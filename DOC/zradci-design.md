# Zrádci na telefonech – návrh designu

16. 11. 2026 · navazuje na [zradci-analyza.md](zradci-analyza.md)

## Shrnutí

Aplikace má tři rozhraní: telefon hráče, konzoli moderátora a velkou obrazovku. Mají společný vizuální jazyk a každé plní jinou úlohu:

- **Telefon hráče** má být nenápadný. Věrný a Zrádce na něm vypadají stejně a hráč z něj nemá nic prozradit, ani když se mu někdo dívá přes rameno.
- **Konzole moderátora** je pracovní nástroj. Ukazuje všechno a hlavní akce je vždycky jedno velké tlačítko.
- **Velká obrazovka** je jeviště. Vzniká na ní atmosféra: pomalá odhalení, velké písmo, zvuk.

Vizuální motiv je **noc na hradě**: tma, svíčky, kámen a pergamen. Ladí to s Křivoklátem z analýzy, a přitom nic nepřebírá z televizního pořadu (barvy, logo, typografie).

Pracovní název v aplikaci: **„Zrada“**. Analýza upozorňuje, že název „Zrádci“ je chráněná značka; pro lokální demo na kurzu to nevadí, ale je dobré si zvyknout na vlastní název.

## Principy

1. **Stejné pro obě role.** Pro každou fázi existuje jeden layout s jednou barvou, animací, vibrací a délkou. Zrádce se od Věrného liší jen textem, a ten je vidět jen na podržení prstu.
2. **Jedna akce na obrazovku.** Na telefonu je vždy jen jedna věc, kterou má hráč udělat. Ovládání je palcem ve spodní polovině displeje.
3. **Tma.** Tmavé pozadí se špatně čte z boku, nesvítí v potemnělé místnosti a podporuje atmosféru.
4. **Telefony mlčí, obrazovka hraje.** Zvuk vychází jen z velké obrazovky. Telefon pípnutím nikdy neprozradí, že jeho majitel něco dělá.
5. **Dramaturgii řídí moderátor.** Nic se neodhaluje samo; každé odhalení spustí moderátor tlačítkem, aby si načasoval napětí.

## Design systém

### Barvy

Jedna tmavá paleta pro všechna tři rozhraní. Žádná barva nepatří jedné roli. Výjimkou jsou konzole moderátora a veřejná odhalení na velké obrazovce, kde se role ukazují záměrně.

| Token | Hodnota | Použití |
| --- | --- | --- |
| `--bg` | `#0F0D0B` | pozadí (téměř černá, do teplého tónu) |
| `--surface` | `#1B1815` | karty, panely |
| `--surface-2` | `#262220` | aktivní a zvýrazněné karty |
| `--line` | `#3A342E` | okraje, oddělovače |
| `--text` | `#EDE6D6` | hlavní text (barva pergamenu) |
| `--text-muted` | `#9A9183` | popisky, sekundární text |
| `--gold` | `#D4A93C` | akcent: tlačítka, poklad, výběr (světlo svíčky) |
| `--gold-dim` | `#8C6E26` | stisknutý stav, okraj vybrané karty |
| `--blood` | `#A3271F` | jen velká obrazovka a konzole: odhalený Zrádce, vražda |
| `--loyal` | `#5E8C6A` | jen velká obrazovka a konzole: odhalený Věrný |
| `--ghost` | `#7F8FA6` | režim ducha (studená, vybledlá modrá) |
| `--ok` / `--warn` | `#6FA36F` / `#D9822B` | jen konzole: připojen / odpojen, odhlasoval / čeká |

Kontrast `--text` na `--bg` je zhruba 15 : 1 a `--gold` na `--bg` zhruba 8 : 1, takže oba splňují WCAG AA i pro malý text.

### Typografie

