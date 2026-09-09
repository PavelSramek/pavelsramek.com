(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var stage = document.getElementById('stage');
  var hint = document.getElementById('hint');
  var hudSpeed = document.getElementById('hudSpeed');
  var hudSpin = document.getElementById('hudSpin');
  var hudBounces = document.getElementById('hudBounces');
  var scoreValueEl = document.getElementById('scoreValue');
  var scoreBestEl = document.getElementById('scoreBest');
  var scoreBadgesEl = document.getElementById('scoreBadges');
  var toastEl = document.getElementById('toast');
  var tiltBtn = document.getElementById('tiltBtn');

  // ---------- gamification: persistent score + badges (localStorage, per browser) ----------
  var STORAGE_KEY = 'pscrystal_stats_v1';
  var BADGES = [
    { id: 'first-touch', label: 'První dotek', test: function(s){ return s.totalThrows >= 1; } },
    { id: 'speedster',   label: 'Rychlík',      test: function(s){ return s.maxSpeed >= 7; } },
    { id: 'bouncer',     label: 'Mistr odrazů', test: function(s){ return s.totalBounces >= 25; } },
    { id: 'high-score',  label: '1000 bodů',    test: function(s){ return s.highScore >= 1000; } }
  ];

  function loadStats(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        var parsed = JSON.parse(raw);
        return {
          score: parsed.score || 0,
          highScore: parsed.highScore || 0,
          totalThrows: parsed.totalThrows || 0,
          totalBounces: parsed.totalBounces || 0,
          maxSpeed: parsed.maxSpeed || 0,
          unlocked: parsed.unlocked || []
        };
      }
    }catch(e){}
    return { score: 0, highScore: 0, totalThrows: 0, totalBounces: 0, maxSpeed: 0, unlocked: [] };
  }
  function saveStats(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); }catch(e){}
  }

  var stats = loadStats();
  var scoreBump = 0;
  var toastQueue = [];
  var toastShowing = false;

  function renderBadgeDots(){
    scoreBadgesEl.innerHTML = BADGES.map(function(b){
      var on = stats.unlocked.indexOf(b.id) !== -1;
      return '<span class="badge-dot' + (on ? ' on' : '') + '" title="' + b.label + '"></span>';
    }).join('');
  }
  renderBadgeDots();
  scoreValueEl.textContent = stats.score;
  scoreBestEl.textContent = stats.highScore;

  function queueToast(text){
    toastQueue.push(text);
    drainToastQueue();
  }
  function drainToastQueue(){
    if(toastShowing || toastQueue.length === 0) return;
    toastShowing = true;
    var text = toastQueue.shift();
    toastEl.innerHTML = 'Odznak: <b>' + text + '</b>';
    toastEl.classList.add('show');
    setTimeout(function(){
      toastEl.classList.remove('show');
      setTimeout(function(){ toastShowing = false; drainToastQueue(); }, 400);
    }, 2600);
  }

  function addScore(points){
    stats.score += points;
    if(stats.score > stats.highScore) stats.highScore = stats.score;
    scoreBump = 1;
    checkBadges();
    saveStats();
  }

  function checkBadges(){
    var changed = false;
    BADGES.forEach(function(b){
      if(stats.unlocked.indexOf(b.id) === -1 && b.test(stats)){
        stats.unlocked.push(b.id);
        queueToast(b.label);
        changed = true;
      }
    });
    if(changed) renderBadgeDots();
  }

  var scene = new THREE.Scene();

  var camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 9);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0b0e16, 1);
  stage.appendChild(renderer.domElement);

  // ---------- lighting ----------
  scene.add(new THREE.AmbientLight(0x404060, 0.9));

  var keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(4, 6, 8);
  scene.add(keyLight);

  var rimLight = new THREE.PointLight(0xd95c86, 2.2, 30);
  rimLight.position.set(-5, -2, 4);
  scene.add(rimLight);

  var orbitLight = new THREE.PointLight(0xffc93c, 2.6, 30);
  scene.add(orbitLight);

  // ---------- the crystal ----------
  var geo = new THREE.IcosahedronGeometry(1.65, 0);
  var colorTop = new THREE.Color(0x9b3fae);
  var colorMid = new THREE.Color(0xd95c86);
  var colorBot = new THREE.Color(0xffc93c);

  var posAttr = geo.attributes.position;
  var colors = [];
  for(var i = 0; i < posAttr.count; i++){
    var y = posAttr.getY(i);
    var t = (y + 1.65) / 3.3; // 0..1 bottom..top
    var c = t > 0.5
      ? colorMid.clone().lerp(colorTop, (t - 0.5) * 2)
      : colorBot.clone().lerp(colorMid, t * 2);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  var mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.22,
    metalness: 0.15,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
    flatShading: true,
    emissive: 0x1a0f24,
    emissiveIntensity: 0.25
  });

  var crystal = new THREE.Mesh(geo, mat);
  scene.add(crystal);

  // soft contact shadow beneath the crystal
  var shadowGeo = new THREE.CircleGeometry(1.5, 40);
  var shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
  var shadowBlob = new THREE.Mesh(shadowGeo, shadowMat);
  shadowBlob.rotation.x = -Math.PI / 2;
  shadowBlob.position.y = -2.9;
  scene.add(shadowBlob);

  // ---------- bounds (recomputed on resize) ----------
  var boundX = 3, boundY = 2;
  function computeBounds(){
    var vFOV = camera.fov * Math.PI / 180;
    var height = 2 * Math.tan(vFOV / 2) * camera.position.z;
    var width = height * camera.aspect;
    var margin = 1.7; // ~ crystal radius + a little breathing room
    boundX = Math.max(width / 2 - margin, 0.6);
    boundY = Math.max(height / 2 - margin, 0.6);
  }

  function onResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    computeBounds();
  }
  window.addEventListener('resize', onResize);
  computeBounds();

  // ---------- phone tilt → gravity ----------
  // Calibrated on whatever position the phone happens to be in when tilt
  // gets enabled, rather than assuming a fixed "upright" angle — so it
  // works whether it's held flat, angled, in one hand, etc. gravity.x/y
  // stay in -1..1 and are read every frame in tick(). If the pull ever
  // feels backwards on a real phone, flip the sign on that one axis below.
  var tiltSupported = 'DeviceOrientationEvent' in window;
  var tiltEnabled = false;
  var tiltBaseline = null;
  var gravity = { x: 0, y: 0 };
  var TILT_RANGE = 26;       // degrees of tilt to reach full gravity strength
  var GRAVITY_STRENGTH = 10; // world units / s^2 at full tilt

  function handleOrientation(e){
    if(e.beta === null || e.gamma === null) return;
    if(!tiltBaseline){ tiltBaseline = { beta: e.beta, gamma: e.gamma }; return; }
    var dGamma = e.gamma - tiltBaseline.gamma; // left/right
    var dBeta = e.beta - tiltBaseline.beta;    // forward/back
    gravity.x = Math.max(-1, Math.min(1, dGamma / TILT_RANGE));
    gravity.y = Math.max(-1, Math.min(1, dBeta / TILT_RANGE));
  }

  function startTilt(){
    tiltEnabled = true;
    tiltBaseline = null; // recalibrate from the very next reading
    window.addEventListener('deviceorientation', handleOrientation);
    if(tiltBtn) tiltBtn.classList.add('is-hidden');
    if(!hintHidden){ hint.classList.add('is-hidden'); hintHidden = true; }
  }

  function initTilt(){
    if(!tiltSupported || reduceMotion) return;
    var DOE = window.DeviceOrientationEvent;
    if(typeof DOE.requestPermission === 'function'){
      // iOS 13+ requires an explicit tap before it will grant sensor access
      if(tiltBtn){
        tiltBtn.classList.remove('is-hidden');
        tiltBtn.addEventListener('click', function(){
          DOE.requestPermission().then(function(state){
            if(state === 'granted') startTilt();
          }).catch(function(){});
        });
      }
    } else {
      // everywhere else: no gesture needed, but only switch tilt "on"
      // once a reading with real numbers actually arrives (desktops often
      // expose the event with null values, which shouldn't count)
      var probe = function(e){
        if(e.beta !== null && e.gamma !== null){
          window.removeEventListener('deviceorientation', probe);
          startTilt();
        }
      };
      window.addEventListener('deviceorientation', probe);
    }
  }
  initTilt();

  // ---------- physics state ----------
  var pos = new THREE.Vector3(0, 0, 0);
  var vel = new THREE.Vector3(0, 0, 0);
  var angVel = new THREE.Vector3(0.28, 0.35, 0.08);
  var bounceCount = 0;

  var squash = 0; // 0..1 decaying impact pulse
  var squashAxis = new THREE.Vector3(1, 0, 0);

  var dragging = false;
  var raycaster = new THREE.Raycaster();
  var dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  var pointerNDC = new THREE.Vector2();
  var dragPoint = new THREE.Vector3();
  var lastDragPoint = new THREE.Vector3();
  var lastDragTime = 0;
  var sampledVel = new THREE.Vector3();

  var hintHidden = false;
  var idleTimer = 0;

  function updatePointerNDC(clientX, clientY){
    var rect = renderer.domElement.getBoundingClientRect();
    pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  function intersectDragPlane(){
    raycaster.setFromCamera(pointerNDC, camera);
    raycaster.ray.intersectPlane(dragPlane, dragPoint);
    return dragPoint;
  }

  function hitTestCrystal(clientX, clientY){
    updatePointerNDC(clientX, clientY);
    raycaster.setFromCamera(pointerNDC, camera);
    var hits = raycaster.intersectObject(crystal, false);
    return hits.length > 0;
  }

  function pointerDown(clientX, clientY){
    if(!hitTestCrystal(clientX, clientY)) return;
    dragging = true;
    stage.classList.add('dragging');
    if(!hintHidden){ hint.classList.add('is-hidden'); hintHidden = true; }
    intersectDragPlane();
    lastDragPoint.copy(dragPoint);
    lastDragTime = performance.now();
    sampledVel.set(0, 0, 0);
  }

  function pointerMove(clientX, clientY){
    if(!dragging) return;
    updatePointerNDC(clientX, clientY);
    intersectDragPlane();
    var now = performance.now();
    var dt = Math.max((now - lastDragTime) / 1000, 1 / 120);
    var frameVel = dragPoint.clone().sub(lastDragPoint).divideScalar(dt);
    sampledVel.lerp(frameVel, 0.6);
    pos.copy(dragPoint);
    pos.x = Math.max(-boundX, Math.min(boundX, pos.x));
    pos.y = Math.max(-boundY, Math.min(boundY, pos.y));
    lastDragPoint.copy(dragPoint);
    lastDragTime = now;
  }

  function pointerUp(){
    if(!dragging) return;
    dragging = false;
    stage.classList.remove('dragging');
    vel.copy(sampledVel);
    vel.z = 0;
    // throwing motion imparts spin perpendicular to the velocity direction —
    // like flicking a ball, it tumbles in the direction it was thrown
    angVel.x += -sampledVel.y * 0.55;
    angVel.y += sampledVel.x * 0.55;
    angVel.z += (sampledVel.x - sampledVel.y) * 0.12;

    var releaseSpeed = Math.hypot(sampledVel.x, sampledVel.y);
    if(releaseSpeed > 0.4){
      stats.totalThrows++;
      if(releaseSpeed > stats.maxSpeed) stats.maxSpeed = releaseSpeed;
      addScore(5 + Math.round(releaseSpeed));
    }
  }

  stage.addEventListener('pointerdown', function(e){ pointerDown(e.clientX, e.clientY); });
  window.addEventListener('pointermove', function(e){ pointerMove(e.clientX, e.clientY); });
  window.addEventListener('pointerup', pointerUp);
  window.addEventListener('pointercancel', pointerUp);

  if(reduceMotion){
    hint.textContent = 'Krystal reaguje na kliknutí a tažení';
  }

  // ---------- main loop ----------
  var last = performance.now();

  function tick(){
    var now = performance.now();
    var dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;

    if(!dragging){
      if(tiltEnabled){
        vel.x += gravity.x * GRAVITY_STRENGTH * dt;
        vel.y -= gravity.y * GRAVITY_STRENGTH * dt;
        // a little roll in the direction it's being pulled, same spirit as
        // the throw's spin-perpendicular-to-motion below
        angVel.x += -gravity.y * dt * 1.4;
        angVel.y += gravity.x * dt * 1.4;
      }

      // integrate free flight
      pos.addScaledVector(vel, dt);

      var speed2 = vel.x * vel.x + vel.y * vel.y;
      var spin2 = angVel.lengthSq();

      if(speed2 < 0.02 && spin2 < 0.05){
        idleTimer += dt;
      } else {
        idleTimer = 0;
      }

      // wall collisions with a bit of restitution + a spin kick
      if(pos.x > boundX){ pos.x = boundX; onBounce(Math.abs(vel.x)); vel.x *= -0.72; angVel.y += -vel.x * 0.4; triggerSquash(1, 0); }
      else if(pos.x < -boundX){ pos.x = -boundX; onBounce(Math.abs(vel.x)); vel.x *= -0.72; angVel.y += -vel.x * 0.4; triggerSquash(1, 0); }
      if(pos.y > boundY){ pos.y = boundY; onBounce(Math.abs(vel.y)); vel.y *= -0.72; angVel.x += vel.y * 0.4; triggerSquash(0, 1); }
      else if(pos.y < -boundY){ pos.y = -boundY; onBounce(Math.abs(vel.y)); vel.y *= -0.72; angVel.x += vel.y * 0.4; triggerSquash(0, 1); }

      // damping — a touch livelier while fast, calmer near rest
      vel.multiplyScalar(Math.pow(0.985, dt * 60));
      angVel.multiplyScalar(Math.pow(0.988, dt * 60));

      // once it settles, ease in a gentle perpetual idle tumble so it never
      // reads as "stopped" — the whole point of this piece is that it's always alive
      var tiltActive = tiltEnabled && (Math.abs(gravity.x) > 0.05 || Math.abs(gravity.y) > 0.05);
      if(idleTimer > 0.6 && !tiltActive){
        angVel.x += (0.22 - angVel.x) * 0.01;
        angVel.y += (0.28 - angVel.y) * 0.01;
        pos.y += Math.sin(now * 0.0011) * 0.0012;
      }
    }

    crystal.position.copy(pos);
    crystal.rotation.x += angVel.x * dt;
    crystal.rotation.y += angVel.y * dt;
    crystal.rotation.z += angVel.z * dt;

    // squash & stretch settle
    squash *= Math.pow(0.82, dt * 60);
    var sx = 1 + squashAxis.x * squash * 0.16 - (1 - squashAxis.x) * squash * 0.06;
    var sy = 1 + squashAxis.y * squash * 0.16 - (1 - squashAxis.y) * squash * 0.06;
    crystal.scale.set(sx, sy, 1 + squash * 0.08);

    shadowBlob.position.x = pos.x;
    shadowBlob.position.z = pos.y * 0.4;
    var shrink = dragging ? 1.08 : 1;
    shadowBlob.scale.setScalar(shrink);

    // orbiting accent light keeps catching new facets even at rest
    var t = now * 0.00035;
    orbitLight.position.set(Math.cos(t) * 6, Math.sin(t * 0.7) * 3 + 1, Math.sin(t) * 6);

    renderer.render(scene, camera);

    var speed = Math.hypot(vel.x, vel.y);
    hudSpeed.textContent = speed.toFixed(2);
    hudSpin.textContent = angVel.length().toFixed(2);
    hudBounces.textContent = bounceCount;

    scoreValueEl.textContent = stats.score;
    scoreBestEl.textContent = stats.highScore;
    if(scoreBump > 0){
      scoreValueEl.classList.add('bump');
      scoreBump -= dt * 4;
      if(scoreBump <= 0) scoreValueEl.classList.remove('bump');
    }

    requestAnimationFrame(tick);
  }

  function triggerSquash(ax, ay){
    squash = 1;
    squashAxis.set(ax, ay, 0);
  }

  function onBounce(impactSpeed){
    bounceCount++;
    stats.totalBounces++;
    addScore(12 + Math.round(impactSpeed * 3));
  }

  requestAnimationFrame(tick);
})();
