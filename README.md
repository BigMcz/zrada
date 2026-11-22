# Zrada

Společenská hra pro 4–10 lidí v jedné místnosti, inspirovaná Městečkem Palermo. Telefony nahrazují kartičky s rolemi a lístečky na hlasování, moderátor hru řídí z notebooku. Hra běží jen v místní síti, bez instalace a bez internetu.

Ukázkový projekt pro vibecoding kurz. Zadání a návrhy jsou ve složce [DOC](DOC/):

- [SPEC.md](DOC/SPEC.md) – zadání (platí přednostně): první verze, Rozšíření 1: Duchové, Rozšíření 2: Minihry
- [architektura.md](DOC/architektura.md) – technické řešení a plán vývoje
- [zradci-design.md](DOC/zradci-design.md) – návrh vzhledu
- [zradci-analyza.md](DOC/zradci-analyza.md) – původní analýza nápadu
- [minihry-analyza.md](DOC/minihry-analyza.md) – analýza miniher (7 her, rámec, rozhraní modulu)

## Spuštění

Potřebuješ **Node.js 22** nebo novější.

```bash
npm install
npm run dev
```

Server v terminálu vypíše dva odkazy:

```
  Moderátor (jen tento počítač):  http://localhost:3000/moderator?key=…
  Hráči (telefony):               http://192.168.x.x:3000/
```

1. **Odkaz pro moderátora** otevři v prohlížeči na notebooku. Klíč v odkazu je při každém spuštění nový; bez něj se do konzole moderátora nikdo nedostane.
2. Hráči naskenují **QR kód** z obrazovky moderátora (nebo otevřou adresu pro hráče), zadají jméno a jsou ve hře.
3. Moderátor zvolí počet Zrádců, zapne nebo vypne minihry a stiskne **Rozdat role**. Dál hru vede jedno velké tlačítko.

Telefony musí být na **stejné Wi-Fi** jako notebook.

**Velká obrazovka (projektor, TV):** otevři `http://localhost:3000/obrazovka` (v konzoli je odkaz **Otevřít velkou obrazovku**), dej ji přes celou obrazovku a jednou klikni na **Zahájit**, aby šel zvuk. Ukazuje jen veřejné informace (QR kód v lobby, hlasování bez jmen hlasujících, odhalení, minihry, konec hry), takže ji klidně promítej. Zvuk ztlumíš v horní liště konzole. Hra jde dohrát i bez ní.

**Když něco selže:**

- **Pád nebo restart serveru:** hra se ukládá do `data/zrada-stav.json` a po novém `npm run dev` pokračuje tam, kde skončila. Odkaz pro moderátora i telefony fungují dál. Úplně novou hru začneš tlačítkem **Nová hra** (nebo smazáním souboru).
- **Pauza:** tlačítko **⏸ Pauza** v horní liště zastaví odpočty miniher; hráči mezitím nic nezadají.
- **Vybitý telefon:** u hráče v konzoli **Nový telefon** ukáže QR kód, na jiném telefonu se přihlásí jako on sám.
- **Hráč odešel:** **Vyřadit** u hráče (počítá se jako mrtvý, role zůstane tajná).
- **Málo lidí:** v lobby **🤖 Přidat bota** – boti hrají na serveru sami, včetně miniher.

**Konec hry:** při 4 a méně živých nabídne konzole ráno **Spustit finále** – hráči jednomyslně ukončí hru, nebo vyženou dalšího. Poklad si na konci rozdělí vítězové a obrazovka ukáže rekapitulaci večera s cenami a závěrečné titulky.

**Zážitek (Rozšíření 16):**

- **Téma hry:** v lobby konzole vybereš Hrad (Zrada), Vesmírnou loď (Sabotáž), Kancelář (Krtek) nebo Pirátskou loď (Vzpouru). Mění názvy rolí a fází, texty, erb a barvy; pravidla a minihry zůstávají.
- **Znaky hráčů:** každý si v čekárně vybere symbol místo iniciál.
- **Reakce:** ráno a u kulatého stolu posílají hráči anonymní 😱 🤔 🙄 😂 👀 na obrazovku; vypínač je v horní liště konzole.
- **Síň slávy:** výsledky napříč večery v `data/zrada-sin-slavy.json` (podle jména hráče, bez botů), žebříčky v čekárně obrazovky; vynulovat jde v lobby konzole.

## Pravidla v kostce

