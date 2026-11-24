"""Skattar tariffen ur kunder.csv + bilar.csv och skriver site/data.js.
Kör: python skatta_tariff.py <mapp med csv-filer>
Metod: Poisson-GLM (log-länk) på kapad skadekostnad med exponering som offset,
L2-krympning (kredibilitet) på märkesfaktorer, storskadetillägg, Poisson-Gamma bonus-malus.
"""
import sys, json, datetime as dt
import numpy as np, pandas as pd

D = sys.argv[1]; OUT = sys.argv[2]
bil = pd.read_csv(f"{D}/bilar.csv", dtype={"regnummer": str})
kun = pd.read_csv(f"{D}/kunder.csv", dtype={"personnummer": str, "regnummer": str})
ans = pd.read_csv(f"{D}/ansokningar.csv", dtype={"personnummer": str, "regnummer": str})
TODAY = dt.date(2026, 11, 24)
CAP = 300_000
COST, PROFIT = 0.22, 0.05

BANDS = {
    "alder":    [(18, 24, "18-24"), (25, 29, "25-29"), (30, 39, "30-39"), (40, 49, "40-49"), (50, 59, "50-59"), (60, 69, "60-69"), (70, 79, "70-79"), (80, 200, "80+")],
    "effekt":   [(0, 100, "<=100 hk"), (101, 150, "101-150 hk"), (151, 200, "151-200 hk"), (201, 250, "201-250 hk"), (251, 300, "251-300 hk"), (301, 400, "301-400 hk"), (401, 9999, ">400 hk")],
    "varde":    [(0, 50000, "<=50 tkr"), (50001, 100000, "50-100 tkr"), (100001, 200000, "100-200 tkr"), (200001, 300000, "200-300 tkr"), (300001, 500000, "300-500 tkr"), (500001, 10**9, ">500 tkr")],
    "bilalder": [(0, 2, "0-2 ar"), (3, 5, "3-5 ar"), (6, 10, "6-10 ar"), (11, 15, "11-15 ar"), (16, 200, "16+ ar")],
}
REF = {"alder": "30-39", "effekt": "101-150 hk", "varde": "100-200 tkr", "bilalder": "6-10 ar", "drivmedel": "bensin", "marke": "Volvo"}

def band(name, v):
    for lo, hi, lab in BANDS[name]:
        if lo <= v <= hi: return lab
    raise ValueError((name, v))

def age(p):
    b = dt.date(int(p[:4]), int(p[4:6]), int(p[6:8]))
    return TODAY.year - b.year - ((TODAY.month, TODAY.day) < (b.month, b.day))

m = kun.merge(bil, on="regnummer")
m["alder"] = m.personnummer.map(age).map(lambda a: band("alder", max(a, 18)))
m["effekt"] = m.effekt_hk.map(lambda v: band("effekt", v))
m["varde"] = m.vardering_kr.map(lambda v: band("varde", v))
m["bilalder"] = (2026 - m.arsmodell).map(lambda v: band("bilalder", max(v, 0)))
y = m.total_skadekostnad_kr.clip(upper=CAP).values / 1000.0
expo = m.antal_ar_forsakrad.values.astype(float)

vars_ = ["alder", "effekt", "varde", "bilalder", "drivmedel", "marke"]
cols, groups = ["intercept"], {}
for v in vars_:
    levels = sorted(m[v].unique())
    groups[v] = [l for l in levels if l != REF[v]]
    cols += [f"{v}={l}" for l in groups[v]]
X = np.zeros((len(m), len(cols))); X[:, 0] = 1
for j, c in enumerate(cols[1:], 1):
    v, l = c.split("=", 1); X[:, j] = (m[v].values == l)
pen = np.zeros(len(cols))
for j, c in enumerate(cols):
    if c.startswith("marke="): pen[j] = 40.0   # kredibilitet: sma marken krymps mot 1
    elif c != "intercept": pen[j] = 2.0       # lätt utjämning av ovriga faktorer
