# Prismotor för Nordisk Bilförsäkring: plan och djupdykning

Siffrorna här kommer från en analys av de tre filerna (5 815 bilar, 4 815 försäkringar, 14 273 försäkringsår, 300 ansökningar).

---

## 1. Vad bolaget egentligen behöver

Uppdraget säger "ta fram ett pris". Datan visar att bolaget har ett större problem än så.

**Bolaget förlorar pengar på sin nuvarande prissättning.**

| Nyckeltal (kunder.csv) | Värde |
|---|---|
| Totala skadeutbetalningar | 73,7 Mkr |
| Totala premieintäkter | 82,4 Mkr |
| Skadekvot (skador / premie) | **0,89** |

En normal svensk motorförsäkrare har driftskostnader på 20–25 % av premien. Med en skadekvot på 0,89 blir totalkvoten (combined ratio) ungefär 110–115 %. Bolaget går alltså med förlust på varje krona det tar in.

**Orsaken är att dagens pris knappt skiljer mellan olika kunder:**

| Ålder | Skadekostnad per år | Premie per år | Skadekvot |
|---|---|---|---|
| 18–25 | 7 550 kr | 4 890 kr | **1,55** |
| 30–40 | 4 440 kr | 5 870 kr | 0,76 |
| 60–70 | 4 100 kr | 5 760 kr | 0,71 |

Premien är nästan densamma för alla, men risken varierar med en faktor 2–3. Unga betalar för lite och medelålders betalar för mycket. Det leder till **antiselektion**: konkurrenter med träffsäkrare priser lockar över de lönsamma kunderna, och bolaget blir kvar med de olönsamma.

**Vår tolkning:** Bolaget behöver ett pris som speglar verklig risk och som går att försvara inför kunden, Finansinspektionen och styrelsen. Prismotorn är verktyget, men det bolaget beställer är **lönsamhet utan diskriminering**.

> Huvudpoängen i redovisningen: "Vi kopierade inte er gamla prislista, eftersom den är det som gör att ni förlorar pengar. Vi byggde priset utifrån vad skadorna faktiskt kostar."

---

## 2. Riskanalys: vad påverkar risken, och hur vet vi det?

Alla siffror är skadekostnad per försäkringsår, beräknad på kunder.csv kopplad till bilar.csv.

### 2.1 Förarens ålder: U-kurva med en oväntad topp

| Ålder | kr/år | Kommentar |
|---|---|---|
| 18–25 | 7 550 | Oerfarna förare, känd effekt |
| 25–30 | 6 840 | |
| 30–50 | ~4 450 | Lägst risk |
| **50–60** | **7 900** | **Oväntad topp** |
| 60–80 | ~3 800 | |
| 80+ | 5 840 | Längre reaktionstid |

**Toppen vid 50–60 år finns kvar även när vi kapar storskador vid 300 000 kr** (7 580 kr/år efter kapning). Det är alltså inte en enstaka skada som ligger bakom. Vår hypotes är **"barnen lånar bilen"**: föräldrar i 50–60-årsåldern har ofta barn mellan 18 och 25 som kör deras bil. Det är ett känt mönster i branschen. Det leder fram till en produktförbättring som konkurrenterna kanske saknar: **fråga om yngsta förare i hushållet** (se 6.3).

### 2.2 Tidigare krockar: starkast prediktor, och vi härleder faktorn ur datan

I stället för att hitta på en bonus–malus-skala skattade vi en **Poisson–Gamma-modell** (negativ binomial) på krockfrekvensen i kunder.csv:

- Genomsnittlig krockfrekvens λ = 0,062 per år
- Heterogenitet α = 1,61, β = 26,0

Med Bayesiansk uppdatering blir förväntad frekvens för en sökande med k krockar på 5 år lika med (α + k) / (β + 5):

| Uppgivna krockar senaste 5 år | Relativ risk |
|---|---|
| 0 | **0,84** |
| 1 | **1,36** |
| 2 | **1,88** |
| 3 | 2,40 |
| 4 | 2,92 |

Det här är **kredibilitetsteori**, alltså samma matematik som försäkringsaktuarier använder. Fördelen är att vi kan visa juryn hur faktorn räknades fram i stället för att bara påstå den.

En krock kostar i snitt cirka 73 000 kr. Skador som inte är krockar (stöld, brand, glas) kostar cirka 780 kr per år och kund.