- Hráči jsou tajně Věrní, nebo Zrádci. Zrádci se znají, Věrní ne.
- **Kulatý stůl**: všichni hlasují, koho vyhnat. Vyhnaný odhalí svou roli. Remíza = los, bez hlasů nikdo.
- **Noc**: Zrádci vyberou Věrného, kterého umlčí. Věrní mezitím tipují Zrádce (tip se nepočítá, jen aby v noci ťukali všichni).
- **Ráno**: všichni se dozví, kdo zemřel.
- Věrní vyhrají, když nezbude žádný Zrádce. Zrádci vyhrají, když jich je stejně nebo víc než Věrných.

**Duchové:** kdo vypadne (vyhnaný nebo umlčený Věrný), stane se duchem. V každém kole tipuje, kdo je Zrádce (1 bod za správný tip), a v minihrách má vlastní úlohu. Body za tipy na Zrádce uvidí až na konci hry. Vyhnaný Zrádce netipuje.

**Minihry:** po rozdání rolí a každé ráno moderátor zvolí **Spustit minihru**, nebo **Přeskočit minihru**. V minihře hráči soutěží o **štít** (chrání jednu noc před umlčením) a mění společný **poklad** (začíná na 1000). Vítěz minihry dostane +2 osobní body a štít může tajně darovat. Zatím jsou hotové dvě minihry:

- **Tajná aukce** – tajné nabídky 0–10 žetonů, nejvyšší nabídka vyhrává štít, všechny nabídky se platí z pokladu.
- **Rozdělit, nebo ukrást** – dva duelisté tajně volí Rozdělit / Ukrást, ostatní sázejí na výsledek.
- **Horký brambor** – bomba se posílá z telefonu na telefon, u koho bouchne, vypadá; poslední přeživší získá štít. Zrádcům ukazuje ručička tlaku skutečný čas do výbuchu.
- **Insider kvíz** – 7 otázek po 15 s, svíčka (nápověda) ukazuje Zrádcům správnou odpověď, Věrným náhodnou; nejlepší hráč získá štít. Otázky jsou v `server/minigames/quiz/questions/`.
- **Trezor** – skupina skládá kód z nápověd na telefonech a zvolený zámečník má 3 pokusy; Zrádci mají jednu nápovědu falešnou. Otevře-li zámečník trezor, získá štít.
- **Rytmus** – všichni ťukají do rytmu kruhu na telefonu, štít získá nejpřesnější hráč, poklad roste podle synchronizace skupiny. Zrádci mají rušičku, která jednomu hráči v kole 2 posune rytmus.
- **Zneškodni bombu** – jen pyrotechnik vidí bombu (dráty a symboly), ostatní mu radí podle stránek manuálu; Zrádci mají ve stránce jedno pravidlo falešné. Zneškodní-li pyrotechnik bombu, získá štít. Manuál je v `server/minigames/bomb/manual.cs.json`.
- **Fyzická mise** (volitelná, zapíná se v konzoli přepínačem Fyzická mise v osudí) – moderátor zadá úkol mimo telefony a sám zapíše výsledek: změnu pokladu, kdo získá štít a body pro jednoho ducha.

Na konci hry je poklad, žebříček hráčů podle osobních bodů a žebříček duchů. Celá pravidla jsou v [SPEC.md](DOC/SPEC.md).

## Když se telefony nepřipojí

| Problém | Řešení |
| --- | --- |
| Telefon stránku nenačte | Windows Firewall blokuje Node.js. Při prvním spuštění povol Node v **soukromé** síti (případně v *Zabezpečení Windows → Firewall → Povolit aplikaci* zaškrtni Node.js pro soukromé sítě). Wi-Fi musí být ve Windows nastavená jako **soukromá**, ne veřejná. |
| Wi-Fi pro hosty (hotel, škola, kavárna) | Tyto sítě často nedovolí zařízením vidět se navzájem. Zapni na notebooku **mobilní hotspot** (*Nastavení → Síť → Mobilní hotspot*), připoj na něj telefony a spusť server znovu, aby vypsal novou adresu. |
| Vypsaná adresa nefunguje | Notebook má víc síťových karet (VPN, WSL, Docker). Server vypíše všechny adresy; tu správnou nastav ručně: `HOST_IP=192.168.1.20 npm run dev` (v PowerShellu `$env:HOST_IP="192.168.1.20"; npm run dev`). |
| Port 3000 je obsazený | `PORT=3100 npm run dev` (PowerShell: `$env:PORT=3100; npm run dev`). |
| Hráč zavřel prohlížeč nebo se mu zamkl telefon | Stačí znovu otevřít stejnou adresu ve stejném prohlížeči – vrátí se jako stejný hráč do aktuální fáze. |
| Notebook usnul | Hra přežije jen krátký výpadek. Před hrou vypni uspávání a připoj nabíječku. |
| Restart serveru | Hra se ztratí (první verze ji neukládá) a klíč moderátora se změní. Začněte novou hru. |

