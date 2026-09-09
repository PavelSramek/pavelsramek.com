(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var trailCanvas = document.getElementById('trail');
  var headCanvas = document.getElementById('heads');
  var tctx = trailCanvas.getContext('2d', { willReadFrequently: true });
  var hctx = headCanvas.getContext('2d');

  var startHint = document.getElementById('startHint');
  var startTap = startHint.querySelector('.tap');
  var banner = document.getElementById('banner');
  var bannerTitle = banner.querySelector('.title');
  var bannerSub = banner.querySelector('.sub');
  var scoreP1El = document.getElementById('scoreP1');
  var scoreP2El = document.getElementById('scoreP2');
  var roundEl = document.getElementById('roundNum');

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;

  function resize(){
    W = window.innerWidth;
    H = window.innerHeight;
    [trailCanvas, headCanvas].forEach(function(c){
      c.width = Math.round(W * DPR);
      c.height = Math.round(H * DPR);
      c.style.width = W + 'px';
      c.style.height = H + 'px';
    });
    tctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    hctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // butt caps matter here, not just cosmetics: a round cap balloons the
    // "occupied" zone in a circle around each tiny per-frame segment
    // endpoint, and at this step size that circle is bigger than the step
    // itself — every snake would immediately "hit" its own last instant.
    // Flat caps keep the occupied strip exactly between the two points.
    tctx.lineCap = 'butt';
    tctx.lineJoin = 'round';
    // canvas contents are wiped by the resize itself — safest is to just
    // restart the current round rather than leave stale/mismatched state
    if(playing) resetRound();
  }

  var resizeTimer = null;
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  });

  // ---------- tunables ----------
  var SPEED = 130;      // px/s
  var TURN_RATE = 3.1;  // rad/s while a turn button is held
  var TRAIL_WIDTH = 5;
  var HEAD_RADIUS = 5;
  var GAP_MIN = 2200, GAP_MAX = 4200;       // ms of survival between gaps
  var GAP_DUR_MIN = 140, GAP_DUR_MAX = 220; // ms a gap stays open
  var SPAWN_GRACE = 0.35; // seconds of trail-collision immunity right after a (re)spawn

  function rand(a, b){ return a + Math.random() * (b - a); }

  // ---------- persistent per-player button state (survives round resets) ----------
  var controls = {
    p1: { left: false, right: false },
    p2: { left: false, right: false }
  };

  var round = 0;
  var score = { p1: 0, p2: 0 };
  var snakes = [];
  var playing = false;
  var roundOver = false;
  var pendingNextRoundTimer = null;

  function makeSnake(id, color, isBot){
    return {
      id: id, color: color, isBot: isBot,
      x: 0, y: 0, angle: 0,
      leftHeld: false, rightHeld: false, // bots only; humans read `controls`
      alive: true,
      gapCooldown: rand(GAP_MIN, GAP_MAX) / 1000,
      gapRemaining: 0,
      spawnGrace: SPAWN_GRACE,
      botThinkAt: 0
    };
  }

  function paintDot(ctx2, x, y, color){
    ctx2.fillStyle = color;
    ctx2.beginPath();
    ctx2.arc(x, y, TRAIL_WIDTH / 2, 0, Math.PI * 2);
    ctx2.fill();
  }

  function resetRound(){
    tctx.clearRect(0, 0, W, H);
    hctx.clearRect(0, 0, W, H);
    roundOver = false;

    snakes = [];
    var p1 = makeSnake('p1', '#d95c86', false);
    p1.x = W * rand(0.25, 0.35); p1.y = H * rand(0.16, 0.24); p1.angle = rand(0.9, 2.2);
    var p2 = makeSnake('p2', '#ffc93c', false);
    p2.x = W * rand(0.65, 0.75); p2.y = H * rand(0.76, 0.84); p2.angle = rand(-2.2, -0.9);
    snakes.push(p1, p2);

    var botCount = W < 500 ? 1 : 2;
    var botColors = ['#8b7ba8', '#6f8b9e'];
    for(var i = 0; i < botCount; i++){
      var b = makeSnake('bot' + i, botColors[i], true);
      b.x = rand(W * 0.15, W * 0.85);
      b.y = rand(H * 0.38, H * 0.62);
      b.angle = rand(0, Math.PI * 2);
      snakes.push(b);
    }

    snakes.forEach(function(s){ paintDot(tctx, s.x, s.y, s.color); });
  }

  function outOfBounds(x, y){
    return x < 1 || y < 1 || x > W - 1 || y > H - 1;
  }
  function trailOccupied(x, y){
    var px = Math.round(x * DPR), py = Math.round(y * DPR);
    if(px < 0 || py < 0 || px >= trailCanvas.width || py >= trailCanvas.height) return true;
    var d = tctx.getImageData(px, py, 1, 1).data;
    return d[3] > 40;
  }

  // ---------- bots: sample a small fan of rays, steer toward the clearest one ----------
  var BOT_ANGLES = [-0.85, -0.42, 0, 0.42, 0.85];
  function botSteer(s, now){
    if(now < s.botThinkAt) return;
    s.botThinkAt = now + 110 + Math.random() * 60;
    var best = 0, bestScore = -Infinity;
    for(var i = 0; i < BOT_ANGLES.length; i++){
      var a = s.angle + BOT_ANGLES[i];
      var dx = Math.cos(a), dy = Math.sin(a);
      var clear = 0;
      for(var d = 10; d <= 90; d += 10){
        if(outOfBounds(s.x + dx * d, s.y + dy * d) || trailOccupied(s.x + dx * d, s.y + dy * d)) break;
        clear = d;
      }
      var sc = clear - Math.abs(BOT_ANGLES[i]) * 6; // mild bias toward going straight
      if(sc > bestScore){ bestScore = sc; best = BOT_ANGLES[i]; }
    }
    if(best < -0.12){ s.leftHeld = true; s.rightHeld = false; }
    else if(best > 0.12){ s.rightHeld = true; s.leftHeld = false; }
    else { s.leftHeld = false; s.rightHeld = false; }
  }

  function updateScoreboard(){
    scoreP1El.textContent = score.p1;
    scoreP2El.textContent = score.p2;
    roundEl.textContent = round;
  }

  function showBanner(title, sub){
    bannerTitle.textContent = title;
    bannerSub.textContent = sub;
    banner.classList.add('show');
  }
  function hideBanner(){ banner.classList.remove('show'); }

  function checkRoundEnd(){
    var aliveAll = snakes.filter(function(s){ return s.alive; });
    if(aliveAll.length > 1) return;
    roundOver = true;

    var winner = aliveAll[0];
    var title;
    if(winner && winner.id === 'p1'){ score.p1++; title = 'Hráč 1 vyhrál kolo!'; }
    else if(winner && winner.id === 'p2'){ score.p2++; title = 'Hráč 2 vyhrál kolo!'; }
    else if(winner){ title = 'Přežil jen bot, kolo se nepočítá'; }
    else { title = 'Oba naboural(i) zároveň'; }

    updateScoreboard();
    showBanner(title, 'Skóre ' + score.p1 + ':' + score.p2 + ' · klepnutím pokračuj');

    clearTimeout(pendingNextRoundTimer);
    pendingNextRoundTimer = setTimeout(function(){
      if(roundOver) nextRound();
    }, 3200);
  }

  function nextRound(){
    clearTimeout(pendingNextRoundTimer);
    round++;
    hideBanner();
    resetRound();
    updateScoreboard();
    playing = true;
  }

  banner.addEventListener('pointerdown', function(){
    if(!roundOver) return;
    nextRound();
  });

  function startGame(){
    startHint.classList.add('hidden');
    round = 1;
    resetRound();
    updateScoreboard();
    playing = true;
  }
  startTap.addEventListener('pointerdown', function(e){ e.preventDefault(); startGame(); });

  // ---------- control buttons (multitouch-safe: each button owns its own state) ----------
  function bindButton(el, playerId, key){
    function down(e){
      e.preventDefault();
      controls[playerId][key] = true;
      el.classList.add('active');
      try{ el.setPointerCapture(e.pointerId); }catch(err){}
    }
    function up(e){
      e.preventDefault();
      controls[playerId][key] = false;
      el.classList.remove('active');
    }
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }
  document.querySelectorAll('.ctrl-cluster.p1 .left').forEach(function(el){ bindButton(el, 'p1', 'left'); });
  document.querySelectorAll('.ctrl-cluster.p1 .right').forEach(function(el){ bindButton(el, 'p1', 'right'); });
  document.querySelectorAll('.ctrl-cluster.p2 .left').forEach(function(el){ bindButton(el, 'p2', 'left'); });
  document.querySelectorAll('.ctrl-cluster.p2 .right').forEach(function(el){ bindButton(el, 'p2', 'right'); });

  // desktop convenience for testing — harmless on phones
  window.addEventListener('keydown', function(e){
    if(e.code === 'ArrowLeft') controls.p1.left = true;
    if(e.code === 'ArrowRight') controls.p1.right = true;
    if(e.code === 'KeyA') controls.p2.left = true;
    if(e.code === 'KeyD') controls.p2.right = true;
  });
  window.addEventListener('keyup', function(e){
    if(e.code === 'ArrowLeft') controls.p1.left = false;
    if(e.code === 'ArrowRight') controls.p1.right = false;
    if(e.code === 'KeyA') controls.p2.left = false;
    if(e.code === 'KeyD') controls.p2.right = false;
  });

  // ---------- main loop ----------
  // "active" mirrors crystal.js's pattern: a host page can pause this game
  // while the other showcase piece is on screen, without losing state.
  var active = false;
  var last = 0;

  function tick(ts){
    if(!last) last = ts;
    var dt = Math.min((ts - last) / 1000, 1 / 30);
    last = ts;

    if(active){
      hctx.clearRect(0, 0, W, H);

      if(playing && !roundOver){
        snakes.forEach(function(s){
          if(!s.alive) return;
          if(s.isBot) botSteer(s, ts);

          var turn;
          if(s.isBot){ turn = (s.rightHeld ? 1 : 0) - (s.leftHeld ? 1 : 0); }
          else { var c = controls[s.id]; turn = (c.right ? 1 : 0) - (c.left ? 1 : 0); }
          s.angle += turn * TURN_RATE * dt;

          var nx = s.x + Math.cos(s.angle) * SPEED * dt;
          var ny = s.y + Math.sin(s.angle) * SPEED * dt;

          if(s.spawnGrace > 0) s.spawnGrace = Math.max(0, s.spawnGrace - dt);

          if(s.gapRemaining > 0){
            s.gapRemaining -= dt;
          } else {
            s.gapCooldown -= dt;
            if(s.gapCooldown <= 0){
              s.gapRemaining = rand(GAP_DUR_MIN, GAP_DUR_MAX) / 1000;
              s.gapCooldown = rand(GAP_MIN, GAP_MAX) / 1000;
            }
          }
          var inGap = s.gapRemaining > 0;
          var inGrace = s.spawnGrace > 0;

          if(outOfBounds(nx, ny) || (!inGap && !inGrace && trailOccupied(nx, ny))){
            s.alive = false;
            return;
          }

          if(!inGap){
            tctx.strokeStyle = s.color;
            tctx.lineWidth = TRAIL_WIDTH;
            tctx.beginPath();
            tctx.moveTo(s.x, s.y);
            tctx.lineTo(nx, ny);
            tctx.stroke();
          }
          s.x = nx; s.y = ny;
        });

        snakes.forEach(function(s){
          if(!s.alive) return;
          hctx.fillStyle = s.color;
          hctx.beginPath();
          hctx.arc(s.x, s.y, HEAD_RADIUS, 0, Math.PI * 2);
          hctx.fill();
        });

        checkRoundEnd();
      }
    }

    requestAnimationFrame(tick);
  }

  resize();
  requestAnimationFrame(tick);

  if(reduceMotion){
    startHint.querySelector('p').textContent = 'Hra je založená na pohybu: klepnutí funguje, ale čekej živé, rychlé zatáčení.';
  }

  window.PSCurve = {
    setActive: function(v){ active = !!v; }
  };
})();
