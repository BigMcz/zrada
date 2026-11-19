# Zrada

Společenská hra pro 4–10 lidí v jedné místnosti, inspirovaná Městečkem Palermo. Telefony nahrazují kartičky s rolemi a lístečky na hlasování, moderátor hru řídí z notebooku. Hra běží jen v místní síti, bez instalace a bez internetu.

Ukázkový projekt pro vibecoding kurz. Zadání a návrhy jsou ve složce [DOC](DOC/):

- [SPEC.md](DOC/SPEC.md) – zadání první verze (platí přednostně)
- [architektura.md](DOC/architektura.md) – technické řešení a plán vývoje
- [zradci-design.md](DOC/zradci-design.md) – návrh vzhledu
- [zradci-analyza.md](DOC/zradci-analyza.md) – původní analýza nápadu

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
3. Moderátor zvolí počet Zrádců a stiskne **Rozdat role**. Dál hru vede jedno velké tlačítko.

Telefony musí být na **stejné Wi-Fi** jako notebook.

## Pravidla v kostce

- Hráči jsou tajně Věrní, nebo Zrádci. Zrádci se znají, Věrní ne.
- **Kulatý stůl**: všichni hlasují, koho vyhnat. Vyhnaný odhalí svou roli. Remíza = los, bez hlasů nikdo.
- **Noc**: Zrádci vyberou Věrného, kterého umlčí. Věrní mezitím tipují Zrádce (tip se nepočítá, jen aby v noci ťukali všichni).
- **Ráno**: všichni se dozví, kdo zemřel.
- Věrní vyhrají, když nezbude žádný Zrádce. Zrádci vyhrají, když jich je stejně nebo víc než Věrných.

Celá pravidla jsou v [SPEC.md](DOC/SPEC.md).

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
- [ ] Tlačítko **Skrýt role** v konzoli, když se moderátorovi někdo dívá přes rameno

## Vývoj

```bash
npm run dev        # server + klient s automatickým obnovováním
npm test           # testy pravidel, utajení rolí a serveru přes sockety
npm run typecheck  # kontrola typů
npm run build      # produkční build klienta do dist/
npm start          # spuštění z produkčního buildu (po npm run build)
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
client/
  player/              obrazovky telefonu hráče
  moderator/           konzole moderátora
  components/          karta role, mřížka hráčů, kostra obrazovky
```

Klient nikdy nedostane celý stav hry, jen svůj **pohled** spočítaný na serveru. Role ostatních hráčů se do telefonu nedostanou ani skrytě – hlídají to testy v `server/game/views.test.ts`.
