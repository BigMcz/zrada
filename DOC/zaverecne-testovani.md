# Závěrečné testování

Plán ruční zkoušky celé hry před ukázkou. Automatické testy (`npm test`, 292 testů) a robot (`npm run e2e`, 5 her) procházejí; tady jde o to, co stroj neověří: skutečné telefony, projektor, zvuk a lidi.

Postup: odškrtávej body. Co nefunguje, zapiš dole do **Nalezených chyb** (co jsi dělal, co se stalo, na jakém telefonu) a pošli mi to. Opravíme po jednom.

## 0. Příprava (10 min)

- [ ] Notebook na nabíječce, uspávání vypnuté
- [ ] Notebook a telefony na stejné Wi-Fi (nebo hotspot z notebooku)
- [ ] Smazat starou hru: soubor `data/zrada-stav.json` (jinak server pokračuje v poslední hře)
- [ ] `npm run dev`, v terminálu odkaz pro moderátora a adresa pro hráče
- [ ] Velká obrazovka: druhé okno nebo projektor s `http://localhost:3000/obrazovka`, kliknout **Zahájit**
- [ ] Telefony: aspoň 4 různé, ideálně iPhone i Android, Safari i Chrome

## 1. Lobby a připojení

- [ ] QR kód na obrazovce i v konzoli jde naskenovat telefonem a otevře stránku hry
- [ ] Hráč zadá jméno, objeví se v konzoli i na obrazovce (zvuk sirky)
- [ ] Stejné jméno podruhé nejde
- [ ] **🤖 Přidat bota** doplní hráče „Bot 1“, „Bot 2“; **Odebrat** ho zase vyřadí
- [ ] Přepínače: minihry, veřejné hlasování, Fyzická mise, sady otázek do kvízu
- [ ] Scénář pro moderátora je vidět a jde skrýt (po obnovení stránky zůstane skrytý)

## 2. Telefony

- [ ] Displej během hry nezhasne (aspoň 2 minuty bez dotyku); kde to telefon neumí, ukáže „Nezhasínej displej“
- [ ] Při rozdání rolí, otevření hlasování, noci a startu minihry telefon krátce zavibruje (iPhone nevibruje – v pořádku)
- [ ] Role na podržení pečeti; Zrádce vidí spoluzrádce, Věrný ne
- [ ] Věrný a Zrádce vedle sebe: obrazovky vypadají stejně (přes rameno nejde poznat roli)
- [ ] Zamknout telefon / přepnout aplikaci a vrátit se: hráč je pořád ve hře

## 3. Základní kolo

- [ ] Kulatý stůl: hlasování, „Hlasovalo N z M“ na obrazovce, změna hlasu před uzavřením
- [ ] **Vynulovat hlasy** smaže hlasy a hlasuje se znovu
- [ ] Výsledek: obrazovka ukáže sloupce hlasů, vyhnaného a po pauze jeho roli (gong / akord)
- [ ] Noc: Zrádci vybírají oběť, Věrní tipují; obrazovka tmavá se svíčkou (tichý vítr)
- [ ] Ráno: oběť noci (úder bubnu), nebo „Tuto noc nikdo nezemřel“ (štít)
- [ ] Duch (vyřazený Věrný) tipuje Zrádce; body uvidí až na konci

## 4. Minihry (každou aspoň jednou, v konzoli Spustit minihru → Vybrat ručně)

Ke každé: pravidla a tajná karta, hra na telefonech, scéna na obrazovce, výsledek, stopa, předání štítu.

- [ ] **Tajná aukce** – nabídky, odhalování karet od nejnižší
- [ ] **Rozdělit, nebo ukrást** – duelisté, sázky, karty se otočí současně
- [ ] **Předej bombu** – posílání bomby ťuknutím, ručička tlaku, výbuch; obrazovka bez ručičky
- [ ] **Insider kvíz** – svíčka u Zrádce na správné odpovědi, u Věrného náhodně; otázky čitelné
- [ ] **Trezor** – volba zámečníka, nápovědy, klávesnice, „N z 4“
- [ ] **Rytmus** – ťukání do prstence na **různých telefonech**: sedí přesnost s pocitem? kalibrace v konzoli v desítkách ms? rušička před 2. kolem
- [ ] **Zneškodni bombu** – pyrotechnik vidí bombu, ostatní stránky manuálu; čitelnost drátů a symbolů na malém displeji; chyba zrychlí odpočet
- [ ] **Fyzická mise** – zadání, zápis výsledku, stopa
- [ ] Boti v minihrách hrají sami (kvíz, trezor, bomba, Předej bombu)

## 5. Velká obrazovka a zvuk

- [ ] Čitelnost z druhého konce místnosti (6 m): jména, poklad, odpočty, otázky kvízu
- [ ] Zvuky: sirka, zvon, karta, gong, akord, buben, mince, noční vítr – znějí přijatelně, nejsou moc hlasité
- [ ] **🔊 Ztlumit obrazovku** v konzoli zvuk vypne a zase zapne
- [ ] Obrazovka nikdy neukáže nic tajného (role živých, svíčku, ručičku tlaku, bombu, kód trezoru)
- [ ] Veřejné hlasování (zapnout v lobby nové hry): karty „Petra hlasuje pro Marka“ jedna po druhé

## 6. Spolehlivost

- [ ] **⏸ Pauza** během minihry: odpočet stojí, telefony i obrazovka ukazují Pauzu, po **Pokračovat** běží dál
- [ ] **Restart serveru** uprostřed hry (Ctrl+C a znovu `npm run dev`): hra pokračuje, konzole i telefony se připojí samy
- [ ] **Nový telefon** u hráče: QR kód, hráč se přihlásí na jiném telefonu, starý přestane platit
- [ ] **Vyřadit** hráče, který odešel: role zůstane tajná, stane se duchem
- [ ] Odpojení pyrotechnika / zámečníka / držitele bomby (zhasnout telefon): hra si poradí

## 7. Konec večera

- [ ] Při 4 a méně živých nabídne konzole ráno **Spustit finále**
- [ ] Finále: dvě karty Ukončit / Vyhnat dalšího; ukončí jen jednomyslné rozhodnutí
- [ ] Konec: odkrytí rolí jedna po druhé, vítěz, každý vítěz získává podíl z pokladu
- [ ] Rekapitulace: časová osa kol a ceny (Detektiv, Mistr klamu, Nejpodezřelejší Věrný) na obrazovce i telefonech
- [ ] **Nová hra** vrátí všechny do lobby

## 8. Celý večer naživo (6–8 lidí, ~1 hodina)

- [ ] Odehrát celou hru se skutečnými lidmi a minihrami, s promítanou obrazovkou
- [ ] Každá minihra aspoň jednou bez zaseknutí
- [ ] Zeptat se hráčů: co bylo matoucí, co se špatně četlo, co bylo nejzábavnější

## Nalezené chyby

| # | Kde (oblast, telefon) | Co jsem dělal | Co se stalo | Co jsem čekal |
| --- | --- | --- | --- | --- |
| 1 | | | | |
