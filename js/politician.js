(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var avatar = document.getElementById('pzAvatar');
  var livesEl = document.getElementById('pzLives');
  var scoreValueEl = document.getElementById('pzScoreValue');
  var scoreBestEl = document.getElementById('pzScoreBest');
  var rankEl = document.getElementById('pzRank');
  var milestoneEl = document.getElementById('pzMilestone');
  var milestoneKickerEl = document.getElementById('pzMilestoneKicker');
  var milestoneNameEl = document.getElementById('pzMilestoneName');
  var milestonePartyEl = document.getElementById('pzMilestoneParty');
  var milestoneQuipEl = document.getElementById('pzMilestoneQuip');
  var startCard = document.getElementById('pzStartCard');
  var startTap = document.getElementById('pzStartTap');
  var overCard = document.getElementById('pzOverCard');
  var finalScoreEl = document.getElementById('pzFinalScore');
  var finalRankEl = document.getElementById('pzFinalRank');
  var retryTap = document.getElementById('pzRetryTap');

  // ---------- content: the "PR-boosting" activities that fly in from all
  // sides — 24 distinct kinds so the same 2-3 icons don't keep repeating
  // back to back the way the old 8-item set did. Grouped loosely by type:
  // visible results, public events, citizen contact, media, goodwill. ----------
  var ICONS = [
    { emoji: '🏛️', label: 'Nové náměstí' },
    { emoji: '🚧', label: 'Oprava ulice' },
    { emoji: '🏫', label: 'Oprava školy' },
    { emoji: '🌳', label: 'Nový park' },
    { emoji: '🚲', label: 'Nová cyklostezka' },
    { emoji: '💡', label: 'Nové osvětlení' },
    { emoji: '🚸', label: 'Bezpečný přechod' },
    { emoji: '🛝', label: 'Dětské hřiště' },
    { emoji: '🅿️', label: 'Nová parkovací místa' },
    { emoji: '✂️', label: 'Slavnostní otevření' },
    { emoji: '🎪', label: 'Jarmark v obvodu' },
    { emoji: '👶', label: 'Vítání občánků' },
    { emoji: '🎂', label: 'Gratulace jubilantovi' },
    { emoji: '🚒', label: 'Ocenění hasičům' },
    { emoji: '🎖️', label: 'Ocenění dobrovolníkům' },
    { emoji: '🤝', label: 'Setkání s občany' },
    { emoji: '🗣️', label: 'Veřejné projednání' },
    { emoji: '📋', label: 'Anketa mezi občany' },
    { emoji: '📱', label: 'Video na sítě' },
    { emoji: '📰', label: 'Rozhovor pro noviny' },
    { emoji: '📻', label: 'Rozhlasový pořad' },
    { emoji: '📺', label: 'Televizní debata' },
    { emoji: '🎁', label: 'Vánoční sbírka' },
    { emoji: '🍲', label: 'Oběd pro seniory' }
  ];

  // 10 levels, upravená sestava dle uživatele (10. 9. 2026). index 0
  // (Radek Proch, score 0) je startovní úroveň — nikdy se pro ni
  // nezobrazuje banner. Poslední index (Roman Zarzycký, ANO) je finální
  // boss level — viz isBossLevel()/maxConcurrent()/spawnInterval() níže,
  // kde se pro tuhle úroveň dramaticky zvyšuje obtížnost (spam bublin).
  // Quipy u úrovní 2–9 čekají na dodání konkrétního textu od uživatele —
  // do té doby zůstávají prázdné (žádný quip se v milníku nezobrazí).
  var RANKS = [
    { score: 0,    name: 'Radek Proch',       party: 'Piráti' },
    { score: 60,   name: 'Michal Vozobule',   party: 'Chceme Plzeň' },
    { score: 180,  name: 'Katka Hulínská',    party: 'Piráti' },
    { score: 360,  name: 'Libuše Hubáčková',  party: 'PRO PLZEŇ' },
    { score: 600,  name: 'Tomáš Zalabák',     party: 'Piráti' },
    { score: 900,  name: 'Aleš Tolar',        party: 'STAN' },
    { score: 1260, name: 'Eva Šrámková',      party: 'Piráti' },
    { score: 1680, name: 'Lukáš Hegner',      party: 'ODS' },
    { score: 2160, name: 'Pavel Šrámek',      party: 'Piráti' },
    { score: 2700, name: 'Roman Zarzycký', party: 'ANO', boss: true,
      quip: '🎥 Vyhrál jsi! Běž na magistrát, buď primátor. (A natoč aspoň 3 videa denně. O všem.)' }
  ];
  var MAX_TIER_SCORE = RANKS[RANKS.length - 1].score;

  var STORAGE_KEY = 'pspolitician_stats_v1';
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

  var DIRS = ['n', 'e', 's', 'w'];
  var zones = DIRS.map(function(dir){
    var el = document.getElementById('pzZone' + dir.toUpperCase());
    return {
      dir: dir,
      el: el,
      emojiEl: el.querySelector('.pz-icon-emoji'),
      labelEl: el.querySelector('.pz-icon-label'),
      state: 'idle',       // idle | active | pop | missed
      timeLeft: 0,          // ms remaining while active
      visibleDuration: 0,   // ms this spawn was given, for reference
      resetTimer: 0         // ms remaining in a pop/missed transition
    };
  });

  zones.forEach(function(z){
    z.el.addEventListener('pointerdown', function(e){
      e.preventDefault();
      hitZone(z);
    });
  });

  var active = true;   // host-controlled pause, same convention as the other games
  var playing = false;
  var lives = 3;
  var score = 0;
  var rankIndex = 0;
  var spawnCooldown = 900;
  var scoreBump = 0;

  // Boss level (the last rank, Roman Zarzycký) is a deliberate difficulty
  // spike on top of the normal curve below: every zone slot is used at
  // once and they refill almost instantly, so the screen fills with
  // activity far beyond what's survivable for long — "10x tolik bublin",
  // per uživatel (10. 9. 2026). It reuses the same 4 fixed zone slots
  // (pzZoneN/E/S/W) rather than spawning extra DOM elements.
  function isBossLevel(){
    return rankIndex === RANKS.length - 1;
  }

  function difficultyFactor(){
    return Math.min(score / MAX_TIER_SCORE, 1);
  }
  function lerp(a, b, t){ return a + (b - a) * t; }

  var BOSS_SPAWN_INTERVAL = 90;     // ms between spawn attempts — near-instant refill
  var BOSS_VISIBLE_DURATION = 420;  // ms a bubble stays up before it's missed

  function spawnInterval(){
    if(isBossLevel()) return BOSS_SPAWN_INTERVAL;
    return lerp(1100, 480, difficultyFactor());
  }
  function visibleDuration(){
    if(isBossLevel()) return BOSS_VISIBLE_DURATION;
    return lerp(1500, 680, difficultyFactor());
  }
  function maxConcurrent(){
    if(isBossLevel()) return zones.length; // every slot in play at once
    var f = difficultyFactor();
    if(f >= 0.6) return 3;
    if(f >= 0.2) return 2;
    return 1;
  }

  function activeCount(){
    var n = 0;
    zones.forEach(function(z){ if(z.state === 'active') n++; });
    return n;
  }

  // ---------- random full-screen placement ----------
  // Bubbles now land anywhere on the display rather than at the 4 compass
  // points. Keep them off the fixed chrome around the edges (backlink,
  // score box, lives HUD, tech-credit corner, the game-switch button) and
  // away from any bubble that's already on screen, retrying a handful of
  // times before just giving up and centering.
  function excludedRects(){
    var w = window.innerWidth, h = window.innerHeight;
    var cw = Math.min(190, w * 0.5);
    var chTop = Math.min(140, h * 0.22);
    var chBacklink = Math.min(70, h * 0.12);
    var chBottom = Math.min(140, h * 0.22);
    var chCorner = Math.min(70, h * 0.12);
    var midW = Math.min(180, w * 0.5);
    var midBand = Math.min(80, h * 0.14);
    return [
      { x1: 0, y1: 0, x2: cw, y2: chBacklink },                    // #backlink
      { x1: w - cw, y1: 0, x2: w, y2: chTop },                     // score box
      { x1: 0, y1: h - chBottom, x2: cw, y2: h },                  // lives HUD
      { x1: w - cw, y1: h - chCorner, x2: w, y2: h },              // tech-credit corner
      { x1: w - midW, y1: h / 2 - midBand, x2: w, y2: h / 2 + midBand } // game-switch button
    ];
  }

  function rectsOverlap(ax1, ay1, ax2, ay2, r){
    return ax1 < r.x2 && ax2 > r.x1 && ay1 < r.y2 && ay2 > r.y1;
  }

  function activeRects(exclude){
    var out = [];
    zones.forEach(function(z){
      if(z !== exclude && (z.state === 'active' || z.state === 'pop') && z.half){
        out.push({ x1: z.cx - z.half, y1: z.cy - z.half, x2: z.cx + z.half, y2: z.cy + z.half });
      }
    });
    return out;
  }

  function randomSpawnPos(size, exclude){
    var w = window.innerWidth, h = window.innerHeight;
    var half = size / 2;
    var pad = 12;
    var minX = pad + half, maxX = Math.max(minX, w - pad - half);
    var minY = pad + half, maxY = Math.max(minY, h - pad - half);
    var rects = excludedRects().concat(activeRects(exclude));
    for(var i = 0; i < 14; i++){
      var x = minX + Math.random() * (maxX - minX);
      var y = minY + Math.random() * (maxY - minY);
      var bad = rects.some(function(r){ return rectsOverlap(x - half, y - half, x + half, y + half, r); });
      if(!bad) return { x: x, y: y };
    }
    return { x: w / 2, y: h / 2 };
  }

  function renderLives(){
    var s = '';
    for(var i = 0; i < 3; i++){ s += i < lives ? '❤️' : '🖤'; }
    livesEl.textContent = s;
  }

  function levelLabel(idx){ return (idx + 1) + '/' + RANKS.length; }

  function renderRank(){
    rankEl.textContent = 'úroveň ' + levelLabel(rankIndex) + ' · ' + RANKS[rankIndex].name;
  }

  function showMilestone(rank){
    milestoneKickerEl.textContent = 'Milník · úroveň ' + levelLabel(rankIndex);
    milestoneNameEl.textContent = rank.name;
    milestonePartyEl.textContent = rank.party || '';
    milestoneQuipEl.textContent = rank.quip || '';
    milestoneQuipEl.classList.toggle('is-hidden', !rank.quip);
    milestoneEl.classList.toggle('boss', !!rank.boss);
    milestoneEl.classList.add('show');
    setTimeout(function(){ milestoneEl.classList.remove('show'); }, rank.boss ? 3200 : 2000);
  }

  function checkRankUp(){
    var newIndex = rankIndex;
    for(var i = RANKS.length - 1; i >= 0; i--){
      if(score >= RANKS[i].score){ newIndex = i; break; }
    }
    if(newIndex > rankIndex){
      rankIndex = newIndex;
      renderRank();
      showMilestone(RANKS[rankIndex]);
    }
  }

  function addScore(points){
    score += points;
    if(score > highScore){ highScore = score; saveHigh(highScore); }
    scoreValueEl.textContent = score;
    scoreBestEl.textContent = highScore;
    scoreBump = 1;
    checkRankUp();
  }

  function pulseAvatar(){
    avatar.classList.remove('hit');
    // restart the animation even if it's already mid-flight
    void avatar.offsetWidth;
    avatar.classList.add('hit');
  }

  function hitZone(z){
    if(z.state !== 'active') return;
    z.state = 'pop';
    z.el.classList.remove('active');
    z.el.classList.add('pop');
    z.resetTimer = 200;
    pulseAvatar();
    addScore(10 + rankIndex * 4);
  }

  function missZone(z){
    z.state = 'missed';
    z.el.classList.remove('active');
    z.el.classList.add('missed');
    z.resetTimer = 240;
    lives--;
    renderLives();
    if(lives <= 0) gameOver();
  }

  function settleZone(z){
    z.state = 'idle';
    z.el.classList.remove('pop', 'missed');
  }

  function trySpawn(){
    if(activeCount() >= maxConcurrent()) return;
    var idle = zones.filter(function(z){ return z.state === 'idle'; });
    if(idle.length === 0) return;
    var z = idle[Math.floor(Math.random() * idle.length)];
    var icon = ICONS[Math.floor(Math.random() * ICONS.length)];
    z.emojiEl.textContent = icon.emoji;
    z.labelEl.textContent = icon.label;

    var size = parseFloat(getComputedStyle(z.el).width) || 100;
    var pos = randomSpawnPos(size, z);
    z.cx = pos.x;
    z.cy = pos.y;
    z.half = size / 2;
    z.el.style.left = pos.x + 'px';
    z.el.style.top = pos.y + 'px';

    z.state = 'active';
    z.visibleDuration = visibleDuration();
    z.timeLeft = z.visibleDuration;
    z.el.classList.add('active');
  }

  function resetZones(){
    zones.forEach(function(z){
      z.state = 'idle';
      z.el.classList.remove('active', 'pop', 'missed');
    });
  }

  function startRound(){
    score = 0;
    lives = 3;
    rankIndex = 0;
    spawnCooldown = 700;
    scoreValueEl.textContent = 0;
    scoreBestEl.textContent = highScore;
    renderLives();
    renderRank();
    resetZones();
    startCard.classList.add('hidden');
    overCard.classList.add('hidden');
    playing = true;
  }

  function gameOver(){
    playing = false;
    resetZones();
    finalScoreEl.textContent = score;
    finalRankEl.textContent = 'dosažená úroveň: ' + levelLabel(rankIndex) + ' · ' + RANKS[rankIndex].name + ' (' + RANKS[rankIndex].party + ')';
    overCard.classList.remove('hidden');
  }

  startTap.addEventListener('click', startRound);
  retryTap.addEventListener('click', startRound);

  // ---------- main loop ----------
  var last = performance.now();
  function tick(){
    var now = performance.now();
    var dt = Math.min(now - last, 1000 / 30);
    last = now;

    if(active && playing){
      zones.forEach(function(z){
        if(z.state === 'active'){
          z.timeLeft -= dt;
          if(z.timeLeft <= 0) missZone(z);
        } else if(z.resetTimer > 0){
          z.resetTimer -= dt;
          if(z.resetTimer <= 0) settleZone(z);
        }
      });

      spawnCooldown -= dt;
      if(spawnCooldown <= 0){
        trySpawn();
        spawnCooldown = spawnInterval() * (0.85 + Math.random() * 0.3);
      }
    }

    if(scoreBump > 0){
      scoreValueEl.classList.add('bump');
      scoreBump -= dt / 250;
      if(scoreBump <= 0) scoreValueEl.classList.remove('bump');
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  if(reduceMotion){
    // the appear/disappear timing is the whole game; without motion this
    // is still playable, just visually simpler — no extra handling needed
    // beyond what the reduced-motion CSS already strips.
  }

  renderLives();
  renderRank();

  window.PSPolitician = {
    setActive: function(v){ active = !!v; }
  };
})();
