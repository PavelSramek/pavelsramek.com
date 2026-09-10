(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var tapsEl = document.getElementById('cxTaps');
  var scoreValueEl = document.getElementById('cxScoreValue');
  var scoreBestEl = document.getElementById('cxScoreBest');
  var roadEl = document.getElementById('cxRoad');
  var playerEl = document.getElementById('cxPlayer');
  var splatEl = document.getElementById('cxSplat');
  var splatCapEl = document.getElementById('cxSplatCap');
  var tapZoneEl = document.getElementById('cxTapZone');
  var startCard = document.getElementById('cxStartCard');
  var startTap = document.getElementById('cxStartTap');
  var overCard = document.getElementById('cxOverCard');
  var finalScoreEl = document.getElementById('cxFinalScore');
  var finalCaptionEl = document.getElementById('cxFinalCaption');
  var retryTap = document.getElementById('cxRetryTap');

  var MAX_TAPS = 50;
  var VISIBLE_ROWS = 5;

  // Aleš jen chce přejít na druhou stranu Americké. Nic víc. Sdílená zóna
  // znamená, že v jednom pruhu je klidně paní s holí, ve druhém trolejbus —
  // to je celý vtip. Kategorie jsou seřazené od nejpomalejší po nejrychlejší
  // a cyklí se dál s tím, že se s každým kolem zrychlují.
  var LANE_TYPES = [
    { emoji: '👵', label: 'paní s holí', period: 3.2, width: 12,
      hits: ['Praštila tě holí. I důchod umí zrychlit.', 'Zastavila tě pohledem. A pak holí.'] },
    { emoji: '🧑‍🦽', label: 'pán na vozíku', period: 2.8, width: 13,
      hits: ['Přejel tě vozíček. Nulové emise, nulová slitovnost.', 'Elektrický vozík. Tichý, ale rychlejší, než čekáš.'] },
    { emoji: '🚗', label: 'veterán', period: 2.2, width: 17,
      hits: ['Veterán tě sejmul stylově. Retro smrt.', 'Historické vozidlo, aktuální ty.'] },
    { emoji: '🚐', label: 'rodinné MPV', period: 1.8, width: 19,
      hits: ['Sedm míst. Žádné pro tebe.', 'Rodinný výlet právě nabral nečekaného spolujezdce.'] },
    { emoji: '🚌', label: 'autobus', period: 1.5, width: 27,
      hits: ['Autobus nezastavuje na znamení. Ani na tobě.', 'Jel přesně podle jízdního řádu. Ty ne.'] },
    { emoji: '🏎️', label: 'sporťák', period: 1.0, width: 16,
      hits: ['Sporťák. Nemá to brzdy, jen styl.', 'Nula na sto. Ty jsi ta nula.'] },
    { emoji: '🚎', label: 'trolejbus', period: 0.68, width: 32,
      hits: ['Trolejbus. Elektrika vždy vyhraje.', 'Tiše, rychle, definitivně.'] }
  ];

  var FINAL_CAPTIONS = [
    { max: 2,  text: 'Ani se ti nepodařilo pořádně vykročit.' },
    { max: 6,  text: 'Paní s holí tě sejmula hned na začátku. Bezpečná zóna, jasně.' },
    { max: 13, text: 'Prošel jsi kolem obyčejného provozu. Sdílená zóna, žádná panika.' },
    { max: 21, text: 'Solidní průjezd. Trolejbus na tebe ještě nedosáhl.' },
    { max: 34, text: 'Skoro mistr Americké. Trolejbus tě respektuje z dálky.' },
    { max: Infinity, text: 'Prošel jsi celou Americkou. Klobouk dolů, hlavu vzhůru.' }
  ];

  var STORAGE_KEY = 'pscrossing_stats_v1';
  function loadHigh(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(raw) return JSON.parse(raw).highScore || 0;
    }catch(e){}
    return 0;
  }
  function saveHigh(v){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify({ highScore: v })); }catch(e){}
  }

  var highScore = loadHigh();
  scoreBestEl.textContent = highScore;

  var active = true;    // host-controlled pause, same convention as the other games
  var playing = false;
  var tapsUsed = 0;
  var currentLaneIndex = 0;   // lanes successfully crossed in the current life
  var bestLaneThisRun = 0;    // furthest reached across all lives this session
  var laneState = [];         // VISIBLE_ROWS entries, [0]=farthest ... [last]=nearest
  var rowEls = [];             // DOM refs, same order as laneState
  var busy = false;            // true while a splat/respawn transition is playing

  function laneParamsFor(absIndex){
    var base = LANE_TYPES[(absIndex - 1) % LANE_TYPES.length];
    var cycle = Math.floor((absIndex - 1) / LANE_TYPES.length);
    var speedMul = Math.pow(0.88, cycle);
    var period = Math.max(0.32, base.period * speedMul);
    var width = Math.min(46, base.width + cycle * 2);
    return { emoji: base.emoji, label: base.label, period: period, width: width, hits: base.hits };
  }

  function freshLane(absIndex){
    return { absIndex: absIndex, params: laneParamsFor(absIndex), phase: Math.random() };
  }

  // build the DOM rows once; content gets rewritten as lanes shift
  for(var i = 0; i < VISIBLE_ROWS; i++){
    var laneEl = document.createElement('div');
    laneEl.className = 'cx-lane';
    var vEl = document.createElement('div');
    vEl.className = 'cx-vehicle';
    laneEl.appendChild(vEl);
    roadEl.appendChild(laneEl);
    rowEls.push({ laneEl: laneEl, vehicleEl: vEl });
  }

  function rebuildLanes(){
    laneState = [];
    for(var k = VISIBLE_ROWS; k >= 1; k--){
      laneState.push(freshLane(currentLaneIndex + k));
    }
    renderLaneContent();
    renderPositions();
  }

  function advanceLanes(){
    laneState.pop();
    laneState.unshift(freshLane(currentLaneIndex + VISIBLE_ROWS));
    renderLaneContent();
    renderPositions();
  }

  function renderLaneContent(){
    for(var i = 0; i < VISIBLE_ROWS; i++){
      var params = laneState[i].params;
      rowEls[i].vehicleEl.textContent = params.emoji;
      rowEls[i].vehicleEl.style.width = params.width + '%';
    }
  }

  function renderPositions(){
    for(var i = 0; i < VISIBLE_ROWS; i++){
      var l = laneState[i];
      var travel = l.phase * (100 + l.params.width) - l.params.width;
      rowEls[i].vehicleEl.style.left = travel + '%';
    }
  }

  function hopPlayer(){
    playerEl.classList.remove('hop');
    void playerEl.offsetWidth;
    playerEl.classList.add('hop');
  }

  function showSplat(params){
    var msg = params.hits[Math.floor(Math.random() * params.hits.length)];
    splatCapEl.textContent = msg;
    splatEl.classList.add('show');
  }

  function hideSplat(){
    splatEl.classList.remove('show');
  }

  function respawn(){
    hideSplat();
    currentLaneIndex = 0;
    rebuildLanes();
    busy = false;
  }

  function finishGame(){
    hideSplat();
    playing = false;
    busy = false;
    if(bestLaneThisRun > highScore){ highScore = bestLaneThisRun; saveHigh(highScore); }
    finalScoreEl.textContent = bestLaneThisRun;
    scoreBestEl.textContent = highScore;
    var caption = FINAL_CAPTIONS[0].text;
    for(var i = 0; i < FINAL_CAPTIONS.length; i++){
      if(bestLaneThisRun <= FINAL_CAPTIONS[i].max){ caption = FINAL_CAPTIONS[i].text; break; }
    }
    finalCaptionEl.textContent = 'nejdál: ' + bestLaneThisRun + ' pruhů — ' + caption;
    overCard.classList.remove('hidden');
  }

  function attemptCross(){
    if(!playing || busy) return;
    tapsUsed++;
    tapsEl.textContent = tapsUsed;

    var nearest = laneState[laneState.length - 1];
    var travel = nearest.phase * (100 + nearest.params.width) - nearest.params.width;
    var occStart = travel, occEnd = travel + nearest.params.width;
    var hitHalf = 6;
    var pStart = 50 - hitHalf, pEnd = 50 + hitHalf;
    var collided = occStart < pEnd && occEnd > pStart;
    var ending = tapsUsed >= MAX_TAPS;

    if(collided){
      busy = true;
      showSplat(nearest.params);
      setTimeout(function(){
        if(ending) finishGame(); else respawn();
      }, 650);
    } else {
      currentLaneIndex++;
      if(currentLaneIndex > bestLaneThisRun){
        bestLaneThisRun = currentLaneIndex;
        scoreValueEl.textContent = bestLaneThisRun;
      }
      advanceLanes();
      hopPlayer();
      if(ending) finishGame();
    }
  }

  function startRound(){
    tapsUsed = 0;
    currentLaneIndex = 0;
    bestLaneThisRun = 0;
    busy = false;
    tapsEl.textContent = 0;
    scoreValueEl.textContent = 0;
    scoreBestEl.textContent = highScore;
    hideSplat();
    rebuildLanes();
    startCard.classList.add('hidden');
    overCard.classList.add('hidden');
    playing = true;
  }

  startTap.addEventListener('click', startRound);
  retryTap.addEventListener('click', startRound);
  tapZoneEl.addEventListener('pointerdown', function(e){
    e.preventDefault();
    attemptCross();
  });

  // ---------- main loop: lanes keep moving in real time between taps ----------
  var last = performance.now();
  function tick(){
    var now = performance.now();
    var dt = Math.min(now - last, 1000 / 30);
    last = now;

    if(active && playing && laneState.length){
      for(var i = 0; i < laneState.length; i++){
        var l = laneState[i];
        l.phase += (dt / 1000) / l.params.period;
        if(l.phase >= 1) l.phase -= Math.floor(l.phase);
      }
      renderPositions();
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  if(reduceMotion){
    // vehicles still move (the timing IS the game); reduced-motion only
    // strips the hop/splat transition flourishes via the CSS media query.
  }

  window.PSCrossing = {
    setActive: function(v){ active = !!v; }
  };
})();
