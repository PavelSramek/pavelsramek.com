# Pavel Šrámek — osobní web

Statický web (čisté HTML/CSS/JS, žádný build krok) připravený k nasazení na Netlify a spravovaný přes git.

## Struktura

```
.
├── index.html            Domovská stránka
├── o-mne.html             O mě — profesní příběh, FAQ
├── program.html           Priority / program — 4 pilíře se stavem plnění
├── co-se-povedlo.html      Realizované projekty
├── investice.html          Investice do Plzně 3 — data a grafy (minulé vs. současné období)
├── galerie.html            Foto/video galerie (filtrovatelná)
├── kontakt.html            Kontaktní formulář + Calendly rezervace + "Připomeň mi volby" + FAQ
├── dekujeme.html           Děkovná stránka po odeslání formuláře
├── 404.html                Vlastní stránka "nenalezeno"
├── css/style.css           Sdílený design (barvy, typografie, komponenty)
├── js/main.js              Mobilní menu, filtr galerie, potvrzení formuláře
└── netlify.toml            Konfigurace Netlify
```

Žádný build systém, žádné závislosti — stačí otevřít `index.html` v prohlížeči pro lokální náhled, nebo použít libovolný statický server (viz níže).

## Co je nové oproti starému webu (Squarespace)

- **Kontaktní formulář**, který reálně funguje přes Netlify Forms (`kontakt.html`) — zprávy chodí do Netlify administrace / e-mailem.
- **Foto/video galerie** (`galerie.html`) s filtrováním podle kategorie (Akce / Projekty / Média) — připravená na doplnění vašich fotek.
- **Samostatná stránka priorit** (`program.html`) s popisem každého pilíře a stavem plnění (Dokončeno / Probíhá / Připravuje se).
- **Stránka Investice** (`investice.html`) — srovnání investic za minulé a současné volební období, po letech i po kategoriích, plus zvlášť opravy a údržba MŠ. Grafy jsou čisté HTML/CSS (žádná JS knihovna), s legendou, hover/focus tooltipy na každém sloupci a skrytou tabulkou dat pod „Zobrazit data v tabulce" pro přístupnost. Barvy (fialová/jantarová) jsou validované na barvoslepost a kontrast.
- **Přebarveno na pirátskou paletu** — přechod fialová → růžová → oranžová → zlatá, do černé (podle vaší kampaňové grafiky), místo původní tmavě modré. Definováno v `css/style.css` v `:root` proměnných (`--purple`, `--pink`, `--orange`, `--accent`).
- Zachován veškerý původní obsah: bio, profesní historie, 4 body programu, 3 realizované projekty, FAQ, citát, kontakty a sociální sítě.

## Data ve stránce Investice

Čísla v `investice.html` vycházejí z podkladů, které poskytla Petra (přehled investic) a Lada (opravy a údržba MŠ) — interní evidence MO Plzeň 3, stav k 31. 7. 2026. Pokud se podklady aktualizují, hodnoty i výšky sloupců v grafu je potřeba přepočítat ručně (nejde o dynamický graf napojený na zdroj dat).

## Než nasadíte — co doplnit

1. **Fotky** — nahraďte zástupné rámečky (v `index.html`, `o-mne.html`, `co-se-povedlo.html`, `galerie.html`) skutečnými obrázky. Uložte je do `img/` a nahraďte např.:
   ```html
   <div class="hero-portrait">Portrétní fotografie...</div>
   ```
   za
   ```html
   <img class="hero-portrait" src="img/portret.jpg" alt="Pavel Šrámek">
   ```
   (bude potřeba drobná úprava CSS `object-fit: cover` pro `<img>` variantu — dejte vědět, pokud chcete rovnou dosadit.)

2. ~~Odkaz na schůzku~~ — hotovo (viz commit „Embed real Calendly widget“): `kontakt.html` má napojený skutečný Calendly kalendář (`pavelsramek/osobni-schuzka-60-min`) jako embedovaný widget přímo na stránce (sekce „Vyberte si volný čas“), plus tlačítko v hero sekci na něj odkazuje.

3. **Odkaz na pirátský program** — v `program.html` je obecný odkaz na pirati.cz. Nahraďte přímým odkazem na krajský/obvodní program, pokud existuje.

## Nasazení na Netlify (přes Git)

1. Vytvořte prázdný repozitář na GitHubu (nebo GitLabu/Bitbucketu).
2. V této složce:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: osobní web Pavla Šrámka"
   git branch -M main
   git remote add origin <URL_VAŠEHO_REPOZITÁŘE>
   git push -u origin main
   ```
3. Na [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project** → vyberte repozitář.
4. Build settings nechte prázdné (žádný build command), **Publish directory: `.`** (root) — Netlify si to přečte i sám z `netlify.toml`.
5. Klikněte **Deploy site**.
6. V **Site settings → Domain management** si nastavte vlastní doménu (např. `pavelsramek.cz`), pokud ji vlastníte.

Každý další `git push` na `main` automaticky znovu nasadí web.

## Formuláře (Netlify Forms)

Oba formuláře (`kontakt.html` a "Připomeň mi volby") mají atribut `data-netlify="true"` — Netlify je při nasazení automaticky detekuje a začne přijímat odeslání, aniž byste museli cokoliv nastavovat na backendu.

Po prvním nasazení doporučuji:

1. V Netlify administraci **Site settings → Forms → Form notifications** přidat e-mailové upozornění na `pavel.sramek@pirati.cz`, ať o nových zprávách víte hned.
2. Zkontrolovat **Site settings → Forms → Spam filtering** (honeypot pole `bot-field` je už v HTML zapnuté, což pokryje většinu spamu).

## Lokální náhled

Není potřeba žádná instalace — stačí otevřít `index.html` přímo v prohlížeči. Pro plné otestování formulářů a přesměrování doporučuji použít Netlify CLI:

```bash
npm install -g netlify-cli
netlify dev
```