beta = np.zeros(len(cols)); beta[0] = np.log(y.sum() / expo.sum())
for it in range(100):
    eta = X @ beta + np.log(expo); mu = np.exp(eta)
    grad = X.T @ (y - mu) - pen * beta
    H = X.T @ (X * mu[:, None]) + np.diag(pen)
    step = np.linalg.solve(H, grad); beta += step
    if np.abs(step).max() < 1e-9: break

rel = {v: {REF[v]: 1.0} for v in vars_}
for j, c in enumerate(cols[1:], 1):
    v, l = c.split("=", 1); rel[v][l] = float(np.exp(beta[j]))
# monotonicitet: mer effekt/hogre varde far aldrig ge lagre pris
for v in ["effekt", "varde"]:
    order = [lab for _, _, lab in BANDS[v]]; run = 0
    for lab in order:
        run = max(run, rel[v][lab]); rel[v][lab] = run
base_capped = float(np.exp(beta[0])) * 1000
storskade = float(m.total_skadekostnad_kr.sum() / m.total_skadekostnad_kr.clip(upper=CAP).sum())

# Poisson-Gamma (negativ binomial) bonus-malus
n = kun.antal_krockar.values; t = kun.antal_ar_forsakrad.values.astype(float)
lam = n.sum() / t.sum()
alpha = lam**2 * (t**2).sum() / (((n - lam * t)**2 - lam * t).sum()); bet = alpha / lam

tariff = {
    "version": "tariff_v1 (skattad 2026-11-24)",
    "basRiskpremie": round(base_capped, 2), "storskadeTillagg": round(storskade, 4),
    "kostnadsandel": COST, "vinstmarginal": PROFIT, "minimipremie": 2400, "maxAutomatiskt": 60000,
    "kapning": CAP, "bands": {k: [[lo, hi, lab] for lo, hi, lab in v] for k, v in BANDS.items()},
    "rel": {v: {k: round(x, 3) for k, x in d.items()} for v, d in rel.items()},
    "krock": {"lambda": round(lam, 5), "alpha": round(alpha, 4), "beta": round(bet, 3)},
    "flerbil": 0.85,
    "komponenter": {"trafik": 0.29, "vagn": 0.56, "delkasko": 0.15},
}

# Backtest: ny tariff pa befintlig portfolj (krockfaktor = verklig historik)
def pred_row(r):
    f = 1.0
    for v in vars_: f *= rel[v][r[v]]
    return f
m["rel"] = m.apply(pred_row, axis=1)
crash = ((alpha + m.antal_krockar) / (bet + m.antal_ar_forsakrad)) / lam
risk = base_capped * storskade * m.rel * crash * m.antal_ar_forsakrad
gross = risk / (1 - COST - PROFIT)
tariff["backtest"] = {
    "gammalSkadekvot": round(m.total_skadekostnad_kr.sum() / m.total_premie_kr.sum(), 3),
    "nySkadekvot": round(m.total_skadekostnad_kr.sum() / gross.sum(), 3),
    "gammalPremie": int(m.total_premie_kr.sum()), "nyPremie": int(gross.sum()), "skador": int(m.total_skadekostnad_kr.sum()),
}
grp = m.assign(old=m.total_premie_kr, new=gross).groupby("alder").agg(old=("old", "sum"), new=("new", "sum"), loss=("total_skadekostnad_kr", "sum"))
tariff["backtest"]["perAlder"] = {k: {"gammalSK": round(r.loss / r.old, 2), "nySK": round(r.loss / r.new, 2), "andring": round(r.new / r.old - 1, 3)} for k, r in grp.iterrows()}

data = {
    "bilar": bil[["regnummer", "marke", "modell", "arsmodell", "vardering_kr", "drivmedel", "effekt_hk"]].values.tolist(),
    "kunder": kun.values.tolist(),
    "ansokningar": ans.values.tolist(),
}
with open(OUT, "w", encoding="utf-8") as f:
    f.write("// Genererad av analys/skatta_tariff.py. Andra inte for hand.\n")
    f.write("window.TARIFF = " + json.dumps(tariff, ensure_ascii=False, indent=1) + ";\n")
    f.write("window.DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":"), default=int) + ";\n")
print(json.dumps({k: tariff[k] for k in ["basRiskpremie", "storskadeTillagg", "rel", "krock", "backtest"]}, indent=1, ensure_ascii=False))
