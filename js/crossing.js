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
  // the splat lives in the markup nested inside .cx-player-wrap (so it can
  // read as "at Aleš"), but that wrap has its own translateX transform —
  // which makes any position:fixed descendant anchor to IT, not the
  // viewport. Move the splat out to the stage root so its `position:fixed`
  // in CSS truly centers on screen and its multi-line caption can never
  // get clipped by the (now much smaller) player token or the board edge.
  var stageEl = document.querySelector('.cx-stage');
  if(stageEl && splatEl && splatEl.parentNode !== stageEl){
    stageEl.appendChild(splatEl);
  }
  var fieldEl = document.getElementById('cxField');
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
  var PLAYER_HIT_HALF = 6;          // Aleš's crossing column is always horizontally centered
                                     // (50% ± this, in % of lane width) — shared by the collision
                                     // check in attemptCross() and the visible corridor guide below,
                                     // so the marked "safe lane" always matches what's actually tested.

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
  var awaitingContinue = false; // true while the death splat is up, waiting for a tap

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

  // Visible guide for the column Aleš actually crosses in (always centered,
  // see PLAYER_HIT_HALF above). Runs the full height of the field, behind
  // the vehicles and the player token, so a lane's real danger zone is
  // readable at a glance — including lanes above the one Aleš is currently
  // on — instead of only being visible once a vehicle's box reaches it.
  if(fieldEl){
    var corridorEl = document.createElement('div');
    corridorEl.className = 'cx-corridor';
    corridorEl.style.left = (50 - PLAYER_HIT_HALF) + '%';
    corridorEl.style.width = (PLAYER_HIT_HALF * 2) + '%';
    fieldEl.appendChild(corridorEl);
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
    // centerY = the vertical midpoint of the row Aleš is standing on
    // (sidewalk for r<=0, otherwise lane r). "bottom" positions the
    // wrap's own bottom edge, so we then pull back by half the wrap's
    // rendered height — otherwise the wrap grows entirely upward from
    // that midpoint and its top (Aleš's head) overflows into the lane
    // above, even though his feet read as being in the right lane.
    var centerY;
    if(r <= 0){
      centerY = sidewalkEl.offsetHeight / 2;
    } else {
      var rowH = rowEls[0].laneEl.offsetHeight || 40;
      centerY = sidewalkEl.offsetHeight + (r - 1) * rowH + rowH / 2;
    }
    var wrapH = playerWrapEl.offsetHeight || 0;
    return centerY - wrapH / 2;
  }

  // Highlights the ONE lane Aleš is currently standing in (row - 1; row 0
  // is the sidewalk, so no lane is current there) — a horizontal counterpart
  // to the vertical .cx-corridor guide. Their intersection is the exact
  // cell a passing vehicle has to enter to be dangerous right now, which
  // used to be genuinely ambiguous to read at a glance: traffic in lanes
  // above/below Aleš looks identical to traffic in his own lane.
  function updateCurrentLaneHighlight(){
    for(var i = 0; i < rowEls.length; i++){
      if(rowEls[i]) rowEls[i].laneEl.classList.remove('is-current');
    }
    var idx = row - 1;
    if(idx >= 0 && idx < LANES && rowEls[idx]) rowEls[idx].laneEl.classList.add('is-current');
  }

  function moveToRow(newRow, cb){
    row = newRow;
    playerWrapEl.style.bottom = computePlayerBottom(row) + 'px';
    updateCurrentLaneHighlight();
    setTimeout(cb, STEP_MS);
  }

  function snapToStart(){
    row = 0;
    playerWrapEl.style.transition = 'none';
    playerWrapEl.style.bottom = computePlayerBottom(0) + 'px';
    // eslint-disable-next-line no-unused-expressions
    void playerWrapEl.offsetHeight;
    playerWrapEl.style.transition = '';
    updateCurrentLaneHighlight();
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
    splatCapEl.innerHTML = '';
    splatCapEl.appendChild(document.createTextNode(msg));
    var hint = document.createElement('span');
    hint.className = 'hint';
    hint.textContent = 'klepni pro další pokus';
    splatCapEl.appendChild(hint);
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
    awaitingContinue = true;
  }

  // fires on the tap that dismisses the death splat — that same tap both
  // clears the message and kicks off the next attempt (or the game-over
  // screen, on the final life), so there's no fixed delay to wait out.
  function continueAfterSplat(){
    awaitingContinue = false;
    hideSplat();
    if(lives <= 0){
      finishGame();
    } else {
      timeLeft = TIME_LIMIT_MS;
      updateTimerUI();
      moveToRow(0, function(){ busy = false; });
    }
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

    if(row >= LANES){
      // Aleš already survived the traffic and is standing at the very edge
      // of the last lane (still exposed there — checkContinuousCollision
      // keeps testing it while he waits, same as any other lane). This
      // second, deliberate tap is the actual step up onto the curb/home
      // strip, kept separate from clearing the last lane's hazard so
      // "made it past the last car" and "actually made it across" read as
      // two distinct moments, not one automatic teleport.
      busy = true;
      onReachHome();
      return;
    }

    var lane = laneState[row];
    var travel = travelFor(lane);
    var occStart = travel, occEnd = travel + lane.params.width;
    var pStart = 50 - PLAYER_HIT_HALF, pEnd = 50 + PLAYER_HIT_HALF;
    var collided = occStart < pEnd && occEnd > pStart;

    if(collided){
      loseLife('hit', lane.params.hits);
    } else {
      busy = true;
      score += 10;
      scoreValueEl.textContent = score;
      moveToRow(row + 1, function(){ busy = false; });
    }
  }

  // Aleš is only ever hit at the instant he hops INTO a lane (checked in
  // attemptCross above) — while he's standing still waiting for the next
  // tap, nothing was checking whether a vehicle drives right through his
  // own square in the meantime. That produced exactly the "it looked like
  // it hit him but it didn't" moment: a car's box could visibly slide all
  // the way over the player token, on his own row, with zero consequence,
  // because collision was never continuous. This runs every frame while
  // Aleš is standing in a lane (not the sidewalk, not mid-hop) and applies
  // the same corridor-vs-vehicle-box test attemptCross uses.
  function checkContinuousCollision(){
    var laneIdx = row - 1;
    if(laneIdx < 0 || laneIdx >= LANES) return;
    var lane = laneState[laneIdx];
    var travel = travelFor(lane);
    var occStart = travel, occEnd = travel + lane.params.width;
    var pStart = 50 - PLAYER_HIT_HALF, pEnd = 50 + PLAYER_HIT_HALF;
    if(occStart < pEnd && occEnd > pStart){
      loseLife('hit', lane.params.hits);
    }
  }

  function startRound(){
    playing = true;
    busy = false;
    awaitingContinue = false;
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
    if(awaitingContinue){ continueAfterSplat(); return; }
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
        checkContinuousCollision();
      }
      if(!busy){
        timeLeft -= dt;
        if(timeLeft <= 0){
          timeLeft = 0;
          loseLife('timeout', null);
        }
        updateTimerUI();
      }
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
