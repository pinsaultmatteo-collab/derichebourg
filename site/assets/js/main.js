/* ==========================================================================
   DERICHEBOURG — interactions partagées
   Lenis (défilement lissé) · GSAP ScrollTrigger · curseur · préchargeur ·
   révélations · compteurs · onglets · accordéons · navigation
   ========================================================================== */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ------------------------------------------------------------ Lenis */
  let lenis = null;
  if (typeof Lenis !== 'undefined' && !reduced && !touch) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
    window.__lenis = lenis;
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const scrollTo = (target, offset = -90) => {
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.4 });
    else {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: reduced ? 'auto' : 'smooth' });
    }
  };
  window.__scrollTo = scrollTo;

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    closeMobile();
    scrollTo(el);
  });

  /* ------------------------------------------------------------ Préchargeur */
  const pre = window.__preDone ? null : document.querySelector('.preloader');
  const ready = () => document.dispatchEvent(new CustomEvent('site:ready'));
  if (pre) {
    document.documentElement.classList.add('is-loading');
    if (lenis) lenis.stop();
    const fg = pre.querySelector('.fg');
    const pct = pre.querySelector('.pct');
    const start = 0; // compté depuis le début de la navigation, scripts externes compris
    const minDur = reduced ? 200 : 1500;
    let loaded = document.readyState === 'complete';
    window.addEventListener('load', () => { loaded = true; });
    const maxWait = 2600; // on n'attend pas indéfiniment les images lourdes
    const tick = () => {
      const t = performance.now() - start;
      const done = loaded || t > maxWait;
      const p = Math.min(1, t / minDur) * (done ? 1 : 0.92);
      if (fg) fg.style.strokeDashoffset = 289 - 289 * p;
      if (pct) pct.textContent = String(Math.round(p * 100)).padStart(3, '0') + ' %';
      if (p >= 1 && done && t >= minDur) finish(); else requestAnimationFrame(tick);
    };
    const finish = () => {
      if (window.__preDone) return; window.__preDone = true; clearTimeout(window.__preloaderKill);
      const curtain = pre.querySelector('.curtain');
      const inner = pre.querySelector('.preloader-inner');
      const done = () => { pre.remove(); document.documentElement.classList.remove('is-loading'); if (lenis) lenis.start(); ready(); };
      if (hasGsap && !reduced) {
        gsap.timeline({ onComplete: done })
          .to(inner, { opacity: 0, y: -20, duration: .4, ease: 'power2.in' })
          .to(curtain, { y: '0%', duration: .6, ease: 'expo.inOut' }, '-=.2')
          .to(pre, { y: '-100%', duration: .7, ease: 'expo.inOut' }, '-=.15');
      } else done();
    };
    requestAnimationFrame(tick);
  } else {
    if (document.readyState === 'complete') setTimeout(ready, 30);
    else window.addEventListener('load', () => setTimeout(ready, 30));
  }

  /* ------------------------------------------------------------ En-tête */
  const header = document.querySelector('.header');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    if (!header) return;
    header.classList.toggle('is-scrolled', y > 40);
    header.classList.toggle('is-hidden', y > 480 && y > lastY && !document.body.classList.contains('menu-open'));
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = document.querySelector('.burger');
  const mobile = document.querySelector('.mobile-menu');
  function closeMobile() {
    if (!mobile) return;
    mobile.classList.remove('is-open'); burger && burger.classList.remove('is-open');
    document.body.classList.remove('menu-open'); if (lenis) lenis.start();
  }
  if (burger && mobile) {
    burger.addEventListener('click', () => {
      const open = !mobile.classList.contains('is-open');
      mobile.classList.toggle('is-open', open); burger.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
      if (lenis) open ? lenis.stop() : lenis.start();
    });
  }

  // Lien actif
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link, .mobile-menu nav a').forEach((a) => {
    const href = (a.getAttribute('href') || '').split('#')[0];
    if (href && href === path) a.classList.add('is-active');
  });

  // Langues (démo)
  document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.lang button').forEach((x) => x.classList.remove('is-active'));
    b.classList.add('is-active');
    if (b.dataset.lang !== 'fr') toast(`Version ${b.textContent.trim()} · déploiement prévu avec le nouveau site (FR / EN / DE / ES).`);
  }));

  /* ------------------------------------------------------------ Toast */
  let toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translate(-50%,20px);z-index:9998;background:#fff;color:#0a0a0b;padding:14px 20px;font:500 .8rem/1.4 Inter,sans-serif;border-radius:4px;opacity:0;transition:.4s cubic-bezier(.16,1,.3,1);max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,.4)';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.opacity = 1; toastEl.style.transform = 'translate(-50%,0)';
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => { toastEl.style.opacity = 0; toastEl.style.transform = 'translate(-50%,20px)'; }, 3200);
  }
  window.__toast = toast;

  /* ------------------------------------------------------------ Curseur */
  const cursor = document.querySelector('.cursor');
  if (cursor && !touch && !reduced) {
    const dot = cursor.querySelector('.cursor-dot'), ring = cursor.querySelector('.cursor-ring'), label = cursor.querySelector('.cursor-label');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; cursor.classList.remove('is-hidden'); });
    document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    const loop = () => {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      dot.style.transform = `translate(${mx}px,${my}px)`;
      ring.style.transform = `translate(${rx}px,${ry}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('a, button, [data-cursor], .public-card, .service, .news-item');
      cursor.classList.toggle('is-hover', !!t);
      const view = e.target.closest('[data-cursor]');
      cursor.classList.toggle('is-view', !!view);
      if (view && label) label.textContent = view.dataset.cursor || 'Voir';
    });
  }

  /* ------------------------------------------------------------ Boutons magnétiques */
  if (!touch && !reduced) {
    document.querySelectorAll('.btn, .go').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.22, y = (e.clientY - r.top - r.height / 2) * 0.22;
        el.style.transform = `translate(${x}px,${y}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)'; el.style.transform = ''; setTimeout(() => (el.style.transition = ''), 600); });
    });
  }

  /* ------------------------------------------------------------ Révélations */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add('is-in');
      if (el.hasAttribute('data-stagger')) [...el.children].forEach((c, i) => (c.style.transitionDelay = `${i * (parseFloat(el.dataset.stagger) || 0.08)}s`));
      el.querySelectorAll('[data-count]').forEach(countUp);
      if (el.hasAttribute('data-count')) countUp(el);
      el.querySelectorAll('.bar .track span[data-w]').forEach((s) => (s.style.width = s.dataset.w + '%'));
      io.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.reveal, .reveal-img, [data-stagger], .lines, .figure, [data-count], .bars, .strip, .pillar').forEach((el) => io.observe(el));

  /* ------------------------------------------------------------ Compteurs */
  function countUp(el) {
    if (el._counted) return; el._counted = true;
    const target = parseFloat(String(el.dataset.count).replace(',', '.'));
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const dur = reduced ? 10 : 1800;
    const fmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt.format(target * e).replace(/ | /g, ' ');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------ Marquee */
  document.querySelectorAll('.marquee-track').forEach((t) => { t.innerHTML += t.innerHTML; });

  /* ------------------------------------------------------------ Lignes du titre héro */
  document.addEventListener('site:ready', () => {
    const spans = document.querySelectorAll('.hero h1 .line > span, .page-hero h1 .line > span, .contact-hero h1 .line > span');
    const blocks = document.querySelectorAll('.hero-kicker, .hero-grid, .hero-stats, .page-hero .crumbs, .page-hero .lead, .page-hero .hero-stats');
    if (hasGsap && !reduced) {
      if (spans.length) gsap.to(spans, { y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.09, delay: 0.1 });
      if (blocks.length) gsap.from(blocks, { opacity: 0, y: 24, duration: 1.1, ease: 'power3.out', stagger: 0.1, delay: 0.5 });
    } else spans.forEach((s) => (s.style.transform = 'none'));
  });

  /* ------------------------------------------------------------ Manifeste : mots qui s'allument */
  document.querySelectorAll('.manifesto .statement').forEach((st) => {
    const html = st.innerHTML;
    st.innerHTML = html.split(/(<em>.*?<\/em>|\s+)/).filter(Boolean).map((tok) => /^\s+$/.test(tok) ? ' ' : `<span class="w">${tok}</span>`).join('');
    const words = st.querySelectorAll('.w');
    if (hasGsap && !reduced) {
      ScrollTrigger.create({ trigger: st, start: 'top 80%', end: 'bottom 45%', scrub: true,
        onUpdate: (self) => { const n = Math.round(self.progress * words.length); words.forEach((w, i) => w.classList.toggle('is-on', i < n)); } });
    } else words.forEach((w) => w.classList.add('is-on'));
  });

  /* ------------------------------------------------------------ Parallaxe images */
  if (hasGsap && !reduced) {
    document.querySelectorAll('[data-parallax]').forEach((img) => {
      const amt = parseFloat(img.dataset.parallax) || 12;
      gsap.fromTo(img, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    document.querySelectorAll('.cta-band img, .page-hero img.bg').forEach((img) => {
      gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // Titre géant du pied de page
    document.querySelectorAll('.footer-giant').forEach((g) => gsap.fromTo(g, { xPercent: 6 }, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: g, start: 'top bottom', end: 'bottom top', scrub: true } }));
  }

  /* ------------------------------------------------------------ Frise horizontale */
  const tl = document.querySelector('.timeline');
  if (tl && hasGsap && !reduced && innerWidth > 960) {
    const track = tl.querySelector('.tl-track'), pin = tl.querySelector('.tl-pin'), prog = tl.querySelector('.tl-progress span');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: tl, start: 'top top', end: () => '+=' + dist() * 1.05, pin: pin, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1, onUpdate: (s) => { if (prog) prog.style.width = s.progress * 100 + '%'; } } });
  }

  /* ------------------------------------------------------------ Onglets */
  document.querySelectorAll('[data-tabs]').forEach((wrap) => {
    const btns = wrap.querySelectorAll('[data-tab]'), panels = wrap.querySelectorAll('[data-panel]');
    const activate = (id) => {
      btns.forEach((b) => b.classList.toggle('is-active', b.dataset.tab === id));
      panels.forEach((p) => p.classList.toggle('is-active', p.dataset.panel === id));
      if (hasGsap) setTimeout(() => ScrollTrigger.refresh(), 50);
    };
    btns.forEach((b) => b.addEventListener('click', () => activate(b.dataset.tab)));
    const hash = location.hash.replace('#', '');
    if (hash && [...btns].some((b) => b.dataset.tab === hash)) activate(hash);
  });

  /* ------------------------------------------------------------ Accordéons */
  document.querySelectorAll('.acc-head').forEach((h) => h.addEventListener('click', () => {
    const item = h.closest('.acc-item'); const open = item.classList.contains('is-open');
    item.parentElement.querySelectorAll('.acc-item.is-open').forEach((x) => x !== item && x.classList.remove('is-open'));
    item.classList.toggle('is-open', !open);
    if (hasGsap) setTimeout(() => ScrollTrigger.refresh(), 720);
  }));

  /* ------------------------------------------------------------ Sous-navigation active */
  const sub = document.querySelector('.subnav');
  if (sub) {
    const links = [...sub.querySelectorAll('a[href^="#"]')];
    const secs = links.map((l) => document.querySelector(l.getAttribute('href'))).filter(Boolean);
    const sio = new IntersectionObserver((ens) => ens.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id));
    }), { rootMargin: '-35% 0px -55% 0px' });
    secs.forEach((s) => sio.observe(s));
  }

  /* ------------------------------------------------------------ Formulaire segmenté (démo) */
  document.querySelectorAll('.segment').forEach((seg) => seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    seg.querySelectorAll('button').forEach((x) => x.classList.remove('is-active')); b.classList.add('is-active');
    const target = seg.dataset.target && document.querySelector(seg.dataset.target);
    if (target) target.textContent = b.dataset.label || b.textContent.trim();
    document.querySelectorAll('[data-for]').forEach((f) => (f.style.display = f.dataset.for.split(',').includes(b.dataset.value) ? '' : 'none'));
  })));
  document.querySelectorAll('form[data-demo]').forEach((f) => f.addEventListener('submit', (e) => { e.preventDefault(); toast('Merci. Votre demande a bien été enregistrée (démonstration).'); f.reset(); }));

  /* ------------------------------------------------------------ Transitions de page */
  const veil = document.querySelector('.veil');
  if (veil && hasGsap && !reduced) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel') || a.target === '_blank' || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      gsap.to(veil, { y: '0%', duration: .7, ease: 'expo.inOut', onComplete: () => (location.href = href) });
    });
    window.addEventListener('pageshow', () => gsap.set(veil, { y: '100%' }));
  }

  // Si le garde-fou du préchargeur a déjà retiré l'écran avant le chargement de ce script,
  // les écouteurs ci-dessus n'ont pas vu l'événement : on le rejoue.
  if (window.__preDone && pre === null) setTimeout(ready, 60);
  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
  if (hasGsap) window.addEventListener('load', () => setTimeout(() => ScrollTrigger.refresh(), 400));
})();