### 2.3 Bilen

| Faktor | Effekt (kr/år) |
|---|---|
| Effekt ≤ 100 hk → > 400 hk | 2 300 → **19 000** |
| Värde < 50 tkr → 500–800 tkr | 2 350 → 26 300 |
| Bilens ålder 0–2 år → 20+ år | 8 300 → 2 600 |
| Drivmedel: bensin / diesel / hybrid / el | 3 290 / 4 920 / 6 310 / **9 030** |
| Märke: Porsche / Tesla / BMW / Volkswagen | 45 000 / 11 600 / 11 400 / 3 350 |

Elbilar är dyrare per skada eftersom batteri, sensorer och reparationer kostar mer, och de har dessutom högre krockfrekvens (0,079 jämfört med 0,054 för bensin). Effekt och värde hänger ihop med märke, och därför måste de modelleras **tillsammans** (se avsnitt 3), inte var för sig.

### 2.4 Lojalitet och flera bilar

- 10+ år hos bolaget: 2 440 kr/år, jämfört med 6 800 kr/år första året. Lojalitet hänger alltså ihop med lägre risk.
- Kunder med 2 bilar: 4 200 kr/år per bil, jämfört med 5 330 för kunder med 1 bil. Det motiverar en flerbilsrabatt.

### 2.5 Storskador: tung svans

- **1 % av försäkringarna står för 26 % av alla skadekostnader.**
- Största enskilda skadan är 2,28 Mkr på en BMW 320d värd 142 000 kr. Den kan inte gälla bilen själv. Det är en **trafikskada**, alltså personskada eller skada på någon annans egendom.
- 120 försäkringar har skadekostnader som överstiger bilens värde (totalt 21 Mkr).

**Konsekvens:** Vi kapar storskador vid 300 tkr när vi skattar faktorerna, så att en enda olycka inte styr hela tariffen. Den kapade delen fördelar vi som ett jämnt storskadetillägg på alla kunder. Det fungerar ungefär som en återförsäkring inbyggd i priset.

### 2.6 Vad vi medvetet INTE använder

| Variabel | Signal i datan | Varför vi inte använder den |
|---|---|---|
| **Kön** (näst sista siffran i personnumret) | Män 5 600 kr/år, kvinnor 4 480 kr/år | **Förbjudet.** EU-domstolens Test-Achats-dom (2012) och diskrimineringslagen. Vi läser aldrig ut den siffran. |
| Postnummer eller bostadsort | Finns inte i datan | Skulle ge stor effekt i verkligheten, så vi föreslår det som nästa steg. |

Att visa att vi **hittade** könssignalen och **valde bort** den med motivering är starkare än att inte nämna den alls.

---

## 3. Prismodell: från risk till kronor

### 3.1 Struktur: priset delas upp i försäkringens tre delar

Produkten består av tre delar med **olika riskdrivare**. Vi prissätter dem var för sig och lägger sedan ihop dem:

| Del | Täcker | Huvudsakliga drivare |
|---|---|---|
| **Trafik** | Skador på andra (person och egendom) | Föraren: ålder, krockhistorik, effekt |
| **Vagn** | Den egna bilen vid krock | Föraren × bilens värde, effekt, drivmedel |
| **Delkasko** | Stöld, brand, glas | Bilen: värde, märke, ålder |

Med den här uppdelningen blir förklaringen naturlig: *"Du betalar 2 100 kr för trafikdelen eftersom du är 22 år, och 3 400 kr för vagndelen eftersom bilen är värd 450 000 kr."*

Datan har inte uppdelade skadebelopp, så uppdelningen approximeras så här: skador utan krock räknas som delkasko, skador på försäkringar med krock fördelas mellan vagn (upp till bilens värde) och trafik (resten).

### 3.2 Riskpremie: multiplikativ modell (GLM)

```
Riskpremie = Basnivå
           × f(ålder)
           × f(krockar senaste 5 år)    <- Poisson-Gamma ovan
           × f(effekt)
           × f(bilens värde)
           × f(bilens ålder)
           × f(drivmedel)
           × f(märkesgrupp)             <- med kredibilitetsvikt
           + storskadetillägg
```

