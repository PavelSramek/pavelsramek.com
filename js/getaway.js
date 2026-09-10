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

  // "Unikovka z Plzne" - nekonecny dodger s naklonem telefonu (styl Flappy
  // Bird / Doodle Jump). Auto samo jede mestem, hrac uhyba vlevo/vpravo
  // pred tim, co bezna cesta obvodem prinasi. Prekazky padaji shora dolu,
  // hrac je ridi naklonem (primarni ovladani), tazenim prstu/mysi nebo
  // sipkami (fallback pro desktop / bez povoleneho senzoru).
  //
  // PLAYER_Y musi souhlasit s CSS "top" hodnotou #gwPlayer v getaway.css -
  // hrac se vertikalne nehybe, jen horizontalne.
  var PLAYER_Y = 86;
  var PLAYER_HALF_W = 6.2;
  var PLAYER_HALF_H = 6;
  var OBST_HALF_H = 6;

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
  var playerX = 50;        // 0..100, percent across #gwRoad
  var playerTargetX = 50;
  var invulnUntil = 0;
  var obstacles = [];      // { type, x, y, el }
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

  function spawnObstacle(){
    var type = pick(OBST_TYPES);
    var half = type.width / 2;
    var x = half + Math.random() * (100 - type.width);
    var el = document.createElement('div');
    el.className = 'gw-obstacle';
    el.style.width = type.width + '%';
    el.style.left = x + '%';
    el.style.top = '-14%';
    var emojiSpan = document.createElement('span');
    emojiSpan.textContent = type.emoji;
    el.appendChild(emojiSpan);
    roadEl.appendChild(el);
    obstacles.push({ type: type, x: x, y: -14, el: el });
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
    playerX = 50;
    playerTargetX = 50;
    spawnAcc = 0;
    invulnUntil = 0;
    tiltBaseline = null;
    clearObstacles();
    renderLives();
    scoreValueEl.textContent = '0';
    scoreBestEl.textContent = best;
    hideCaption();
    playerEl.style.left = '50%';
    playerEl.classList.remove('hit');
    startCard.classList.add('hidden');
    overCard.classList.add('hidden');
    last = performance.now();
  }

  startTap.addEventListener('click', startRound);
  retryTap.addEventListener('click', startRound);

  // ---------- controls: drag/tap (always available), keyboard (desktop), tilt (primary on mobile) ----------
  function clamp01to100(v){ return Math.max(0, Math.min(100, v)); }

  function xFromClientX(clientX){
    var rect = roadEl.getBoundingClientRect();
    if(!rect.width) return playerTargetX;
    return clamp01to100(((clientX - rect.left) / rect.width) * 100);
  }

  var dragging = false;
  fieldEl.addEventListener('pointerdown', function(e){
    if(!playing) return;
    dragging = true;
    playerTargetX = xFromClientX(e.clientX);
  });
  fieldEl.addEventListener('pointermove', function(e){
    if(!dragging) return;
    playerTargetX = xFromClientX(e.clientX);
  });
  window.addEventListener('pointerup', function(){ dragging = false; });
  window.addEventListener('pointercancel', function(){ dragging = false; });

  var keyDir = 0;
  var KEY_SPEED = 90; // percent/s
  window.addEventListener('keydown', function(e){
    if(e.key === 'ArrowLeft'){ keyDir = -1; }
    else if(e.key === 'ArrowRight'){ keyDir = 1; }
  });
  window.addEventListener('keyup', function(e){
    if(e.key === 'ArrowLeft' && keyDir === -1) keyDir = 0;
    if(e.key === 'ArrowRight' && keyDir === 1) keyDir = 0;
  });

  // ---------- tilt (same iOS 13+ permission pattern as Kostka) ----------
  var tiltSupported = 'DeviceOrientationEvent' in window;
  var tiltBaseline = null;
  var TILT_RANGE = 22; // degrees of tilt to swing fully across the road

  function handleOrientation(e){
    if(e.gamma === null) return;
    if(tiltBaseline === null){ tiltBaseline = e.gamma; return; }
    var d = e.gamma - tiltBaseline;
    var t = Math.max(-1, Math.min(1, d / TILT_RANGE));
    playerTargetX = 50 + t * 50;
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

      if(keyDir !== 0){
        playerTargetX = clamp01to100(playerTargetX + keyDir * KEY_SPEED * dt);
      }
      playerX += (playerTargetX - playerX) * Math.min(1, 10 * dt);
      playerEl.style.left = playerX + '%';

      var fallSpeed = Math.min(MAX_FALL, BASE_FALL + elapsed * FALL_RAMP);
      var spawnEvery = Math.max(MIN_SPAWN_MS, BASE_SPAWN_MS - elapsed * SPAWN_RAMP_MS_PER_S);

      spawnAcc += dt * 1000;
      if(spawnAcc >= spawnEvery){
        spawnAcc = 0;
        spawnObstacle();
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
