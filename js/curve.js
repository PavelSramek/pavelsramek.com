(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var curveRoot = document.getElementById('curveRoot');
  var trailCanvas = document.getElementById('trail');
  var headCanvas = document.getElementById('heads');
  var tctx = trailCanvas.getContext('2d', { willReadFrequently: true });
  var hctx = headCanvas.getContext('2d');

  var startHint = document.getElementById('startHint');
  var startTap = startHint.querySelector('.tap');
  var banner = document.getElementById('banner');
  var bannerTitle = banner.querySelector('.title');
  var bannerSub = banner.querySelector('.sub');
  var scoreListEl = document.getElementById('scoreList');
  var roundEl = document.getElementById('roundNum');
  var playersListEl = document.getElementById('curvePlayersList');
  var addPlayerBtn = document.getElementById('curveAddPlayer');

  // "desktop" = primary input is a mouse/trackpad (hover + fine pointer).
  // Touchscreens (phones, tablets, and touch-primary hybrids) report
  // pointer:coarse/hover:none and keep the original phone-on-the-table UI
  // untouched below. Computed once — device input type doesn't change
  // mid-session in any case that matters here.
  var isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if(isDesktop) curveRoot.classList.add('ps-desktop');

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
  // SPEED is px/s in CSS-pixel canvas space (see resize(): canvas is sized to
  // window.innerWidth/innerHeight). That's an ABSOLUTE speed, not relative to
  // screen size — so the same number covers a much bigger fraction of a
  // phone's ~400px-wide screen per second than of a PC's ~1500-2000px-wide
  // window, which is why one shared constant felt noticeably faster on
  // mobile than on desktop even though it was numerically identical (report
  // 15. 9. 2026). Split by device instead of changing the shared value, so
  // mobile feel (already tuned 11. 9. 2026, slowed from 130) is untouched.
  var SPEED = isDesktop ? 118 : 95;  // px/s (desktop bumped 15. 9. 2026, on request)
  var TURN_RATE = 3.1;  // rad/s while a turn button is held
  var TRAIL_WIDTH = 5;
  var HEAD_RADIUS = 5;
  var GAP_MIN = 2200, GAP_MAX = 4200;       // ms of survival between gaps
  var GAP_DUR_MIN = 140, GAP_DUR_MAX = 220; // ms a gap stays open
  var SPAWN_GRACE = 0.35; // seconds of trail-collision immunity right after a (re)spawn
  var BOT_COLORS = ['#8b7ba8', '#6f8b9e', '#6a9e74'];

  function rand(a, b){ return a + Math.random() * (b - a); }

  // ---------- player control schemes ----------
  // Index 0 (arrows) is always on — it's the default/host control and was
  // already wired to "p1" before this. Desktop players 2-6 are added one at
  // a time via the "Přidat hráče" button, in this order, so a group of
  // people can spread across one keyboard (plus the mouse) instead of
  // passing a single phone around.
  var PLAYER_SCHEMES = [
    { id: 'p1', color: '#d95c86', desc: '← / →',     type: 'key',   left: ['ArrowLeft'], right: ['ArrowRight'] },
    { id: 'p2', color: '#ffc93c', desc: 'myš: L / P tlačítko', type: 'mouse', left: 0, right: 2 },
    { id: 'p3', color: '#5cd9a8', desc: 'Q / W',               type: 'key',   left: ['KeyQ'],      right: ['KeyW'] },
    { id: 'p4', color: '#5c9ad9', desc: 'O / P',               type: 'key',   left: ['KeyO'],      right: ['KeyP'] },
    { id: 'p5', color: '#e0975c', desc: 'V / B',               type: 'key',   left: ['KeyV'],      right: ['KeyB'] },
    { id: 'p6', color: '#b06bd9', desc: 'Num 4 / Num 6',       type: 'key',   left: ['Numpad4'],   right: ['Numpad6'] }
  ];

  function schemeById(id){
    for(var i = 0; i < PLAYER_SCHEMES.length; i++){ if(PLAYER_SCHEMES[i].id === id) return PLAYER_SCHEMES[i]; }
    return null;
  }
  function schemeColor(id){ var s = schemeById(id); return s ? s.color : '#fff'; }
  function playerLabel(id){
    for(var i = 0; i < PLAYER_SCHEMES.length; i++){ if(PLAYER_SCHEMES[i].id === id) return 'Hráč ' + (i + 1); }
    return id;
  }

  // ---------- persistent per-player button/key state (survives round resets) ----------
  var controls = {};
  PLAYER_SCHEMES.forEach(function(s){ controls[s.id] = { left: false, right: false }; });

  // desktop roster: which scheme ids currently have a human attached.
  // Mobile always plays p1 + p2 (unchanged phone-on-the-table experience).
  var activeSchemeIds = isDesktop ? ['p1'] : ['p1', 'p2'];
  function activeHumanIds(){ return isDesktop ? activeSchemeIds : ['p1', 'p2']; }

  var round = 0;
  var score = { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 };
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

  function desiredBotCount(){
    if(!isDesktop) return W < 500 ? 1 : 2;
    // fills the table up to 4 total snakes, then just adds humans past that
    return Math.max(0, 4 - activeSchemeIds.length);
  }

  function resetRound(){
    tctx.clearRect(0, 0, W, H);
    hctx.clearRect(0, 0, W, H);
    roundOver = false;
    snakes = [];

    if(!isDesktop){
      // original two-corner phone-on-the-table layout, unchanged
      var p1 = makeSnake('p1', schemeColor('p1'), false);
      p1.x = W * rand(0.25, 0.35); p1.y = H * rand(0.16, 0.24); p1.angle = rand(0.9, 2.2);
      var p2 = makeSnake('p2', schemeColor('p2'), false);
      p2.x = W * rand(0.65, 0.75); p2.y = H * rand(0.76, 0.84); p2.angle = rand(-2.2, -0.9);
      snakes.push(p1, p2);

      var botCount = desiredBotCount();
      for(var i = 0; i < botCount; i++){
        var b = makeSnake('bot' + i, BOT_COLORS[i % BOT_COLORS.length], true);
        b.x = rand(W * 0.15, W * 0.85);
        b.y = rand(H * 0.38, H * 0.62);
        b.angle = rand(0, Math.PI * 2);
        snakes.push(b);
      }
    } else {
      // desktop: 1-6 humans spread evenly around the field, bots fill the rest
      var humanIds = activeSchemeIds.slice();
      var botCount = desiredBotCount();
      var total = humanIds.length + botCount;
      var cx = W / 2, cy = H / 2;
      var radius = Math.min(W, H) * 0.32;
      var baseAngle = rand(0, Math.PI * 2);
      var idx = 0;

      humanIds.forEach(function(id){
        var a = baseAngle + (idx / total) * Math.PI * 2 + rand(-0.15, 0.15);
        var s = makeSnake(id, schemeColor(id), false);
        s.x = cx + Math.cos(a) * radius; s.y = cy + Math.sin(a) * radius;
        s.angle = a + Math.PI + rand(-0.3, 0.3); // face roughly inward
        snakes.push(s);
        idx++;
      });
      for(var j = 0; j < botCount; j++){
        var a2 = baseAngle + (idx / total) * Math.PI * 2 + rand(-0.15, 0.15);
        var bot = makeSnake('bot' + j, BOT_COLORS[j % BOT_COLORS.length], true);
        bot.x = cx + Math.cos(a2) * radius; bot.y = cy + Math.sin(a2) * radius;
        bot.angle = a2 + Math.PI + rand(-0.3, 0.3);
        snakes.push(bot);
        idx++;
      }
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

  function scoreSummaryText(){
    var ids = activeHumanIds();
    return 'Skóre ' + ids.map(function(id){ return score[id]; }).join(':');
  }

  function updateScoreboard(){
    var ids = activeHumanIds();
    scoreListEl.innerHTML = ids.map(function(id, i){
      var sep = i > 0 ? '<span class="sep">:</span>' : '';
      return sep + '<span style="color:' + schemeColor(id) + ';font-weight:700;">' + score[id] + '</span>';
    }).join('');
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
    if(!isDesktop){
      // unchanged wording for the default 2-player phone game
      if(winner && winner.id === 'p1'){ score.p1++; title = 'Hráč 1 vyhrál kolo!'; }
      else if(winner && winner.id === 'p2'){ score.p2++; title = 'Hráč 2 vyhrál kolo!'; }
      else if(winner){ title = 'Přežil jen bot, kolo se nepočítá'; }
      else { title = 'Oba naboural(i) zároveň'; }
    } else {
      if(winner && !winner.isBot){ score[winner.id]++; title = playerLabel(winner.id) + ' vyhrál kolo!'; }
      else if(winner){ title = 'Přežil jen bot, kolo se nepočítá'; }
      else { title = 'Nikdo nepřežil, kolo se nepočítá'; }
    }

    updateScoreboard();
    showBanner(title, scoreSummaryText() + ' · klepnutím pokračuj');

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
  // On-screen touch buttons, both players (14. 9. 2026): bound CROSSED —
  // the DOM/CSS ".left" button (showing ◀, physically on the left of its
  // cluster) triggers the "right" turn key, and vice versa. This looks
  // backwards on paper, but two rounds of real 2-player play on an actual
  // phone (11. 9. and 14. 9. 2026) confirmed the straight binding felt
  // reversed for BOTH players, not just p2 — a player sitting at a flat
  // phone on a table, looking down at their own edge's buttons, reads
  // "which way the snake turns" by which side of the SCREEN the snake's
  // path curves toward from their seat, not by the abstract left/right
  // math-angle convention the glyphs were bound to. Do not "fix" this back
  // to a straight binding based on geometric reasoning alone — the direct
  // binding was tried twice and reported backwards both times in real
  // play; if this ever needs revisiting, re-verify with the user actually
  // playing on a phone, not by re-deriving the rotation on paper.
  document.querySelectorAll('.ctrl-cluster.p1 .left').forEach(function(el){ bindButton(el, 'p1', 'right'); });
  document.querySelectorAll('.ctrl-cluster.p1 .right').forEach(function(el){ bindButton(el, 'p1', 'left'); });
  document.querySelectorAll('.ctrl-cluster.p2 .left').forEach(function(el){ bindButton(el, 'p2', 'right'); });
  document.querySelectorAll('.ctrl-cluster.p2 .right').forEach(function(el){ bindButton(el, 'p2', 'left'); });

  // ---------- keyboard: every "key" scheme in PLAYER_SCHEMES, always on ----------
  // (harmless on phones — kept as-is from before this feature, just
  // generalized past the old fixed Arrows/AD pair)
  function keySchemeFor(code){
    for(var i = 0; i < PLAYER_SCHEMES.length; i++){
      var s = PLAYER_SCHEMES[i];
      if(s.type !== 'key') continue;
      if(s.left.indexOf(code) !== -1) return { id: s.id, key: 'left' };
      if(s.right.indexOf(code) !== -1) return { id: s.id, key: 'right' };
    }
    return null;
  }
  window.addEventListener('keydown', function(e){
    var m = keySchemeFor(e.code);
    if(!m) return;
    controls[m.id][m.key] = true;
    e.preventDefault();
  });
  window.addEventListener('keyup', function(e){
    var m = keySchemeFor(e.code);
    if(!m) return;
    controls[m.id][m.key] = false;
    e.preventDefault();
  });

  // ---------- mouse buttons (desktop only — the "p2: myš" scheme) ----------
  function isUiTarget(el){
    return !!(el && el.closest && el.closest('.ctrl-btn, .add-player-btn, .tap, #banner, #curvePlayers'));
  }
  if(isDesktop){
    window.addEventListener('mousedown', function(e){
      if(isUiTarget(e.target)) return;
      PLAYER_SCHEMES.forEach(function(s){
        if(s.type !== 'mouse') return;
        if(e.button === s.left) controls[s.id].left = true;
        if(e.button === s.right) controls[s.id].right = true;
      });
    });
    window.addEventListener('mouseup', function(e){
      PLAYER_SCHEMES.forEach(function(s){
        if(s.type !== 'mouse') return;
        if(e.button === s.left) controls[s.id].left = false;
        if(e.button === s.right) controls[s.id].right = false;
      });
    });
    // the right mouse button doubles as a turn key, so its usual context
    // menu has to stay out of the way while this game is on screen
    window.addEventListener('contextmenu', function(e){
      if(active) e.preventDefault();
    });
  }

  // ---------- "Přidat hráče" (desktop only) ----------
  function nextSchemeToAdd(){
    for(var i = 0; i < PLAYER_SCHEMES.length; i++){
      if(activeSchemeIds.indexOf(PLAYER_SCHEMES[i].id) === -1) return PLAYER_SCHEMES[i];
    }
    return null;
  }
  function renderPlayersPanel(){
    if(!isDesktop) return;
    playersListEl.innerHTML = activeSchemeIds.map(function(id){
      var s = schemeById(id);
      return '<div class="curve-player-row"><span class="dot" style="background:' + s.color + '"></span>' +
        playerLabel(id) + ' · ' + s.desc + '</div>';
    }).join('');
    var next = nextSchemeToAdd();
    if(next){
      addPlayerBtn.textContent = '+ Přidat hráče (' + next.desc + ')';
      addPlayerBtn.disabled = false;
    } else {
      addPlayerBtn.textContent = 'Max hráčů (6)';
      addPlayerBtn.disabled = true;
    }
  }
  if(isDesktop){
    addPlayerBtn.addEventListener('click', function(){
      var next = nextSchemeToAdd();
      if(!next) return;
      activeSchemeIds.push(next.id);
      renderPlayersPanel();
      updateScoreboard();
      // restarts the in-progress round so the new player spawns cleanly,
      // same spirit as an arcade "insert coin" joining the current game
      if(playing) resetRound();
    });
  }
  renderPlayersPanel();

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