- Modellen skattas som en **Tweedie-GLM med log-länk**, där försäkringsår används som vikt (exponering). Det är branschstandard.
- **Kredibilitet för små grupper:** Porsche har bara 27 försäkringar. En ren skattning skulle ge en faktor på 8× baserad på 13 krockar. Vi drar faktorn mot genomsnittet i proportion till hur mycket data som finns (Bühlmann: Z = n / (n + k)).
- **Monotonicitet:** Fler hästkrafter får aldrig ge ett lägre pris, och fler krockar får aldrig ge ett lägre pris. Bättre för kunden och lättare att förklara.
- **Utjämnade åldersfaktorer:** Kurvan utjämnas så att priset inte hoppar 30 % vid en enskild födelsedag.

### 3.3 Från riskpremie till kundpris

```
Bruttopremie = Riskpremie / (1 − driftskostnad − vinstmarginal)
             = Riskpremie / (1 − 0,22 − 0,05)
```

Därefter läggs följande regler på:

- Minimipremie (till exempel 2 400 kr/år) så att administrationskostnaden täcks.
- Avrundning till hela kronor, eftersom uppdraget kräver det.
- Målet är att skadekvoten för hela portföljen hamnar på cirka 0,70 i stället för dagens 0,89. **Vi visar vad den nya tariffen hade gett på den befintliga portföljen** (backtest): vilka grupper blir dyrare, vilka blir billigare, och hur ändras totalresultatet.

### 3.4 Validering

- Uppdela kunder.csv i 80 % träning och 20 % test. Mät hur väl modellen rangordnar risk (Gini och lift-kurva) och om nivån stämmer (faktiska skador mot förväntade skador per grupp).
- Jämför mot dagens nästan platta tariff. Den nya modellen ska rangordna risk tydligt bättre.

---

## 4. Beslutsmotor: pris, villkor eller nej

Uppdraget säger: *"Går det inte att lämna ett pris, eller bör bolaget inte göra det, ska lösningen säga det."* Vi bygger det som en regelmotor med **fyra utfall** i stället för bara ja eller nej:

| Utfall | Exempel |
|---|---|
| **Pris** | Normalfallet |
| **Pris med villkor** | Ung förare med stark bil: pris med högre självrisk. 2 krockar: pris men längre bindningstid för bonus. |
| **Manuell granskning** | 3+ krockar, bil värd > 800 tkr, eller uppgifter som inte går ihop |
| **Inget pris** | Se tabellen nedan |

### 4.1 Livetestets fälla: juryn ger bara personnummer och regnummer

Uppgivna krockar finns bara i ansokningar.csv. Juryn kommer att ge personer som inte finns där. Lösningen använder **samma Poisson–Gamma-formel för alla tre källorna**, så motorn är konsekvent:

| Källa (i prioritetsordning) | Formel för relativ frekvens | Förklaring till kunden |
|---|---|---|
| 1. Befintlig kund (kunder.csv): **verklig historik** | (α + krockar) / (β + år försäkrad) / λ | "Vi har sett X krockar på Y år hos oss." |
| 2. Sökande (ansokningar.csv): **egen uppgift**, 5 år | (α + k) / (β + 5) / λ | "Du har uppgett k krockar de senaste 5 åren." |
| 3. Okänd person: **ingen historik** | 1,00 (portföljens snitt) | "Vi saknar skadehistorik och räknar med ett genomsnitt. Priset kan sänkas när historiken är verifierad." |

Är personen både kund och sökande, och den egna uppgiften är lägre än den verkliga historiken, används den verkliga historiken och avvikelsen flaggas.

### 4.2 Komplett scenariokatalog (allt motorn hanterar)

**A. Personnummer**

