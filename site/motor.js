// Prismotor for Nordisk Bilforsakring. Ren JavaScript, kors i webblasaren.
// All tariffdata kommer fran data.js (genererad av analys/skatta_tariff.py).
(function () {
  const T = window.TARIFF, D = window.DATA;
  const BIL = new Map(D.bilar.map(r => [r[0], { regnummer: r[0], marke: r[1], modell: r[2], arsmodell: r[3], vardering: r[4], drivmedel: r[5], hk: r[6] }]));
  const KUND_PNR = new Map(), KUND_REG = new Map();
  for (const r of D.kunder) {
    const k = { pnr: r[0], reg: r[1], ar: r[2], krockar: r[3], skador: r[4], premie: r[5] };
    if (!KUND_PNR.has(k.pnr)) KUND_PNR.set(k.pnr, []);
    KUND_PNR.get(k.pnr).push(k); KUND_REG.set(k.reg, k);
  }
  const ANS = new Map(D.ansokningar.map(r => [String(r[1]), { id: r[0], pnr: String(r[1]), reg: r[2], krockar: r[3] }]));

  const kr = n => Math.round(n).toLocaleString("sv-SE") + " kr";
  const bandOf = (name, v) => { for (const [lo, hi, lab] of T.bands[name]) if (v >= lo && v <= hi) return lab; return null; };

  // ---------- Personnummer ----------
  function luhn(ten) {
    let s = 0;
    for (let i = 0; i < 9; i++) { let d = +ten[i] * (i % 2 === 0 ? 2 : 1); s += Math.floor(d / 10) + (d % 10); }
    return (10 - (s % 10)) % 10 === +ten[9];
  }
  function parsePnr(raw, today) {
    const s = String(raw || "").trim();
    if (!s) return { fel: "Du behöver ange ett personnummer.", kod: "A5" };
    const plus = s.includes("+");
    const digits = s.replace(/[\s\-+]/g, "");
    if (!/^\d+$/.test(digits)) return { fel: "Personnumret får bara innehålla siffror (och eventuellt - eller +).", kod: "A5" };
    let full;
    if (digits.length === 12) full = digits;
    else if (digits.length === 10) {
      const yy = +digits.slice(0, 2); let year = 2000 + yy;
      if (year > today.getFullYear()) year -= 100;
      if (plus) year -= 100;
      full = year + digits.slice(2);
    } else return { fel: "Personnumret ska ha 10 eller 12 siffror, till exempel 19850412-1234.", kod: "A5" };
    const y = +full.slice(0, 4), m = +full.slice(4, 6); let d = +full.slice(6, 8);
    const samord = d > 60; if (samord) d -= 60;
    const date = new Date(y, m - 1, d);
    if (m < 1 || m > 12 || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d)
      return { fel: "Födelsedatumet i personnumret finns inte. Kontrollera siffrorna.", kod: "A6" };
    if (date > today) return { fel: "Födelsedatumet i personnumret ligger i framtiden.", kod: "A9" };
    if (!luhn(full.slice(2))) return { fel: "Personnumret verkar innehålla ett skrivfel (kontrollsiffran stämmer inte). Kontrollera de sista fyra siffrorna.", kod: "A7" };
    let age = today.getFullYear() - y;
    if (today.getMonth() < m - 1 || (today.getMonth() === m - 1 && today.getDate() < d)) age--;
    return { pnr: full, age, samord, fodd: `${full.slice(0, 4)}-${full.slice(4, 6)}-${String(d).padStart(2, "0")}`, maskerat: full.slice(0, 8) + "-****" };
  }

  // ---------- Registreringsnummer ----------
  function parseReg(raw) {
    const s = String(raw || "").toUpperCase().replace(/[\s\-]/g, "");
    if (!s) return { fel: "Du behöver ange ett registreringsnummer.", kod: "B6" };
    if (/^[A-Z]{3}[0-9]{2}[A-Z0-9]$/.test(s)) {
      if (/[IQV]/.test(s.slice(0, 3))) return { fel: `${s} kan inte vara ett svenskt registreringsnummer (bokstäverna I, Q och V används inte).`, kod: "B4" };
      if (s[5] === "O") return { fel: `${s} kan inte vara ett svenskt registreringsnummer (sista tecknet kan inte vara O).`, kod: "B4" };
      return { reg: s };
    }
    if (/^[A-ZÅÄÖ0-9]{2,7}$/.test(s) && /[A-ZÅÄÖ]/.test(s))
      return { fel: `${s} ser ut som en personlig skylt. Ange bilens ordinarie registreringsnummer, det står i registreringsbeviset.`, kod: "B5" };
    return { fel: "Registreringsnumret ska ha formatet ABC123 eller ABC12D.", kod: "B6" };
  }

  const krockFaktor = (n, ar) => ((T.krock.alpha + n) / (T.krock.beta + ar)) / T.krock.lambda;

  // ---------- Huvudfunktion ----------
  // opts: { krockar: number|null (frivillig egen uppgift), today: Date }
  function prissatt(pnrRaw, regRaw, opts = {}) {
    const today = opts.today || new Date();
    const res = { indata: { pnr: pnrRaw, reg: regRaw }, tid: today.toISOString(), version: T.version, flaggor: [], villkor: [], rad: [], kontroller: [] };
    const ok = (txt) => res.kontroller.push({ ok: true, txt }), bad = (txt) => res.kontroller.push({ ok: false, txt });
    const nej = (kod, txt) => Object.assign(res, { utfall: "NEJ", kod, kundtext: txt });

    const p = parsePnr(pnrRaw, today);
    if (p.fel) { bad("Personnummer: " + p.fel); return nej(p.kod, p.fel); }
    ok(`Personnummer giltigt (format, datum, kontrollsiffra)${p.samord ? ", samordningsnummer" : ""}. Ålder ${p.age} år.`);
    res.person = p;
    if (p.age < 18) { bad("Ålder under 18 år."); return nej("A10", `Du är ${p.age} år. Du behöver vara 18 år och ha körkort för att teckna försäkringen. Om bilen ska köras av någon annan kan bilens ägare teckna den.`); }

    const r = parseReg(regRaw);
    if (r.fel) { bad("Registreringsnummer: " + r.fel); return nej(r.kod, r.fel); }
    ok(`Registreringsnummer ${r.reg} har giltigt format.`);
    const bil = BIL.get(r.reg);
    if (!bil) { bad("Bilen finns inte i fordonsregistret."); return nej("B3", `Vi hittar ingen bil med registreringsnummer ${r.reg}. Kontrollera numret. Om bilen är nyregistrerad kan det dröja några dagar innan uppgifterna finns hos oss.`); }
    ok(`Bil hittad: ${bil.marke} ${bil.modell} ${bil.arsmodell}, ${bil.hk} hk, ${bil.drivmedel}, värderad till ${kr(bil.vardering)}.`);
    res.bil = bil;

    // Befintliga forsakringar
    const egna = KUND_PNR.get(p.pnr) || [];
    if (egna.some(k => k.reg === bil.regnummer)) { bad("Bilen är redan försäkrad hos oss av samma person."); return nej("C1", `Din ${bil.marke} ${bil.modell} (${bil.regnummer}) är redan försäkrad hos oss. Du behöver ingen ny försäkring.`); }
    const annan = KUND_REG.get(bil.regnummer);
    if (annan) res.flaggor.push({ kod: "C2", grans: true, txt: "Bilen är redan försäkrad hos oss av en annan person. Ägarbyte måste bekräftas innan försäkringen kan börja gälla, så att bilen inte dubbelförsäkras." });

    // Skadehistorik: tre kallor i prioritetsordning
    const ans = ANS.get(p.pnr);
    let hist;
    if (egna.length) {
      const n = egna.reduce((a, k) => a + k.krockar, 0), ar = egna.reduce((a, k) => a + k.ar, 0);
      const sk = egna.reduce((a, k) => a + k.skador, 0), pr = egna.reduce((a, k) => a + k.premie, 0);
      hist = { kalla: "Verklig historik hos oss", n, ar, faktor: krockFaktor(n, ar), txt: `${n} krock${n === 1 ? "" : "ar"} på ${ar} försäkringsår hos oss` };
      ok(`Befintlig kund: ${egna.length} försäkring(ar), ${ar} år, ${n} krockar, skadekvot ${(sk / pr).toFixed(2)}.`);
      const uppgett = opts.krockar != null ? opts.krockar : (ans ? ans.krockar : null);
      if (uppgett != null && uppgett < n) res.flaggor.push({ kod: "E5", txt: `Uppgivna krockar (${uppgett}) är färre än vår egen historik (${n}). Vi använder vår egen historik.` });
      if (sk / pr > 3 && sk > 200000) res.flaggor.push({ kod: "C4", grans: true, txt: `Mycket hög skadekvot hos oss (${(sk / pr).toFixed(1)}), skador ${kr(sk)}. Behöver granskas av en handläggare.` });
    } else if (opts.krockar != null) {
      hist = { kalla: "Egen uppgift (inmatad)", n: opts.krockar, ar: 5, faktor: krockFaktor(opts.krockar, 5), txt: `${opts.krockar} krock${opts.krockar === 1 ? "" : "ar"} senaste 5 åren enligt egen uppgift` };
    } else if (ans) {
      hist = { kalla: `Egen uppgift (ansökan ${ans.id})`, n: ans.krockar, ar: 5, faktor: krockFaktor(ans.krockar, 5), txt: `${ans.krockar} krock${ans.krockar === 1 ? "" : "ar"} senaste 5 åren enligt din ansökan` };
      ok(`Ansökan ${ans.id} hittad med uppgivna krockar: ${ans.krockar}.`);
    } else {
      hist = { kalla: "Saknas: genomsnitt", n: null, ar: 0, faktor: 1, txt: "ingen verifierad skadehistorik, vi räknar med ett genomsnitt" };
      ok("Ny person utan historik i våra register. Genomsnittlig skadefrekvens används.");
    }
    res.historik = hist;

    // ---------- Pris ----------
    const ctx = { age: p.age, hk: bil.hk, varde: bil.vardering, bilalder: Math.max(0, today.getFullYear() - bil.arsmodell), drivmedel: bil.drivmedel, marke: bil.marke, krockFaktor: hist.faktor, flerbil: egna.length > 0 };
    const calc = berakna(ctx);
    res.rad = calc.rad; res.risk = calc.risk; res.pris = calc.pris; res.komponenter = calc.komponenter;
    if (calc.minimi) res.flaggor.push({ kod: "F1", txt: `Beräknat pris låg under minimipremien och har höjts till ${kr(T.minimipremie)}.` });

    // ---------- Beslutsregler ----------
    const n = hist.n;
    if (n != null && n >= 4) res.flaggor.push({ kod: "E3", grans: true, txt: `${n} krockar på kort tid. En handläggare behöver gå igenom skadehistoriken innan vi kan lämna ett bindande pris.` });
    else if (n === 3) res.villkor.push("Förhöjd självrisk vid vagnskada (3 krockar senaste 5 åren).");
    if (p.age < 25 && bil.hk >= 500) res.flaggor.push({ kod: "C6", grans: true, txt: `Förare under 25 år med en bil på ${bil.hk} hk. Kräver manuell bedömning.` });
    else if (p.age < 25 && bil.hk >= 300) res.villkor.push(`Förhöjd självrisk för förare under 25 år med bil över 300 hk (${bil.hk} hk).`);
    if (bil.vardering > 800000) res.flaggor.push({ kod: "D1", grans: true, txt: `Bilens värde (${kr(bil.vardering)}) är över 800 000 kr. Krav på godkänt stöldskydd och spårsändare ska kontrolleras.` });
    if (bil.vardering < 15000) res.flaggor.push({ kod: "D2", txt: `Bilen är värd ${kr(bil.vardering)}. Helförsäkringen kan kosta en stor del av bilens värde. Överväg halvförsäkring.` });
    if (p.age > 110) res.flaggor.push({ kod: "A14", grans: true, txt: "Ålder över 110 år, troligen ett inmatningsfel." });
    if (res.pris > T.maxAutomatiskt) res.flaggor.push({ kod: "F2", grans: true, txt: `Beräknat pris (${kr(res.pris)}) är över ${kr(T.maxAutomatiskt)}. Vi lämnar inte så höga priser automatiskt.` });
    if (p.age >= 85) res.flaggor.push({ kod: "A13", txt: "Vi nekar aldrig på grund av ålder. Åldern påverkar bara priset, och det går att motivera med skadedata." });

    const granska = res.flaggor.some(f => f.grans);
    res.utfall = granska ? "GRANSKNING" : (res.villkor.length ? "VILLKOR" : "PRIS");
    res.kundtext = granska
      ? `Vi kan inte lämna ett bindande pris direkt. En handläggare kontaktar dig inom en arbetsdag. Preliminärt pris: ${kr(res.pris)} per år.`
      : `Din helförsäkring för ${bil.marke} ${bil.modell} kostar ${kr(res.pris)} per år (${kr(res.pris / 12)} per månad).`;

    // ---------- Sa sanker du priset (kontrafaktiskt) ----------
    const cf = [];
    const alt = (andring, txt) => { const c = berakna(Object.assign({}, ctx, andring)); if (c.pris < res.pris - 50) cf.push({ txt, pris: c.pris, diff: res.pris - c.pris }); };
    if (hist.n == null) alt({ krockFaktor: krockFaktor(0, 5) }, "Om du visar att du kört utan krockar de senaste 5 åren");
    else if (hist.n > 0) alt({ krockFaktor: krockFaktor(hist.n, hist.ar + 3) }, "Efter 3 år till utan krock");
    if (p.age < 25) alt({ age: 25 }, "När du fyller 25 år (allt annat lika)");
    if (bil.hk > 150) alt({ hk: 150 }, "Med en bil på högst 150 hk (allt annat lika)");
    if (!ctx.flerbil) alt({ flerbil: true }, "Om du redan har en annan bil försäkrad hos oss (flerbilsrabatt)");
    res.sankPris = cf;
    return res;
  }

  function berakna(c) {
    const rad = [];
    const bas = T.basRiskpremie * T.storskadeTillagg;
    rad.push({ namn: "Grundpremie", varde: "Genomsnittlig riskkostnad per år inklusive storskadetillägg", f: null, kr: bas, forkl: `${kr(T.basRiskpremie)} × storskadetillägg ${T.storskadeTillagg.toFixed(3)}` });
    let x = bas;
    const steg = (namn, varde, f, forkl) => { x *= f; rad.push({ namn, varde, f, kr: x, forkl }); };
    const ab = bandOf("alder", Math.max(18, c.age));
    steg("Förarens ålder", `${c.age} år (${ab})`, T.rel.alder[ab], forklAlder(ab));
    steg("Skadehistorik", c.krockFaktor === 1 ? "Ingen historik, genomsnitt" : "Krockar enligt historik", c.krockFaktor, "Poisson–Gamma: (α + krockar) / (β + år) jämfört med snittet");
    const eb = bandOf("effekt", c.hk);
    steg("Motoreffekt", `${c.hk} hk (${eb})`, T.rel.effekt[eb], "Starkare bil ger fler och dyrare skador");
    const vb = bandOf("varde", c.varde);
    steg("Bilens värde", `${kr(c.varde)} (${vb})`, T.rel.varde[vb], "Dyrare bil kostar mer att reparera och ersätta");
    const bb = bandOf("bilalder", c.bilalder);
    steg("Bilens ålder", `${c.bilalder} år (${bb.replace("ar", "år")})`, T.rel.bilalder[bb], "Äldre bilar har lägre skadekostnad");
    steg("Drivmedel", c.drivmedel, T.rel.drivmedel[c.drivmedel] ?? 1, c.drivmedel === "el" ? "Batteri och sensorer gör reparationer dyrare" : "Skillnad i skadekostnad mellan drivmedel");
    const mf = T.rel.marke[c.marke];
    steg("Märke", c.marke, mf ?? 1, mf == null ? "Märket saknas i vår data, neutral faktor" : "Kredibilitetsviktad: märken med lite data dras mot 1,00");
    if (c.flerbil) steg("Flerbilsrabatt", "Befintlig kund", T.flerbil, "Kunder med flera bilar har lägre skadekostnad per bil");
    const risk = x;
    const brutto = risk / (1 - T.kostnadsandel - T.vinstmarginal);
    let pris = Math.round(brutto), minimi = false;
    if (pris < T.minimipremie) { pris = T.minimipremie; minimi = true; }
    const komponenter = Object.fromEntries(Object.entries(T.komponenter).map(([k, s]) => [k, Math.round(pris * s)]));
    return { rad, risk, brutto, pris, minimi, komponenter };
  }
  function forklAlder(b) {
    return ({ "18-24": "Oerfarna förare har dubbelt så hög skadekostnad", "25-29": "Fortfarande förhöjd risk", "30-39": "Referensgrupp", "40-49": "Nära referensnivån",
      "50-59": "Förhöjd: troligen lånar vuxna barn bilen", "60-69": "Lägst risk i datan", "70-79": "Låg risk", "80+": "Ökad risk, längre reaktionstid" })[b] || "";
  }

  window.Motor = { prissatt, parsePnr, parseReg, kr, ANS, BIL };
})();
