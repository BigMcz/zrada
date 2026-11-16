# Zrada – zadání první verze

16. 11. 2026 · vychází z [zradci-analyza.md](zradci-analyza.md)

## Cíl a pro koho

Zrada je společenská hra pro 4–10 lidí v jedné místnosti, inspirovaná hrou Městečko Palermo. Telefony v ní nahrazují kartičky s rolemi a lístečky na hlasování. Hrát ji budou účastníci vibecoding kurzu jako krátkou ukázku na 20–30 minut. Řídí ji moderátor z notebooku a sám nehraje.

Hra běží jen na místní síti (notebook a telefony na stejné Wi-Fi). Nic se nikam nenasazuje a internet není potřeba.

**Kde se toto zadání liší od [analýzy](zradci-analyza.md) nebo [návrhu designu](zradci-design.md), platí toto zadání.** Analýza počítá s nasazením na server a s celou televizní verzí hry; návrh designu popisuje i funkce pro pozdější verze. Technologie vybírá programátor, ani jeden z dokumentů je nepředepisuje.

## Pravidla v kostce

- Hráči jsou tajně rozděleni na **Věrné** a **Zrádce**. Zrádci se navzájem znají, Věrní neví, kdo je kdo.
- Hra se opakuje v kolech. Každé kolo má tři fáze:
  1. **Kulatý stůl**: všichni živí hráči hlasují, koho vyhnat. Kdo má nejvíc hlasů, odchází a jeho role se odhalí.
  2. **Noc**: Zrádci tajně vyberou jednoho Věrného, kterého „umlčí“.
  3. **Ráno**: všem se oznámí, kdo v noci zemřel.
- **Věrní vyhrají**, když nezbyde žádný Zrádce.
- **Zrádci vyhrají**, když je jich stejně nebo víc než Věrných.
- Konec hry se kontroluje po každém vyřazení, tedy po kulatém stole i po noci.

## Hlavní scénář

**Příprava (moderátor)**

1. Moderátor otevře na notebooku stránku moderátora a založí novou hru.
2. Na obrazovce se objeví QR kód a pod ním adresa pro připojení.

**Připojení (hráči)**

3. Každý hráč naskenuje QR kód telefonem. Otevře se mu stránka hry v prohlížeči.
4. Hráč zadá své jméno a potvrdí. Ocitne se v čekárně.
5. Moderátor vidí, jak mu přibývají jména připojených hráčů.

**Začátek hry**

6. Když jsou všichni připojení, moderátor zvolí počet Zrádců (aplikace sama navrhne: 1 při 4–7 hráčích, 2 při 8–10) a stiskne **Rozdat role**. Hru jde spustit už od 4 hráčů, aby šla vyzkoušet v malé skupině. Hra se 4–5 hráči ale skončí po jednom až dvou kolech, zábavná je až od 6 hráčů.
7. Aplikace náhodně rozdělí role. Každý hráč na telefonu podrží prst na kartě a uvidí svou roli. Zrádce navíc uvidí jméno spoluzrádce. Po puštění prstu role zmizí.
8. Moderátor vidí, kdo už svou roli viděl. Když ji viděli všichni, stiskne **Začít kulatý stůl**.

**Kulatý stůl**

9. Hráči spolu nahlas diskutují. Na telefonu každý vybere jednoho hráče, kterého chce vyhnat, a potvrdí. Sám sebe vybrat nemůže. Dokud moderátor hlasování neuzavře, může hráč svůj hlas změnit.
10. Moderátor vidí, kdo už hlasoval, a stiskne **Uzavřít hlasování**.
11. Hráč s nejvíce hlasy je vyhnán. Při remíze rozhodne los, žádné druhé kolo hlasování se nekoná. Kdo nehlasoval, se nepočítá. Pokud nehlasoval nikdo, nikdo není vyhnán a hra pokračuje nocí. Všem se na telefonu ukáže jméno vyhnaného a jeho role. Kdo pro koho hlasoval, se neukazuje.
12. Pokud tím hra skončila, všichni vidí výsledek. Jinak moderátor stiskne **Začít noc**.

**Noc**

13. Všichni živí hráči vidí na telefonu stejnou mřížku: jména všech živých hráčů kromě sebe.
14. Zrádci vyberou jednoho Věrného jako oběť. Na spoluzrádce klepnout jde, ale nic se nestane, takže ho nejde vybrat. Pokud jsou Zrádci dva a vyberou různé hráče, rozhodne los mezi jejich volbami.
15. Věrní mají ve stejnou chvíli na telefonu otázku „Kdo je podle tebe Zrádce?“ a také vybírají a potvrzují. Jejich tip se nikam nepočítá. Slouží jen k tomu, aby v noci ťukali do telefonu všichni a Zrádci se neprozradili.
16. Moderátor vidí jen, zda už Zrádci vybrali. Pak stiskne **Ukončit noc**. Pokud Zrádci nikoho nevybrali, oběť vybere aplikace losem mezi živými Věrnými.

