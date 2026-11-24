# Klarpris.

**Bilförsäkring utan frågetecken.** Kunden skriver in regnummer och personnummer, får årspriset direkt och ser exakt vad det består av.

Byggt för Dotnet Mentor Hackathon, uppdrag från Nordisk Bilförsäkring AB.

## Kom igång

1. Klona repot eller ladda ner det som ZIP (Code → Download ZIP).
2. Öppna `site/index.html` i en webbläsare (dubbelklicka).

Ingen installation, ingen server. Fungerar utan internet (typsnitten faller då tillbaka på systemets).

## Demo-exempel

Under "Prova med ett exempel" i formuläret:

| Exempel | Personnummer | Regnummer | Förväntat |
|---|---|---|---|
| Vanlig kund | 198908152393 | BOC026 | Pris |
| Ung förare, Tesla 670 hk | 200204082390 | XFG61W | Preliminärt pris (granskning) |
| Ny kund utan historik | 19900101-0017 | AJP978 | Pris, genomsnittlig historik |
| Befintlig kund, ny bil | 193311288454 | AJP978 | Pris med flerbilsrabatt |
| 16 år | 201004122394 | RCA353 | Inget pris |
| Skrivfel i personnummer | 198411112386 | DKP41T | Inget pris |
| Okänd bil | 198908152393 | ZZZ999 | Inget pris |

## Språk och filer

| Fil | Språk | Innehåll |
|---|---|---|
| `site/index.html` | HTML, CSS, JavaScript | Kundsidan: formulär, pris, förklaring, animationer |
| `site/motor.js` | JavaScript | Prismotorn: validering, beslutsregler, pris, "så sänker du priset" |
| `site/data.js` | Genererad | Tariff + bil-, kund- och ansökningsdata. Ändra inte för hand. |
| `site/publish.html` | HTML | Samma sida utan html/head-omslag, för publicering som artifact |
| `analys/skatta_tariff.py` | Python 3 (pandas, numpy) | Skattar tariffen ur CSV-filerna och skriver `site/data.js` |
| `PLAN.md` | Markdown | Analys, prismodell, scenariokatalog och plan |

## Prismodellen i korthet

```
Pris = Grundpris × ålder × krockar × effekt × bilens värde
       × bilens ålder × drivmedel × märke
       ÷ (1 − 22 % drift − 5 % vinst)
```

- Faktorerna skattas med en Poisson-GLM på bolagets kunddata (4 815 försäkringar).
- Krockar: Poisson–Gamma-modell. 0 krockar ×0,84, 1 ×1,36, 2 ×1,88, okänd ×1,00.
- Storskador över 300 000 kr fördelas jämnt (+9 %).
- Kön används aldrig (Test-Achats-domen 2012).
- Skadekvot i dag 0,89. Med vår tariff 0,68 på samma kunder.

Se `PLAN.md` för alla beslutsregler och scenarier.

## Uppdatera tariffen

```
python analys/skatta_tariff.py <mapp med bilar.csv, kunder.csv, ansokningar.csv> site/data.js
```
