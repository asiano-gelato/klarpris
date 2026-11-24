# Prismotor – Nordisk Bilförsäkring

Hemsida som räknar fram årspremien för en bilförsäkring utifrån personnummer och registreringsnummer, och förklarar varför priset blev som det blev.

## Starta

Öppna `site/index.html` i en webbläsare (dubbelklicka). Ingen installation, ingen server, inget internet behövs.

## Språk

- **JavaScript**: prismotorn (`site/motor.js`), körs i webbläsaren
- **HTML och CSS**: sidan (`site/index.html`)
- **Python 3** (pandas, numpy): skattar tariffen ur datafilerna (`analys/skatta_tariff.py`)

## Filer

| Fil | Innehåll |
|---|---|
| `site/index.html` | Sidan: priskalkylator, analys, prismodell, beslutsregler, alla 300 ansökningar, teknik |
| `site/motor.js` | Validering, beslutsregler, prisberäkning, motivering |
| `site/data.js` | Genererad: tariff + bil-, kund- och ansökningsdata. Ändra inte för hand. |
| `site/publish.html` | Samma sida utan html/head-omslag, används för publicering som artifact |
| `analys/skatta_tariff.py` | Skattar tariffen och skriver `site/data.js` |
| `PLAN.md` | Analys, prismodell, scenariokatalog och plan |

## Uppdatera tariffen

```
python analys/skatta_tariff.py <mapp med bilar.csv, kunder.csv, ansokningar.csv> site/data.js
```
