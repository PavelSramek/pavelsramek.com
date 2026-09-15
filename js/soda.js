/* Česká sodovka — satirický generátor zpráv pro Laboratoř.
   Pevný seznam 100 ručně napsaných položek, každá s vlastním obrázkem
   (img/sodovka/001.jpg … 100.jpg, 1168x784). Žádné skóre, žádná gesta:
   jediná interakce je tlačítko "Další zpráva".
   Pořadí je "shuffle bag" — všech 100 se vystřídá, než se některá zopakuje. */
(function(){
  var root = document.getElementById('sodaRoot');
  if(!root) return;

  var imgEl      = document.getElementById('sodaImg');
  var catEl      = document.getElementById('sodaCat');
  var headlineEl = document.getElementById('sodaHeadline');
  var quoteEl    = document.getElementById('sodaQuote');
  var roleEl     = document.getElementById('sodaRole');
  var counterEl  = document.getElementById('sodaCounter');
  var nextBtn    = document.getElementById('sodaNext');
  var paperEl    = document.getElementById('sodaPaper');
  if(!imgEl || !headlineEl || !nextBtn) return;

  var IMG_DIR = 'img/sodovka/';

  // [id, rubrika, titulek, role mluvčího, citace]
  var NEWS = [
    [1,"doprava","Nová parkovací zóna na náměstí Republiky má vyšší sazbu než nájem v centru, radnice se brání: aspoň něco tu vydělává.","mluvčí radnice","Berte to jako investiční příležitost, ne pokutu."],
    [2,"doprava","Město spustilo aplikaci na hledání volných parkovacích míst, výsledek: žádná volná místa, jen lepší grafika.","uživatel aplikace","Aspoň vím přesně, že nemám kde zaparkovat."],
    [3,"doprava","Parkoviště u hlavního nádraží zdraženo o 200 %, cestující raději jezdí vlakem do jiného města a odtud pěšky zpět.","mluvčí Českých drah","Doprava funguje, jen jinak, než jsme čekali."],
    [4,"doprava","Nový systém sdílených kol v centru hlásí rekordní využití, důvod: řidiči je používají jako náhradní zábrany na parkování.","technik sdílených kol","Nikdy jsem neviděl kolo zaparkované tak kreativně."],
    [5,"doprava","Radnice zvažuje zavedení parkovacích domů na sídlištích, obyvatelé žádají hlavně to, aby dům nebyl vyšší než jejich panelák.","obyvatel sídliště","Hlavně ať nekouká přímo do kuchyně."],
    [6,"doprava","Křižíkovy sady dostaly nová dopravní omezení, cyklisté si stěžují, že teď musí jezdit stejně pomalu jako dřív, jen s cedulí navíc.","cyklista","Aspoň mám teď cedulku, o kterou se můžu opřít."],
    [7,"doprava","Semafor na Klatovské třídě se rozbil, provoz se zrychlil, řidiči žádají, aby se to tak nechalo.","řidič","Konečně semafor, co nezdržuje."],
    [8,"doprava","Nová jednosměrka v centru zkrátila cestu autem, prodloužila cestu pěšky, radnice hlásí úspěch.","chodec","Autem rychleji, pěšky déle, logika jasná."],
    [9,"doprava","Testovací provoz elektrobusů skončil kvůli přehřívání baterií, náhradní autobusy jezdí na naftu, statistiky emisí přesto vylepšeny.","mluvčí dopravního podniku","Emise klesly, i když motor jel dýl."],
    [10,"doprava","Parkovací asistent pro seniory: nová služba, kdy úředník osobně zaparkuje vaše auto, zatím funguje jen v teorii.","úředník","V teorii to funguje bezvadně."],
    [11,"silnice","Kruhový objezd na Borech dostal třetí název v řadě, řidiči jezdí pořád stejně.","řidič","Aspoň má objezd bohatou historii jmen."],
    [12,"silnice","Oprava silnice na Karlovarské byla dokončena dřív, než se čekalo, hned se ale musela znovu rozkopat kvůli plynu.","dělník","Rozkopali jsme to, abychom to zase zakopali."],
    [13,"silnice","Nová kruhová křižovatka u Košutky má prý zlepšit průjezdnost, autům to zatím trvá o pět minut déle, ale s lepším pocitem.","dopravní expert","Pět minut navíc je cena za bezpečnost."],
    [14,"silnice","Silnice na Doubravce dostala nový povrch, výmoly se přestěhovaly na chodník.","chodec","Výmoly se prostě přestěhovaly, jako my."],
    [15,"silnice","Radnice testuje chytré semafory, které se řídí náladou řidičů, výsledek: většinu dne svítí červená.","technik semaforů","Nálada řidičů je bohužel dlouhodobě rudá."],
    [16,"silnice","Nová okružní křižovatka u Zoo Plzeň má sochu opice uprostřed, řidiči tvrdí, že provoz teď má aspoň vtip.","řidič","Konečně provoz s trochou humoru."],
    [17,"silnice","Silniční uzávěrka na Americké třídě prodloužena podruhé, obchodníci žádají alespoň ceduli s omluvou.","obchodník","Cedule s omluvou by neublížila."],
    [18,"silnice","Nový kruhový objezd na Slovanech je tak velký, že řidiči najedou celý kruh, než najdou svůj výjezd.","turista","Objeli jsme město, aniž jsme opustili kruh."],
    [19,"silnice","Radnice slibuje opravu mostu přes Radbuzu do konce volebního období, otázkou zůstává kterého.","mluvčí radnice","Termín platí, jen ještě nevíme který rok."],
    [20,"silnice","Dopravní studie doporučila zúžení silnice u Lochotínského parku, řidiči doporučují zúžit spíš studii.","autor studie","Doporučujeme zúžit hlavně diskuzi."],
    [21,"mhd","Tramvaj číslo 4 jezdí přesně podle jízdního řádu, cestující ohlašují to jako mimořádnou událost.","cestující","Historický okamžik pro celou linku."],
    [22,"mhd","Nová aplikace na sledování MHD v reálném čase ukazuje, že autobus je na cestě už čtyřicet minut.","cestující","Aplikace mi aspoň dělá společnost."],
    [23,"mhd","Plzeňské dopravní podniky testují klimatizaci v tramvajích, funguje spolehlivě, jen v zimě.","technik dopravního podniku","V zimě to funguje bezvadně."],
    [24,"mhd","Noční autobusová linka zrušena kvůli nízkému zájmu, cestující tvrdí, že zájem měli, jen autobus nikdy nepřijel.","cestující","Zájem jsme měli, autobus ne."],
    [25,"mhd","Zastávka u Hlavního nádraží dostala nový přístřešek, prší do něj akorát ze strany, odkud fouká vítr.","cestující","Aspoň vím, odkud fouká vítr."],
    [26,"mhd","Trolejbus na lince 13 uvízl na dráty spadlém stromě, cestující ocenili aspoň výhled.","řidič trolejbusu","Výhled byl fakt hezký."],
    [27,"mhd","Nový jízdní řád zkrátil interval tramvají na Slovany, praxe ukazuje, že se akorát zdvojily zpoždění.","cestující","Zpoždění se teď aspoň zdvojilo systematicky."],
    [28,"mhd","Plzeňská MHD spustila platbu kartou, systém funguje bezchybně, kromě chvil, kdy má někdo nastoupit.","cestující","Systém funguje, dokud nechci nastoupit."],
    [29,"mhd","Autobusová zastávka na Košutce přejmenována podruhé za rok, řidiči ji pořád hlásí starým názvem.","řidič autobusu","Starý název je prostě chytlavější."],
    [30,"mhd","Nový elektrobus představen na tiskové konferenci, do provozu nasazen zatím jen na fotografie.","mluvčí dopravního podniku","Fotogenický je stoprocentně."],
    [31,"chodniky","Rekonstrukce chodníku v Sadech Pětatřicátníků má termín dokončení posunutý potřetí, tentokrát kvůli nepředvídatelnému počasí.","stavbyvedoucí","Počasí je letos fakt nepředvídatelné."],
    [32,"chodniky","Nový chodník na Denisově nábřeží je širší, ale vede přímo do keře.","chodec","Aspoň je ten keř pěkný."],
    [33,"chodniky","Oprava schodů u Mikulášského náměstí trvá už druhý rok, radnice slibuje, že tentokrát je to opravdu poslední fáze.","mluvčí radnice","Poslední fáze trvá už déle než ty předchozí dohromady."],
    [34,"chodniky","Chodník u Zoo Plzeň dostal žlutý pruh pro nevidomé, vede bohužel rovnou do zdi pavilonu.","chodec","Vede přesně tam, kam nechci."],
    [35,"chodniky","Nová dlažba na Habrmannově náměstí je prý bezúdržbová, první díra se objevila do týdne.","dodavatel","Bezúdržbová dlažba, první rok zdarma."],
    [36,"chodniky","Radnice slibuje bezbariérový přístup na radnici, výtah je zatím mimo provoz kvůli rekonstrukci vstupu.","návštěvník úřadu","Bezbariérové je to hlavně na papíře."],
    [37,"chodniky","Oprava lávky přes Mži byla dokončena, lávka teď vede jen k lešení na druhé straně.","chodec","Lávka nikam nevede, ale je hezká."],
    [38,"chodniky","Chodník na Anglickém nábřeží prochází kompletní obnovou, chodci prozatím chodí po silnici.","chodec","Chodíme po silnici, jsme skoro řidiči."],
    [39,"chodniky","Nový mobiliář na Americké třídě: lavičky bez opěradel, prý kvůli modernímu designu, prakticky kvůli levnějšímu tendru.","designér mobiliáře","Opěradlo by kazilo linii."],
    [40,"chodniky","Radnice instalovala na náměstí nové osvětlení chodníku, svítí od půlnoci do čtvrté ráno, kdy tam nikdo nechodí.","chodec","Svítí přesně, když to nikdo nepotřebuje."],
    [41,"odpady","Popelnice na tříděný odpad na Košutce dostaly nová víka, obyvatelé je teď nedokážou otevřít vůbec.","obyvatel","Otevřít se to nedá, ale recyklovat můžeme aspoň emoce."],
    [42,"odpady","Nový svoz bioodpadu spuštěn v centru, svážecí auto jezdí jednou za měsíc, prý kvůli optimalizaci tras.","technik svozu","Optimalizace znamená míň jezdit."],
    [43,"odpady","Kontejnery na sklo přemístěny blíž k domům, sousedské spory o hluk teď mají oficiální místo konání.","soused","Teď máme oficiální místo na hádku."],
    [44,"odpady","Radnice spustila soutěž o nejlépe tříděnou domácnost, výhrou je další popelnice.","mluvčí radnice","Motivace musí být hmatatelná."],
    [45,"odpady","Nový systém čipování popelnic na Slovanech měří váhu odpadu, občané tvrdí, že hlavně měří trpělivost.","obyvatel","Trpělivost měřej, kolik chceš."],
    [46,"odpady","Sběrný dvůr v Doubravce prodloužil otevírací dobu, jen v době, kdy tam nikdo nemá čas jít.","pracovník sběrného dvora","Otevřeno máme přesně, když nikdo nemá čas."],
    [47,"odpady","Odpadkové koše v centru vyměněny za menší, prý estetičtější, odpad teď leží vedle nich.","kolemjdoucí","Odpad teď leží estetičtěji."],
    [48,"odpady","Kampaň na omezení jednorázových kelímků na festivalech skončila úspěchem, kelímky teď jen nemají ouška.","organizátor festivalu","Kelímky bez ouška jsou budoucnost."],
    [49,"odpady","Radnice testuje podzemní kontejnery na náměstí, funguje skvěle, dokud nezačne pršet.","technik","Funguje skvěle, dokud je sucho."],
    [50,"odpady","Nová aplikace nahlašuje přeplněné kontejnery v reálném čase, přeplněné jsou průměrně od úterý do neděle.","obyvatel","Přeplněno je vlastně stálý stav."],
    [51,"byrokracie","Radnice zavedla objednávkový systém na úřad, první volný termín je za tři měsíce, ideálně na vyřízení věci, co nepočká.","úředník","Termín je pevný, jen vzdálený."],
    [52,"byrokracie","Nový formulář na žádost o parkovací kartu má o dvě strany méně, obsahuje ale nový kolek navíc.","žadatel","Papíru míň, kolků víc."],
    [53,"byrokracie","Úřad spustil online podání žádostí, systém spadne pokaždé, když se blíží uzávěrka.","IT technik","Systém je stabilní, kromě uzávěrek."],
    [54,"byrokracie","Radnice slibuje digitalizaci bez front, fronta se zatím jen přesunula do čekárny na počítač.","návštěvník úřadu","Fronta se jen přestěhovala k počítači."],
    [55,"byrokracie","Nová linka na stížnosti občanů má rekordní vytíženost, hlavně stížnostmi na to, že se nikdo neozval.","operátor linky","Ozvat se je další krok v procesu."],
    [56,"byrokracie","Odbor životního prostředí pokácel starý strom kvůli studii o výsadbě nových stromů.","odbor životního prostředí","Strom musel ustoupit studii o stromech."],
    [57,"byrokracie","Radnice zveřejnila transparentní účet, transparentní je hlavně to, že do něj nikdo nekouká.","mluvčí radnice","Transparentnost je vidět, jen do ní nikdo nekouká."],
    [58,"byrokracie","Nová vývěska s úředními hodinami visí přesně tam, kam nedosvítí veřejné osvětlení.","návštěvník","Úřední hodiny visí ve tmě jako záhada."],
    [59,"byrokracie","Úřad zavedl systém pořadových čísel, systém vydává lístky rychleji, než je stíhá kdokoliv obsloužit.","úředník","Lístky vydáváme rychleji, než stíháme lidi."],
    [60,"byrokracie","Radnice slíbila zjednodušení stavebního řízení, zjednodušilo se hlavně razítko, ne řízení.","stavitel","Razítko je teď jednodušší, řízení ne."],
    [61,"skolstvi","Zápis do mateřské školky na Lochotíně skončil dřív, než začal, rodiče čekali od čtyř ráno.","rodič","Přišli jsme dřív, než vstalo slunce."],
    [62,"skolstvi","Nová školka na Bolevecku má prý kapacitu pro sto dětí, podle rodičů hlavně pro sto přihlášek.","rodič","Sto míst, sto přihlášek, žádná náhoda."],
    [63,"skolstvi","Radnice slibuje novou základní školu do pěti let, otázkou zůstává, které volební období tím myslí.","mluvčí radnice","Pět let je jen orientační číslo."],
    [64,"skolstvi","Školní jídelna na Košutce zavedla bezobalové vaření, obaly nahradily fronty na oběd.","kuchařka","Bezobalové je jídlo, ne fronta."],
    [65,"skolstvi","Nový hřiště u školky na Skvrňanech otevřeno, houpačky jsou zatím vidět jen na vizualizaci.","rodič","Houpačky vidím zatím jen na plakátu."],
    [66,"skolstvi","Radnice rozšířila kapacitu školek o kontejnerové třídy, děti tvrdí, že jim to připomíná staveniště, protože jím pořád je.","učitelka","Staveniště je aspoň autentický zážitek."],
    [67,"skolstvi","Nový systém přihlašování do školky online zhavaroval přesně v den zápisu, papírové formuláře zažily renesanci.","rodič","Papír vyhrál nad systémem."],
    [68,"skolstvi","Škola na Doubravce dostala novou tělocvičnu, otevření se odkládá kvůli kolaudaci, která čeká na otevření.","ředitel školy","Kolaudace čeká, až bude co kolaudovat."],
    [69,"skolstvi","Radnice spustila příměstské tábory zdarma, kapacita naplněna dřív, než se stránka stihla načíst.","rodič","Kapacita se plní rychleji než stránka."],
    [70,"skolstvi","Nová družina ve škole na Slovanech má prý moderní vybavení, zatím hlavně nový nápis na dveřích.","žák","Nápis na dveřích je zatím to nejmodernější."],
    [71,"zelen","Boleveckých rybníků se dotkla nová revitalizace, ryby si prý zvykají pomaleji než lidé.","rybář","Ryby si zvykají v klidu, bez tiskovek."],
    [72,"zelen","Radnice vysadila sto nových stromů v Lochotínském parku, padesát z nich uschlo dřív, než se stihly zalévat.","zahradník","Padesát stromů zalévalo jen sluníčko."],
    [73,"zelen","Zoo Plzeň hlásí rekordní návštěvnost, hlavně díky novému pavilonu, který je zatím ve výstavbě.","mluvčí zoo","Pavilon existuje, zatím jen na plánu."],
    [74,"zelen","Nová komunitní zahrada na Košutce má čekací listinu delší než záhon.","zahrádkář","Na záhon se čeká déle než na byt."],
    [75,"zelen","Radnice zakázala krmení holubů na náměstí Republiky, holubi to podle svědků zatím neregistrují.","kolemjdoucí","Holubi nečtou vyhlášky."],
    [76,"zelen","Nový psí park na Vinicích otevřen, psi si zatím víc oblíbili sousední trávník bez cedule.","majitel psa","Tráva bez cedule je prostě lákavější."],
    [77,"zelen","Křižíkovy sady dostaly novou fontánu, funguje spolehlivě, kromě letních měsíců kvůli suchu.","technik fontány","V suchu šetříme vodou i iluzí."],
    [78,"zelen","Radnice spustila projekt zelené střechy na úřadech, první realizovaná střecha je nad garážemi.","mluvčí radnice","Garáž je taky budova."],
    [79,"zelen","Nová naučná stezka kolem Boleveckých rybníků má deset cedulí, informace na nich jsou z minulého století.","turista","Historie na cedulích je fakt historická."],
    [80,"zelen","Divoká prasata zpozorovaná na Košutce dostala od radnice oficiální stanovisko: situace se sleduje.","mluvčí radnice","Situace se sleduje, prasata zatím ne."],
    [81,"kultura","Letní kino na Papírně hlásí vyprodáno, hlavně díky kapacitě dvaceti míst.","provozovatel kina","Vyprodáno zní líp než malé."],
    [82,"kultura","Nový festival na Náměstí Republiky slibuje program pro celou rodinu, harmonogram zveřejněn den před akcí.","návštěvník festivalu","Program jsem stihl přečíst cestou na akci."],
    [83,"kultura","Techmania spustila novou expozici o budoucnosti dopravy, dopravu k ní zatím komplikuje uzavřená silnice.","mluvčí Techmanie","Budoucnost dopravy začíná objížďkou."],
    [84,"kultura","Radnice oznámila slavnostní rozsvícení vánočního stromu, strom dorazil o dva dny později než světla.","technik","Světla čekala na strom trpělivě."],
    [85,"kultura","Nová vyhlídková věž na Radyni hlásí rekordní zájem turistů, hlavně díky výtahu, který zatím nejezdí.","turista","Výhled si užijeme po schodech."],
    [86,"kultura","Plzeňské Slavnosti svobody rozšířeny o nový program, parkování zůstalo stejně omezené jako loni.","mluvčí radnice","Program roste, parkování zůstává věrné."],
    [87,"kultura","Radnice podpořila místní divadlo grantem, podmínkou je hra o tom, jak funguje udělování grantů.","dramaturg","Grant si zaslouží vlastní scénář."],
    [88,"kultura","Nová cyklostezka podél Berounky slouží zatím hlavně jako zkratka pro pěší, kteří nechtějí čekat na semaforu.","cyklista","Zkratka funguje líp než přechod."],
    [89,"kultura","DEPO2015 hlásí novou výstavu o městském plánování, vstup je dočasně přes staveniště.","návštěvník","Vstup přes staveniště je zážitek navíc."],
    [90,"kultura","Radniční trhy na náměstí rozšířeny o nové stánky, prodejci žádají hlavně víc místa na parkování dodávek.","prodejce","Dodávka potřebuje víc místa než stánek."],
    [91,"smart","Nový kamerový systém na náměstí Republiky sleduje dopravní přestupky, nejčastěji zachycuje sám sebe při výpadku.","technik kamer","Systém hlásí hlavně sám sebe."],
    [92,"smart","Radnice spustila chytré lampy, které samy tlumí svit podle pohybu chodců, tma na ně reaguje rychleji než lampa.","technik osvětlení","Tma reaguje rychleji než technologie."],
    [93,"smart","Nová aplikace pro hlášení podnětů občanů dostala redesign, tlačítko odeslat zatím nefunguje.","vývojář aplikace","Design je hotový, tlačítko ještě ne."],
    [94,"smart","Radnice testuje senzory na kontejnerech měřící naplněnost, data ukazují hlavně to, že senzory potřebují baterky.","technik senzorů","Data jsou přesná, akorát o bateriích."],
    [95,"smart","Nový wifi hotspot na náměstí funguje spolehlivě, dokud se nepřipojí víc než jeden člověk.","uživatel wifi","Připojen jsem, dokud jsem sám."],
    [96,"smart","Bezpečnostní kamera u přechodu na Slovanech nahrává ve vysokém rozlišení, obraz je bohužel z roku 2019.","technik kamer","Rozlišení máme na úrovni budoucnosti, obraz minulosti."],
    [97,"smart","Radnice zavedla online rezervaci hřišť, systém rezervuje hřiště i pro nikoho, prý kvůli údržbě serveru.","správce systému","Rezervace patří i serveru."],
    [98,"smart","Nový systém SMS varování při povodních otestován úspěšně, zprávy dorazily o den později.","krizový mluvčí","Varování dorazilo, jen jako pozdní vzpomínka."],
    [99,"smart","Digitální úřední deska nahradila papírovou, výpadek internetu vrátil praxi vylepování oznámení na sklo.","úředník","Sklo drží líp než síť."],
    [100,"smart","Radnice spustila chatbota pro dotazy občanů, na většinu dotazů odpovídá: předávám na příslušný odbor.","chatbot","Předávám na příslušný odbor."],  ];

  var CATEGORY_LABEL = {
    doprava:   'Doprava',
    silnice:   'Silnice',
    mhd:       'MHD',
    chodniky:  'Chodníky',
    odpady:    'Odpady',
    byrokracie:'Úřad',
    skolstvi:  'Školství',
    zelen:     'Zeleň',
    kultura:   'Kultura',
    smart:     'Chytré město'
  };

  var bag = [];
  var lastIndex = -1;
  var shown = 0;
  var started = false;
  var preloader = new Image();

  function pad(n){ return (n < 10 ? '00' : n < 100 ? '0' : '') + n; }

  function refillBag(){
    var i, j, tmp;
    bag = [];
    for(i = 0; i < NEWS.length; i++) bag.push(i);
    for(i = bag.length - 1; i > 0; i--){
      j = Math.floor(Math.random() * (i + 1));
      tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp;
    }
    // ať se poslední zpráva z předchozího kola nezopakuje hned jako první
    if(bag.length > 1 && bag[bag.length - 1] === lastIndex){
      tmp = bag[bag.length - 1]; bag[bag.length - 1] = bag[0]; bag[0] = tmp;
    }
  }

  function takeIndex(){
    if(!bag.length) refillBag();
    return bag.pop();
  }

  function preloadNext(){
    if(!bag.length) return;
    preloader.src = IMG_DIR + pad(NEWS[bag[bag.length - 1]][0]) + '.jpg';
  }

  function render(idx){
    var item = NEWS[idx];
    lastIndex = idx;
    shown++;

    imgEl.classList.remove('is-loaded');
    imgEl.alt = 'Ilustrační fotografie ke zprávě: ' + item[2];
    imgEl.src = IMG_DIR + pad(item[0]) + '.jpg';

    if(catEl) catEl.textContent = CATEGORY_LABEL[item[1]] || item[1];
    headlineEl.textContent = item[2];
    quoteEl.textContent = '„' + item[4] + '“';
    roleEl.textContent = item[3];
    if(counterEl) counterEl.textContent = shown + ' / ' + NEWS.length;

    if(paperEl){
      paperEl.classList.remove('is-fresh');
      // vynutit restart CSS animace
      void paperEl.offsetWidth;
      paperEl.classList.add('is-fresh');
    }
    preloadNext();
  }

  imgEl.addEventListener('load', function(){ imgEl.classList.add('is-loaded'); });
  imgEl.addEventListener('error', function(){ imgEl.classList.add('is-loaded'); });

  nextBtn.addEventListener('click', function(){
    render(takeIndex());
  });

  function start(){
    if(started) return;
    started = true;
    refillBag();
    render(takeIndex());
  }

  window.PSSoda = {
    setActive: function(v){
      if(v) start();
    }
  };
})();