| Role | Písmo | Velikost (telefon / TV) |
| --- | --- | --- |
| Nadpisy, jména, odhalení | **Cinzel** SemiBold/Bold (tesané kapitálky, „hradní“; nejčastější volba pro fantasy hry) | 24–32 px / 96 px |
| Text, tlačítka, UI | **Figtree** Medium (čisté, dobře čitelné na telefonu) | 17 px / 40 px |
| Čísla (poklad, časovač) | Figtree Tabular, SemiBold | 48 px / 160 px |

Obě písma mají plnou českou diakritiku. Pro lokální demo je přibalíme do aplikace (`@fontsource`), aby hra fungovala i bez internetu.

### Prostor a tvary

- Mřížka po 8 px. Okraj obrazovky na telefonu je 20 px.
- Dotykový cíl má minimálně 56 px; hlavní tlačítko je 64 px vysoké a jde přes celou šířku.
- Zaoblení: karty 16 px, tlačítka 14 px, portréty hráčů kruh.
- Stíny se nepoužívají. Hloubku dělá jemná zlatá záře (`box-shadow: 0 0 24px rgba(212,169,60,.25)`) kolem aktivního prvku, jako světlo svíčky.

### Komponenty

| Komponenta | Popis |
| --- | --- |
| **Hlavní tlačítko** | Zlaté pozadí s tmavým textem, celá šířka, vždy ve spodní části. Neaktivní je obrys s šedým textem. |
| **Portrét hráče** | Kruh s fotkou, jinak iniciály na `--surface-2`. Pod ním jméno. Vyřazený hráč je černobílý a přeškrtnutý tenkou linkou. |
| **Mřížka hráčů** | 3 sloupce portrétů na telefonu. Výběr ukáže zlatý okraj a jemné zvětšení na 1,05. Hráč sám sebe v mřížce nevidí. |
| **Podrž pro odhalení** | Karta s pečetí. Hráč drží prst, pečeť se během 0,6 s „rozlomí“ a karta se otočí. Po puštění se zavře. |
| **Časovač** | Tenký zlatý pruh u horní hrany, který se zkracuje. Posledních 10 s pulzuje, ale nemění barvu. |
| **Fázový štítek** | Malý text nahoře („Kulatý stůl · 2. kolo“), aby hráč věděl, kde je. |
| **Toast** | Krátké oznámení dole nad tlačítkem, např. „Hlas odeslán“. Na velké obrazovce se nepoužívá. |

### Pohyb a vibrace

- Přechod mezi fázemi je prolnutí přes černou (400 ms), jako zhasnutí svíčky. Všechny telefony se přepnou najednou.
- Respektujeme `prefers-reduced-motion`: animace se pak zkrátí na prosté prolnutí.
- Vibrace mají jen tři vzory a všechny jsou stejné pro obě role:
  - **Nová fáze**: jedna krátká, 80 ms.
  - **Potvrzení**: dvě krátké.
  - **Jsi vyřazen**: jedna dlouhá, 400 ms. Přijde jen vyřazenému, ale ve chvíli, kdy jeho jméno stejně ukazuje velká obrazovka.

## Telefon hráče

Rozložení je na výšku a každá obrazovka má stejnou kostru:

```
┌─────────────────────────────┐
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬░░░░░░░░░░ │  ← časovač (jen když běží)
│ KULATÝ STŮL · 2. KOLO       │  ← fázový štítek
│                             │
│                             │
│        obsah fáze           │
│   (nadpis, mřížka, karta)   │
│                             │
│                             │
│                             │
│ ┌─────────────────────────┐ │
│ │      HLAVNÍ AKCE        │ │  ← vždy dole, palcem
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### 0. Vstup a lobby

Hráč naskenuje QR kód z velké obrazovky. Otevře se stránka s jediným polem na jméno. Fotka je volitelná: na mobilu otevře přední kameru a vyfotí selfie, které se ořízne do kruhu.

```
┌─────────────────────────────┐
│                             │
│           ZRADA             │
│      ─── ✦ ───              │
│                             │
│   Jak ti mají ostatní říkat?│
│ ┌─────────────────────────┐ │
│ │ Petra                   │ │
│ └─────────────────────────┘ │
│                             │
│        ( ◯ )                │
│     Přidat fotku            │
│     (nepovinné)             │
│                             │
│ ┌─────────────────────────┐ │
│ │       VSTOUPIT          │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

