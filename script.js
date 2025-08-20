(() => {
    const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
    const lerp = (a,b,t)=>a+(b-a)*t;
    const on = (el,ev,fn,opt)=>el.addEventListener(ev,fn,opt||{passive:true});
  
    /* ========= 1) Intro hero lettre par lettre + parallax léger ========= */
    const hero    = document.querySelector('.hero');
    const overlay = document.querySelector('.overlay');
    const title   = document.querySelector('.hero-title');
    const sub     = document.querySelector('.hero-sub');
  
    // Split titre en lettres
    if (title){
      const txt = title.textContent;
      title.textContent = '';
      title.classList.add('split');
      const frag = document.createDocumentFragment();
      [...txt].forEach((ch, i) => {
        if (ch === ' ') {
          const sp = document.createElement('span');
          sp.className = 'space';
          sp.style.transitionDelay = (i*35)+'ms';
          sp.innerHTML = '&nbsp;'; // espace insécable visible
          frag.appendChild(sp);
        } else {
          const span = document.createElement('span');
          span.textContent = ch;
          span.style.transitionDelay = (i*35)+'ms';
          frag.appendChild(span);
        }
      });      
      title.appendChild(frag);
  
      // Lancement
      requestAnimationFrame(() => {
        title.querySelectorAll('span').forEach(s => s.classList.add('in'));
        if (sub){
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
  
    // Parallax léger sur l'overlay en scroll
    let smoothY = 0;
    const parallax = () => {
      const rect = hero?.getBoundingClientRect();
      if (!rect || !overlay) return;
      const visible = clamp(1 - Math.abs(rect.top)/rect.height, 0, 1);
      const y = (1 - visible) * 30; // translation verticale (px)
      smoothY = lerp(smoothY, y, 0.15);
      overlay.style.transform = `translateY(${smoothY}px)`;
      overlay.style.opacity = String(0.85 + visible*0.15);
    };
    on(window,'scroll', parallax);
    parallax();
  
    /* ========= 2) Reveal on scroll ========= */
    const toReveal = document.querySelectorAll('.reveal, .grid .bloc');
    toReveal.forEach(el => el.classList.add('reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting){
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    toReveal.forEach(el => io.observe(el));
  
    /* ========= 3) Auto-scroll depuis la bannière si l'utilisateur ne scrolle pas =========
       - On attend un court délai d'inactivité (ex: 5s).
       - Si l'utilisateur bouge (wheel, touch, scroll, key), on annule.
       - Si on est toujours sur le hero (plein écran visible), on scroll en douceur vers #section-suivante.
    */
    const nextSection = document.getElementById('section-suivante');
    let idleTimer = null;
    let autoScrolled = false;
  
    const isHeroMostlyVisible = () => {
      const rect = hero?.getBoundingClientRect();
      if (!rect) return false;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      // On considère "sur la bannière" si le hero occupe encore au moins 70% de la hauteur de l'écran
      const visible = clamp((vh - Math.max(0, rect.top)) / rect.height, 0, 1);
      return visible > 0.7 && rect.top <= 0; // top proche de 0 et grande part visible
    };
  
    const scheduleAutoScroll = () => {
      clearTimeout(idleTimer);
      if (autoScrolled) return;
      idleTimer = setTimeout(() => {
        if (isHeroMostlyVisible() && nextSection){
          autoScrolled = true;
          nextSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 10000); // délai d'inactivité (ms) avant auto-scroll
    };
  
    // Toute interaction utilisateur annule/repousse l'auto-scroll
    const cancelAuto = () => { clearTimeout(idleTimer); if (!autoScrolled) scheduleAutoScroll(); };
    ['wheel','touchstart','scroll','keydown','mousemove'].forEach(evt => on(window, evt, cancelAuto, {passive:true}));
  
    // Premier armement du timer au chargement
    scheduleAutoScroll();
  })();
  