| # | Scenario | Utfall |
|---|---|---|
| A1 | 12 siffror, giltigt | Fortsätt |
| A2 | 10 siffror `YYMMDD-XXXX` eller utan bindestreck | Normaliseras: sekel räknas fram så att personen inte är född i framtiden |
| A3 | `+` som avgränsare (100 år eller äldre) | Normaliseras till rätt sekel |
| A4 | Mellanslag, bindestreck på fel ställe | Rensas bort |
| A5 | Bokstäver, fel längd, tomt | Nej: "Personnumret ska ha 10 eller 12 siffror." |
| A6 | Ogiltigt datum (t.ex. 0230, 1332) | Nej: "Födelsedatumet i personnumret finns inte." |
| A7 | Fel kontrollsiffra (Luhn), t.ex. ansökan 1081 | Nej: "Personnumret verkar innehålla ett skrivfel." |
| A8 | Samordningsnummer (dag + 60) | Godkänns, ålder räknas från dag − 60 |
| A9 | Födelsedatum i framtiden | Nej |
| A10 | Under 18 år, t.ex. ansökan 1112 | Nej: "Du behöver vara 18 år och ha körkort." |
| A11 | Fyller 18 i dag | Pris (gränsfall testat) |
| A12 | 18–19 år | Pris, ung-förare-faktorn förklaras tydligt |
| A13 | 85 år eller äldre | Pris. Aldrig nej på grund av ålder. |
| A14 | Ålder över 110 | Manuell granskning (troligt inmatningsfel) |
| A15 | Kön (näst sista siffran) | Läses aldrig ut. Inget scenario påverkar priset. |

**B. Registreringsnummer**

| # | Scenario | Utfall |
|---|---|---|
| B1 | `ABC123` eller `ABC12D`, finns i registret | Fortsätt |
| B2 | Små bokstäver, mellanslag, bindestreck (`abc 123`, `ABC-123`) | Normaliseras |
| B3 | Rätt format men finns inte i registret | Nej: "Vi hittar inte bilen. Kontrollera numret. Nyregistrerade bilar kan dröja några dagar." |
| B4 | Bokstäverna I, Q eller V, eller O som sista tecken | Nej: "Numret kan inte vara ett svenskt registreringsnummer." |
| B5 | Personlig skylt (2–7 tecken, t.ex. `KUNGEN`) | Nej: "Ange bilens ordinarie registreringsnummer, det står i registreringsbeviset." |
| B6 | Utländsk eller annan skylt, fel längd, tomt | Nej med formatförklaring |

**C. Person + bil i kombination**

| # | Scenario | Utfall |
|---|---|---|
| C1 | Personen har redan just den här bilen försäkrad hos oss | Inget nytt pris: "Bilen är redan försäkrad hos oss genom dig." |
| C2 | Bilen är försäkrad hos oss av **någon annan** | Manuell granskning: ägarbyte? Dubbelförsäkring ska undvikas. |
| C3 | Befintlig kund med en ny bil | Pris med verklig historik + **flerbilsrabatt** |
| C4 | Befintlig kund med mycket dålig historik (skadekvot > 3 och skador > 200 tkr) | Manuell granskning |
| C5 | Ung förare (< 25) + effekt ≥ 300 hk | Pris med villkor: förhöjd självrisk |
| C6 | Ung förare (< 25) + effekt ≥ 500 hk | Manuell granskning |

**D. Bilen**

| # | Scenario | Utfall |
|---|---|---|
| D1 | Värde > 800 tkr | Manuell granskning (krav på stöldskydd/spårsändare) |
| D2 | Värde < 15 tkr | Pris, men med råd: "Helförsäkringen kan kosta mer än bilen är värd. Överväg halvförsäkring." |
| D3 | Ny bil (0–2 år) | Pris, faktor för ny bil |
| D4 | Elbil | Pris, elbilsfaktor förklarad (dyra batteri- och sensorreparationer) |
| D5 | Märke med lite data (Porsche, BYD, Polestar) | Kredibilitetsviktad faktor, förklaras |

**E. Krockhistorik**

| # | Scenario | Utfall |
|---|---|---|
| E1 | 0–2 krockar | Pris med bonus–malus-faktor |
| E2 | 3 krockar, t.ex. ansökan 1176 | Pris med villkor (högre självrisk) |
| E3 | 4 eller fler, t.ex. ansökan 1220 | Manuell granskning |
| E4 | Uppgiften saknas (okänd person) | Faktor 1,00 (se 4.1) |
| E5 | Egen uppgift lägre än verklig historik | Verklig historik används, avvikelsen flaggas |

**F. Priset i sig (sista skyddsnätet)**

| # | Scenario | Utfall |
|---|---|---|
| F1 | Pris under minimipremien | Höjs till minimipremien (2 400 kr), förklaras |
| F2 | Pris över 60 000 kr/år | Manuell granskning: ingen kund ska få ett orimligt pris automatiskt |
| F3 | Avrundning | Alltid hela kronor |

