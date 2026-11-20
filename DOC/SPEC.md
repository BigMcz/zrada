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

- Mise a poklad – poklad doplněn v části [Rozšíření 2: Minihry](#rozšíření-2-minihry)
- Štít proti noční vraždě – doplněn v části [Rozšíření 2: Minihry](#rozšíření-2-minihry)
- Verbování Věrných na stranu Zrádců
- Finálové hlasování „ukončit hru / vyhnat dalšího“
- ~~Režim duchů s body a žebříčkem pro vyřazené~~ – doplněno v části [Rozšíření 1: Duchové](#rozšíření-1-duchové)
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

---

## Rozšíření 1: Duchové

19. 11. 2026 · doplněno po první verzi · dílčí cíle a pořadí vývoje viz [Kroky vývoje](#kroky-vývoje)

### Cíl

Vyřazení hráči se u stolu nemají nudit. Kdo vypadne, stane se **duchem**: dál sleduje hru a v každém kole tipuje, kdo je Zrádce. Za správné tipy sbírá body a na konci hry se vyhlásí žebříček duchů.

### Pravidla

- **Kdo je duch:** každý vyhnaný nebo v noci umlčený Věrný. Duch nehlasuje u kulatého stolu a v noci nevybírá oběť.
- **Vyhnaný Zrádce netipuje.** Zná spoluzrádce, takže by tipoval vždy správně. Jeho role je po vyhnání veřejná, takže to, že netipuje, nic neprozradí. Je to duch bez tipování: jen sleduje hru.
- **Tip:** duch v každém kole jednou vybere živého hráče, o kterém si myslí, že je Zrádce. Tipovat může od začátku kulatého stolu do konce noci a do té doby tip změnit. Ráno se tipovat nedá.
- Kdo vypadl u kulatého stolu, tipuje už v noci téhož kola. Kdo vypadl v noci, tipuje od dalšího kola.
- **Body:** 1 bod za každý tip, který ukázal na skutečného Zrádce. Za špatný nebo žádný tip se nic neodečítá. Tip se vyhodnotí podle role tipovaného hráče, i když ten hráč později v tomtéž kole vypadne.
- Body za kolo se připíšou na konci noci. Když hra skončí dřív (u kulatého stolu), připíšou se při konci hry.

### Utajení

- **Duch se do konce hry nedozví, jestli tipoval správně.** Body za tipy uvidí až na konci hry. Kdyby je viděl hned, poznal by z nich Zrádce a mohl by to ostatním prozradit, protože sedí ve stejné místnosti.
- Duch nevidí nic, co by neviděli všichni ostatní: žádné cizí role ani tipy ostatních duchů.
- **Moderátor vidí vše:** u každého ducha jeho aktuální tip (koho tipuje) a průběžný žebříček duchů s body, po celou dobu hry.
- Živí hráči tipy duchů nevidí. Žebříček duchů uvidí všichni až na konci hry.

### Body hráčů

Body za tipy duchů jsou **první druh osobních bodů hráče**. Minihry (viz [minihry-analyza.md](minihry-analyza.md)) budou později přidávat a ubírat další body a některé minihry je budou moci utrácet. Aplikace si proto u každého hráče pamatuje seznam připsaných bodů s důvodem (např. „tip ducha, 2. kolo“) a u každé položky, jestli je vidět hned, nebo až na konci hry. Body za tipy duchů jsou vždy „až na konci hry“.

### Obrazovky

**Telefon ducha** (nahrazuje obrazovku „Vypadl/a jsi ze hry“):

| Kdy | Co je na obrazovce | Co se dá udělat |
| --- | --- | --- |
| Kulatý stůl, výsledek hlasování a noc | Nahoře štítek „Duch“ a fáze. „Kdo je podle tebe Zrádce?“, mřížka živých hráčů, řádek „Tvůj tip v tomto kole: Jméno“ a „Odevzdané tipy: 3“. | Vybrat hráče a potvrdit tlačítkem „Tipnout: Jméno“. Tip jde změnit do konce noci. |
| Ráno | Kdo v noci zemřel a „Další tip můžeš dát od kulatého stolu.“ | Nic |
| Kdykoli | Seznam hráčů se stavy jako dosud | Nic |
| Vyhnaný Zrádce | „Jsi duch. Jako Zrádce netipuješ, jen sleduješ hru.“ a seznam hráčů | Nic |

Duch má vlastní, chladnější barvu (vybledlá modrá místo zlaté), aby bylo na první pohled jasné, že už nehraje. Duchové jsou veřejně známí, takže to nic neprozrazuje.

**Konzole moderátora** – nový panel **Duchové** pod seznamem hráčů:

- žebříček duchů seřazený podle bodů (pořadí, jméno, body),
- u každého ducha aktuální tip v tomto kole (jméno, nebo „… zatím netipoval“) a značka, zda míří na Zrádce,
- vyhnaný Zrádce je v panelu uvedený s poznámkou „netipuje“.

**Konec hry** (telefony všech i konzole): pod vítězem a seznamem rolí **žebříček duchů** s body. Pokud ve hře žádný duch nebyl, žebříček se nezobrazí.

### Data navíc

- Tipy duchů v aktuálním kole: kdo tipuje koho.
- Body hráčů: seznam připsaných bodů (hráč, počet, důvod, kolo, vidět hned / až na konci).

### Rozšíření NEobsahuje

- Velkou obrazovku se žebříčkem duchů (přijde s minihrami)
- Úlohy duchů v minihrách a „vítěze mezi duchy“ po minihře (přijde s minihrami)
- Utrácení bodů a body z miniher (přijde s minihrami)
- Bonusy za sérii správných tipů a jiná složitější bodování

### Hotovo, když

1. **Duch tipuje:** hráč vyhnaný u kulatého stolu může ještě v noci téhož kola tipnout živého hráče, tip změnit a v dalším kole tipnout znovu. Ráno tipovat nejde.
2. **Utajení:** během hry duch na telefonu nevidí, jestli tipoval správně, ani žádnou cizí roli. Ověřují to automatické testy stejně jako u ostatních pohledů.
3. **Moderátor:** v konzoli po celou hru vidí, koho každý duch tipuje, a průběžný žebříček duchů s body.
4. **Konec hry:** všichni vidí žebříček duchů se správně sečtenými body (1 bod za každé kolo, ve kterém duch tipoval Zrádce).
5. **Vyhnaný Zrádce** netipuje a v žebříčku nemá body.

### Kroky vývoje

| Krok | Obsah | Ověření |
| --- | --- | --- |
| A | Pravidla duchů a body na serveru, pohledy pro hráče a moderátora, testy včetně utajení | Testy prochází |
| B | Obrazovka ducha na telefonu | Ve hře v prohlížeči jde tipovat jako duch |
| C | Panel Duchové v konzoli a žebříček na konci hry | Moderátor vidí tipy a body, na konci všichni vidí žebříček |

---

## Rozšíření 2: Minihry

20. 11. 2026 · vychází z [minihry-analyza.md](minihry-analyza.md); kde se toto zadání od analýzy liší, platí toto zadání

### Cíl

Každý herní den může začít **minihrou na telefonech**, ve které živí hráči soutěží o **štít** proti noční vraždě a mění společný **poklad**. Zrádci mají v každé minihře veřejně známou výhodu nebo motiv a po minihře zůstane **stopa**, o které se pak mluví u kulatého stolu. První dávka obsahuje rámec a dvě minihry, **Tajnou aukci** a **Rozdělit, nebo ukrást**. Další minihry z analýzy přibudou později po jedné.

### Průběh dne s minihrou

1. Po rozdání rolí a každé ráno má moderátor dvě stejně velká tlačítka: **Spustit minihru** a **Přeskočit minihru**. Přeskočení vede rovnou ke kulatému stolu.
2. **Los:** aplikace vylosuje minihru, která v této hře ještě nebyla. Když už se hrály všechny, smí se opakovat kromě té ze včerejška. Moderátor může jednou za den **přelosovat** nebo minihru **vybrat ručně** a pak los **potvrdí**.
3. **Pravidla:** telefony ukážou název, pravidla, veřejné pravidlo o Zrádcích a **tajnou kartu** na podržení prstu. Kartu má každý živý hráč, Zrádce na ní najde svou výhodu a Věrný neutrální text se stejným počtem řádků. Moderátor vidí, kdo kartu viděl, a stiskne **Spustit**.
4. **Hra:** podle minihry. Časovače běží na serveru a moderátor může každou část ukončit dřív.
5. **Výsledek:** všichni vidí, kdo vyhrál (nebo že nikdo), změnu pokladu a **vítěze mezi duchy**.
6. **Stopa:** moderátor ji ukáže tlačítkem. Jsou to veřejná data z minihry (např. kdo kolik přihodil). Stopy dřívějších dní si hráč může kdykoli znovu otevřít.
7. **Předání štítu** (jen když štít někdo vyhrál): vítěz má 20 s, aby si štít tajně ponechal, nebo ho daroval jinému živému hráči. Ostatní živí hráči vidí ve stejné chvíli obrazovku stejného tvaru („Komu bys štít svěřil ty?“) a jejich volba se nikam nepočítá.
8. Moderátor stiskne **Začít kulatý stůl** a den pokračuje jako dosud.

Moderátor může kdykoli během minihry stisknout **Přeskočit minihru**: žádný štít, poklad beze změny, žádné body a minihra se nepočítá jako odehraná.

### Štít

- Za den nejvýš jeden štít. Platí jen pro noc téhož kola, ráno zmizí.
- Když Zrádci v noci vyberou hráče se štítem, **nikdo nezemře**. Ráno všichni uvidí „Tuto noc nikdo nezemřel“. Zrádci se nedozví víc než ostatní.
- Kdo štít drží, uvidí to jen na podržení pečeti v rohu („Tuto noc tě chrání štít“). Ostatní na stejném místě uvidí „Štít drží někdo jiný“, nebo „Dnes štít nikdo nemá“.
- Moderátor vidí u držitele štítu ikonu 🛡.

### Poklad

- Hra začíná s pokladem **1000 bodů**. Minihry ho zvyšují i snižují, nikdy neklesne pod 0.
- Poklad je vidět v hlavičce telefonu a v konzoli moderátora.
- Na konci hry: „Vítězové si dělí poklad: 1 750 bodů“.

### Osobní body hráčů

Navazuje na osobní body z Rozšíření 1.

- **Vítěz minihry** (kdo štít vyhrál, ještě před předáním) dostane **+2 body**.
- **Divák, který v duelu správně vsadí**, dostane **+1 bod**.
- Duchové dostávají body za úlohy v minihrách (viz níže).
- Body z miniher jsou **vidět hned**: vyplývají jen z veřejných výsledků. Body za tipy duchů na Zrádce zůstávají skryté až do konce hry jako dosud.
- Hráč vidí své body v hlavičce telefonu. Na konci hry je pod vítězem **žebříček hráčů** (všichni hráči podle osobních bodů) a pod ním žebříček duchů jako dosud.
- Utrácení bodů v první dávce není.

### Duchové v minihrách

- Duch o štít nesoutěží, ale v každé minihře má **vlastní úlohu** (tip na výsledek). Body se počítají **jen z veřejných výsledků**, nikdy ne z toho, kdo je Zrádce.
- Ve výsledku minihry se všem ukáže **vítěz mezi duchy** („Mezi duchy vyhrála Anna, +3 body“). Při shodě všichni nejlepší. Bez duchů se tento řádek nezobrazí.
- Vyhnaný Zrádce v minihrách netipuje, stejně jako u tipů na Zrádce.

### Tajná aukce

Podrobně v analýze, kapitola 4. Shrnutí:

- Každý živý hráč tajně přihodí **0–10 žetonů** na štít. 1 žeton = 50 bodů pokladu. Podmínka: poklad aspoň 200.
- **Domluva 60 s** (nahlas), pak **přihazování 30 s** (posuvník, nabídku jde do konce měnit, kdo nepotvrdí, přihodil 0).
- **Odhalení:** moderátor odhaluje nabídky jednu po druhé od nejnižší po nejvyšší.
- **Štít** získá jediná nejvyšší nabídka; při remíze na vrcholu nikdo. **Poklad** se sníží o součet nabídek × 50.
- Tajná karta: Věrný „Každý žeton stojí poklad 50 bodů. Šetři.“ / Zrádce „Každý žeton stojí poklad 50 bodů. Čím víc, tím líp, ale nebuď nápadný.“
- **Stopa:** tabulka hráč → nabídka (od nejvyšší), součet a o kolik se snížil poklad.
- **Duchové** během přihazování tipují součet všech nabídek. Nejbližší tip 3 body (při shodě všichni nejbližší), tip vzdálený nejvýš 3 žetony 1 bod.

### Rozdělit, nebo ukrást

Podrobně v analýze, kapitola 7. Shrnutí:

- Los dvou **duelistů** mezi živými (kdo už v této hře duelistou byl, má nižší šanci).
- **Domluva 60 s** (nahlas tváří v tvář), pak **volba 10 s**: duelisté tajně zvolí **Rozdělit**, nebo **Ukrást** (kdo nezvolí, rozděluje). Ostatní živí hráči ve stejných 10 s **sázejí**: „Oba rozdělí“, „Jeden ukradne“, „Oba ukradnou“.
- **Odhalení** spustí moderátor, obě volby se otočí současně.

| Duelista A | Duelista B | Štít | Poklad |
| --- | --- | --- | --- |
| Rozdělit | Rozdělit | nikdo | +300 |
| Ukrást | Rozdělit | A | 0 |
| Rozdělit | Ukrást | B | 0 |
| Ukrást | Ukrást | nikdo | −200 |

- Za každou správnou sázku diváka jde do pokladu +20 a divák dostane +1 osobní bod.
- Tajná karta: Věrný „Rozdělit pomáhá všem. Ukrást pomáhá jen tobě.“ / Zrádce „Rozdělit pomáhá Věrným. Ukrást rozbíjí důvěru.“
- **Stopa:** volby obou duelistů a sázky diváků se jmény.
- **Duchové** sázejí přesněji: oba rozdělí / ukradne A / ukradne B / oba ukradnou. Přesná sázka 3 body, správně „někdo ukradl“, ale špatný duelista, 1 bod. Do pokladu nepřidávají.

### Utajení

Platí vše dosavadní a navíc:

- Pohled minihry má pro Věrného i Zrádce **stejná pole**, výhoda Zrádců je jen jiná hodnota (u první dávky jen text tajné karty).
- Do telefonu nejde nic, co se hráč nemá dozvědět předem (cizí nabídky před odhalením, volby duelistů před odhalením, kdo drží štít).
- Kdo komu daroval štít, nevidí nikdo kromě dárce a moderátora.
- Telefony nesmí ani v minihře vydávat zvuk ani dávat herní informaci vibrací.

### Obrazovky navíc

**Telefon:** v hlavičce poklad a moje body. Pro každý krok minihry obrazovka podle analýzy (los, pravidla s tajnou kartou, hra, výsledek, stopa, předání štítu, „Za chvíli začne kulatý stůl“). Ikona **Stopy** v hlavičce otevře stopy všech dosavadních dní.

**Konzole moderátora:** tlačítka Spustit / Přeskočit minihru, při losu Přelosovat / Vybrat ručně / Potvrdit, v každém kroku jedno hlavní tlačítko dalšího kroku. Během hry vidí moderátor všechny skryté údaje (nabídky, volby, sázky, tipy duchů, komu byl štít darován). V seznamu hráčů ikona 🛡 u držitele štítu. V lobby přepínač **Minihry zapnuté / vypnuté**.

### Data navíc

- Poklad, držitel štítu pro aktuální noc, odehrané minihry této hry.
- Probíhající minihra: která, v jakém kroku, její vlastní stav, kdo viděl tajnou kartu, výsledek a předání štítu.
- U každého kola: jaká minihra se hrála, shrnutí, stopa, změna pokladu, vítězové mezi duchy a zda štít někoho zachránil.
- Nastavení: minihry zapnuté / vypnuté.

### Rozšíření NEobsahuje

- Velkou obrazovku pro projektor a její scény
- Minihry Trezor, Zneškodni bombu, Rytmus a Fyzickou misi (přijdou později po jedné; Horký brambor je v Rozšíření 3, Insider kvíz v Rozšíření 4, Trezor v Rozšíření 5)
- Utrácení osobních bodů
- Veřejný režim štítu (jen tajné předání)
- Podrobné nastavení (osudí, délky časovačů, počáteční poklad); používají se výchozí hodnoty
- Nižší váhu losu pro minihry z předchozí hry

### Hotovo, když

1. **Řízení dne:** moderátor po rozdání rolí i každé ráno zvolí Spustit, nebo Přeskočit minihru. Při vypnutých minihrách běží hra přesně jako dosud.
2. **Tajná aukce** jde v 5 kartách prohlížeče odehrát od losu po kulatý stůl. Štít, poklad i stopa odpovídají pravidlům.
3. **Rozdělit, nebo ukrást** jde odehrát stejně, včetně všech čtyř výsledků (ověřeno testy) a sázek.
4. **Štít funguje:** když Zrádci vyberou hráče se štítem, nikdo nezemře a ráno to všichni uvidí. Kdo štít drží, ví jen on a moderátor.
5. **Utajení:** automatické testy ověří, že telefony Věrného a Zrádce mají v každém kroku minihry pohled stejného tvaru a že do telefonu nepřijdou cizí nabídky, volby ani držitel štítu dřív, než mají.
6. **Body:** vítěz minihry, správně sázející diváci a duchové dostanou body podle pravidel a na konci hry je vidí všichni v žebříčcích.

### Kroky vývoje

| Krok | Obsah | Ověření |
| --- | --- | --- |
| M1 | Rámec miniher na serveru: fáze Minihra, kroky od losu po předání štítu, časovače, tajná karta, stopa, historie, los a přeskočení. Testovací minihra jen pro testy. | Testy prochází |
| M2 | Štít v noci, poklad a osobní body z miniher na serveru | Testy prochází |
| M3 | Tajná aukce na serveru a kostra miniher v klientovi (telefon i konzole) | Aukce jde odehrát v 5 kartách prohlížeče |
| M4 | Rozdělit, nebo ukrást | Duel jde odehrát v 5 kartách prohlížeče |
| M5 | Duchové v minihrách, vítěz mezi duchy, žebříček hráčů a poklad na konci hry | Duch tipuje v obou minihrách, na konci jsou žebříčky |
| M6 | Úpravy README a zkouška naživo | Celá hra s minihrami na telefonech |

## Rozšíření 3: Horký brambor

Třetí minihra do osudí. Podrobně v [analýze miniher](minihry-analyza.md), kapitola 5. Rámec miniher (los, tajná karta, stopa, předání štítu, poklad, body) zůstává beze změny.

### Cíl

Rychlá a hlučná minihra, kde se bomba posílá z telefonu na telefon. Zrádci vidí, kdy se blíží výbuch, a proto skoro nikdy nebouchnou. Právě to je stopa.

### Pravidla

- Hrají všichni živí hráči, podmínka **aspoň 3 živí**.
- Bomba se objeví u **náhodného** hráče, který je v minihře. Kdo ji drží, ťukne na jméno v mřížce a bomba přeletí k němu.
- Bombu **nejde poslat zpět** tomu, od koho přišla. Když v minihře zbývají jen dva hráči, toto pravidlo neplatí.
- **Rozbuška** je v 1. kole náhodně 10–25 s a s každým dalším kolem se zkracuje, nejméně na 6–12 s. Délku zná jen server.
- U koho bomba bouchne, ten **vypadává z minihry** (ne ze hry) a dál jen sleduje. Po pauze 3 s začne další kolo u náhodného zbývajícího hráče.
- **Poslední přeživší získá štít** a +2 osobní body. **Poklad se nemění.**
- Když se odpojí ten, kdo drží bombu, po 3 s bomba sama přeskočí k náhodnému připojenému hráči v minihře. Rozbuška běží dál.

### Výhoda Zrádců: ručička tlaku

- Všichni živí hráči vidí **stejnou bombu s ručičkou tlaku** (hodnota 0–1), i když bombu zrovna nedrží.
- Zrádcům ručička ukazuje **skutečný** zbývající čas, posledních 5 s je v červeném poli. Věrným ručička **náhodně kmitá** v celém rozsahu, takže občas ukáže červenou, i když nehrozí.
- Kmitání počítá server. Telefon Věrného i Zrádce dostane stejné pole a přes rameno nejde poznat, čí ručička je pravá.
- Pravidlo je veřejné: „Zrádcům ukazuje ručička tlaku skutečný čas do výbuchu. Ostatním jen náhodně kmitá.“
- Tajná karta: Věrný „Tvoje ručička tlaku lže. Spoléhej na štěstí.“ / Zrádce „Tvoje ručička tlaku je pravá. Červené pole = zbývá méně než 5 s.“

### Stopa

- Pořadí vyřazení („1. Jana, 2. Karel, …“).
- Tabulka hráč → **kolikrát se bomby zbavil v posledních 3 s před výbuchem** a **průměrná doba držení**.

### Duchové

- Před první bombou tipují **posledního přeživšího** a **prvního, u koho bouchne**.
- Správný poslední přeživší 3 body, správný první vyřazený 1 bod.
- Ručičku tlaku nemají, vidí jen, kdo bombu drží.

### Utajení

Platí vše z Rozšíření 2 a navíc:

- Čas výbuchu ani délka rozbušky nejdou do žádného telefonu. Do pohledu jde jen `pressure`.
- Pohled Věrného i Zrádce má v každém okamžiku stejná pole, liší se jen hodnota `pressure`.

### Obrazovky

- **Telefon s bombou:** velká bomba, ručička tlaku, pod ní mřížka jmen a výzva „Pošli ji dál!“.
- **Telefon bez bomby:** stejné rozložení, bomba malá a šedá, nahoře „Bombu má: Karel“, mřížka neaktivní, ručička tlaku zůstává.
- **Vyřazený z minihry:** „Bouchlo to u tebe“, dál vidí, kdo bombu drží.
- **Duch:** tipy před první bombou, pak jen kdo drží bombu a kdo vypadl.
- **Konzole moderátora:** kdo drží bombu, skutečný čas do výbuchu, pořadí vyřazených, tipy duchů.

### Rozšíření NEobsahuje

- Velkou obrazovku s animací výbuchu
- Zvuk tikání a vibrace (telefony dál nesmí vydávat zvuk)
- Nastavení délky rozbušky

### Hotovo, když

1. Horký brambor se losuje s ostatními minihrami a jde odehrát v 5 kartách prohlížeče od losu po kulatý stůl.
2. Bomba nejde poslat zpět odesílateli (kromě souboje dvou), vyřazení, pauza, kratší rozbuška a štít pro posledního přeživšího odpovídají pravidlům (ověřeno testy).
3. **Utajení:** testy ověří, že pohled Věrného a Zrádce má stejný tvar, Zrádce dostává skutečný tlak a do telefonu nejde čas výbuchu.
4. Odpojený držitel: bomba po 3 s přeskočí (ověřeno testem).
5. Duchové tipují a dostanou body podle pravidel, stopa ukazuje pořadí, zbavení na poslední chvíli a průměrnou dobu držení.
6. Robot `npm run e2e` odehraje hry i s Horkým bramborem bez chyby.

### Kroky vývoje

| Krok | Obsah | Ověření |
| --- | --- | --- |
| H1 | Pravidla Horkého bramboru na serveru a testy, včetně utajení ručičky tlaku a odpojeného držitele | Testy prochází |
| H2 | Obrazovky na telefonu (bomba, mřížka jmen, ručička tlaku), u ducha a v konzoli, rozšíření robota `npm run e2e` | Horký brambor jde odehrát v 5 kartách prohlížeče, robot prochází |

## Rozšíření 4: Insider kvíz

Čtvrtá minihra do osudí. Podrobně v [analýze miniher](minihry-analyza.md), kapitola 6. Rámec miniher zůstává beze změny.

### Cíl

Krátký kvíz, kde Zrádci mají nápovědu se správnou odpovědí. Kdo odpovídá rychle hned po nápovědě a skoro vždy správně, je podezřelý.

### Pravidla

- Hrají všichni živí hráči, podmínka **aspoň 3 živí**.
- **7 otázek**, každá se **4 možnostmi** a časem **15 s**.
- Po **3 s** se u jedné možnosti rozsvítí **svíčka** (nápověda).
- Hráč ťukne na odpověď. **Odpověď nejde změnit.**
- Otázka skončí po 15 s, nebo dřív, když odpoví všichni připojení živí hráči.
- Po otázce se na **4 s** ukáže správná odpověď a průběžné pořadí. Pak sama naskočí další otázka. Moderátor může mezikrok zkrátit tlačítkem **Další otázka**.
- **Body kvízu:** správně 100 + bonus za rychlost až 50 (lineárně, 50 při okamžité odpovědi, 0 na konci času). Špatně nebo bez odpovědi 0. Body kvízu nejsou osobní body.

### Výhoda Zrádců: svíčka

- Zrádcům svíčka ukazuje **správnou** odpověď, Věrným **náhodnou** (může být i správná).
- Svíčka se objeví u všech ve stejnou chvíli a pole nápovědy má každý telefon. Přes rameno nejde poznat, čí svíčka je pravá.
- Pravidlo je veřejné: „Nápověda ukazuje Zrádcům správnou odpověď. Věrným ukazuje náhodnou.“
- Tajná karta: Věrný „Tvoje nápověda je náhodná.“ / „Spoléhej na sebe.“; Zrádce „Tvoje nápověda je vždy správná.“ / „Nebuď ale až moc dobrý.“

### Vyhodnocení

| | |
| --- | --- |
| Štít | nejvíc bodů kvízu; při shodě menší součet časů odpovědí; při úplné shodě nikdo |
| Poklad | +300 × podíl správných odpovědí všech hráčů, zaokrouhleno na desítky |
| Osobní body | vítěz +2 (jako u ostatních miniher) |

### Otázky

- Jedna obecná sada asi **60 českých otázek** v `server/minigames/quiz/questions/obecne.cs.json` ve formátu z analýzy (sada nemá v sobě nic o rolích ani nápovědách).
- Otázky se v jedné hře neopakují.

### Stopa

- Konečné pořadí s body kvízu.
- Tabulka hráč → **kolikrát odpověděl do 1,5 s po rozsvícení svíčky a kolikrát z toho správně**.

### Duchové

- Hrají **stejný kvíz mimo soutěž**, se stejnými otázkami a body za rychlost, **bez svíčky**.
- Mají vlastní pořadí, které se do pořadí o štít nepočítá.
- Nejlepší duch 3 body, druhý 2, třetí 1 (při shodě bodů kvízu stejné místo).

### Utajení

Platí vše z Rozšíření 2 a navíc:

- Správná odpověď nejde do žádného telefonu, dokud otázka neskončí.
- Nápověda jde do telefonu až po 3 s. Pohled Věrného i Zrádce má v každém okamžiku stejná pole.
- Duch nápovědu nedostává vůbec.

### Obrazovky

- **Telefon:** otázka nahoře, čtyři velké dlaždice odpovědí pod sebou, malá svíčka u jedné z nich, odpočet. Po odpovědi „Odpověď zamčena“. Po otázce správná odpověď a průběžné pořadí.
- **Duch:** stejný kvíz bez svíčky, vlastní pořadí duchů.
- **Konzole moderátora:** otázka, správná odpověď, kdo jak odpověděl, kde mají Věrní náhodné svíčky, průběžné pořadí, tlačítko Další otázka.

### Rozšíření NEobsahuje

- Výběr sad otázek v nastavení
- Vlastní sadu otázek zákazníka
- Otázky z lobby („Pes, nebo kočka?“)
- Neopakování otázek napříč hrami celého večera

### Hotovo, když

1. Insider kvíz se losuje s ostatními minihrami a jde odehrát v 5 kartách prohlížeče od losu po kulatý stůl.
2. Body za rychlost, konec otázky po odpovědi všech, štít, poklad a body duchů odpovídají pravidlům (ověřeno testy).
3. **Utajení:** testy ověří, že telefon nedostane správnou odpověď před koncem otázky ani nápovědu před 3 s, že Věrný a Zrádce mají stejný tvar pohledu a že Zrádce má svíčku u správné odpovědi.
4. Banka otázek má aspoň 60 platných otázek (ověřeno testem) a v jedné hře se neopakují.
5. Robot `npm run e2e` odehraje hry i s kvízem bez chyby.

### Kroky vývoje

| Krok | Obsah | Ověření |
| --- | --- | --- |
| Q1 | Pravidla kvízu na serveru, banka otázek a testy, včetně utajení odpovědi a nápovědy | Testy prochází |
| Q2 | Obrazovky telefonu, ducha a konzole, zařazení do osudí, rozšíření robota `npm run e2e` | Kvíz jde odehrát v 5 kartách prohlížeče, robot prochází |

## Rozšíření 5: Trezor

Pátá minihra do osudí. Podrobně v [analýze miniher](minihry-analyza.md), kapitola 1. Rámec miniher zůstává beze změny.

### Cíl

Skupina skládá kód trezoru z nápověd na telefonech. Zrádci mají jednu nápovědu falešnou. Kdo kód otevře, získá štít. Stopa ukáže, čí nápovědy pro skutečný kód neplatily.

### Pravidla

- Hrají všichni živí hráči, podmínka **aspoň 4 živí**.
- Kód má **4 číslice** (0–9, mohou se opakovat). Při **4 živých** má kód jen **3 číslice**.
- **Rozdání nápověd:** server vygeneruje kód a nápovědy hned na začátku minihry a rozdá je dokola všem živým hráčům, každý má **1–3 nápovědy**. Nápověd je tolik, aby:
  - pravdivé nápovědy dohromady vedly na **jediný** kód (ověřeno hrubou silou přes všechny kombinace),
  - ke každé číslici mířily aspoň **dvě nápovědy od různých hráčů**.
- **Volba zámečníka (20 s):** živí hlasují na telefonu, kdo bude zámečník. Sám sebe volit nejde. Nejvíc hlasů vyhrává, remízu rozhodne los. Když nikdo nehlasuje, losuje se ze všech živých. Moderátor může volbu ukončit dřív.
- Zámečník **si nápovědy ponechá** a navíc dostane klávesnici.
- **Luštění (3 min):** hráči čtou nápovědy nahlas. Zámečník zadá kód a zmáčkne **Otevřít trezor**. Má **3 pokusy**. Po každém pokusu všichni vidí zadaný kód a **počet číslic na správném místě** („2 ze 4“).
- Minihra skončí otevřením trezoru, vyčerpáním pokusů, vypršením času, nebo když ji moderátor ukončí.
- **Zámečník se odpojí:** čas běží dál. Po 20 s odpojení nabídne konzole **Přidělit zámečníka znovu** (los mezi ostatními živými). Nový zámečník si nápovědy ponechá a pokračuje se zbývajícími pokusy.

### Typy nápověd

| Typ | Příklad |
| --- | --- |
| Parita | „1. číslice je sudá.“ |
| Rozsah | „3. číslice je větší než 5.“ |
| Vyloučení | „2. číslice není 1, 4 ani 7.“ |
| Vztah dvou číslic | „4. číslice je o 2 menší než 1.“ |
| Součet | „Součet 2. a 3. číslice je 11.“ |
| Přesná hodnota (nejvýš 1 na kód) | „3. číslice je 8.“ |

### Výhoda a nevýhoda Zrádců: falešná nápověda

- Každý Zrádce má na telefonu **jednu falešnou nápovědu**, ostatní jeho nápovědy jsou pravé. Falešná má stejný typ a číslice jako pravá, jen jinou hodnotu, a pro skutečný kód **neplatí**.
- Dva Zrádci mají falešné nápovědy pokud možno u různých číslic.
- Na telefonu vypadá falešná nápověda stejně jako pravá.
- Pravidlo je veřejné: „Zrádci mají na telefonu falešnou nápovědu.“
- Tajná karta: Věrný „Tvoje nápovědy jsou pravdivé.“ / „Ostatním věř opatrně.“; Zrádce „Jedna tvoje nápověda je falešná.“ / „Pravá zní: ‚…‘“.

### Vyhodnocení

| Výsledek | Štít | Poklad |
| --- | --- | --- |
| Otevřeno na 1. pokus | zámečník | +300 |
| Otevřeno na 2. pokus | zámečník | +200 |
| Otevřeno na 3. pokus | zámečník | +100 |
| Neotevřeno | nikdo | 0 |

Osobní body: zámečník, který otevře, +2 (jako u ostatních miniher).

### Stopa

- Skutečný kód a všechny pokusy zámečníka s výsledkem.
- Tabulka **hráč → jeho nápovědy tak, jak je měl na telefonu**. Stopa neříká, které jsou falešné.
- Věta „Z pravdivých nápověd šlo kód složit jednoznačně.“

### Duchové

- Tipují výsledek: **1. pokus / 2. pokus / 3. pokus / neotevře se**. Tip jde podat během volby zámečníka a luštění až do prvního pokusu.
- Přesný tip **3 body**, tip o jeden pokus vedle **1 bod** („neotevře se“ se počítá jako 4. pokus).
- Nápovědy hráčů nevidí. Vidí zámečníka, odpočet a pokusy.

### Utajení

Platí vše z Rozšíření 2 a navíc:

- Kód nejde do žádného telefonu, dokud minihra neskončí.
- Každý telefon dostane jen **své** nápovědy, nikdy cizí. Nikde v pohledu hráče není poznačeno, která nápověda je falešná.
- Pohled Věrného i Zrádce má stejná pole.
- Duch nápovědy nedostává vůbec.

### Obrazovky

- **Telefon hráče:** při volbě mřížka jmen pro hlas, pak karta s nápovědami, odpočet, zámečník, počet zbývajících pokusů a historie pokusů.
- **Telefon zámečníka:** navíc čtyři (tři) okénka, číselník 0–9 s mazáním a tlačítko **Otevřít trezor**.
- **Duch:** tlačítka tipu, zámečník, odpočet, pokusy.
- **Konzole moderátora:** kód, nápovědy všech hráčů s označením falešných, hlasy, pokusy, tlačítka Ukončit volbu, Ukončit trezor a Přidělit zámečníka znovu (po 20 s odpojení).

### Rozšíření NEobsahuje

- Velkou obrazovku s animací zámku (přijde se scénami na velkou obrazovku)
- Odebrání nápověd zámečníkovi
- Pozastavení času při odpojení zámečníka

### Hotovo, když

1. Trezor se losuje s ostatními minihrami a jde odehrát v 5 kartách prohlížeče od losu po kulatý stůl.
2. Generátor pro 3 i 4 číslice a 4–10 hráčů vždy dá nápovědy, z jejichž pravdivé části jde kód složit jednoznačně, každá číslice má aspoň dvě nápovědy od různých hráčů a falešné nápovědy pro kód neplatí (ověřeno testem na mnoha náhodných hrách).
3. Volba zámečníka, pokusy, štít, poklad, přidělení nového zámečníka a body duchů odpovídají pravidlům (ověřeno testy).
4. **Utajení:** testy ověří, že telefon nedostane kód ani cizí nápovědy, že Věrný a Zrádce mají stejný tvar pohledu a že duch nápovědy nevidí.
5. Robot `npm run e2e` odehraje hry i s Trezorem bez chyby.

### Kroky vývoje

| Krok | Obsah | Ověření |
| --- | --- | --- |
| T1 | Generátor kódu a nápověd, pravidla Trezoru na serveru a testy, včetně utajení | Testy prochází |
| T2 | Obrazovky telefonu, zámečníka, ducha a konzole, zařazení do osudí, rozšíření robota `npm run e2e` | Trezor jde odehrát v 5 kartách prohlížeče, robot prochází |
