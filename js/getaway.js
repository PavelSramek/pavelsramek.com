(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var livesEl = document.getElementById('gwLives');
  var scoreValueEl = document.getElementById('gwScoreValue');
  var scoreBestEl = document.getElementById('gwScoreBest');
  var fieldEl = document.getElementById('gwField');
  var roadEl = document.getElementById('gwRoad');
  var playerEl = document.getElementById('gwPlayer');
  var captionEl = document.getElementById('gwCaption');
  var tiltBtn = document.getElementById('gwTiltBtn');
  var startCard = document.getElementById('gwStartCard');
  var startTap = document.getElementById('gwStartTap');
  var overCard = document.getElementById('gwOverCard');
  var finalScoreEl = document.getElementById('gwFinalScore');
  var finalCaptionEl = document.getElementById('gwFinalCaption');
  var retryTap = document.getElementById('gwRetryTap');
  var leftBtn = document.getElementById('gwLeftBtn');
  var rightBtn = document.getElementById('gwRightBtn');

  // "Unikovka z Plzne" - hra se 3 pevnymi pruhy (na zadost uzivatele
  // 10. 9. 2026, 3. kolo: "prekazky jezdi ve 3 sloupcich a auticko ma
  // preddefinovanou pozici taky ve 3 sloupcich"). Auto i prekazky se
  // pohybuji jen mezi 3 pevnymi pozicemi (LANE_X nize, presne uprostred
  // vizualnich delicich car v .gw-road), NE uz volne po celym rozsahu
  // silnice jako driv. Prechod mezi pruhy je porad PLYNULY (viz
  // PLAYER_MAX_SPEED nize, z 2. kola oprav) - jen CIL pohybu (playerTargetX)
  // je ted vzdy jedna ze 3 hodnot LANE_X, misto libovolneho bodu pod prstem.
  //
  // DULEZITA OPRAVA SOUROADNICOVEHO SYSTEMU: #gwPlayer byl puvodne DOM
  // potomek #gwField (ne #gwRoad jako prekazky), takze jeho "left: X%" se
  // pocitalo relativne k SIRCE FIELDU (100%), zatimco cislo playerX/
  // playerTargetX v JS je (a vzdy bylo) "0..100 % napric SILNICI" - presne
  // ta sama skala, jakou pouzivaji prekazky (ty jsou DOM potomci #gwRoad).
  // Protoze .gw-road je uvnitr .gw-field zuzena o obrubniky (9 % na kazde
  // strane), field je o cca 22 % sirsi nez silnice - auto se tak driv
  // vizualne posouvalo o 22 % dal, nez odpovidalo jeho skutecne logicke
  // pozici (kolizni matematika uz ale byla spravne, jen vykresleni bylo
  // mimo). Pri volnem pohybu po cele silnici to nebylo vidět (stred pole i
  // stred silnice vychazi na stejnych 50 %, takze chyba byla znatelna jen
  // na krajich), ale u pevnych pruhu presne zarovnanych na delici cary by
  // auto vubec nesedelo uprostred pruhu. Oprava: #gwPlayer se pri startu
  // skriptu prevesi (appendChild) z #gwField do #gwRoad, takze jeho "left"
  // je od teď spocitane ve stejne souradnicove soustave jako u prekazek a
  // jako delici cary v CSS.
  roadEl.appendChild(playerEl);

  // PLAYER_Y musi souhlasit s CSS "top" hodnotou #gwPlayer v getaway.css -
  // hrac se vertikalne nehybe, jen horizontalne.
  var PLAYER_Y = 86;
  var PLAYER_HALF_W = 6.2;
  var PLAYER_HALF_H = 6;
  var OBST_HALF_H = 6;

  // 3 pevne pruhy, stredy presne uprostred kazde tretiny silnice (delici
  // cary v .gw-road::before/::after jsou na road-relativnich 33.3 % a
  // 66.6 % - tohle jsou stredy mezi nimi/kraji). Cislo v poli je index
  // pruhu (0 = levy, 1 = stredni, 2 = pravy).
  var LANE_COUNT = 3;
  var LANE_X = [100 / 6, 50, 500 / 6]; // 16.667, 50, 83.333

  // Max rychlost, kterou se auto muze horizontalne pohybovat, v procentech
  // sirky silnice za sekundu - ted uz jen mezi 3 pevnymi pozicemi LANE_X,
  // driv mezi libovolnym bodem pod prstem/naklonem. Drive se pozice
  // dobihala k cili exponencialnim tlumenim (playerX += (target-playerX)
  // *10*dt) SOUCASNE s CSS transition (transition:left .05s linear na
  // .gw-player v getaway.css) - obe bezely najednou a soutezily o to, kdo
  // "vyhraje" hodnotu left mezi snimky, coz na realnem telefonu vypadalo
  // jako trhane preskakovani mezi par pozicemi (uzivatel to popsal jako
  // "prijizdi ve 3 sloupcich, auto na pruh preskoci"), i kdyz tehdy zadne
  // skutecne pruhy v datech nebyly - auto se melo pohybovat volne. Reseni:
  // CSS transition uplne pryc (viz getaway.css) a pohyb reseny jen tady,
  // jednou, konstantni rychlosti. Ted, kdyz uz jsou pruhy realne (3. kolo,
  // na zadost uzivatele), presne tahle konstantni rychlost je to, co dela
  // prechod mezi pruhy plynulym slidem mista neyplym skokem/teleportem.
  var PLAYER_MAX_SPEED = 150;

  var OBST_TYPES = [
    { id:'closure',  emoji:'🚧', label:'uzavírka',        width:20,
      hits:['Uzavírka. Tahle cesta dnes nikam nevede.','Silnice zavřená. Objížďka nikde označená.'] },
    { id:'roadwork', emoji:'👷', label:'oprava silnice',   width:20,
      hits:['Opravují silnici. Zase.','Frézují asfalt zrovna teď.'] },
    { id:'dig',      emoji:'🕳️', label:'výkop',            width:16,
      hits:['Výkop uprostřed ulice. Klasika.','Neoznačená díra. Skoro klasika.'] },
    { id:'sewer',    emoji:'🪠', label:'oprava kanalizace',width:18,
      hits:['Opravují kanalizaci. Voňavá objížďka.','Kanalizace otevřená, ulice ne.'] },
    { id:'water',    emoji:'🚰', label:'oprava vodovodu',  width:18,
      hits:['Prasknutý vodovod. Ulice jako řeka.','Opravují vodovod, provoz stojí.'] },
    { id:'crash',    emoji:'🚨', label:'nehoda',           width:18,
      hits:['Nehoda v křižovatce. Radši objeď.','Dvě auta, jeden pruh. Zpomal.'] },
    { id:'pride',    emoji:'🏳️‍🌈', label:'průvod', width:34,
      hits:['Průvod má přednost. Počkej nebo objeď.','Ulice patří průvodu. Najdi jinou cestu.'] }
  ];

  var STORAGE_KEY = 'psgetaway_stats_v1';
  function loadBest(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(raw) return JSON.parse(raw).best || 0;
    }catch(e){}
    return 0;
  }
  function saveBest(v){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify({ best: v })); }catch(e){}
  }

  var best = loadBest();
  scoreBestEl.textContent = best;

  var FINAL_CAPTIONS = [
    { max: 100,  text: 'Sotva jsi vyjel z garáže.' },
    { max: 400,  text: 'Slušný začátek, obvod má ale víc překvapení.' },
    { max: 900,  text: 'Zkušený řidič Plzně 3.' },
    { max: 1600, text: 'Znáš tu každou uzavírku nazpaměť.' },
    { max: Infinity, text: 'Radnice by tě měla najmout na plánování objížděk.' }
  ];

  function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

  var active = true;    // host-controlled pause, same convention as the other games
  var playing = false;
  var lives = 3;
  var LIVES_START = 3;
  var score = 0;
  var elapsed = 0;
  var playerLane = 1;         // 0..LANE_COUNT-1, start ve stredovem pruhu
  var playerX = LANE_X[1];    // 0..100, percent across #gwRoad - vzdy == LANE_X[playerLane] jako cil
  var playerTargetX = LANE_X[1];
  var invulnUntil = 0;
  var obstacles = [];      // { type, x, lane, y, el }
  var spawnAcc = 0;
  var captionTimer = null;

  var BASE_FALL = 34;      // road-percent per second at the very start
  var FALL_RAMP = 0.55;    // added per second survived
  var MAX_FALL = 100;
  var BASE_SPAWN_MS = 1050;
  var MIN_SPAWN_MS = 480;
  var SPAWN_RAMP_MS_PER_S = 9;

  function renderLives(){
    var s = '';
    for(var i = 0; i < lives; i++) s += '❤️';
    livesEl.textContent = s || '💀';
  }

  function showCaption(msg){
    captionEl.textContent = msg;
    captionEl.classList.add('show');
    clearTimeout(captionTimer);
    captionTimer = setTimeout(function(){ captionEl.classList.remove('show'); }, 1700);
  }
  function hideCaption(){
    captionEl.classList.remove('show');
    clearTimeout(captionTimer);
  }

  function clearObstacles(){
    for(var i = 0; i < obstacles.length; i++){
      if(obstacles[i].el.parentNode) obstacles[i].el.parentNode.removeChild(obstacles[i].el);
    }
    obstacles = [];
  }

  // Vrati mnozinu pruhu, ktere jsou "v tuto chvili relevantni" - obsazene
  // prekazkou blizko horniho okraje. Protoze vsechny prekazky padaji
  // stejnou rychlosti kazdy snimek (fallSpeed je sdileny), rozestup mezi
  // dvema uz existujicimi prekazkami zustava od okamziku druheho spawnu
  // uz napořad konstantni - takze staci hlidat jen prekazky blizko vrcholu
  // v okamziku noveho spawnu, dal uz se jejich vzajemny rozestup nezmeni.
  function occupiedLanesNearTop(){
    var occ = {};
    for(var i = 0; i < obstacles.length; i++){
      var o = obstacles[i];
      if(o.y > -20 && o.y < 50) occ[o.lane] = true;
    }
    return occ;
  }

  // Vrati true, pokud se povedlo neco vygenerovat. Zaruceni "vzdy zustane
  // aspon 1 volny pruh": pokud uz jsou v relevantni zone obsazene 2 ruzne
  // pruhy, novy spawn se v tomhle kole preskoci (zkusi se znovu presne
  // dalsi snimek, viz volani v tick()) - nikdy se nezvoli posledni volny
  // pruh, protoze by to hrace zavrelo do nemozne situace.
  function trySpawnObstacle(){
    var occ = occupiedLanesNearTop();
    var free = [];
    for(var i = 0; i < LANE_COUNT; i++){ if(!occ[i]) free.push(i); }
    if(free.length < 2) return false;
    var lane = free[Math.floor(Math.random() * free.length)];
    var type = pick(OBST_TYPES);
    var x = LANE_X[lane];
    var el = document.createElement('div');
    el.className = 'gw-obstacle';
    el.style.width = type.width + '%';
    el.style.left = x + '%';
    el.style.top = '-14%';
    var emojiSpan = document.createElement('span');
    emojiSpan.textContent = type.emoji;
    el.appendChild(emojiSpan);
    roadEl.appendChild(el);
    obstacles.push({ type: type, x: x, lane: lane, y: -14, el: el });
    return true;
  }

  function onHit(o){
    lives--;
    renderLives();
    invulnUntil = performance.now() + 1100;
    playerEl.classList.add('hit');
    setTimeout(function(){ playerEl.classList.remove('hit'); }, 1100);
    showCaption(pick(o.type.hits));
    if(o.el.parentNode) o.el.parentNode.removeChild(o.el);
    var idx = obstacles.indexOf(o);
    if(idx !== -1) obstacles.splice(idx, 1);
    if(lives <= 0) finishGame();
  }

  function checkCollisions(){
    if(performance.now() < invulnUntil) return;
    for(var i = 0; i < obstacles.length; i++){
      var o = obstacles[i];
      if(Math.abs(o.y - PLAYER_Y) < (PLAYER_HALF_H + OBST_HALF_H)){
        var half = (o.type.width * 0.42);
        var overlap = (playerX + PLAYER_HALF_W) > (o.x - half) && (playerX - PLAYER_HALF_W) < (o.x + half);
        if(overlap){ onHit(o); break; }
      }
    }
  }

  function finishGame(){
    playing = false;
    var finalScore = Math.floor(score);
    if(finalScore > best){ best = finalScore; saveBest(best); }
    finalScoreEl.textContent = finalScore;
    scoreBestEl.textContent = best;
    var caption = FINAL_CAPTIONS[FINAL_CAPTIONS.length - 1].text;
    for(var i = 0; i < FINAL_CAPTIONS.length; i++){
      if(finalScore <= FINAL_CAPTIONS[i].max){ caption = FINAL_CAPTIONS[i].text; break; }
    }
    finalCaptionEl.textContent = caption;
    overCard.classList.remove('hidden');
    hideCaption();
  }

  function startRound(){
    playing = true;
    lives = LIVES_START;
    score = 0;
    elapsed = 0;
    playerLane = 1;
    playerX = LANE_X[playerLane];
    playerTargetX = LANE_X[playerLane];
    spawnAcc = 0;
    invulnUntil = 0;
    tiltBaseline = null;
    clearObstacles();
    renderLives();
    scoreValueEl.textContent = '0';
    scoreBestEl.textContent = best;
    hideCaption();
    playerEl.style.left = playerX + '%';
    playerEl.classList.remove('hit');
    startCard.classList.add('hidden');
    overCard.classList.add('hidden');
    last = performance.now();
  }

  startTap.addEventListener('click', startRound);
  retryTap.addEventListener('click', startRound);

  // ---------- controls: drag/tap (always available), keyboard (desktop), tilt (primary on mobile) ----------
  // Vsechny 4 vrstvy ovladani ted dela jedno a to same: zvoli cilovy pruh
  // (setLane/moveLane), NE uz libovolnou spojitou pozici. Plynuly prejezd
  // mezi zvolenymi pruhy pak resi konstantni-rychlostni "dojezd" v tick()
  // nize (beze zmeny od 2. kola oprav).
  function clamp01to100(v){ return Math.max(0, Math.min(100, v)); }

  function xFromClientX(clientX){
    var rect = roadEl.getBoundingClientRect();
    if(!rect.width) return playerTargetX;
    return clamp01to100(((clientX - rect.left) / rect.width) * 100);
  }

  function setLane(lane){
    lane = Math.max(0, Math.min(LANE_COUNT - 1, lane));
    playerLane = lane;
    playerTargetX = LANE_X[lane];
  }
  function moveLane(dir){
    if(!playing) return;
    setLane(playerLane + dir);
  }
  function laneFromX(x){
    var laneWidth = 100 / LANE_COUNT;
    return Math.max(0, Math.min(LANE_COUNT - 1, Math.floor(x / laneWidth)));
  }

  var dragging = false;
  fieldEl.addEventListener('pointerdown', function(e){
    if(!playing) return;
    dragging = true;
    setLane(laneFromX(xFromClientX(e.clientX)));
  });
  fieldEl.addEventListener('pointermove', function(e){
    if(!dragging) return;
    setLane(laneFromX(xFromClientX(e.clientX)));
  });
  window.addEventListener('pointerup', function(){ dragging = false; });
  window.addEventListener('pointercancel', function(){ dragging = false; });

  // Sipky na klavesnici a ◀/▶ tlacitka na obrazovce: kazdy stisk = presun
  // presne o jeden pruh (ne uz spojite drzeni jako driv - to davalo smysl
  // jen pri volnem pohybu, u 3 pevnych pruhu je "tap = jeden pruh"
  // prirozenejsi, stejny vzor jako Crossy Road/Frogger-style hry).
  window.addEventListener('keydown', function(e){
    if(e.repeat) return; // ignorovat OS auto-repeat pri drzeni klavesy
    if(e.key === 'ArrowLeft') moveLane(-1);
    else if(e.key === 'ArrowRight') moveLane(1);
  });

  function bindCtrlBtn(el, dir){
    if(!el) return;
    function down(e){
      e.preventDefault();
      el.classList.add('active');
      try{ el.setPointerCapture(e.pointerId); }catch(err){}
      moveLane(dir);
    }
    function up(e){
      e.preventDefault();
      el.classList.remove('active');
    }
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  }
  bindCtrlBtn(leftBtn, -1);
  bindCtrlBtn(rightBtn, 1);

  // ---------- tilt (same iOS 13+ permission pattern as Kostka) ----------
  var tiltSupported = 'DeviceOrientationEvent' in window;
  var tiltBaseline = null;
  // Naklon uz taky jen voli jeden ze 3 pruhu, ne spojitou pozici. Dva prahy
  // misto jednoho kvuli hystereze: aby se pri naklonu presne na hranici
  // pruh netrepal tam a zpet (mala chvenim ruky by jinak preskakovalo mezi
  // sousednimi pruhy vickrat za sekundu). TILT_ENTER = jak moc se musi
  // naklonit ze STREDOVEHO pruhu, aby se presunul do krajniho. TILT_EXIT =
  // o kolik min se musi narovnat zpet, aby se z krajniho pruhu vratil do
  // stredu - vzdy mensi nez ENTER, takze mezi nimi je pasmo bez zmeny.
  var TILT_ENTER = 10; // stupne
  var TILT_EXIT = 4;   // stupne

  function handleOrientation(e){
    if(e.gamma === null) return;
    if(tiltBaseline === null){ tiltBaseline = e.gamma; return; }
    var d = e.gamma - tiltBaseline;
    var lane = playerLane;
    if(lane === 1){
      if(d <= -TILT_ENTER) lane = 0;
      else if(d >= TILT_ENTER) lane = 2;
    } else if(lane === 0){
      if(d > -TILT_EXIT) lane = 1;
    } else if(lane === 2){
      if(d < TILT_EXIT) lane = 1;
    }
    setLane(lane);
  }

  function startTilt(){
    window.addEventListener('deviceorientation', handleOrientation);
    if(tiltBtn) tiltBtn.classList.add('is-hidden');
  }

  function initTilt(){
    if(!tiltSupported || reduceMotion) return;
    var DOE = window.DeviceOrientationEvent;
    if(typeof DOE.requestPermission === 'function'){
      if(tiltBtn){
        tiltBtn.classList.remove('is-hidden');
        tiltBtn.addEventListener('click', function(){
          DOE.requestPermission().then(function(state){
            if(state === 'granted') startTilt();
          }).catch(function(){});
        });
      }
    } else {
      var probe = function(e){
        if(e.gamma !== null){
          window.removeEventListener('deviceorientation', probe);
          startTilt();
        }
      };
      window.addEventListener('deviceorientation', probe);
    }
  }
  initTilt();

  // ---------- main loop ----------
  var last = performance.now();
  function tick(now){
    var dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;

    if(active && playing){
      elapsed += dt;

      // Konstantni-rychlostni "dojezd" k playerTargetX (viz PLAYER_MAX_SPEED
      // vyse) - ted vzdy jede k jedne ze 3 hodnot LANE_X, takze tohle je to,
      // co dela prejezd mezi pruhy plynulym slidem, ne teleportem/skokem.
      var dx = playerTargetX - playerX;
      var maxStep = PLAYER_MAX_SPEED * dt;
      if(Math.abs(dx) <= maxStep){ playerX = playerTargetX; }
      else{ playerX += (dx > 0 ? 1 : -1) * maxStep; }
      playerEl.style.left = playerX + '%';

      var fallSpeed = Math.min(MAX_FALL, BASE_FALL + elapsed * FALL_RAMP);
      var spawnEvery = Math.max(MIN_SPAWN_MS, BASE_SPAWN_MS - elapsed * SPAWN_RAMP_MS_PER_S);

      spawnAcc += dt * 1000;
      if(spawnAcc >= spawnEvery){
        if(trySpawnObstacle()) spawnAcc = 0;
        // else: vsechny volne pruhy by se timhle spawnem zaplnily - preskocit
        // tohle kolo, zkusit znovu presne dalsi snimek (spawnAcc zustava nad
        // prahem), dokud se nejaky pruh neuvolni.
      }

      for(var i = obstacles.length - 1; i >= 0; i--){
        var o = obstacles[i];
        o.y += fallSpeed * dt;
        if(o.y > 114){
          if(o.el.parentNode) o.el.parentNode.removeChild(o.el);
          obstacles.splice(i, 1);
          continue;
        }
        o.el.style.top = o.y + '%';
      }

      checkCollisions();

      score += fallSpeed * dt * 0.6;
      scoreValueEl.textContent = Math.floor(score);
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  window.PSGetaway = {
    setActive: function(v){ active = !!v; }
  };
})();
