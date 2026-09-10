(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var livesEl = document.getElementById('cxLives');
  var timerFillEl = document.getElementById('cxTimerFill');
  var scoreValueEl = document.getElementById('cxScoreValue');
  var scoreBestEl = document.getElementById('cxScoreBest');
  var roundLabelEl = document.getElementById('cxRoundLabel');
  var homeEl = document.getElementById('cxHome');
  var roadEl = document.getElementById('cxRoad');
  var sidewalkEl = document.getElementById('cxSidewalk');
  var playerWrapEl = document.getElementById('cxPlayerWrap');
  var splatEl = document.getElementById('cxSplat');
  var splatCapEl = document.getElementById('cxSplatCap');
  var tapZoneEl = document.getElementById('cxTapZone');
  var startCard = document.getElementById('cxStartCard');
  var startTap = document.getElementById('cxStartTap');
  var overCard = document.getElementById('cxOverCard');
  var finalScoreEl = document.getElementById('cxFinalScore');
  var finalCaptionEl = document.getElementById('cxFinalCaption');
  var retryTap = document.getElementById('cxRetryTap');

  // Aleš jen chce přejít Americkou, klidně vícekrát za směnu. Klasický
  // Frogger: pevná deska pruhů (ne nekonečné rolování), životy, časomíra
  // na pokus a řada "domečků" nahoře, které se postupně obsazují. Kategorie
  // jsou seřazené od nejpomalejší (dole, u chodníku) po nejrychlejší
  // (nahoře, u cíle) — to je celý vtip sdílené zóny.
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

  var TIMEOUT_CAPTIONS = [
    'Stál jsi tam moc dlouho. Sdílená zóna nečeká.',
    'Čas vypršel. Doprava má přednost, i před váháním.'
  ];

  var FINAL_CAPTIONS = [
    { max: 1, text: 'Ani jedno kolo. Paní s holí měla navrch.' },
    { max: 2, text: 'Jedno kolo za sebou. Slušný start.' },
    { max: 3, text: 'Solidní výkon. Trolejbus tě ještě nerespektuje.' },
    { max: 5, text: 'Zkušený chodec Americké. Klobouk dolů.' },
    { max: Infinity, text: 'Mistr sdílené zóny. Radnice by tě měla najmout.' }
  ];

  var STORAGE_KEY = 'pscrossing_stats_v2';
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

  var LANES = LANE_TYPES.length;   // fixed board: 7 lanes, index 0 = nearest start (easiest) ... LANES-1 = nearest home (hardest)
  var HOME_SLOTS = 5;
  var LIVES_START = 3;
  var TIME_LIMIT_MS = 30000;
  var STEP_MS = 360;                // must match the .cx-player-wrap "bottom" transition duration

  var active = true;    // host-controlled pause, same convention as the other games
  var playing = false;
  var lives = LIVES_START;
  var round = 1;
  var score = 0;
  var row = 0;                 // 0 = at the sidewalk (start); LANES = reached the home strip
  var timeLeft = TIME_LIMIT_MS;
  var busy = false;            // true while a step/splat/respawn transition is playing —
                                // traffic freezes whenever this is true, same as the timer,
                                // so the "cross one lane" motion always reads clearly
  var laneState = [];          // LANES entries
  var rowEls = [];             // DOM refs, keyed by logical lane index (0..LANES-1)
  var homeSlotEls = [];
  var slotsFilled = 0;

  function laneParamsFor(i){
    var base = LANE_TYPES[i];
    var cycle = round - 1;
    var speedMul = Math.pow(0.88, cycle);
    var period = Math.max(0.28, base.period * speedMul);
    var width = Math.min(46, base.width + cycle * 2);
    return { emoji: base.emoji, label: base.label, period: period, width: width, hits: base.hits };
  }

  // build the DOM rows once — top of the column is the hardest lane
  // (nearest home), bottom is the easiest (nearest the sidewalk).
  for(var bi = LANES - 1; bi >= 0; bi--){
    var laneEl = document.createElement('div');
    laneEl.className = 'cx-lane';
    var vEl = document.createElement('div');
    vEl.className = 'cx-vehicle';
    laneEl.appendChild(vEl);
    roadEl.appendChild(laneEl);
    rowEls[bi] = { laneEl: laneEl, vehicleEl: vEl };
  }

  for(var hs = 0; hs < HOME_SLOTS; hs++){
    var slotEl = document.createElement('div');
    slotEl.className = 'cx-home-slot';
    homeEl.appendChild(slotEl);
    homeSlotEls.push(slotEl);
  }

  function resetHomeSlots(){
    slotsFilled = 0;
    for(var i = 0; i < homeSlotEls.length; i++){
      homeSlotEls[i].classList.remove('filled');
      homeSlotEls[i].textContent = '';
    }
  }

  function fillNextHomeSlot(){
    if(slotsFilled < homeSlotEls.length){
      homeSlotEls[slotsFilled].classList.add('filled');
      homeSlotEls[slotsFilled].textContent = '✓';
      slotsFilled++;
    }
  }

  function buildLanesForRound(){
    for(var i = 0; i < LANES; i++){
      laneState[i] = { params: laneParamsFor(i), phase: Math.random(), dir: (i % 2 === 0) ? 1 : -1 };
    }
    renderLaneContent();
    renderPositions();
  }

  function renderLaneContent(){
    for(var i = 0; i < LANES; i++){
      var s = laneState[i];
      rowEls[i].vehicleEl.textContent = s.params.emoji;
      rowEls[i].vehicleEl.style.width = s.params.width + '%';
      rowEls[i].vehicleEl.classList.toggle('rev', s.dir === -1);
    }
  }

  function travelFor(lane){
    var w = lane.params.width;
    return lane.dir === 1 ? (lane.phase * (100 + w) - w) : ((1 - lane.phase) * (100 + w) - w);
  }

  function renderPositions(){
    for(var i = 0; i < LANES; i++){
      rowEls[i].vehicleEl.style.left = travelFor(laneState[i]) + '%';
    }
  }

  function computePlayerBottom(r){
    if(r <= 0) return sidewalkEl.offsetHeight / 2;
    var rowH = rowEls[0].laneEl.offsetHeight || 40;
    return sidewalkEl.offsetHeight + (r - 1) * rowH + rowH / 2;
  }

  function moveToRow(newRow, cb){
    row = newRow;
    playerWrapEl.style.bottom = computePlayerBottom(row) + 'px';
    setTimeout(cb, STEP_MS);
  }

  function snapToStart(){
    row = 0;
    playerWrapEl.style.transition = 'none';
    playerWrapEl.style.bottom = computePlayerBottom(0) + 'px';
    // eslint-disable-next-line no-unused-expressions
    void playerWrapEl.offsetHeight;
    playerWrapEl.style.transition = '';
  }

  function renderLives(){
    var s = '';
    for(var i = 0; i < lives; i++) s += '❤️';
    livesEl.textContent = s || '💀';
  }

  function updateTimerUI(){
    var pct = Math.max(0, (timeLeft / TIME_LIMIT_MS) * 100);
    timerFillEl.style.width = pct + '%';
    timerFillEl.classList.toggle('warn', pct <= 40 && pct > 15);
    timerFillEl.classList.toggle('danger', pct <= 15);
  }

  function showSplat(msg){
    splatCapEl.textContent = msg;
    splatEl.classList.add('show');
  }
  function hideSplat(){
    splatEl.classList.remove('show');
  }

  function onReachHome(){
    var bonus = 50 + Math.round(timeLeft / 1000) * 5;
    score += bonus;
    scoreValueEl.textContent = score;
    fillNextHomeSlot();
    if(slotsFilled >= HOME_SLOTS){
      score += 100;
      scoreValueEl.textContent = score;
      round++;
      roundLabelEl.textContent = 'kolo ' + round;
      resetHomeSlots();
      buildLanesForRound();
    }
    timeLeft = TIME_LIMIT_MS;
    updateTimerUI();
    moveToRow(0, function(){ busy = false; });
  }

  function loseLife(kind, hits){
    busy = true;
    lives--;
    renderLives();
    var msg = (kind === 'hit')
      ? hits[Math.floor(Math.random() * hits.length)]
      : TIMEOUT_CAPTIONS[Math.floor(Math.random() * TIMEOUT_CAPTIONS.length)];
    showSplat(msg);
    setTimeout(function(){
      hideSplat();
      if(lives <= 0){
        finishGame();
      } else {
        timeLeft = TIME_LIMIT_MS;
        updateTimerUI();
        moveToRow(0, function(){ busy = false; });
      }
    }, 650);
  }

  function finishGame(){
    playing = false;
    busy = false;
    hideSplat();
    if(score > highScore){ highScore = score; saveHigh(highScore); }
    finalScoreEl.textContent = score;
    scoreBestEl.textContent = highScore;
    var caption = FINAL_CAPTIONS[FINAL_CAPTIONS.length - 1].text;
    for(var i = 0; i < FINAL_CAPTIONS.length; i++){
      if(round <= FINAL_CAPTIONS[i].max){ caption = FINAL_CAPTIONS[i].text; break; }
    }
    finalCaptionEl.textContent = 'kolo ' + round + ' · ' + caption;
    overCard.classList.remove('hidden');
  }

  function attemptCross(){
    if(!playing || busy) return;
    if(row >= LANES) return;

    var lane = laneState[row];
    var travel = travelFor(lane);
    var occStart = travel, occEnd = travel + lane.params.width;
    var hitHalf = 6;
    var pStart = 50 - hitHalf, pEnd = 50 + hitHalf;
    var collided = occStart < pEnd && occEnd > pStart;

    if(collided){
      loseLife('hit', lane.params.hits);
    } else {
      busy = true;
      score += 10;
      scoreValueEl.textContent = score;
      var nextRow = row + 1;
      moveToRow(nextRow, function(){
        if(nextRow >= LANES){ onReachHome(); } else { busy = false; }
      });
    }
  }

  function startRound(){
    playing = true;
    busy = false;
    lives = LIVES_START;
    round = 1;
    score = 0;
    timeLeft = TIME_LIMIT_MS;
    renderLives();
    scoreValueEl.textContent = 0;
    scoreBestEl.textContent = highScore;
    roundLabelEl.textContent = 'kolo 1';
    resetHomeSlots();
    buildLanesForRound();
    updateTimerUI();
    hideSplat();
    snapToStart();
    startCard.classList.add('hidden');
    overCard.classList.add('hidden');
  }

  startTap.addEventListener('click', startRound);
  retryTap.addEventListener('click', startRound);
  tapZoneEl.addEventListener('pointerdown', function(e){
    e.preventDefault();
    attemptCross();
  });

  // ---------- main loop: lanes keep moving in real time, timer keeps ticking ----------
  var last = performance.now();
  function tick(){
    var now = performance.now();
    var dt = Math.min(now - last, 1000 / 30);
    last = now;

    if(active && playing && !busy){
      if(laneState.length){
        for(var i = 0; i < laneState.length; i++){
          var l = laneState[i];
          l.phase += (dt / 1000) / l.params.period;
          if(l.phase >= 1) l.phase -= Math.floor(l.phase);
        }
        renderPositions();
      }
      timeLeft -= dt;
      if(timeLeft <= 0){
        timeLeft = 0;
        loseLife('timeout', null);
      }
      updateTimerUI();
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  if(reduceMotion){
    // vehicles still move (the timing IS the game); reduced-motion only
    // strips the step transition flourish via the CSS media query.
  }

  window.PSCrossing = {
    setActive: function(v){ active = !!v; }
  };
})();