### 4.3 Kontroller och kundtexter (fall i ansokningar.csv)

| Kontroll | Fall i datan | Kundtext |
|---|---|---|
| Personnummer felformat eller felaktig kontrollsiffra (Luhn) | **1081** (198411112386 har fel kontrollsiffra) | "Personnumret verkar innehålla ett skrivfel. Kontrollera de sista fyra siffrorna." |
| Under 18 år | **1112** (16 år) | "Du behöver vara 18 år och ha körkort för att teckna försäkringen. Om bilen ska köras av någon annan kan bilens ägare teckna den." |
| 18–19 år | 1001, 1064, 1174, 1221, 1291 | Pris ges, men med tydlig förklaring av ung-förare-faktorn |
| Regnummer felformat | – | "Registreringsnumret ska ha formatet ABC123 eller ABC12D." |
| Bilen finns inte i registret | Kan hända i livetestet | "Vi hittar inte bilen. Kontrollera registreringsnumret. Är bilen nyregistrerad kan uppgifterna dröja några dagar." |
| Bilen är redan försäkrad hos oss på någon annan | Kontrolleras mot kunder.csv | Manuell granskning (byte av ägare?) |
| Den sökande är redan kund | Kontrolleras mot kunder.csv | **Vi använder bolagets egen skadehistorik i stället för den egna uppgiften**, och ger flerbilsrabatt |
| 4+ uppgivna krockar | **1220** (4 st), 1176 (3 st) | Manuell granskning med förklaring |
| 85+ år | 1026, 1030, 1128, 1289 | **Pris ges.** Vi nekar inte på grund av ålder; åldern påverkar bara priset, och det går att motivera med data. |
| Inmatningsvarianter | – | Klarar mellanslag och små bokstäver ("abc 123"), 10-siffrigt personnummer med `-` eller `+` (100+ år) samt samordningsnummer (dag + 60) |

---

## 5. Verklighet: vad som krävs i ett riktigt svenskt bolag

| Område | Vad vi gör |
|---|---|
| **GDPR** | Personnummer är känsliga personuppgifter. De hashas i loggar, maskeras i gränssnittet (19840411-****) och sparas bara så länge offerten gäller. |
| **Försäkringsavtalslagen (FAL)** | Informationsplikt: kunden ska förstå vad som påverkar priset. Det löser vi med förklaringsmotorn. |
| **Trafikförsäkring är obligatorisk** | Om vi nekar helförsäkringen behöver kunden ändå trafikförsäkring. Behöver kontrolleras: om bolaget har kontraheringsplikt för just trafikdelen. Kundtexten hänvisar i så fall vidare. |
| **Egen uppgift kontra verifierad uppgift** | Uppgivna krockar går inte att lita på. I verkligheten slås de upp i branschens skadeanmälningsregister (GSR). Vi bygger en adapter som i demon läser kunder.csv och som i produktion kan bytas mot GSR. |
| **Fordonsdata** | bilar.csv i demon. I produktion byts den mot ett anrop till Transportstyrelsen (med samma gränssnitt). Ägarkontroll: är den sökande ägare eller brukare? |
| **Spårbarhet** | Varje offert loggas med indata, tariffversion och faktoruppdelning. Bolaget kan svara på "varför fick jag det här priset i mars?" ett år senare. |
| **Tariffen är data, inte kod** | Faktorerna ligger i en versionerad JSON- eller YAML-fil, så att aktuarien kan ändra dem utan att utvecklare behöver släppa en ny version. |
| **Offertens giltighet** | 30 dagar, och priset är låst under den tiden. |

---

## 6. Det som gör oss unika

1. **Vi börjar med diagnosen, inte koden.** "Ni förlorar pengar, och här är varför." Inga andra grupper lär öppna så.
2. **Härledd bonus–malus** (Poisson–Gamma) i stället för en påhittad skala. Vi kan visa formeln.
3. **Upptäckten vid 50–60 år** och produktförslaget "yngsta förare i hushållet".
4. **Prisuppdelning per del** (trafik, vagn, delkasko), så att förklaringen följer med automatiskt.
5. **Kontrafaktisk förklaring:** *"Ditt pris är 8 420 kr. Med en bil på under 200 hk hade det blivit 6 100 kr. Efter 2 år utan krock sjunker det till cirka 7 300 kr."* Kunden får veta vad hen kan göra för att sänka priset.
6. **Rättvisa visad öppet:** Vi visar könssignalen och att vi tog bort den.
7. **Backtest på portföljen:** "Med vår tariff hade skadekvoten blivit 0,70 i stället för 0,89."
8. **Läge för jurypresentation:** Vid livetestet visar gränssnittet hela beräkningskedjan steg för steg, som ett kvitto.