Po vstupu následuje **čekárna**: vlastní portrét uprostřed, pod ním „Čekáme na ostatní · 7 hráčů“ a jemně blikající plamen svíčky jako indikátor, že aplikace žije. Hráč tu nic nedělá.

### 1. Rozdání rolí

Tohle je nejcitlivější obrazovka. Obě role vidí **stejnou kartu s pečetí** a stejný text. Rozdíl je až pod pečetí.

```
┌─────────────────────────────┐
│ ROZDÁNÍ ROLÍ                │
│                             │
│   Tvoje role je tajná.      │
│   Ujisti se, že se ti nikdo │
│   nedívá přes rameno.       │
│                             │
│     ┌───────────────┐       │
│     │               │       │
│     │      ◉        │       │  ← vosková pečeť
│     │               │       │
│     └───────────────┘       │
│                             │
│ ┌─────────────────────────┐ │
│ │  PODRŽ PRO ODHALENÍ     │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

Po podržení:

```
  Věrný                         Zrádce
┌───────────────┐            ┌───────────────┐
│               │            │               │
│   JSI VĚRNÝ   │            │   JSI ZRÁDCE  │
│               │            │               │
│  Najdi Zrádce │            │ Tví spojenci: │
│  dřív, než    │            │  Tomáš        │
│  najdou tebe. │            │               │
└───────────────┘            └───────────────┘
```

- Obě karty mají stejnou barvu (`--surface-2` se zlatým písmem), stejnou velikost a počet řádků. Věrný má místo seznamu spojenců krátkou větu stejné délky, aby karta nevypadala „prázdněji“.
- Po puštění prstu se karta okamžitě zavře.
- Dole je malý odkaz „Viděl jsem svou roli“, který moderátorovi odškrtne hráče v konzoli. Roli si pak hráč může kdykoli znovu ukázat přes ikonu pečeti v rohu.

### 2. Mise

Telefon je tady jen informační: zadání mise (text od moderátora) a velké číslo pokladu. Hlavní tlačítko chybí, protože se hraje fyzicky. Když hráč získá štít, uvidí ho jen sám, opět přes podržení (stejná pečeť, text „Tuto noc tě chrání štít“). Ostatní hráči dostanou ve stejnou chvíli stejnou kartu s textem „Štít připadl někomu jinému“, takže nikdo nepozná, kdo štít dostal, podle toho, kdo zrovna drží telefon.

### 3. Kulatý stůl – hlasování

```
┌─────────────────────────────┐
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬░░░░░░░░░░░░ │
│ KULATÝ STŮL · 2. KOLO       │
│                             │
│   Koho vyženeš?             │
│                             │
│   ( ◯ )    ( ◯ )    ( ◯ )   │
│   Tomáš    Jana     Karel   │
│                             │
│   ( ◯ )   (( ◉ ))   ( ◯ )   │
│   Eva      Marek    Lucie   │  ← vybraný: zlatý okraj
│                             │
│   ( ◯ )    ( ◯ )            │
│   Ondra    Pavla            │
│                             │
│ ┌─────────────────────────┐ │
│ │   VYHNAT: MARKA         │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

- Tlačítko je neaktivní, dokud hráč někoho nevybere. Text tlačítka pak obsahuje jméno ve 4. pádě, aby hráč přesně věděl, co potvrzuje.
- Po potvrzení se mřížka ztlumí a objeví se „Hlas odevzdán · čekáme na ostatní (6/9)“. Hlas lze změnit, dokud moderátor hlasování neuzavře.
- Druhé kolo při remíze má stejný layout, jen s menší mřížkou a nadpisem „Rozstřel“.