Pevný klíč moderátora (např. pro předem připravený odkaz) nastavíš proměnnou `MODERATOR_KEY`.

## Před ukázkou

- [ ] Notebook a telefony na stejné Wi-Fi (nebo hotspot z notebooku)
- [ ] `npm run dev` běží a jeden telefon otevře stránku hráče
- [ ] Uspávání notebooku vypnuté, nabíječka připojená
- [ ] Konzole moderátora se po rozdání rolí **nepromítá** – jsou na ní vidět role
- [ ] Tlačítko **Skrýt role** v konzoli, když se moderátorovi někdo dívá přes rameno (skryje i štít a body duchů)
- [ ] Minihry v lobby zapnuté, pokud se mají hrát (vypnuté = hra bez miniher); vybrané sady otázek do kvízu
- [ ] Veřejné hlasování v lobby jen tehdy, když ho skupina chce (obrazovka pak ukáže, kdo pro koho hlasoval)
- [ ] Scénář pro moderátora v konzoli: věty k přečtení nahlas (jde skrýt, texty v `client/moderator/script.cs.json`)

## Vývoj

```bash
npm run dev        # server + klient s automatickým obnovováním
npm test           # testy pravidel, utajení rolí, miniher a serveru přes sockety
npm run typecheck  # kontrola typů
npm run build      # produkční build klienta do dist/
npm start          # spuštění z produkčního buildu (po npm run build)
npm run e2e        # robot odehraje 5 celých her přes skutečný server a zkontroluje utajení, štít a body
```

**Testování na jednom počítači:** všechny karty prohlížeče sdílejí úložiště, takže by byly stejným hráčem. Přidej do adresy číslo hráče – `http://localhost:3000/?hrac=1`, `?hrac=2` … – a každá karta bude jiný hráč.

### Struktura

```
shared/types.ts        typy zpráv a pohledů sdílené serverem a klientem
server/
  index.ts             Express + Socket.IO, adresa v místní síti, klíč moderátora
  hub.ts               připojení klientů, ověření, rozesílání pohledů
  game/engine.ts       jediný vstup do herní logiky (čisté funkce)
  game/rules.ts        rozdání rolí, vyhodnocení hlasování a noci, konec hry
  game/views.ts        co smí který hráč a moderátor vidět
  minigames/
    types.ts           rozhraní minihry (MinigameModule)
    framework.ts       los, kroky minihry, štít, poklad, body
    registry.ts        seznam miniher; modules.ts je registruje při startu
    auction/           Tajná aukce
    splitSteal/        Rozdělit, nebo ukrást
    hotPotato/         Horký brambor
    quiz/              Insider kvíz (sady otázek v questions/*.json se načtou samy; vlastní sada = nový soubor)
    vault/             Trezor (generátor kódu a nápověd v hints.ts)
    rhythm/            Rytmus (hodnocení ťuknutí v scoring.ts)
    bomb/              Zneškodni bombu (manuál v manual.cs.json, generátor a řešitel v manual.ts)
    physical/          Fyzická mise (výsledek zapisuje moderátor)
client/
  player/              obrazovky telefonu hráče
  moderator/           konzole moderátora
  screen/              velká obrazovka /obrazovka (scény hry a miniher, zvuky přes Web Audio)
  minigames/           obrazovky miniher (telefon, duch, moderátor) a jejich registr
  components/          karta role, karta s pečetí, mřížka hráčů, odpočet, stopa, žebříčky
```

### Nová minihra

Každá minihra je samostatný modul, takže ji může postavit jeden tým nezávisle na ostatních:

1. Na serveru složka `server/minigames/<nazev>/` s modulem podle rozhraní `MinigameModule` (pravidla, tajná karta, vstupy hráčů a duchů, výsledek, pohledy) a testy. Jako vzor slouží `auction/`.
2. Registrace v `server/minigames/modules.ts`.
3. V klientovi komponenty pro telefon, ducha a moderátora v `client/minigames/<nazev>/` a zápis do `client/minigames/registry.ts`.

Rámec se postará o los, pravidla, tajnou kartu, časovače, výsledek, stopu, předání štítu, poklad i body.

Klient nikdy nedostane celý stav hry, jen svůj **pohled** spočítaný na serveru. Role ostatních hráčů, cizí nabídky a volby v minihrách ani držitel štítu se do telefonu nedostanou ani skrytě – hlídají to testy v `server/game/views.test.ts`, `server/game/ghosts.test.ts` a `server/minigames/`.