### 6.3 Förslag till nästa version (visar att vi tänkt längre)

- Yngsta förare i hushållet, postnummer, årlig körsträcka och garage.
- Telematik (körbeteende) som frivillig rabatt.
- Uppföljning efter lansering: faktiskt mot förväntat per faktor varje kvartal.

---

## 7. Teknisk arkitektur

```
            +-------------------+
 Inmatning  |  Webb-UI / CLI    |   regnummer + personnummer
            +---------+---------+
                      |
            +---------v---------+
            |  Validering       |   Luhn, format, ålder, normalisering
            +---------+---------+
                      |
     +----------------+-----------------+
     |                |                 |
+----v-----+   +------v------+   +------v------+
| Fordons- |   | Kundhistorik|   | Skade-      |   adaptrar (CSV i dag,
| källa    |   | (kunder)    |   | register    |   Transportstyrelsen/GSR i morgon)
+----+-----+   +------+------+   +------+------+
     +----------------+-----------------+
                      |
            +---------v---------+
            |  Beslutsregler    |   pris / villkor / granskning / nej
            +---------+---------+
                      |
            +---------v---------+
            |  Tarifmotor       |   läser tariff_v1.json (faktorer)
            +---------+---------+
                      |
            +---------v---------+
            |  Förklaring +     |   kvitto, kontrafaktiskt, kundtext
            |  revisionslogg    |
            +-------------------+

 Offline: notebook/skript -> skattar GLM + kredibilitet -> skriver tariff_v1.json
```

**Teknikval:** Python utan externa beroenden och en lokal webbsida (se avsnitt 8, valt för att ni har 30 minuter). Kontraktet mellan analys och motor är `tariff.json`. I produktion kan motorn skrivas om i .NET med samma JSON-fil, utan att aktuariens arbete behöver göras om.

**Tester:** Enhetstester för Luhn, regnummer, ålder och skottår. Golden tests: alla 300 ansökningar körs och resultatet jämförs med en låst förväntad fil. Plus en lista med elaka testfall inför livetestet.

---

## 8. Plan: 3 personer, 30 minuter

Med 30 minuter hinner ni inte koda själva. **Claude bygger motorn** medan ni tre förbereder redovisningen.

**Teknikval för leverans i ett försök:** ett enda Python-program utan externa beroenden (bara standardbiblioteket), plus en lokal webbsida som visar priskvittot. Det startar på alla datorer utan installation, så det finns ingen risk att det går sönder under livetestet. Tariffen ligger i `tariff.json`, separat från koden.

| Minut | Claude | Person 1 (analys) | Person 2 (presentation) | Person 3 (testledare) |
|---|---|---|---|---|
| 0–12 | Bygger validering, tarifmotor och förklaring | Läser avsnitt 1–2, äger "diagnos + risk"-delen | Lägger in avsnitt 1, 3 och 6 i Google Slides | Läser scenariokatalogen 4.2 |
| 12–18 | Kör alla 300 ansökningar och alla scenarier i 4.2 som automatiska tester | Kontrollerar att priserna ser rimliga ut | Lägger in arkitekturbilden (avsnitt 7) | Skriver egna elaka testfall till listan |
| 18–24 | Rättar det testerna hittar, ger startkommando | Övar: "varför fick 1238 sitt pris?" | Klar med presentationen | Kör programmet själv med de elaka testfallen |
| 24–30 | Finns kvar för snabba fixar | **Generalrep:** person 1 förklarar risken, person 2 presenterar, person 3 kör livetestet och läser kvittot högt | | |

**Fördelning under redovisningen:**
1. Person 2: problemet och diagnosen ("ni förlorar pengar").
2. Person 1: vad som påverkar priset och hur vi vet det.
3. Person 3: teknik och livetest. Kvittot på skärmen gör förklaringen åt er.

**Prioritet om tiden tar slut:** Rätt pris + kundtext i terminalen först, webbsidan sist.
