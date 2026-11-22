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
- ~~Finálové hlasování „ukončit hru / vyhnat dalšího“~~ – doplněno v části [Rozšíření 11: Finále a konec večera](#rozšíření-11-finále-a-konec-večera)
- ~~Režim duchů s body a žebříčkem pro vyřazené~~ – doplněno v části [Rozšíření 1: Duchové](#rozšíření-1-duchové)
- ~~Zvláštní velkou obrazovku pro projektor, animace a zvuky~~ – doplněno v části [Rozšíření 9: Velká obrazovka](#rozšíření-9-velká-obrazovka); odhalování hlasů jeden po druhém zůstává mimo
- Chat Zrádců (domlouvají se jinak, např. pohledem; při rozdílné volbě rozhodne los)
- Druhé kolo hlasování při remíze (rozhodne rovnou los)
- Zveřejnění, kdo pro koho hlasoval (ukáže se jen výsledek)
- Body za noční tip Věrných (tip se nikam nepočítá)
- Časové limity na hlasování (fáze ukončuje vždy moderátor tlačítkem)
- Fotky hráčů, jen jména
- ~~Ruční zásahy moderátora během hry (pauza, opakování hlasování, ruční vyřazení, přihlášení na jiném telefonu)~~ – doplněno v části [Rozšíření 10: Spolehlivost](#rozšíření-10-spolehlivost)
- Víc her najednou, statistiky (~~uložení hry po restartu~~ – doplněno v části [Rozšíření 10: Spolehlivost](#rozšíření-10-spolehlivost))
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
- Minihry Trezor, Zneškodni bombu, Rytmus a Fyzickou misi (přijdou později po jedné; Horký brambor je v Rozšíření 3, Insider kvíz v Rozšíření 4, Trezor v Rozšíření 5, Rytmus v Rozšíření 6, Zneškodni bombu v Rozšíření 7, Fyzická mise v Rozšíření 8)
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

## Rozšíření 6: Rytmus

Šestá minihra do osudí. Podrobně v [analýze miniher](minihry-analyza.md), kapitola 3. Rámec miniher zůstává beze změny.

### Cíl

Všichni ťukají do telefonu do rytmu. Štít získá nejpřesnější hráč, poklad roste podle synchronizace skupiny. Zrádci mají rušičku, která jednomu hráči v kole 2 posune rytmus, takže pak vypadá jako sabotér.

### Pravidla

- Hrají všichni živí hráči, podmínka **aspoň 3 živí**.
- **Synchronizace hodin:** na začátku Rytmu si telefon znovu zjistí rozdíl svých hodin a hodin serveru z **10 výměn zpráv** a použije tu s nejkratší odezvou.
- **Zobrazení rytmu:** uprostřed obrazovky je kruh, ke kterému se stahuje prstenec. Doba je ve chvíli, kdy se prstenec dotkne kruhu; kruh v tu chvíli blikne. Hráč ťuká kamkoli na obrazovku. Telefony nehrají zvuk.
- **Kola:**

| Kolo | Doby | Tempo | Poznámka |
| --- | --- | --- | --- |
| Cvičné | 8 | 80 BPM | nepočítá se, slouží ke kalibraci |
| 1 | 16 | 80 BPM | |
| 2 | 16 | 100 BPM | před ním volba rušičky a ochrany |
| 3 | 16 | 120 BPM | synkopa: každá 4. doba přijde o půl doby dřív |

- Před každým kolem odpočet **3–2–1**. Po každém kole **4 s mezikrok**: telefon ukáže tvoji přesnost a synchronizaci skupiny (cizí přesnosti ne). Moderátor může mezikrok zkrátit tlačítkem **Další kolo**.
- **Volba před kolem 2 (15 s):** všichni živí vidí stejnou mřížku všech živých kromě sebe. Zrádce volí cíl rušičky, Věrný koho chrání. Nadpis mřížky je pro všechny stejný: „Vyber jednoho hráče“; co volba znamená, říká jen tajná karta (jinak by šlo roli přečíst přes rameno). U dvou Zrádců platí volba toho, kdo potvrdil později. Moderátor může volbu ukončit dřív.
- **Odeslání ťuknutí:** telefon měří čas ťuknutí v události `pointerdown` přes `performance.now()`, převede ho na čas serveru a všechna ťuknutí kola pošle najednou po jeho konci. Server na ně čeká nejvýš **2 s**. Kdo je nepošle (odpojení), má celé kolo vynechané.

### Hodnocení

- **Kalibrace:** typické zpoždění hráče = medián odchylek ťuknutí od dob ve cvičném kole, nejvýš ±150 ms (bez ťuknutí 0). V ostrých kolech se od časů ťuknutí odečítá.
- **Párování:** každá doba si vezme nejbližší ještě nepoužité ťuknutí do ±250 ms. Doba bez ťuknutí = chyba **250 ms**. Každé nespárované ťuknutí navíc přidá do průměru chybu **250 ms**.
- **Přesnost kola** = 100 − průměrná chyba / 2,5 (0–100 %). **Přesnost hráče** = průměr přesností kol 1–3.
- **Synchronizace skupiny** = průměr přesností všech živých hráčů.

### Výhoda Zrádců: rušička

- Rušička posune cíli **v kole 2** zobrazení rytmu o **150 ms** (prstenec dosedá později). Hodnocení na serveru počítá vždy se skutečnými dobami, takže cíl ťuká mimo.
- Pokud na cíl míří **aspoň jedna ochrana** Věrného, rušička nezabere.
- Pole `displayOffsetMs` má v pohledu **každý** hráč; mimo zasažený cíl v kole 2 je 0.
- Pravidlo je veřejné: „Zrádci mají rušičku. Jednomu hráči na jedno kolo posunou rytmus.“
- Tajná karta: Věrný „Před 2. kolem můžeš jednoho hráče ochránit před rušičkou.“ / „Rušička mu posune rytmus.“; Zrádce „Před 2. kolem pošlete ozvěnu: vybraný hráč bude ťukat mimo.“ / „Věrní ho mohou ochránit.“

### Vyhodnocení

| | |
| --- | --- |
| Štít | nejvyšší přesnost; při shodě menší nejhorší chyba; při úplné shodě nikdo |
| Poklad | +300 × (synchronizace − 50 %) / 50 %, zaokrouhleno na desítky; pod 50 % beze změny |
| Osobní body | vítěz +2 (jako u ostatních miniher) |

### Stopa

- Tabulka **hráč → přesnost v kolech 1 / 2 / 3**.
- Jedna věta: „Rušička zasáhla jednoho hráče.“, „Rušičku někdo zablokoval.“, nebo „Rušička nebyla použita.“ **Koho** zasáhla, stopa neříká.

### Duchové

- Hrají **celý rytmus mimo soutěž**, včetně cvičného kola s kalibrací.
- Nevolí a rušička na ně nepůsobí. Jejich přesnost se nepočítá do synchronizace ani do štítu.
- Nejpřesnější duch 3 body, druhý 2, třetí 1 (při shodě stejné místo; jen duchové, kteří ťukali).

### Utajení

Platí vše z Rozšíření 2 a navíc:

- Cíl rušičky, ochrany ani volby ostatních nejdou do žádného telefonu.
- Pohled Věrného i Zrádce má stejná pole a mřížka volby má pro oba stejný nadpis.
- Telefon nevidí cizí přesnosti, jen svou a synchronizaci skupiny.

### Obrazovky

- **Telefon:** celá obrazovka je dotyková plocha, uprostřed kruh se stahujícím se prstencem, nahoře kolo a tempo, po ťuknutí krátký záblesk na místě dotyku. Mezi koly tvoje přesnost a synchronizace skupiny. Před kolem 2 mřížka volby.
- **Duch:** stejný rytmus bez volby, mezi koly vlastní přesnost a pořadí duchů.
- **Konzole moderátora:** kolo a stav, přesnosti všech hráčů a duchů po kolech, cíl rušičky, ochrany a zda zabrala, tlačítka Ukončit volbu a Další kolo.

### Rozšíření NEobsahuje

- Zvuk a metronom
- Velkou obrazovku se synchronizací v reálném čase (přijde se scénami na velkou obrazovku)
- Ochranu proti upravenému telefonu, který pošle vymyšlené časy ťuknutí

### Hotovo, když

1. Rytmus se losuje s ostatními minihrami a jde odehrát v 5 kartách prohlížeče od losu po kulatý stůl.
2. Kalibrace, párování ťuknutí, přesnost, synchronizace, rušička a ochrana, štít, poklad a body duchů odpovídají pravidlům (ověřeno testy).
3. **Utajení:** testy ověří, že telefon nedostane cíl rušičky, ochrany ani cizí přesnosti a že Věrný a Zrádce mají stejný tvar pohledu.
4. Robot `npm run e2e` odehraje hry i s Rytmem bez chyby (bot ťuká s náhodnou chybou 20–120 ms).
5. Zkouška na skutečných telefonech (iPhone i Android) udělá uživatel; nálezy se opraví v dalším kroku.

### Kroky vývoje

| Krok | Obsah | Ověření |
| --- | --- | --- |
| R1 | Pravidla Rytmu na serveru: kola, kalibrace, hodnocení, rušička, testy včetně utajení | Testy prochází |
| R2 | Telefon s kruhem a ťukáním, synchronizace hodin, duch, konzole, zařazení do osudí, rozšíření robota `npm run e2e` | Rytmus jde odehrát v 5 kartách prohlížeče, robot prochází |

## Rozšíření 7: Zneškodni bombu

Sedmá minihra do osudí. Podrobně v [analýze miniher](minihry-analyza.md), kapitola 2. Rámec miniher zůstává beze změny. Mechanika „jeden vidí bombu, ostatní čtou manuál“ je inspirovaná hrou *Keep Talking and Nobody Explodes*; pravidla manuálu i symboly jsou vlastní.

### Cíl

Pyrotechnik vidí bombu, ostatní mají stránky manuálu a musí ho navigovat. Zrádci mají v jedné stránce falešné pravidlo. Když se bomba zneškodní, pyrotechnik získá štít.

### Pravidla

- Hrají všichni živí hráči, podmínka **aspoň 4 živí**.
- **Pyrotechnik** se vylosuje mezi živými hned na začátku minihry. Jediný vidí bombu, stránku manuálu nemá.
- **Bomba** má 2 moduly: **Dráty** a **Symboly**.
- **Manuál** má 4 stránky: *Dráty 3–4*, *Dráty 5–6*, *Symboly – sloupce 1–3*, *Symboly – sloupce 4–6*. Rozdají se dokola všem kromě pyrotechnika, každý má **1–2 stránky**. Každou stránku má aspoň jeden hráč; když je hráčů dost, aspoň dva.
- **Příprava (20 s):** navigátoři čtou stránky, duchové tipují. Moderátor může odpočet spustit dřív tlačítkem **Spustit odpočet**.
- **Odpočet 3:00.** Pyrotechnik popisuje bombu, ostatní hledají pravidla, pyrotechnik provádí akce.
- **Ovládání:** ťuknutí na drát nebo symbol ho označí, akce proběhne až tlačítkem **Přestřihnout** / **Zmáčknout**.
- **Chyba** = špatná akce. Každá chyba zrychlí zbývající čas o **10 %**. **Třetí chyba** nebo nula na odpočtu = výbuch.
- Oba moduly vyřešené = bomba zneškodněna.
- **Pyrotechnik se odpojí:** odpočet se pozastaví. Po 20 s nabídne konzole **Přidělit pyrotechnika znovu** (los mezi ostatními živými); bomba zůstane stejná, nový pyrotechnik si své stránky ponechá. Když se původní pyrotechnik vrátí dřív, odpočet běží dál.

### Modul Dráty

- 3–6 drátů, barvy červená, modrá, žlutá, bílá, černá, zelená.
- Pro každý počet drátů je v manuálu 4–5 číslovaných pravidel „Pokud …, přestřihni …“. Platí **první pravidlo, které sedí**; poslední je „Jinak …“.
- Správné je přestřihnout jeden drát. Špatně přestřižený drát zůstane přestřižený, správný drát se nemění.

### Modul Symboly

- Manuál má 6 sloupců po 7 symbolech (vlastní sada znaků).
- Bomba ukáže 4 symboly z jednoho sloupce v náhodném pořadí. Generátor zaručí, že všechny čtyři obsahuje **jen jeden sloupec**.
- Symboly se mačkají v pořadí, v jakém jsou ve sloupci shora dolů. Špatný symbol = chyba, už zmáčknuté symboly platí dál.

### Manuál jako data

- Pravidla drátů a sloupce symbolů jsou v JSON (`server/minigames/bomb/manual.cs.json`), ne v kódu.
- Řešitel z manuálu a bomby spočítá správné řešení. Generátor vytváří jen bomby, které manuál jednoznačně řeší.

### Výhoda Zrádců: falešné pravidlo

- Každý Zrádce-navigátor má v **jedné své stránce jedno pozměněné pravidlo**: u drátů jiný drát, u symbolů dva prohozené symboly ve sloupci. Pozměněné je to pravidlo (nebo sloupec), které **rozhoduje o této bombě**.
- Falešná stránka má stejné rozložení i počet pravidel jako pravá.
- Pravidlo je veřejné: „Ve stránce manuálu, kterou mají Zrádci, je jedno pravidlo falešné.“
- Tajná karta (stejný počet řádků pro všechny):
  - Věrný navigátor: „Tvoje stránky manuálu jsou pravé.“ / „Pozor na rozpory.“
  - Zrádce navigátor: „Ve stránce *…* je falešné pravidlo č. N.“ / „Pravé zní: ‚…‘“
  - Pyrotechnik (obě role): „Jsi pyrotechnik. Jen ty vidíš bombu.“ / „Popisuj nahlas, co vidíš.“

### Vyhodnocení

| Výsledek | Štít | Poklad |
| --- | --- | --- |
| Zneškodněna | pyrotechnik | +400, minus 100 za každou chybu |
| Výbuch | nikdo | 0 |

Osobní body: pyrotechnik, který bombu zneškodní, +2 (jako u ostatních miniher).

### Stopa

- Seznam chyb, např. „Chyba 1: Dráty, přestřižen 3. drát (správně 5.)“.
- U každé chyby, zda by ji vysvětlila falešná verze některé stránky („Tuto chybu by vysvětlila falešná verze stránky Dráty 3–4“). Neříká, čí stránka byla falešná.
- Tabulka **stránka manuálu → kdo ji měl**.

### Duchové

- Do spuštění odpočtu tipují: **bez chyby / s 1 chybou / se 2 chybami / vybuchne**.
- Přesný tip **3 body**, o jedno vedle **1 bod** („vybuchne“ se počítá jako 3 chyby).
- Bombu ani stránky nevidí. Vidí pyrotechnika, odpočet a kontrolky chyb.

### Utajení

Platí vše z Rozšíření 2 a navíc:

- Bomba (dráty, symboly) jde jen do telefonu pyrotechnika. Správné řešení nejde do žádného telefonu.
- Každý navigátor dostane jen **své** stránky. Nikde v pohledu hráče není poznačeno, které pravidlo je falešné.
- Pohled Věrného i Zrádce má stejná pole (pyrotechnik i navigátor).
- Duch nedostává bombu ani stránky.

### Obrazovky

- **Telefon pyrotechnika:** nahoře odpočet a tři kontrolky chyb, pod tím moduly Dráty a Symboly, označení a potvrzovací tlačítko.
- **Telefon navigátora:** jeho stránky (nadpis, číslovaná pravidla, u symbolů sloupce), pyrotechnik, kontrolky chyb, stav modulů.
- **Duch:** tlačítka tipu, pyrotechnik, kontrolky chyb, stav modulů.
- **Konzole moderátora:** bomba se správným řešením, rozdělení stránek s vyznačeným falešným pravidlem, chyby, tipy duchů, tlačítka Spustit odpočet, Přidělit pyrotechnika znovu a Ukončit bombu (= výbuch).

### Rozšíření NEobsahuje

- Moduly Tlačítko a Kódový zámek
- Velkou obrazovku s odpočtem (přijde se scénami na velkou obrazovku)
- Víc variant manuálu

### Hotovo, když

1. Zneškodni bombu se losuje s ostatními minihrami a jde odehrát v 5 kartách prohlížeče od losu po kulatý stůl.
2. Generátor vytváří jen bomby, které manuál jednoznačně řeší, a falešné pravidlo vždy mění řešení této bomby (ověřeno testem na mnoha náhodných bombách).
3. Akce, chyby, zrychlení odpočtu, výbuch, zneškodnění, pozastavení a nový pyrotechnik, štít, poklad a body duchů odpovídají pravidlům (ověřeno testy).
4. **Utajení:** testy ověří, že bombu vidí jen pyrotechnik, řešení nikdo, navigátor jen své stránky, Věrný a Zrádce mají stejný tvar pohledu a duch nevidí bombu ani stránky.
5. Robot `npm run e2e` odehraje hry i s bombou bez chyby (bot-pyrotechnik provede správnou akci s pravděpodobností 80 %).

### Kroky vývoje

| Krok | Obsah | Ověření |
| --- | --- | --- |
| B1 | Manuál jako data, generátor bomby, řešitel, falešná pravidla, pravidla na serveru a testy včetně utajení | Testy prochází |
| B2 | Obrazovky pyrotechnika, navigátora, ducha a konzole, zařazení do osudí, rozšíření robota `npm run e2e` | Bomba jde odehrát v 5 kartách prohlížeče, robot prochází |

## Rozšíření 8: Fyzická mise

Osmá, volitelná minihra. Podrobně v [analýze miniher](minihry-analyza.md), kapitola „Fyzická mise (moderátorský modul)“. Není to hra na telefonech, ale modul se stejným rozhraním jako ostatní minihry; los, předání štítu a historie kol fungují stejně.

### Cíl

Moderátor dá skupině fyzický úkol (stavění věže, šifra po místnosti, štafeta). Hráči ho splní mimo telefony a moderátor zapíše výsledek: poklad, štít a body duchů.

### Zapnutí

- Nové nastavení **Fyzická mise v osudí**, výchozí hodnota **vypnuto**.
- Moderátor ho přepíná v konzoli **kdykoli** (v lobby i během hry).
- Vypnutá mise se nelosuje a nejde ani vybrat ručně.
- Podmínka: **aspoň 1 živý hráč**.

### Průběh (krok Hra)

1. **Zadání:** moderátor napíše zadání do textového pole (nejvýš **300 znaků**) a stiskne **Zveřejnit zadání**. Konzole nabízí tři náměty jedním ťuknutím:
   - „Postavte z kelímků co nejvyšší věž do 3 minut.“
   - „V místnosti jsou schované čtyři lístky s písmeny. Najděte je a složte slovo.“
   - „Štafeta: každý donese jeden předmět z druhé strany místnosti, kdo upustí, začíná znovu.“
2. **Plnění:** telefony ukazují zadání velkým písmem a „Plňte misi“. **Odpočet není**, moderátor sám ví, kdy mise skončila.
3. **Výsledek:** moderátor v konzoli vybere:
   - **změnu pokladu** −200 až +300 po 50,
   - **štít**: jeden živý hráč, nebo nikdo,
   - **duch s 3 body**: jeden duch, nebo nikdo,
   - **stopu**: nepovinný text (nejvýš 300 znaků),

   a stiskne **Uložit výsledek**. Minihra tím skončí a pokračuje jako ostatní (výsledek, stopa, předání štítu).

### Zrádci

- Výhodu na telefonu nemají.
- Veřejné pravidlo: „Zrádci nemají žádnou výhodu na telefonu. Mohou ale misi nenápadně kazit.“
- Tajná karta: Věrný „Snaž se, aby mise vyšla.“ / „Sleduj, kdo ji kazí.“; Zrádce „Můžeš misi nenápadně kazit.“ / „Nenech se přistihnout.“

### Vyhodnocení a stopa

| | |
| --- | --- |
| Štít | hráč, kterého vybral moderátor, nebo nikdo |
| Poklad | změna zapsaná moderátorem (−200 až +300) |
| Osobní body | vítěz +2 (jako u ostatních miniher) |
| Duchové | vybraný duch 3 body |

- Stopa: zadání mise, a pokud ho moderátor napsal, jeho text („Petra upustila klíč dvakrát“).

### Utajení

Platí vše z Rozšíření 2. Pohled Věrného i Zrádce má stejná pole; telefon nedostává nic, co by moderátor ještě nezveřejnil.

### Obrazovky

- **Telefon a duch:** před zveřejněním „Moderátor připravuje misi“, pak zadání velkým písmem a „Plňte misi“.
- **Konzole moderátora:** pole pro zadání s náměty a tlačítko Zveřejnit zadání; pak volba změny pokladu, štítu, ducha a text stopy s tlačítkem Uložit výsledek.
- **Nastavení:** přepínač Fyzická mise v osudí.

### Rozšíření NEobsahuje

- Odpočet mise
- Uložené vlastní náměty mezi hrami
- Velkou obrazovku se zadáním (přijde se scénami na velkou obrazovku)

### Hotovo, když

1. Se zapnutým nastavením se Fyzická mise losuje s ostatními minihrami a jde odehrát v 5 kartách prohlížeče od losu po kulatý stůl; s vypnutým se nelosuje ani nejde vybrat.
2. Zadání, zápis výsledku, poklad, štít, body duchů a stopa odpovídají pravidlům a neplatné vstupy (dlouhý text, poklad mimo rozsah, mrtvý hráč jako vítěz) se odmítnou (ověřeno testy).
3. Robot `npm run e2e` odehraje hry i s Fyzickou misí bez chyby.

### Kroky vývoje

| Krok | Obsah | Ověření |
| --- | --- | --- |
| F1 | Nastavení Fyzická mise v osudí, modul na serveru a testy | Testy prochází |
| F2 | Obrazovky telefonu, ducha a konzole, přepínač v konzoli, rozšíření robota `npm run e2e` | Mise jde odehrát v 5 kartách prohlížeče, robot prochází |

## Rozšíření 9: Velká obrazovka

Třetí rozhraní hry vedle telefonu a konzole: projektor nebo TV, která provází hrou. Podklady jsou v [návrhu designu](zradci-design.md) (kapitola Velká obrazovka), v [analýze miniher](minihry-analyza.md) (princip 7 a scény u jednotlivých her) a v [architektuře](architektura.md) (`viewForScreen`, `/obrazovka`).

### Cíl

Hráči sledují průběh hry, odhalení a minihry na jedné společné obrazovce. Vzniká tím atmosféra večera. Pravidla hry se nemění: obrazovka ukazuje jen to, co je veřejné, a hra jde dohrát i bez ní.

### Přístup a vzhled

- Stránka **`/obrazovka`** na stejném serveru, **bez klíče**. Nic se na ní neovládá.
- Server pro ni počítá vlastní pohled **`viewForScreen`** jen s veřejnými informacemi: žádné role živých hráčů, volby, noční výběry, tipy duchů ani nic, co minihry tají.
- V konzoli je odkaz **Otevřít velkou obrazovku**.
- Rozložení na šířku 16:9, písmo škálované podle šířky okna (nejméně 40 px při 1080p), vizuální jazyk podle návrhu designu.
- Stálé prvky během hry: název fáze a kolo uprostřed nahoře, **poklad** vpravo nahoře, řada portrétů živých hráčů dole, malý **žebříček duchů** vpravo dole.
- Při výpadku obrazovky telefony dál dostávají vše potřebné ke hře.

### Scény základní hry

| Fáze | Obrazovka |
| --- | --- |
| Lobby | QR kód a adresa pro připojení, jména připojených hráčů |
| Rozdání rolí | „Role byly rozdány“ |
| Kulatý stůl (hlasování) | „Hlasovalo N z M“ |
| Výsledek hlasování | sloupce hlasů u jednotlivých hráčů (**bez toho, kdo hlasoval**), pak vyhnaný a po 3 s napětí jeho role |
| Noc | téměř černá obrazovka se svíčkou a nápisem „Noc“ |
| Ráno | jméno oběti, nebo „Tuto noc nikdo nezemřel“ |
| Konec hry | role všech hráčů postupně jedna po druhé, pak vítězná strana a poklad |

Pravidlo tajného hlasování zůstává: kdo pro koho hlasoval, se nezveřejňuje ani na obrazovce.

### Společné scény miniher

| Krok minihry | Obrazovka |
| --- | --- |
| Los | „Osud vybírá…“ s názvy her, pak vylosovaná hra |
| Pravidla | název, pravidla a veřejné pravidlo o Zrádcích |
| Hra | scéna konkrétní minihry (viz níže), jinak název a odpočet |
| Výsledek | shrnutí, kdo vyhrál štít, změna pokladu, vítěz mezi duchy |
| Stopa | stopa z minihry |
| Předání štítu | „Probíhá tajné předání štítu“ |

### Scény jednotlivých miniher

Každá minihra dostane vlastní `viewForScreen` jen s veřejnými informacemi.

| Minihra | Obrazovka |
| --- | --- |
| Tajná aukce | otáčení karet nabídek ve stejném pořadí jako na telefonech |
| Rozdělit, nebo ukrást | dvě karty duelistů, které se po odhalení otočí současně |
| Horký brambor | jméno držitele bomby velkým písmem, výbuch, pořadí vyřazení; **bez ručičky tlaku** |
| Insider kvíz | otázka a možnosti, odpočet; po otázce správná odpověď a průběžné pořadí; **bez svíčky** |
| Trezor | zámečník, okénka kódu, pokusy „N z 4“, odpočet |
| Rytmus | pulzující kruh podle dob kola; po každém kole synchronizace skupiny |
| Zneškodni bombu | pyrotechnik, velký odpočet a kontrolky chyb; **ne bomba samotná** |
| Fyzická mise | zadání velkým písmem |

### Tempo

- Obrazovka jen sleduje stav hry; moderátor nemá kvůli ní žádná nová tlačítka.
- Dramatické pauzy si časuje sama (3 s před rolí vyhnaného, postupné odkrývání rolí na konci).

### Zvuky

- Zvuky hraje **jen** velká obrazovka, syntézou v prohlížeči (Web Audio), bez zvukových souborů.

| Událost | Zvuk |
| --- | --- |
| Hráč se připojil | zapálení sirky |
| Nová fáze | úder do zvonu z dálky |
| Hlas / karta otočena | otočení karty |
| Odhalen Zrádce | nízký gong |
| Odhalen Věrný | tichý molový akord |
| Noc | tichý ambient |
| Oběť noci | úder bubnu |
| Poklad roste | cinkání mincí |

- Při prvním otevření obrazovka vyžádá jedno kliknutí **Zahájit** (prohlížeče jinak zvuk nepustí).
- V konzoli je přepínač **Ztlumit obrazovku**.

### Rozšíření NEobsahuje

- Odhalování hlasů jeden po druhém se jmény hlasujících (pravidlo tajného hlasování zůstává)
- Fotky hráčů (portréty jsou iniciály)
- Ovládání na obrazovce a přístupový klíč
- Zvukové soubory a hudbu

### Utajení

- Testy ověří, že `viewForScreen` nikdy neobsahuje role živých hráčů, volby hlasování ani noční výběry, tajné údaje miniher (ručička tlaku, svíčka, kód trezoru, nápovědy, bomba, rušička, nabídky před odhalením, volby duelistů před odhalením) ani tokeny.
- Robot `npm run e2e` připojí i obrazovku a hlídá totéž během celé hry.

### Hotovo, když

1. Celá hra s minihrami jde sledovat na `/obrazovka` bez pohledu do telefonu: od lobby po konec hry.
2. Každá minihra má svou scénu podle tabulky.
3. Utajení obrazovky ověřují testy i robot e2e.
4. Zvuky hrají po kliknutí na Zahájit a jdou ztlumit z konzole.

### Kroky vývoje

| Krok | Obsah | Ověření |
| --- | --- | --- |
| O1 | `viewForScreen` na serveru, stránka `/obrazovka`, scény základní hry a společné scény miniher, odkaz v konzoli, testy utajení, obrazovka v robotovi | Testy a robot prochází, hra jde sledovat v prohlížeči |
| O2 | Scény jednotlivých miniher (`viewForScreen` v každém modulu) | Testy a robot prochází, každá minihra má scénu |
| O3 | Zvuky přes Web Audio, tlačítko Zahájit, ztlumení v konzoli | Zvuky hrají a jdou ztlumit |

## Rozšíření 10: Spolehlivost

Ochrana živého večera před nejčastějšími problémy: pád serveru, usínající telefony, hráč, který odejde nebo vymění telefon. Pravidla hry se nemění.

### Obnova po pádu serveru

- Server po každé změně uloží **celý stav hry** do souboru `data/zrada-stav.json` (zápis přes dočasný soubor, aby se při pádu nepoškodil). Ukládá se stav, ne přehrávání akcí, protože los v jádru je náhodný.
- Po startu server stav načte a hra pokračuje tam, kde skončila. Odpočty miniher jsou v absolutním čase, takže po restartu doběhnou samy.
- Uloží se i **klíč moderátora**: otevřená konzole funguje dál. Telefony se vrátí samy podle svého tokenu.
- Soubor je v `.gitignore`. Tlačítko **Nová hra** stav přepíše.

### Telefon nezhasne

- Telefon při prvním ťuknutí požádá o podržení rozsvíceného displeje (Wake Lock API) a po návratu do prohlížeče požádá znovu.
- Kde to prohlížeč neumí, ukáže telefon nenápadné upozornění „Nezhasínej displej“.

### Vibrace

- Krátká vibrace (200 ms) **u všech hráčů současně**, když začne nový úkol: role rozdány, hlasování otevřeno, noc, start minihry, finálové hlasování.
- Nikdy jen jednomu hráči, aby nic neprozradila. Kde prohlížeč vibrace neumí (iPhone), nestane se nic.

### Pauza a zásahy moderátora

| Zásah | Kdy | Co udělá |
| --- | --- | --- |
| **Pauza / Pokračovat** | kdykoli během hry | Zastaví odpočty miniher a předání štítu, hráči nemůžou nic zadávat, telefony i obrazovka ukážou „Pauza“. Po pokračování odpočty běží dál od stejného místa. |
| **Vynulovat hlasy** | během hlasování | Smaže dosavadní hlasy, hlasuje se znovu. |
| **Vyřadit hráče** | mimo minihru | Hráč, který odešel. Počítá se jako mrtvý (stav „odešel/a“), role se nezveřejní, stane se duchem. Po vyřazení se zkontroluje konec hry. |
| **Nový telefon** | kdykoli | Konzole u hráče vygeneruje nový odkaz s QR kódem. Hráč se na něm přihlásí jako on sám, starý telefon přestane platit. |

### Rozšíření NEobsahuje

- Vrácení už vyhnaného nebo zavražděného hráče
- Úpravu bodů nebo pokladu ručně

### Hotovo, když

1. Po restartu serveru (i uprostřed minihry) hra pokračuje, konzole i telefony se připojí samy (ověřeno testem).
2. Pauza zastaví a obnoví odpočty, během pauzy jsou akce hráčů odmítnuté (ověřeno testy).
3. Vynulování hlasů, vyřazení hráče a nový telefon fungují podle tabulky (ověřeno testy).
4. Telefon drží displej rozsvícený a vibruje u všech současně (ověřeno v prohlížeči, kde to jde).

### Kroky vývoje

| Krok | Obsah | Ověření |
| --- | --- | --- |
| S1 | Ukládání a načtení stavu, uložený klíč moderátora | Testy, restart dev serveru uprostřed hry |
| S2 | Wake Lock, upozornění, vibrace | Prohlížeč |
| S3 | Pauza, vynulování hlasů, vyřazení hráče, nový telefon | Testy, robot, prohlížeč |

## Rozšíření 11: Finále a konec večera

Konec hry jako v televizi: hráči sami rozhodují, jestli hru ukončí. Poklad tím dostane smysl. Na konci večera rekapitulace a ceny.

### Finálové hlasování

- Automatický konec zůstává: žádný Zrádce = výhra Věrných; Zrádců stejně nebo víc než Věrných = výhra Zrádců.
- Když je **4 a méně živých**, nabídne konzole ráno (místo minihry a kulatého stolu) tlačítko **Spustit finále**. Moderátor ho použít nemusí.
- **Finálové hlasování** (nová fáze `FINAL_VOTE`): každý živý tajně zvolí **Ukončit hru** („Věřím, že tu zbyli jen Věrní.“), nebo **Vyhnat dalšího** („Mezi námi je pořád Zrádce.“). Telefony mají dvě velké karty, stejné pro obě role.
- Moderátor hlasování uzavře. Hru ukončí jen **jednomyslné** „Ukončit hru“; jinak následuje kulatý stůl s vyhnáním (bez minihry a bez noci) a po něm znovu finálové hlasování.
- Velká obrazovka: „Hlasovalo N z M“, po uzavření jen výsledek („Jednomyslně ukončit“ / „Hra pokračuje“), ne kdo jak hlasoval.
- **Konec po finále:**
  - zbyli jen Věrní: vyhráli a **dělí se o poklad** rovným dílem (zaokrouhleno dolů na celé body),
  - zbyl Zrádce: vyhrávají Zrádci a **celý poklad** si rozdělí živí Zrádci.
- Podíl z pokladu se připíše jako osobní body (důvod „poklad“). Při automatickém konci bez finále se poklad rozdělí stejně.
- Poklad se dělí, jen když byl ve hře: hrála se aspoň jedna minihra, nebo proběhlo finále. Bez toho ho hráči nikde neviděli.

### Rekapitulace a ceny

- Po vyhlášení vítěze velká obrazovka (a telefony na konci hry) ukáže **časovou osu kol**: kdo byl vyhnán (s rolí), kdo zemřel v noci, minihra a kdo vyhrál štít.
- **Ceny** (jen jména a počty):
  - **Detektiv**: nejvíc hlasů u kulatého stolu pro Zrádce,
  - **Mistr klamu**: Zrádce s nejmenším počtem hlasů proti sobě,
  - **Nejpodezřelejší Věrný**: Věrný s nejvíc hlasy proti sobě.
- Server si k tomu pamatuje hlasy všech kol. Ven jdou jen ceny, nikdy kompletní seznam, kdo pro koho hlasoval (pokud není zapnuté veřejné hlasování, Rozšíření 12).
- Při shodě cenu získají všichni se stejným počtem; když nikdo nesplňuje podmínku, cena se neudělí.

### Hotovo, když

1. Finále jde spustit jen při 4 a méně živých, ukončí ho jen jednomyslný hlas, jinak kulatý stůl a nové finále (ověřeno testy).
2. Poklad se na konci rozdělí podle pravidel a připíše jako osobní body (ověřeno testy).
3. Časová osa a ceny odpovídají průběhu hry a neprozradí, kdo pro koho hlasoval (ověřeno testy).
4. Robot `npm run e2e` hraje i finále.

### Kroky vývoje

| Krok | Obsah | Ověření |
| --- | --- | --- |
| K1 | Finálové hlasování, dělení pokladu, obrazovky telefonu, konzole a velké obrazovky, robot | Testy, robot, prohlížeč |
| K2 | Časová osa a ceny na konci hry | Testy, prohlížeč |

## Rozšíření 12: Moderátor a obrazovka

### Veřejné hlasování (volitelné)

- Nové nastavení v lobby **Veřejné hlasování**, výchozí **vypnuto**.
- Zapnuté: velká obrazovka po uzavření hlasování otáčí karty „Petra → Marek“ jednu po druhé (1,5 s), pak vyhnaný a jeho role. Telefony dál ukazují jen výsledek.
- Hráči se o zapnutém veřejném hlasování dozví v lobby a v pravidlech na telefonu.
- Vypnuté: platí tajné hlasování jako dosud.

### Scénář pro moderátora

- V konzoli u každé fáze a kroku minihry **1–2 věty k přečtení nahlas** (např. „Slunce zapadá. Zrádci, otevřete oči… na telefonu.“).
- Texty jsou v datovém souboru `client/moderator/script.cs.json`, aby šly upravit bez programování.
- Scénář jde v konzoli skrýt (pamatuje si to prohlížeč).

### Hotovo, když

1. S vypnutým veřejným hlasováním obrazovka hlasy nezveřejní; se zapnutým je odhalí jeden po druhém (ověřeno testy pohledu obrazovky).
2. Konzole ukazuje scénář ke každé fázi a kroku minihry a jde skrýt.

### Kroky vývoje

| Krok | Obsah | Ověření |
| --- | --- | --- |
| M1 | Veřejné hlasování: nastavení, pohled obrazovky, scéna odhalení | Testy, prohlížeč |
| M2 | Scénář pro moderátora | Prohlížeč |

## Rozšíření 13: Kurz

### Boti

- V lobby tlačítko **Přidat bota** („Bot 1“, „Bot 2“, … až do maxima hráčů) a u bota tlačítko Odebrat.
- Boti hrají **na serveru sami** s krátkou náhodnou prodlevou (1–3 s): potvrdí roli a tajnou kartu, hlasují náhodně, Zrádce-bot vybírá oběť, duch-bot tipuje.
- V minihrách hrají jednoduchou strategií: každý modul dostane funkci pro tah bota (inspirovanou robotem z e2e). Bot může být i zámečník nebo pyrotechnik.
- Boti se v konzoli i na obrazovce poznají podle jména; jinak jsou to běžní hráči.

### Sady otázek

- Všechny soubory `*.json` ve složce `server/minigames/quiz/questions/` se načtou automaticky. Vlastní sada = nový soubor ve stejném formátu a restart serveru.
- V lobby zaškrtávátka, ze kterých sad kvíz bere otázky; výchozí jsou všechny. Kvíz se nelosuje, když ve vybraných sadách není dost otázek.
- Nová ukázková sada **Filmy a seriály** (asi 30 otázek).

### Hotovo, když

1. Hra s boty doplněnými do 6–8 hráčů jde odehrát od lobby po konec včetně miniher, jen se dvěma lidmi a moderátorem (ověřeno testem a v prohlížeči).
2. Nová sada otázek se načte sama a výběr sad v lobby ovlivní otázky kvízu (ověřeno testy).

### Kroky vývoje

| Krok | Obsah | Ověření |
| --- | --- | --- |
| B1 | Boti v základní hře: přidání, odebrání, tahy na serveru | Testy, prohlížeč |
| B2 | Tahy botů ve všech minihrách | Testy, robot |
| Q1 | Sady otázek: automatické načtení, výběr v lobby, sada Filmy a seriály | Testy, prohlížeč |