### 4. Verbování

Nabídku vidí jen vybraný Věrný. Všichni ostatní ve stejné chvíli vidí obrazovku „Rada se radí…“ se svíčkou, aby nebylo poznat, kdo dostal nabídku. Nabídka sama je karta s pečetí na podržení se dvěma tlačítky:

```
│   ┌─────────────────────┐   │
│   │ Zrádci ti nabízejí  │   │
│   │ místo mezi sebou.   │   │
│   └─────────────────────┘   │
│ ┌──────────┐ ┌────────────┐ │
│ │ ODMÍTNOUT│ │  PŘIJMOUT  │ │
│ └──────────┘ └────────────┘ │
```

Obě tlačítka mají stejnou vizuální váhu (obrys), aby design hráče do ničeho netlačil. Zrádci v této fázi vybírají kandidáta v mřížce stejné jako u kulatého stolu.

### 5. Noc

Klíčové pravidlo z analýzy: **v noci ťuká každý**. Proto mají obě role stejnou dvojici panelů: **volbu** nahoře a **textové pole** dole.

```
  Věrný                            Zrádce
┌─────────────────────────┐      ┌─────────────────────────┐
│ ▬▬▬▬▬▬▬▬▬░░░░░░░░░░░░░ │      │ ▬▬▬▬▬▬▬▬▬░░░░░░░░░░░░░ │
│ NOC · 2. KOLO           │      │ NOC · 2. KOLO           │
│                         │      │                         │
│ Kdo je podle tebe Zrádce?│     │ Koho tuto noc umlčíte?  │
│ ( ◯ ) ( ◯ ) ( ◯ ) ( ◯ ) │      │ ( ◯ ) ( ◯ ) ( ◯ ) ( ◯ ) │
│ ( ◯ ) ( ◯ ) ( ◯ )       │      │ ( ◯ ) ( ◯ ) ( ◯ )       │
│                         │      │  Tomáš volí: Janu       │
│ ┌ Zápisník ───────────┐ │      │ ┌ Šeptání ────────────┐ │
│ │ Marek byl u stolu   │ │      │ │ Tomáš: Jana je moc  │ │
│ │ divně tichý…        │ │      │ │ chytrá, pryč s ní   │ │
│ │                     │ │      │ │                     │ │
│ └─────────────────────┘ │      │ └─────────────────────┘ │
│ ┌─────────────────────┐ │      │ ┌─────────────────────┐ │
│ │      POTVRDIT       │ │      │ │      POTVRDIT       │ │
│ └─────────────────────┘ │      │ └─────────────────────┘ │
└─────────────────────────┘      └─────────────────────────┘
```

- Věrný má **zápisník**: soukromé poznámky, které mu vydrží celou hru a jsou opravdu užitečné. Zrádce má na stejném místě **šeptání**, tedy chat se spoluzrádci. Oba panely vypadají stejně a liší se jen nadpisem a obsahem.
- Noční tip Věrného se počítá do bodů (stejně jako tip duchů), takže má smysl ho brát vážně.
- Noc má pevnou délku podle časovače. I když hráč potvrdí dřív, obrazovka zůstane otevřená do konce, aby nikdo nepoznal, že „už má hotovo“.
- Hráči se štítem se v noci nic nemění.

### 6. Snídaně

Telefon ukazuje jen „Probouzíte se…“ se svítáním (pozadí se zvolna zesvětlí z `--bg` na `--surface`). Oběť se odhaluje na velké obrazovce. Zavražděný dostane na telefon kartu „Tuto noc tě Zrádci umlčeli“ a dlouhou vibraci, ale až ve chvíli, kdy jeho jméno ukazuje velká obrazovka.

### 7. Finále

Stejná kostra jako hlasování, ale místo mřížky jsou jen dvě velké karty pod sebou:

```
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │     UKONČIT HRU         │ │
│ │  Věřím, že tu zbyli     │ │
│ │  jen Věrní.             │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │     VYHNAT DALŠÍHO      │ │
│ │  Mezi námi je pořád     │ │
│ │  Zrádce.                │ │
│ └─────────────────────────┘ │
```

Konec hry je na telefonu i velké obrazovce totožný: všechny role odkryté, vítězná strana a poklad.

### Režim ducha

Vyřazený hráč nezmizí, jen se změní nálada aplikace:

- Paleta se posune do `--ghost`: studená vybledlá modrá místo zlaté. Portrét hráče je poloprůhledný.
- Nahoře je trvale štítek „Jsi duch“ a počet bodů.
- Ve všech fázích tipuje Zrádce stejnou mřížkou jako ostatní. Za správný tip dostane body a vidí svou pozici v žebříčku duchů.
- Role ostatních se duch nedozví, ale vidí, co veřejně vidí všichni.

Barva ducha je v pořádku, protože vyřazení je veřejně známé a nic neprozrazuje.

### Stavy, které se snadno zapomenou

| Stav | Co hráč vidí |
| --- | --- |
| Ztráta spojení | Tenký pruh nahoře „Obnovuji spojení…“. Obsah zůstane, akce se zablokují. Po návratu se obrazovka sama přepne do aktuální fáze. |
| Nečinnost / zamknutý telefon | Po odemčení aplikace naváže na aktuální fázi přes token. Nic se neztratí. |
| Nestihl hlasovat | „Hlasování skončilo · tvůj hlas nebyl započítán“. Neutrálně, bez výčitek. |
| Pauza od moderátora | Celoobrazovkové „Pauza“ se svíčkou. Časovač stojí. |
| Prohlížeč na šířku | Výzva „Otoč telefon na výšku“. |

## Konzole moderátora

Konzole běží na notebooku nebo tabletu na šířku. Je tmavá jako zbytek aplikace, ale hustší a věcnější: méně dekorací, víc informací. Barvy rolí se tu používají, protože moderátor role zná.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ZRADA · moderátor     Hra K7Q2 · 2. kolo · KULATÝ STŮL   ▬▬▬▬░░ 02:14   │
│                                               [⏸ Pauza] [👁 Skrýt role] │
├───────────────────────┬──────────────────────────────┬───────────────────┤
│ HRÁČI (9 živých)      │                              │ ZÁZNAM            │
│                       │   Hlasování probíhá          │ 21:04 Petra hlas. │
│ ● Petra   V   ✔ hlas. │                              │ 21:04 Tomáš hlas. │
│ ● Tomáš   Z   ✔ hlas. │        6 / 9 hlasů           │ 21:03 Kolo 2 start│
│ ● Jana    V   … čeká  │   ████████████░░░░░░         │ 21:01 Štít: Eva   │
│ ● Karel   V   ✔ hlas. │                              │ 20:58 Mise +300   │
│ ● Eva     V 🛡 … čeká  │   Průběžně (jen moderátor):  │ …                 │
│ ○ Marek   Z   odpojen │   Marek 3 · Jana 2 · Karel 1 │                   │
│ ● Lucie   V   ✔ hlas. │                              │                   │
│ ● Ondra   V   ✔ hlas. │                              │                   │
│ ● Pavla   V   ✔ hlas. │                              │                   │
│ ─ duchové ─           │                              │                   │
│ ✝ Filip   V  (noc 1)  │ ┌──────────────────────────┐ │                   │
│                       │ │ UZAVŘÍT HLASOVÁNÍ ▸      │ │                   │
│                       │ └──────────────────────────┘ │                   │
├───────────────────────┴──────────────────────────────┴───────────────────┤
│ Další: Odhalení hlasů → Odhalení role vyhnaného → Noc                    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Rozložení**

