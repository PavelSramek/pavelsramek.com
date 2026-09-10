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

  // ---------- die faces: campaign priorities + one brand face ----------
  // 5 faces carry the approved 2026 priority slogans (verbatim from the
  // campaign leaflet copy), 1 face is a plain brand card. Order here maps
  // 1:1 onto THREE.BoxGeometry's default material groups: [+X,-X,+Y,-Y,+Z,-Z].
  // Each face also carries a real die number ("num") so the same object can
  // double as an honest 1-6 die to roll for a board game — +X/-X, +Y/-Y and
  // +Z/-Z are opposite face pairs, numbered so opposite faces sum to 7 just
  // like a standard die.
  var FACES = [
    { id: 'young',    kind: 'priority', emoji: '🧒', title: 'Budoucnost pro mladé', sub: 'Stavíme školky, aby v Plzni 3 mělo místo každé dítě.', colorA: '#9b3fae', colorB: '#d95c86', num: 1 },
    { id: 'office',   kind: 'priority', emoji: '💻', title: 'Moderní úřad',         sub: 'Chceme úřad, který funguje z mobilu, ne z fronty.',     colorA: '#3a2f7d', colorB: '#5c6fd9', num: 6 },
    { id: 'green',    kind: 'priority', emoji: '🌳', title: 'Více zeleně',          sub: 'Měníme beton za parky.',                                colorA: '#1f6b46', colorB: '#3fae7b', num: 2 },
    { id: 'traffic',  kind: 'priority', emoji: '🚗', title: 'Klidnější obvod',      sub: 'Méně tranzitu, víc klidu pro lidi.',                    colorA: '#2f5d7d', colorB: '#4f8fae', num: 5 },
    { id: 'housing',  kind: 'priority', emoji: '🏠', title: 'Dostupné bydlení',     sub: 'Stavíme byty pro mladé rodiny.',                        colorA: '#ae7b3f', colorB: '#ffc93c', num: 3 },
    { id: 'brand',    kind: 'brand',    emoji: '🎲', title: 'PAVEL ŠRÁMEK',         sub: 'pavelsramek.com',                                       colorA: '#1a1224', colorB: '#0b0e16', num: 4 }
  ];

  // ---------- gamification: persistent score + badges (localStorage, per browser) ----------
  var STORAGE_KEY = 'pskostka_stats_v1';
  var BADGES = [
    { id: 'first-touch', label: 'První dotek',      test: function(s){ return s.totalThrows >= 1; } },
    { id: 'speedster',   label: 'Rychlík',           test: function(s){ return s.maxSpeed >= 7; } },
    { id: 'bouncer',     label: 'Mistr odrazů',      test: function(s){ return s.totalBounces >= 25; } },
    { id: 'high-score',  label: '1000 bodů',         test: function(s){ return s.highScore >= 1000; } },
    { id: 'collector',   label: 'Sběratel priorit',  test: function(s){ return (s.seenFaces || []).length >= 5; } }
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
          unlocked: parsed.unlocked || [],
          seenFaces: parsed.seenFaces || []
        };
      }
    }catch(e){}
    return { score: 0, highScore: 0, totalThrows: 0, totalBounces: 0, maxSpeed: 0, unlocked: [], seenFaces: [] };
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

  // queueToast: html is shown as-is; variant 'slogan' gets the taller/centered
  // card style (see css .toast.slogan), plain badge toasts keep the pill style.
  function queueToast(html, opts){
    toastQueue.push({ html: html, variant: (opts && opts.variant) || 'badge', duration: (opts && opts.duration) || 2600 });
    drainToastQueue();
  }
  function drainToastQueue(){
    if(toastShowing || toastQueue.length === 0) return;
    toastShowing = true;
    var item = toastQueue.shift();
    toastEl.innerHTML = item.html;
    toastEl.className = item.variant === 'slogan' ? 'slogan' : '';
    toastEl.classList.add('show');
    setTimeout(function(){
      toastEl.classList.remove('show');
      setTimeout(function(){ toastShowing = false; drainToastQueue(); }, 400);
    }, item.duration);
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
        queueToast('Odznak: <b>' + b.label + '</b>');
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
  // Kept deliberately soft/matte — the accent point lights used to throw a
  // hard glossy hotspot across the die; toned down here alongside the
  // material tweak below so the slogans stay readable from any angle.
  scene.add(new THREE.AmbientLight(0x404060, 0.95));

  var keyLight = new THREE.DirectionalLight(0xffffff, 0.75);
  keyLight.position.set(4, 6, 8);
  scene.add(keyLight);

  var rimLight = new THREE.PointLight(0xd95c86, 1.1, 30);
  rimLight.position.set(-5, -2, 4);
  scene.add(rimLight);

  var orbitLight = new THREE.PointLight(0xffc93c, 1.3, 30);
  scene.add(orbitLight);

  // ---------- texture helpers: draw one canvas "card" per die face ----------
  function wrapLines(ctx, text, maxWidth){
    var words = text.split(' ');
    var lines = [];
    var cur = '';
    for(var i = 0; i < words.length; i++){
      var test = cur ? cur + ' ' + words[i] : words[i];
      if(ctx.measureText(test).width > maxWidth && cur){
        lines.push(cur);
        cur = words[i];
      } else {
        cur = test;
      }
    }
    if(cur) lines.push(cur);
    return lines;
  }
  function drawWrapped(ctx, text, cx, cy, maxWidth, lineHeight){
    var lines = wrapLines(ctx, text, maxWidth);
    var startY = cy - (lines.length - 1) * lineHeight / 2;
    for(var j = 0; j < lines.length; j++){
      ctx.fillText(lines[j], cx, startY + j * lineHeight);
    }
  }

  function drawNumberBadge(ctx, cx, cy, num){
    var r = 34;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(11,14,22,0.55)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '700 40px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num), cx, cy + 2);
    ctx.restore();
  }

  function makeFaceTexture(face){
    var size = 512;
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    var ctx = canvas.getContext('2d');

    var g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, face.colorA);
    g.addColorStop(1, face.colorB);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    var rg = ctx.createRadialGradient(size * 0.5, size * 0.36, size * 0.05, size * 0.5, size * 0.5, size * 0.66);
    rg.addColorStop(0, 'rgba(255,255,255,0.18)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, size - 32, size - 32);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '148px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.fillText(face.emoji, size / 2, size * 0.35);

    ctx.fillStyle = '#fff';
    ctx.font = face.kind === 'brand' ? '700 42px Inter, sans-serif' : '700 48px Inter, sans-serif';
    drawWrapped(ctx, face.title, size / 2, size * 0.58, size - 90, 54);

    if(face.sub){
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.font = '400 29px Inter, sans-serif';
      drawWrapped(ctx, face.sub, size / 2, size * 0.75, size - 110, 35);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '600 22px Inter, sans-serif';
    ctx.fillText('PLZEŇ 3 · 2026', size / 2, size - 34);

    // corner number badges — so the same die also works as an honest 1-6
    // die for tabletop games, readable no matter how it lands or spins.
    if(face.num){
      drawNumberBadge(ctx, size * 0.12, size * 0.12, face.num);
      drawNumberBadge(ctx, size * 0.88, size * 0.88, face.num);
    }

    var tex = new THREE.CanvasTexture(canvas);
    if(renderer.capabilities && renderer.capabilities.getMaxAnisotropy){
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }
    return tex;
  }

  // ---------- the die ----------
  // BoxGeometry's default material groups map to faces in this order:
  // [+X, -X, +Y, -Y, +Z, -Z] — FACES above is written to match.
  var DIE_SIZE = 2.2;
  var geo = new THREE.BoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE);
  // matte-leaning finish: high roughness + a bare whisper of clearcoat keeps
  // the printed slogans readable instead of drowning in a glossy hotspot
  var materials = FACES.map(function(face){
    return new THREE.MeshPhysicalMaterial({
      map: makeFaceTexture(face),
      roughness: 0.68,
      metalness: 0.03,
      clearcoat: 0.06,
      clearcoatRoughness: 0.75
    });
  });

  var crystal = new THREE.Mesh(geo, materials);
  scene.add(crystal);

  // face normals in the die's own local space, index-matched to FACES / the
  // material groups above — used to work out which face ends up camera-facing
  var FACE_NORMALS = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1)
  ];
  // canonical "which way is up" for each face's printed texture — used so
  // that whichever face lands toward the camera, its slogan lands right
  // side up rather than at some arbitrary 90°/180° roll. Matched against
  // makeFaceTexture()'s actual UV orientation via visual QA.
  var FACE_UP = [
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 1, 0)
  ];
  var CAM_DIR = new THREE.Vector3(0, 0, 1);

  // soft contact shadow beneath the die
  var shadowGeo = new THREE.CircleGeometry(1.7, 40);
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
    var margin = 2.0; // ~ die's rotated corner reach + a little breathing room
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
  var GRAVITY_STRENGTH = 12; // world units / s^2 at full tilt

  // baseline "tabletop" gravity — active whenever tilt isn't, so the die
  // always has real weight and settles at the bottom of the screen instead
  // of just drifting to a stop wherever it was thrown
  var BASE_GRAVITY = 6.5;
  // a heavier die: throws land softer, walls feel like a dull thud instead
  // of a bouncy ball, and everything damps out a touch quicker
  var THROW_MASS = 1.35;
  // below this impact speed a wall "hit" is treated as resting contact
  // (velocity just clamped to zero) instead of a bounce — otherwise the
  // constant downward gravity above would keep re-triggering tiny bounces
  // against the floor forever and the die would never settle into landing
  var MIN_BOUNCE_SPEED = 0.15;

  function handleOrientation(e){
    if(e.beta === null || e.gamma === null) return;
    if(!tiltBaseline){ tiltBaseline = { beta: e.beta, gamma: e.gamma }; return; }
    var dGamma = e.gamma - tiltBaseline.gamma; // left/right
    var dBeta = e.beta - tiltBaseline.beta;    // forward/back
    gravity.x = Math.max(-1, Math.min(1, dGamma / TILT_RANGE));
    gravity.y = Math.max(-1, Math.min(1, dBeta / TILT_RANGE));
  }

  // ---------- shake to roll ----------
  // Once tilt is on, a real shake of the phone (not just a slow tilt) gives
  // the die a hard random kick — like shaking dice in cupped hands — so it
  // tumbles and lands on a fresh face without needing a drag/flick gesture.
  var lastAccel = null;
  var lastShakeTime = 0;
  var SHAKE_THRESHOLD = 22;  // m/s^2 of jerk between readings
  var SHAKE_COOLDOWN = 650;  // ms — ignore re-triggers mid-shake

  function triggerShakeRoll(){
    landed = false;
    landing = false;
    idleTimer = 0;
    var kick = 3 + Math.random() * 3;
    vel.x += (Math.random() * 2 - 1) * kick;
    vel.y += (Math.random() * 2 - 1) * kick * 0.7 + kick * 0.5;
    angVel.x += (Math.random() * 2 - 1) * 7;
    angVel.y += (Math.random() * 2 - 1) * 7;
    angVel.z += (Math.random() * 2 - 1) * 5;
    if(!hintHidden){ hint.classList.add('is-hidden'); hintHidden = true; }
  }

  function handleMotion(e){
    var a = e.accelerationIncludingGravity || e.acceleration;
    if(!a || a.x === null || a.x === undefined) return;
    if(lastAccel){
      var dx = a.x - lastAccel.x, dy = a.y - lastAccel.y, dz = a.z - lastAccel.z;
      var jerk = Math.sqrt(dx * dx + dy * dy + dz * dz);
      var now = performance.now();
      if(jerk > SHAKE_THRESHOLD && now - lastShakeTime > SHAKE_COOLDOWN){
        lastShakeTime = now;
        triggerShakeRoll();
      }
    }
    lastAccel = a;
  }

  function startTilt(){
    tiltEnabled = true;
    tiltBaseline = null; // recalibrate from the very next reading
    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);
    if(tiltBtn) tiltBtn.classList.add('is-hidden');
    if(!hintHidden){ hint.classList.add('is-hidden'); hintHidden = true; }
  }

  function initTilt(){
    if(!tiltSupported || reduceMotion) return;
    var DOE = window.DeviceOrientationEvent;
    var DME = window.DeviceMotionEvent;
    if(typeof DOE.requestPermission === 'function'){
      // iOS 13+ requires an explicit tap before it will grant sensor access —
      // orientation and motion are separate permissions there, so both get
      // requested from the same tap.
      if(tiltBtn){
        tiltBtn.classList.remove('is-hidden');
        tiltBtn.addEventListener('click', function(){
          DOE.requestPermission().then(function(state){
            if(state === 'granted') startTilt();
          }).catch(function(){});
          if(DME && typeof DME.requestPermission === 'function'){
            DME.requestPermission().catch(function(){});
          }
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

  // ---------- landing: once the die settles, snap it flat onto whichever
  // face is currently most toward the camera, then reveal that slogan.
  // The target orientation is computed analytically (not just "round each
  // Euler angle to the nearest 90°") so the printed text always lands the
  // right way up instead of at some arbitrary 90°/180° roll. ----------
  var LAND_MS = 480;
  var landing = false;
  var landed = false;
  var landedFaceIdx = -1;
  var landStartTime = 0;
  var landStartQuat = new THREE.Quaternion();
  var landTargetQuat = new THREE.Quaternion();
  var tmpNormal = new THREE.Vector3();
  var tmpRight = new THREE.Vector3();
  var tmpMatrix = new THREE.Matrix4();

  function facingCameraIndex(){
    var best = -1, bestDot = -2;
    for(var i = 0; i < FACE_NORMALS.length; i++){
      tmpNormal.copy(FACE_NORMALS[i]).applyQuaternion(crystal.quaternion);
      var d = tmpNormal.dot(CAM_DIR);
      if(d > bestDot){ bestDot = d; best = i; }
    }
    return best;
  }

  // the exact orientation where FACE_NORMALS[idx] points at the camera and
  // FACE_UP[idx] points straight up on screen — i.e. that face's slogan
  // rendered upright and facing the viewer
  function uprightQuaternionFor(idx){
    var n = FACE_NORMALS[idx];
    var up = FACE_UP[idx];
    tmpRight.crossVectors(up, n).normalize();
    tmpMatrix.set(
      tmpRight.x, tmpRight.y, tmpRight.z, 0,
      up.x,       up.y,       up.z,       0,
      n.x,        n.y,        n.z,        0,
      0, 0, 0, 1
    );
    return new THREE.Quaternion().setFromRotationMatrix(tmpMatrix);
  }

  function startLanding(){
    landing = true;
    landStartTime = performance.now();
    landStartQuat.copy(crystal.quaternion);
    landedFaceIdx = facingCameraIndex();
    landTargetQuat.copy(uprightQuaternionFor(landedFaceIdx));
    // slerp the short way round
    if(landStartQuat.dot(landTargetQuat) < 0){
      landTargetQuat.set(-landTargetQuat.x, -landTargetQuat.y, -landTargetQuat.z, -landTargetQuat.w);
    }
  }

  function revealLandedFace(){
    var idx = landedFaceIdx;
    var face = FACES[idx];
    if(!face) return;
    if(face.kind === 'priority'){
      if(stats.seenFaces.indexOf(face.id) === -1){
        stats.seenFaces.push(face.id);
        saveStats();
      }
      addScore(20);
      checkBadges();
      queueToast(
        face.emoji + ' <b>' + face.title + '</b><span class="toast-sub">' + face.sub + '</span>',
        { variant: 'slogan', duration: 3200 }
      );
    } else {
      addScore(8);
      queueToast(
        face.emoji + ' <b>' + face.title + '</b><span class="toast-sub">' + face.sub + '</span>',
        { variant: 'slogan', duration: 2600 }
      );
    }
  }

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
    landed = false;
    landing = false;
    idleTimer = 0;
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
    // a heavier die doesn't fly off at full flick speed — scale the release
    // velocity down by its "mass" so throws feel weighty, not floaty
    vel.copy(sampledVel).divideScalar(THROW_MASS);
    vel.z = 0;
    // throwing motion imparts spin perpendicular to the velocity direction —
    // like flicking a die, it tumbles in the direction it was thrown
    angVel.x += -sampledVel.y * 0.4 / THROW_MASS;
    angVel.y += sampledVel.x * 0.4 / THROW_MASS;
    angVel.z += (sampledVel.x - sampledVel.y) * 0.09 / THROW_MASS;

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
    hint.textContent = 'Kostka reaguje na kliknutí a tažení';
  }

  // ---------- main loop ----------
  // "active" lets a host page pause this game (e.g. while the visitor has
  // switched to the other showcase piece) without tearing anything down —
  // state, score and the Three.js scene all just sit still until resumed.
  var active = true;
  var last = performance.now();

  function tick(){
    var now = performance.now();
    var dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;

    if(!active){
      requestAnimationFrame(tick);
      return;
    }

    if(!dragging){
      // captured before gravity is applied this frame, so a slow/irregular
      // frame's own (possibly large) gravity delta can never masquerade as
      // "real incoming motion" when classifying the wall contact below
      var entryVelX = vel.x, entryVelY = vel.y;

      if(tiltEnabled){
        vel.x += gravity.x * GRAVITY_STRENGTH * dt;
        vel.y -= gravity.y * GRAVITY_STRENGTH * dt;
        // a little roll in the direction it's being pulled, same spirit as
        // the throw's spin-perpendicular-to-motion below
        angVel.x += -gravity.y * dt * 1.4;
        angVel.y += gravity.x * dt * 1.4;
      } else {
        // no phone sensor in play — the die still has real weight and
        // always falls toward the bottom of the screen, like on a table
        vel.y -= BASE_GRAVITY * dt;
      }

      // integrate free flight
      pos.addScaledVector(vel, dt);

      // wall collisions with a bit of restitution + a spin kick — a hard
      // bounce always wakes the die up, landed or not. Restitution is kept
      // low (a dull thud, not a bouncy ball) to match the die's added weight.
      // Whether a contact counts as a real bounce is judged on the velocity
      // the die already had coming into this frame (entryVel*), not the
      // post-gravity value — otherwise a slow/irregular frame's own gravity
      // delta could masquerade as an "impact" and the die would never
      // settle, forever re-bouncing at ~zero amplitude.
      if(pos.x > boundX){
        pos.x = boundX;
        if(Math.abs(entryVelX) > MIN_BOUNCE_SPEED){ onBounce(Math.abs(vel.x)); vel.x *= -0.42; angVel.y += -vel.x * 0.28; triggerSquash(1, 0); landed = false; landing = false; }
        else vel.x = 0;
      } else if(pos.x < -boundX){
        pos.x = -boundX;
        if(Math.abs(entryVelX) > MIN_BOUNCE_SPEED){ onBounce(Math.abs(vel.x)); vel.x *= -0.42; angVel.y += -vel.x * 0.28; triggerSquash(1, 0); landed = false; landing = false; }
        else vel.x = 0;
      }
      if(pos.y > boundY){
        pos.y = boundY;
        if(Math.abs(entryVelY) > MIN_BOUNCE_SPEED){ onBounce(Math.abs(vel.y)); vel.y *= -0.42; angVel.x += vel.y * 0.28; triggerSquash(0, 1); landed = false; landing = false; }
        else vel.y = 0;
      } else if(pos.y < -boundY){
        pos.y = -boundY;
        if(Math.abs(entryVelY) > MIN_BOUNCE_SPEED){ onBounce(Math.abs(vel.y)); vel.y *= -0.42; angVel.x += vel.y * 0.28; triggerSquash(0, 1); landed = false; landing = false; }
        else vel.y = 0;
      }

      // damping — heavier now: settles calmer and a bit sooner
      vel.multiplyScalar(Math.pow(0.975, dt * 60));
      angVel.multiplyScalar(Math.pow(0.978, dt * 60));

      // speed/spin are read AFTER the wall-contact clamp and damping above,
      // not before — a die resting against a wall has just had its velocity
      // clamped to exactly 0 there, so this reads as truly still no matter
      // how strong gravity is or how long/short this frame's dt was. Reading
      // it earlier (pre-clamp) meant a slow frame's own gravity delta alone
      // could look like "still moving" and the die would tumble forever.
      var speed2 = vel.x * vel.x + vel.y * vel.y;
      var spin2 = angVel.lengthSq();

      if(landed && (speed2 > 0.05 || spin2 > 0.08)){
        // something (usually tilt) is pushing hard enough to wake it back up
        landed = false;
      }

      if(!landed && !landing){
        if(speed2 < 0.02 && spin2 < 0.05){ idleTimer += dt; } else { idleTimer = 0; }
      }

      // once it truly settles (and isn't being held tilted), start the
      // snap-to-face landing sequence instead of tumbling forever
      var tiltActive = tiltEnabled && (Math.abs(gravity.x) > 0.05 || Math.abs(gravity.y) > 0.05);
      if(!landed && !landing && idleTimer > 0.6 && !tiltActive){
        startLanding();
      }
    }

    if(landing){
      var lp = Math.min((now - landStartTime) / LAND_MS, 1);
      var ease = 1 - Math.pow(1 - lp, 3);
      crystal.quaternion.copy(landStartQuat).slerp(landTargetQuat, ease);
      if(lp >= 1){
        crystal.quaternion.copy(landTargetQuat);
        landing = false;
        landed = true;
        revealLandedFace();
      }
    } else if(!landed){
      crystal.rotation.x += angVel.x * dt;
      crystal.rotation.y += angVel.y * dt;
      crystal.rotation.z += angVel.z * dt;
    }

    crystal.position.copy(pos);

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

  window.PSCrystal = {
    setActive: function(v){ active = !!v; }
  };
})();
