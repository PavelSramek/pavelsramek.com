// "Kdo je Pavel" — interaktivní scrollytelling hero (index.html)
(function(){
  var root = document.querySelector('.hs-root');
  if(!root) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var progressBar = document.getElementById('hsScrollProgress');

  if(reduce){
    root.classList.add('hs-reduced-motion');
    if(progressBar) progressBar.style.width = '100%';
    return;
  }

  var hoverCapable = window.matchMedia('(hover: hover)').matches;

  // magnetic pull on the stage CTA buttons
  if(hoverCapable){
    root.querySelectorAll('.hs-btn').forEach(function(btn){
      btn.addEventListener('mousemove', function(e){
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.3;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.35;
        btn.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      });
      btn.addEventListener('mouseleave', function(){ btn.style.transform = ''; });
    });
  }

  // cursor tilt on the opening portrait — tracked continuously, eased toward the target each frame
  var tiltWrap = document.getElementById('hsTiltWrap');
  var tiltFrame = document.getElementById('hsTiltFrame');
  var targetRX = 0, targetRY = 0, curRX = 0, curRY = 0;
  if(hoverCapable && tiltWrap){
    tiltWrap.addEventListener('mousemove', function(e){
      var r = tiltWrap.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      targetRY = px * 12;
      targetRX = py * -12;
    });
    tiltWrap.addEventListener('mouseleave', function(){ targetRX = 0; targetRY = 0; });
  }

  var panels = Array.prototype.slice.call(root.querySelectorAll('.hs-phrase-panel'));
  var chaptersEl = root.querySelector('.hs-chapters');
  var pinFrame = root.querySelector('.hs-portrait-pin .hs-pin-frame');
  var pinFlip = document.getElementById('hsPinFlip');
  var pinFaceFront = document.getElementById('hsPinFaceFront');
  var pinFaceBack = document.getElementById('hsPinFaceBack');

  // one visual per chapter — swap a 'placeholder' entry for a 'photo' entry as real photos arrive
  var chapterVisuals = [
    {type:'placeholder', label:'Právník'},
    {type:'placeholder', label:'Bývalý voják'},
    {type:'placeholder', label:'Manažer v IT'},
    {type:'placeholder', label:'Táta dvou kluků'},
    {type:'photo', src:'img/skodaland-zahajeni.jpg', alt:'Pavel Šrámek na zahájení dobíjecí stanice ve Škodalandu', caption:'Otevření dobíjecí stanice, Škodaland'}
  ];

  function renderChapterFace(el, visual){
    if(!el || !visual) return;
    if(visual.type === 'photo'){
      el.classList.remove('hs-pin-placeholder');
      el.innerHTML = '<img src="' + visual.src + '" alt="' + visual.alt + '">' +
        (visual.caption ? '<span class="hs-pin-caption">' + visual.caption + '</span>' : '');
    } else {
      el.classList.add('hs-pin-placeholder');
      el.innerHTML = '<span class="hs-ph-label">' + visual.label + '</span><span class="hs-ph-note">zatím bez fotky</span>';
    }
  }

  var lastFrontIndex = -1;

  function tick(){
    curRX += (targetRX - curRX) * 0.12;
    curRY += (targetRY - curRY) * 0.12;
    if(tiltFrame){
      tiltFrame.style.setProperty('--hs-rx', curRX.toFixed(2) + 'deg');
      tiltFrame.style.setProperty('--hs-ry', curRY.toFixed(2) + 'deg');
    }

    var vh = window.innerHeight;

    panels.forEach(function(panel){
      var rect = panel.getBoundingClientRect();
      var center = rect.top + rect.height / 2;
      var dist = Math.abs(center - vh / 2);
      var t = Math.max(0, 1 - dist / (vh * 0.85));
      var glow = panel.querySelector('.hs-phrase-glow');
      var wrap = panel.querySelector('.hs-phrase-wrap');
      var index = panel.querySelector('.hs-phrase-index');
      if(glow) glow.style.opacity = t.toFixed(3);
      if(wrap){
        wrap.style.transform = 'translateY(' + ((1 - t) * 14).toFixed(1) + 'px)';
        wrap.style.filter = 'blur(' + ((1 - t) * 5).toFixed(2) + 'px)';
      }
      if(index) index.style.opacity = (0.3 + t * 0.7).toFixed(2);
    });

    if(chaptersEl && pinFrame){
      var cRect = chaptersEl.getBoundingClientRect();
      var total = Math.max(chaptersEl.offsetHeight - vh, 1);
      var scrolled = Math.min(Math.max(-cRect.top, 0), total);
      var progress = scrolled / total;
      pinFrame.style.transform = 'scale(' + (1 + progress * 0.06).toFixed(3) + ') rotate(' + ((progress - 0.5) * 3).toFixed(2) + 'deg)';
      if(pinFlip && pinFaceFront && pinFaceBack){
        var lastIndex = chapterVisuals.length - 1;
        var pos = Math.max(0, Math.min(progress, 1)) * lastIndex;
        var idx = Math.min(Math.floor(pos), lastIndex - 1);
        var frac = pos - idx;
        if(idx !== lastFrontIndex){
          renderChapterFace(pinFaceFront, chapterVisuals[idx]);
          renderChapterFace(pinFaceBack, chapterVisuals[idx + 1]);
          lastFrontIndex = idx;
        }
        pinFlip.style.transform = 'rotateY(' + (frac * 180).toFixed(1) + 'deg)';
      }
    }

    if(progressBar){
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      progressBar.style.width = pct.toFixed(2) + '%';
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