- **Horní lišta**: kód hry, kolo, fáze, časovač a dvě trvalá tlačítka, Pauza a **Skrýt role**. Skrytí rolí zakryje všechna písmena V/Z, když se moderátorovi někdo dívá na obrazovku.
- **Vlevo seznam hráčů**: stav připojení (● zelená / ○ oranžová), role (V zeleně, Z červeně), štít 🛡 a stav akce v aktuální fázi. Kliknutím na hráče se otevře menu zásahů: vyřadit ručně, odpojit zařízení, zobrazit kód pro přihlášení na jiném telefonu.
- **Uprostřed panel fáze**: co se právě děje a jedno velké zlaté tlačítko s názvem další akce. Tlačítko se nikdy nepřesouvá, takže ho moderátor najde i bez dívání.
- **Vpravo záznam událostí**: časová osa toho, co se stalo, pro případ sporu („já jsem přece hlasovala!“).
- **Dolní lišta**: co následuje po stisknutí tlačítka, aby moderátor viděl dva kroky dopředu.

**Panel fáze podle fáze**

| Fáze | Obsah panelu | Hlavní tlačítko |
| --- | --- | --- |
| Lobby | QR kód, počet připojených, nastavení (počet Zrádců s doporučenou hodnotou, počet kol, délky časovačů, mise ano/ne) | Rozdat role |
| Rozdání rolí | Kolik hráčů už roli vidělo (8/10) | Začít 1. kolo |
| Mise | Pole pro zadání mise (text se pošle na telefony), částka do pokladu, výběr hráče pro štít | Zapsat výsledek mise |
| Kulatý stůl | Postup hlasování a průběžný výsledek | Uzavřít hlasování → Odhalit hlasy → Odhalit roli |
| Verbování | Koho Zrádci vybrali a zda odpověděl | Pokračovat do noci |
| Noc | Jen „Zrádci: hotovo / čeká se“, ne koho volí (moderátor to zjistí až ráno, stejně jako ostatní) | Ukončit noc |
| Snídaně | Výsledek noci připravený k odhalení (nebo „štít zafungoval“) | Odhalit oběť |
| Finále | Hlasy Ukončit / Vyhnat | Odhalit výsledek |

**Destruktivní akce** (ruční vyřazení, opakování hlasování, ukončení hry) vyžadují potvrzení v dialogu a jsou v menu, ne na hlavní ploše, aby se nedaly spustit omylem.

## Velká obrazovka

Běží na TV nebo projektoru na šířku (16:9) a nic se na ní neovládá. Má největší písmo, nejpomalejší animace a jediná hraje zvuk. Všechno musí být čitelné ze 6 metrů: minimální velikost textu je 40 px při 1080p.

### Lobby

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                          Z R A D A                           │
│                         ─── ✦ ───                            │
│                                                              │
│      ┌────────────┐        ( ◯ ) ( ◯ ) ( ◯ ) ( ◯ )           │
│      │ ▓▓  ▓ ▓▓▓  │        Petra Tomáš Jana  Karel           │
│      │ ▓ ▓▓▓  ▓   │                                          │
│      │ ▓▓▓ ▓  ▓▓  │        ( ◯ ) ( ◯ ) ( ◯ )                 │
│      └────────────┘        Eva   Marek Lucie                 │
│   Naskenuj a připoj se                                       │
│   192.168.1.24:5173        7 hráčů u stolu                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

QR kód a pod ním adresa textem (pro lokální demo IP počítače v síti). Nově připojený hráč se objeví s jemným „rozhořením“ portrétu a tichým zvukem zapálené sirky.

### Během hry (klidový stav)

Ve středu je název fáze velkým patkovým písmem, pod ním číslo kola. Nahoře vpravo je **poklad** (velké zlaté číslo, které se při přičtení roztočí jako počítadlo). Dole je řada portrétů živých hráčů a vpravo dole malý **žebříček duchů**.

### Odhalení hlasů

Nejdůležitější scéna celé hry. Moderátor ji spouští hlas po hlasu:

```
┌──────────────────────────────────────────────────────────────┐
│  KULATÝ STŮL · 2. KOLO                                       │
│                                                              │
│      ( ◯ )                                                   │
│      Petra        hlasuje pro    ┌─────────────┐             │
│                                  │   MARKA     │             │
│                                  └─────────────┘             │
│                                                              │
│  Marek ▮▮▮        Jana ▮▮        Karel ▮                     │
└──────────────────────────────────────────────────────────────┘
```

- Každý hlas je karta, která se otočí (zvuk otočení karty). Dole rostou sloupce hlasů.
- Po posledním hlasu se vítěz hlasování přiblíží doprostřed a ostatní ztmavnou.
- **Odhalení role vyhnaného**: 3 s ticha a temného dunění, pak se karta otočí. Zrádce se rozsvítí `--blood` s nízkým tónem gongu, Věrný `--loyal` se zklamaným, tichým akordem. Tady je barva role v pořádku, protože je veřejná.

### Noc a snídaně

- **Noc**: obrazovka téměř černá, jen svíčka a text „Noc“. Tichý ambient (vítr, praskání ohně). Nic se neodhaluje.
- **Snídaně**: postupné svítání a portréty všech živých hráčů. Na pokyn moderátora jeden portrét pomalu vybledne do šedi a objeví se jméno oběti. Pokud zafungoval štít, všechny portréty se naopak rozsvítí a nápis zní „Tuto noc nikdo nezemřel“.

### Finále

Postupné odkrývání rolí všech hráčů, jeden po druhém. Nakonec celoobrazovkový nápis vítězné strany a poklad, který se „rozsype“ mezi vítěze (nebo celý připadne Zrádci).

### Zvuky

Jen velká obrazovka. Krátké, tlumené, „dřevěné a kamenné“, ne arkádové:

| Událost | Zvuk |
| --- | --- |
| Hráč se připojil | zapálení sirky |
| Nová fáze | úder do zvonu z dálky |
| Hlas otočen | otočení karty |
| Odhalen Zrádce | nízký gong |
| Odhalen Věrný | tichý molový akord |
| Noc | ambient: vítr, oheň |
| Oběť noci | jediný úder bubnu |
| Poklad roste | cinkání mincí |

Moderátor má v konzoli ztlumení zvuku. Při prvním zobrazení obrazovka vyžaduje jedno kliknutí („Zahájit“), protože prohlížeče jinak zvuk nepustí.

## Přístupnost

- Kontrast textu minimálně 4,5 : 1, u hlavních prvků přes 7 : 1.
- Informace nikdy nejsou jen v barvě: role v konzoli mají písmeno V/Z, stav připojení tvar ●/○, vyřazený hráč přeškrtnutí.
- Velikost písma na telefonu respektuje systémové zvětšení až do 130 % bez rozbití layoutu.
- `prefers-reduced-motion` vypne otáčení karet a dlouhé animace a nahradí je prolnutím.
- Celá aplikace je česky, formulace v 2. osobě, krátce a bez technických slov („Obnovuji spojení“, ne „WebSocket disconnected“).

## Návrh pro implementaci

Pro lokální demo stačí:

- **Tailwind CSS** s tokeny výše v `tailwind.config` (nebo CSS proměnné, pokud se Tailwind nepoužije).
- **Framer Motion** pro otáčení karet, prolínání fází a počítadlo pokladu.
- **@fontsource/cinzel** a **@fontsource/figtree**, přibalené fonty bez závislosti na internetu.
- **qrcode.react** pro QR kód v lobby a na velké obrazovce.
- Zvuky jako krátké `.mp3` v `public/sounds`, z volně licencovaných knihoven.

Doporučené pořadí: nejdřív design systém a sdílené komponenty (tlačítko, portrét, mřížka, karta s pečetí, časovač), potom telefon hráče, potom konzole a nakonec velká obrazovka. Ta je nejvíc „show“ a na kurzu nejlíp vynikne.