**Ráno**

17. Všem se na telefonu zobrazí jméno hráče, který v noci zemřel. Oběť je vždy Věrný, protože Zrádci nemohou vybrat spoluzrádce. Oběť dostane na telefon zprávu, že vypadla ze hry.
18. Pokud tím hra skončila, všichni vidí výsledek. Jinak moderátor stiskne **Další kolo** a hra pokračuje bodem 9.

**Konec**

19. Všichni na telefonu i moderátor na notebooku vidí, kdo vyhrál, a seznam všech hráčů s jejich rolemi.
20. Moderátor může stisknout **Nová hra**.

## Obrazovky

### Telefon hráče

Na každé obrazovce je nahoře malý nápis s fází a kolem („Kulatý stůl · 2. kolo“) a dole jedno velké tlačítko pro hlavní akci.

| Obrazovka | Co je na ní | Co se dá udělat |
| --- | --- | --- |
| **Vstup** | Název hry, pole pro jméno | Zadat jméno a vstoupit. Prázdné jméno ani jméno, které už ve hře je, nejde potvrdit. |
| **Čekárna** | „Čekáme na začátek hry“, počet připojených | Nic, jen čekat |
| **Moje role** | Karta s pečetí a text „Podrž prst pro zobrazení role“. Po podržení: „Jsi Věrný“, nebo „Jsi Zrádce“ a jména spoluzrádců. | Podržet prst, role zmizí po puštění. Tlačítko „Viděl jsem svou roli“. Roli lze kdykoli znovu zobrazit malou ikonou v rohu, i během hry. |
| **Kulatý stůl** | „Koho vyženeš?“ a mřížka jmen živých hráčů (bez sebe sama) | Vybrat jméno, potvrdit tlačítkem „Vyhnat: Jméno“. Po potvrzení: „Hlas odevzdán“ a možnost hlas změnit. |
| **Výsledek hlasování** | Jméno vyhnaného a jeho role, nebo „Nikdo nebyl vyhnán“, pokud nikdo nehlasoval | Nic, čekat na moderátora |
| **Noc (Zrádce)** | „Koho tuto noc umlčíte?“ a mřížka všech živých hráčů kromě sebe. Pod mřížkou jeden řádek: „Spojenec volí: Jméno“, nebo „Tvá volba: Jméno“, když je Zrádce jen jeden. | Vybrat a potvrdit. Klepnutí na spoluzrádce nic neudělá. |
| **Noc (Věrný)** | „Kdo je podle tebe Zrádce?“ a stejná mřížka všech živých hráčů kromě sebe. Pod mřížkou na stejném místě řádek „Tvá volba: Jméno“. | Vybrat a potvrdit. Obrazovka má stejný počet jmen, stejné rozložení i stejný řádek pod mřížkou jako u Zrádce. |
| **Ráno** | „Tuto noc zemřel/a: Jméno“ | Nic, čekat na moderátora |
| **Vyřazen** | „Vypadl/a jsi ze hry“, pod tím průběžně, co se ve hře děje (fáze, kdo byl vyhnán, kdo zemřel) | Jen sledovat. Vyřazený hráč už nehlasuje. |
| **Konec hry** | Kdo vyhrál (Věrní / Zrádci) a seznam všech hráčů s rolemi | Nic |
| **Obnovuji spojení** | Nenápadný pruh nahoře, obsah zůstává | Nic, po obnovení naváže sama |

### Notebook moderátora

| Obrazovka | Co je na ní | Co se dá udělat |
| --- | --- | --- |
| **Lobby** | Velký QR kód s adresou textem, seznam připojených hráčů, volba počtu Zrádců s doporučenou hodnotou | Vyřadit hráče, který se připojil omylem. Zvolit počet Zrádců. Stisknout **Rozdat role** (aktivní od 4 hráčů). |
| **Řízení hry** | Nahoře fáze a číslo kola. Vlevo seznam hráčů s rolí (V/Z), stavem (živý / vyhnán / zemřel) a stavem akce v aktuální fázi (✔ hotovo / … čeká). Uprostřed popis, co se právě děje, a jedno velké tlačítko další akce. | Stisknout tlačítko další akce (Začít kulatý stůl → Uzavřít hlasování → Začít noc → Ukončit noc → Další kolo). Tlačítko **Skrýt role**, které zakryje role, když se moderátorovi někdo dívá na obrazovku. |
| **Konec hry** | Vítěz a všichni hráči s rolemi | **Nová hra** |

