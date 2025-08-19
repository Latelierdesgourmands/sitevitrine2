(() => {
    // Utilitaires
    const lerp = (a,b,t)=>a+(b-a)*t;
    const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
    const on = (el,ev,fn,opt)=>el.addEventListener(ev,fn,opt||{passive:true});
  
    // 0) Sélecteurs clés + fallback id section
    const hero   = document.querySelector('.hero');
    const overlay= document.querySelector('.overlay');
    const title  = document.querySelector('.hero-title');
    const sub    = document.querySelector('.hero-sub');
    const univers= document.querySelector('.univers');
    if (univers && !univers.id) univers.id = 'section-suivante';
  
    /* ===========================
       1) Intro titre + parallax
       =========================== */
    if (title) {
      // Split lettres
      const txt = title.textContent;
      title.textContent = '';
      title.classList.add('split');
      const frag = document.createDocumentFragment();
      [...txt].forEach((ch, i) => {
        const span = document.createElement('span');
        span.textContent = ch;
        span.style.transitionDelay = (i*35)+'ms';
        frag.appendChild(span);
      });
      title.appendChild(frag);
  
      // Lancement
      requestAnimationFrame(() => {
        title.querySelectorAll('span').forEach(s => s.classList.add('in'));
        if (sub) {
          sub.style.opacity = 0;
          sub.style.transform = 'translateY(10px)';
          setTimeout(()=>{
            sub.style.transition = 'opacity .5s ease .2s, transform .5s ease .2s';
            sub.style.opacity = 1;
            sub.style.transform = 'translateY(0)';
          }, Math.min(1200, txt.length*35 + 200));
        }
      });
    }
  
    // Parallax overlay (léger)
    let smoothY = 0;
    const parallax = () => {
      const rect = hero?.getBoundingClientRect();
      if (!rect || !overlay) return;
      const visible = clamp(1 - Math.abs(rect.top)/rect.height, 0, 1);
      const y = (1 - visible) * 30; // translateY
      smoothY = lerp(smoothY, y, 0.15);
      overlay.style.transform = `translateY(${smoothY}px)`;
      overlay.style.opacity = String(0.85 + visible*0.15);
    };
    on(window,'scroll', parallax);
    parallax();
  
    /* ===========================
       2) Reveal on scroll
       =========================== */
    const toReveal = [
      ...document.querySelectorAll('.grid .bloc'),
      ...document.querySelectorAll('.histoire-grid img, .histoire-grid div')
    ];
    toReveal.forEach((el, idx) => {
      el.classList.add('reveal');
      if (el.closest('.grid')) {
        el.style.setProperty('--d', (idx%6)*70 + 'ms'); // léger décalage
      }
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    toReveal.forEach(el => io.observe(el));
  
    /* ===========================
       3) Tilt 3D sur .bloc
       =========================== */
    const maxTilt = 10; // degrés
    document.querySelectorAll('.bloc').forEach(card => {
      let rafId=null;
      const bounds = ()=>card.getBoundingClientRect();
  
      const move = (e) => {
        const b = bounds();
        const x = (e.clientX - b.left) / b.width;   // 0..1
        const y = (e.clientY - b.top)  / b.height;  // 0..1
        const rx = lerp(maxTilt, -maxTilt, y);
        const ry = lerp(-maxTilt, maxTilt, x);
        card.classList.add('tilted');
        card.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
      };
      const leave = () => {
        card.classList.remove('tilted');
        card.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(0)';
      };
  
      on(card, 'mousemove', (e)=>{ cancelAnimationFrame(rafId); rafId=requestAnimationFrame(()=>move(e)); });
      on(card, 'mouseleave', ()=>{ cancelAnimationFrame(rafId); leave(); });
      on(card, 'touchstart', ()=>card.classList.add('tilted'), {passive:true});
      on(card, 'touchend', leave, {passive:true});
    });
  
    /* =======================================================
       4) Effet "bug de position" des images pendant le scroll
       ======================================================= */
    const buggyImgs = [
      ...document.querySelectorAll('.bloc img'),
      ...document.querySelectorAll('.histoire-grid img')
    ];
  
    // seed par image pour que chaque visuel "bug" différemment
    buggyImgs.forEach((img, i) => {
      img.dataset._seed = (Math.random() * 1000 + i*13.37).toFixed(3);
    });
  
    let lastY = window.scrollY;
    let glitchActive = false;
    let rafBug = null;
  
    // petite fonction pseudo-aléatoire déterministe
    const prng = (t, seed) => {
      return Math.sin(t*0.0013 + seed*0.017) * Math.cos(t*0.0021 + seed*0.011);
    };
  
    const applyBugTransforms = () => {
      const y = window.scrollY;
      const speed = Math.abs(y - lastY); // vitesse de scroll
      lastY = y;
  
      buggyImgs.forEach(img => {
        const seed = parseFloat(img.dataset._seed || '0');
        // décalage "normal" basé sur le scroll (sinueux, doux)
        const baseX = Math.sin((y*0.12) + seed)* (6 + (seed%1)*18);
        const baseY = Math.cos((y*0.09) + seed*0.7)* (3 + (seed%1)*10);
  
        // intensité glitch en fonction de la vitesse + état glitch
        const intensity = clamp((speed/30), 0, 1);
        const glitchBoost = glitchActive ? 1 : 0;
  
        // jitter pseudo-aléatoire court
        const t = performance.now();
        const jx = prng(t + seed*100, seed) * (glitchBoost ? 18 : 6) * intensity;
        const jy = prng(t + seed*200, seed) * (glitchBoost ? 12 : 4) * intensity;
  
        // petite rotation/skew quand ça "casse"
        const rot = (glitchBoost ? prng(t + seed*50, seed) * 2.5 : prng(t, seed) * 0.6) * intensity;
        const skew = (glitchBoost ? prng(t + seed*25, seed) * 3.5 : prng(t, seed) * 0.8) * intensity;
  
        // conserve le translateZ du tilt (20px normal, 30px si parent .tilted)
        const z = img.closest('.bloc')?.classList.contains('tilted') ? 30 : 20;
  
        img.style.transform =
          `translateZ(${z}px) translate(${(baseX + jx).toFixed(2)}px, ${(baseY + jy).toFixed(2)}px) ` +
          `rotate(${rot.toFixed(2)}deg) skewX(${skew.toFixed(2)}deg)`;
        img.style.willChange = 'transform';
      });
  
      rafBug = requestAnimationFrame(applyBugTransforms);
    };
  
    // active un "pic de glitch" bref dès que le scroll est brusque
    const onScrollBug = () => {
      const currentY = window.scrollY;
      const delta = Math.abs(currentY - lastY);
      if (delta > 12) {
        glitchActive = true;
        clearTimeout(onScrollBug._to);
        onScrollBug._to = setTimeout(()=>{ glitchActive = false; }, 180);
      }
    };
  
    on(window, 'scroll', onScrollBug);
    // lance la boucle rAF qui applique en continu les transforms
    cancelAnimationFrame(rafBug);
    rafBug = requestAnimationFrame(applyBugTransforms);
  
    /* ===========================
       5) Particules hero (canvas)
       =========================== */
    const canvas = document.getElementById('hero-particles');
    if (canvas && hero) {
      const ctx = canvas.getContext('2d');
      let w=0,h=0, dpr = Math.max(1, window.devicePixelRatio || 1);
      const partCount = 60;
      const parts = [];
      const rnd = (a,b)=>a + Math.random()*(b-a);
  
      const resize = () => {
        w = hero.clientWidth;
        h = hero.clientHeight;
        canvas.width = w*dpr;
        canvas.height = h*dpr;
        canvas.style.width = w+'px';
        canvas.style.height = h+'px';
        ctx.setTransform(dpr,0,0,dpr,0,0);
      };
  
      const makeParticle = () => ({
        x: rnd(0,w),
        y: rnd(0,h),
        vx: rnd(-0.2,0.2),
        vy: rnd(-0.4,-0.1),
        r: rnd(1,2.4),
        a: rnd(0.2,0.6)
      });
  
      const init = () => {
        parts.length = 0;
        for(let i=0;i<partCount;i++) parts.push(makeParticle());
      };
  
      let animId;
      const tick = () => {
        ctx.clearRect(0,0,w,h);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        parts.forEach(p=>{
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -10 || p.x < -10 || p.x > w+10){
            p.x = rnd(0,w); p.y = h + rnd(0,40);
          }
          ctx.globalAlpha = p.a;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        });
        ctx.restore();
        animId = requestAnimationFrame(tick);
      };
  
      const start = () => { cancelAnimationFrame(animId); resize(); init(); tick(); };
      const stop  = () => cancelAnimationFrame(animId);
  
      // Lance/stop selon visibilité du hero (perf)
      const heroObs = new IntersectionObserver((entries)=>{
        entries.forEach(e=>{ if (e.isIntersecting) start(); else stop(); });
      }, {threshold: 0});
      heroObs.observe(hero);
  
      on(window,'resize', resize);
    }
  })();
  