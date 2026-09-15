# Česká sodovka: oprava přiřazení obrázků ke zprávám

Kontrola 15. 9. 2026.

**Texty byly v pořádku.** JSON nahraný podruhé je byte po bytu identický s tím, ze kterého se hra stavěla. Všech 100 Grok promptů souhlasí s JSONem v kategorii, titulku i popisu scény. Nasazený `js/soda.js` souhlasí se JSONem ve všech 100 položkách.

**Obrázky v pořádku nebyly.** Soubory byly očíslované v jiném pořadí, než v jakém jsou zprávy. Ke správné zprávě sedělo jen 21 ze 100.

V repozitáři je oprava už nasazená. Tahle tabulka slouží k opravě vaší zdrojové složky a ke kontrole.

## Jak číst tabulku

- **Nový soubor** = číslo, pod kterým musí obrázek být, aby seděl ke zprávě.
- **Původní soubor** = číslo, pod kterým ten stejný obrázek přišel v ZIPu.

| Nový soubor | Původní soubor | Co je na obrázku |
|---|---|---|
| 001 | 003 | parkovací automat a řada aut na dlážděném náměstí |
| 002 | 002 (beze změny) | mobilní telefon s mapou plnou červených bodů nad ulicí plnou aut |
| 003 | 001 | parkoviště u nádraží se závorou a automatem na lístky |
| 004 | 006 | sdílené kolo opřené šikmo o sloup veřejného osvětlení |
| 005 | 004 | vizualizace parkovacího domu vedle panelového sídliště |
| 006 | 007 | cyklostezka s dopravní značkou v parku se stromy |
| 007 | 005 | rozbitý semafor na frekventované křižovatce |
| 008 | 008 (beze změny) | jednosměrná ulice s dopravní značkou v centru města |
| 009 | 011 | elektrobus s otevřenou kapotou na konečné zastávce |
| 010 | 009 | prázdné parkovací místo s cedulí vyhrazeno pro asistovanou službu |
| 011 | 010 | kruhový objezd s dopravními značkami na okraji města |
| 012 | 012 (beze změny) | rozkopaná silnice s výkopem a plynovou trubkou |
| 013 | 013 (beze změny) | nová okružní křižovatka s čerstvým asfaltem |
| 014 | 015 | chodník plný výtluků vedle nově vyasfaltované silnice |
| 015 | 014 | semafor svítící červeně na prázdné křižovatce za soumraku |
| 016 | 017 | socha opice uprostřed kruhového objezdu u zoo |
| 017 | 016 | uzavřená ulice s dopravními kužely před obchody |
| 018 | 018 (beze změny) | velký kruhový objezd s mnoha výjezdy a auty |
| 019 | 020 | starý most přes řeku s lešením |
| 020 | 019 | úzká silnice podél parku s cedulí probíhá studie |
| 021 | 021 (beze změny) | tramvaj přijíždějící přesně na zastávku podle displeje |
| 022 | 022 (beze změny) | telefon s aplikací MHD na prázdné zastávce |
| 023 | 023 (beze změny) | interiér tramvaje se zamženými okny v létě |
| 024 | 024 (beze změny) | prázdná noční zastávka s jízdním řádem |
| 025 | 025 (beze změny) | nový přístřešek zastávky u nádraží s deštěm ze strany |
| 026 | 029 | trolejbus zastavený pod spadlým stromem na dráty |
| 027 | 027 (beze změny) | displej zastávky ukazující dvě zpožděné tramvaje najednou |
| 028 | 026 | platební terminál v tramvaji s chybovou hláškou |
| 029 | 028 | autobusová zastávka s novou i starou cedulí názvu |
| 030 | 030 (beze změny) | nový elektrobus vyfocený na tiskové konferenci před radnicí |
| 031 | 032 | rozestavěný chodník s lešením v parku |
| 032 | 031 | nový chodník končící u keře na nábřeží |
| 033 | 034 | schodiště obehnané páskou u náměstí |
| 034 | 033 | žlutý vodicí pruh pro nevidomé končící u zdi pavilonu |
| 035 | 037 | nová dlažba na náměstí s jednou čerstvou dírou |
| 036 | 035 | výtah na radnici s cedulí mimo provoz |
| 037 | 038 | opravená lávka přes řeku vedoucí k lešení |
| 038 | 036 | chodci jdoucí po okraji vozovky vedle rozkopaného chodníku |
| 039 | 041 | nové lavičky bez opěradel na třídě |
| 040 | 043 | osvětlený prázdný chodník uprostřed noci |
| 041 | 040 | nová popelnice na tříděný odpad se zaseklým víkem |
| 042 | 047 | svozové auto na bioodpad projíždějící prázdnou ulicí |
| 043 | 045 | kontejnery na sklo těsně u okna bytového domu |
| 044 | 039 | vítězná popelnice s mašlí předávaná na pódiu |
| 045 | 046 | čipovaná popelnice s displejem ukazujícím chybu vážení |
| 046 | 042 | prázdný sběrný dvůr v podvečer s otevřenou branou |
| 047 | 050 | malý odpadkový koš přeplněný vedle větší hromady odpadků |
| 048 | 044 | hromada kelímků bez ouška na stole festivalového stánku |
| 049 | 048 | podzemní kontejner na náměstí zalitý po dešti |
| 050 | 049 | přeplněný kontejner s odpadky na chodníku |
| 051 | 052 | obrazovka s objednávkovým systémem, termín za tři měsíce |
| 052 | 051 | formulář s kolkem na přepážce úřadu |
| 053 | 057 | chybová hláška na obrazovce online formuláře (**znak Plzně + fiktivní přihlášené jméno**) |
| 054 | 055 | řada lidí čekajících u veřejného počítače v čekárně |
| 055 | 059 | telefonní linka s nekonečnou nahrávkou čekejte prosím |
| 056 | 054 | pokácený strom vedle cedule zde bude výsadba |
| 057 | 060 | veřejně dostupný účet na obrazovce v prázdné místnosti |
| 058 | 053 | vývěska s úředními hodinami mimo dosah pouličního osvětlení |
| 059 | 058 | výdejní automat na pořadová čísla s frontou čísel na displeji |
| 060 | 056 | stavební žádost s novým jednodušším razítkem na stole |
| 061 | 061 (beze změny) | rodiče ve frontě před mateřskou školkou za tmy |
| 062 | 062 (beze změny) | nová budova školky s frontou rodičů venku |
| 063 | 063 (beze změny) | vizualizace nové školní budovy na prázdném pozemku |
| 064 | 065 | školní jídelna s dlouhou frontou dětí |
| 065 | 066 | plakát s vizualizací hřiště vedle prázdného oploceného pozemku |
| 066 | 069 | kontejnerová třída obklopená stavebním materiálem |
| 067 | 067 (beze změny) | rodiče vyplňující papírové formuláře u přepážky školky |
| 068 | 064 | nová tělocvična s páskou zákaz vstupu na dveřích |
| 069 | 070 | webová stránka s nápisem kapacita naplněna |
| 070 | 068 | nová cedule družina na starých dveřích školy |
| 071 | 071 (beze změny) | revitalizovaný břeh rybníka s bagrem opodál |
| 072 | 072 (beze změny) | řada nově vysazených stromků, polovina zaschlá |
| 073 | 075 | vstupní brána zoo s cedulí nová expozice připravujeme |
| 074 | 073 | komunitní zahrada s prázdnými záhony a seznamem čekatelů |
| 075 | 076 | hejno holubů na náměstí u cedule zákazu krmení |
| 076 | 074 | pes běhající po trávníku vedle prázdného psího parku |
| 077 | 077 (beze změny) | vypnutá fontána v parku v letním horku |
| 078 | 078 (beze změny) | zelená střecha nad řadou garáží vedle úřední budovy |
| 079 | 080 | vybledlá informační cedule naučné stezky u rybníka |
| 080 | 081 | divoké prase procházející sídlištěm za soumraku |
| 081 | 082 | letní kino s dvaceti židlemi a plátnem |
| 082 | 079 | plakát festivalu vylepený den před konáním na náměstí |
| 083 | 086 | uzavřená silnice před vchodem do vědeckého centra |
| 084 | 085 | vánoční strom na náměstí bez ozdobených světel |
| 085 | 083 | vyhlídková věž s cedulí výtah mimo provoz |
| 086 | 087 | davy lidí na náměstí a plné parkoviště opodál |
| 087 | 089 | divadelní plakát s názvem hry o udělování grantů |
| 088 | 084 | chodci a cyklisté sdílející novou cyklostezku podél řeky |
| 089 | 096 | vchod do výstavní haly obklopený stavební ohradou |
| 090 | 092 | tržní stánky na náměstí s dodávkami zaparkovanými kolem |
| 091 | 088 | bezpečnostní kamera na sloupu s blikajícím výpadkovým světlem |
| 092 | 090 | chytrá lampa tlumeně svítící na prázdné ulici |
| 093 | 095 | mobilní aplikace s tlačítkem odeslat bez reakce |
| 094 | 093 | senzor na kontejneru s ikonou vybité baterie |
| 095 | 100 | veřejný wifi hotspot na náměstí s jedním notebookem |
| 096 | 091 | stará bezpečnostní kamera u přechodu pro chodce |
| 097 | 097 (beze změny) | rezervační kalendář hřiště s blokací údržba serveru |
| 098 | 094 | SMS s varováním před povodní s datem o den pozdějším |
| 099 | 098 | papírové oznámení vylepené na skleněných dveřích úřadu |
| 100 | 099 | obrazovka chatbota s opakující se stejnou odpovědí |

## Obrázky, které seděly už předtím (21)

002, 008, 012, 013, 018, 021, 022, 023, 024, 025, 027, 030, 061, 062, 063, 067, 071, 072, 077, 078, 097

## Poznámka ke znaku města

Obrázek se znakem Plzně a fiktivním přihlášeným jménem, který jste vědomě nechal beze změny, měl dřív číslo **057**. Po přečíslování je to soubor **053** (zpráva o chybové hlášce online formuláře). Není to jediný obrázek s městskou identitou, viz shrnutí v projektovém dokumentu.