Moderátor nesmí během hry promítat svou obrazovku na projektor, protože jsou na ní vidět role. QR kód ukazuje jen v lobby, než se role rozdají.

## Data

Aplikace si po dobu hry pamatuje:

- **Hru**: aktuální fázi, číslo kola, počet Zrádců a zda a jak hra skončila.
- **Hráče**: jméno, roli, zda je živý, vyhnaný nebo zemřel, a zda už viděl svou roli.
- **Hlasy v aktuální fázi**: kdo pro koho hlasoval u kulatého stolu a koho Zrádci vybrali v noci. Po vyhodnocení se už nikde neukazují.
- **Historii kol**: kdo byl v kterém kole vyhnán a kdo zemřel, aby to šlo zobrazit vyřazeným hráčům a na konci hry.
- **Který telefon patří kterému hráči**: když hráč omylem zavře prohlížeč nebo se mu zamkne telefon, po návratu na stránku pokračuje jako stejný hráč ve stejné fázi.

Je potřeba hlídat dvě věci:

- **Utajení rolí**: telefon hráče nikdy nedostane informaci o roli někoho jiného (kromě spoluzrádců pro Zrádce a odhalených rolí vyhnaných). A to ani skrytě, tedy tak, aby se nedala najít ani při zkoumání stránky.
- Stačí jedna hra najednou. Po restartu notebooku hra nemusí přežít.

## Vzhled

- **Nálada**: noc na hradě, tajemno, svíčky. Hra se hraje často v přítmí.
- **Barvy**: téměř černé pozadí, text v barvě starého papíru (světle béžová), zlatý akcent pro tlačítka a výběr. Červená jen pro odhaleného Zrádce a zelená jen pro odhaleného Věrného, a to pouze ve veřejných výsledcích a u moderátora.
- **Písmo**: názvy a jména ozdobným patkovým písmem (jako na starém dokumentu), ostatní text jednoduchým a dobře čitelným.
- **Telefon**: jen na výšku, velká tlačítka pro palec, velké písmo, na obrazovce vždy jen jedna věc k udělání.
- **Stejný vzhled pro obě role**: Věrný a Zrádce mají na telefonu v každé fázi stejné barvy, rozložení a animace. Žádná červená obrazovka pro Zrádce. Jediné, čím se liší, je text.
- **Moderátor**: stejný tmavý styl, ale víc informací na obrazovce. Ovládání myší na notebooku.
- Telefony nevydávají žádné zvuky.

Podrobnější vizuální návrh je v [zradci-design.md](zradci-design.md). Pro první verzi z něj stačí barvy, písmo a karta s pečetí.

## První verze NEobsahuje

- Mise a poklad
- Štít proti noční vraždě
- Verbování Věrných na stranu Zrádců
- Finálové hlasování „ukončit hru / vyhnat dalšího“
- Režim duchů s body a žebříčkem pro vyřazené
- Zvláštní velkou obrazovku pro projektor, odhalování hlasů jeden po druhém, animace a zvuky
- Chat Zrádců (domlouvají se jinak, např. pohledem; při rozdílné volbě rozhodne los)
- Druhé kolo hlasování při remíze (rozhodne rovnou los)
- Zveřejnění, kdo pro koho hlasoval (ukáže se jen výsledek)
- Body za noční tip Věrných (tip se nikam nepočítá)
- Časové limity na hlasování (fáze ukončuje vždy moderátor tlačítkem)
- Fotky hráčů, jen jména
- Ruční zásahy moderátora během hry (pauza, opakování hlasování, ruční vyřazení, přihlášení na jiném telefonu)
- Víc her najednou, uložení hry po restartu, statistiky
- Nasazení na internet, přihlašování, jiné jazyky než čeština

## Hotovo, když

1. **Připojení**: 4 lidé naskenují QR kód z notebooku, zadají jméno a moderátor je do minuty vidí všechny v lobby.
2. **Utajení**: po rozdání rolí každý vidí jen svou roli a Zrádce i jméno spoluzrádce. Telefony Věrného a Zrádce vypadají v každé fázi stejně, takže to člověk dívající se přes rameno nepozná, pokud hráč zrovna nedrží prst na kartě. V noci mají Věrný i Zrádce v mřížce stejný počet jmen.
3. **Celá hra**: s 5 hráči a 1 Zrádcem jde odehrát hra od lobby až po obrazovku s vítězem. Vyhnaný i zavražděný hráč z ní správně vypadnou a nemohou dál hlasovat.
4. **Správný konec**: hra sama skončí výhrou Věrných, jakmile je vyhnán poslední Zrádce, a výhrou Zrádců, jakmile jich je stejně nebo víc než Věrných.
5. **Návrat**: když hráč během hry zavře prohlížeč a znovu otevře adresu, vrátí se jako stejný hráč do aktuální fáze.
