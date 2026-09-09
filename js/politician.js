(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var avatar = document.getElementById('pzAvatar');
  var livesEl = document.getElementById('pzLives');
  var scoreValueEl = document.getElementById('pzScoreValue');
  var scoreBestEl = document.getElementById('pzScoreBest');
  var rankEl = document.getElementById('pzRank');
  var milestoneEl = document.getElementById('pzMilestone');
  var milestoneNameEl = document.getElementById('pzMilestoneName');
  var milestoneQuipEl = document.getElementById('pzMilestoneQuip');
  var startCard = document.getElementById('pzStartCard');
  var startTap = document.getElementById('pzStartTap');
  var overCard = document.getElementById('pzOverCard');
  var finalScoreEl = document.getElementById('pzFinalScore');
  var finalRankEl = document.getElementById('pzFinalRank');
  var retryTap = document.getElementById('pzRetryTap');

  // ---------- content: the "achievements" that fly in from all sides ----------
  var ICONS = [
    { emoji: '🏛️', label: 'Nové náměstí' },
    { emoji: '🚧', label: 'Oprava ulice' },
    { emoji: '🏫', label: 'Oprava školy' },
    { emoji: '🚒', label: 'Ocenění hasičům' },
    { emoji: '📱', label: 'Video o bezpečnosti' },
    { emoji: '🌳', label: 'Nový park' },
    { emoji: '🤝', label: 'Setkání s občany' },
    { emoji: '✂️', label: 'Slavnostní otevření' }
  ];

  // score milestones — index 0 is the starting rank (never announced with a
  // banner, just shown as the baseline under the score box); the rest fire
  // a milestone banner the moment the player's score first crosses them.
  var RANKS = [
    { score: 0,    name: 'Nováček na kandidátce' },
    { score: 100,  name: 'Radek Proch',      quip: 'Sportovní tempo. Rychlost roste.' },
    { score: 300,  name: 'Kateřina Hulínská', quip: 'Přehled o všem, co se ve městě řeší.' },
    { score: 600,  name: 'Marek Habruň',      quip: 'Naplánováno do posledního detailu.' },
    { score: 1000, name: 'Pavel Šrámek',      quip: 'Level lídra kandidátky. Skoro doma.' },
    { score: 1500, name: 'Roman Zarzycký', boss: true, quip: '🎥 Teď musíš natočit aspoň 3 videa denně. O všem.' }
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

  function difficultyFactor(){
    return Math.min(score / MAX_TIER_SCORE, 1);
  }
  function lerp(a, b, t){ return a + (b - a) * t; }

  function spawnInterval(){ return lerp(1100, 480, difficultyFactor()); }
  function visibleDuration(){ return lerp(1500, 680, difficultyFactor()); }
  function maxConcurrent(){ return score >= 300 ? 2 : 1; }

  function activeCount(){
    var n = 0;
    zones.forEach(function(z){ if(z.state === 'active') n++; });
    return n;
  }

  function renderLives(){
    var s = '';
    for(var i = 0; i < 3; i++){ s += i < lives ? '❤️' : '🖤'; }
    livesEl.textContent = s;
  }

  function renderRank(){
    rankEl.textContent = 'úroveň: ' + RANKS[rankIndex].name;
  }

  function showMilestone(rank){
    milestoneNameEl.textContent = rank.name;
    milestoneQuipEl.textContent = rank.quip || '';
    milestoneQuipEl.classList.toggle('is-hidden', !rank.quip);
    milestoneEl.classList.toggle('boss', !!rank.boss);
    milestoneEl.classList.add('show');
    setTimeout(function(){ milestoneEl.classList.remove('show'); }, rank.boss ? 3200 : 2200);
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
    finalRankEl.textContent = 'dosažená úroveň: ' + RANKS[rankIndex].name;
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
