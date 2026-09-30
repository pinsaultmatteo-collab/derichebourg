/* ==========================================================================
   Chaîne de valeur — la boucle en 5 étapes (SVG dynamique)
   Arc de progression piloté par le défilement, nœuds actifs, particules de
   matière circulant sur la boucle, pictogramme central par étape.
   ========================================================================== */
(() => {
  const svg = document.querySelector('.chain-visual svg');
  const steps = [...document.querySelectorAll('.chain-step')];
  if (!svg || !steps.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const nodes = [...svg.querySelectorAll('.loop-node')];
  const glyphs = [...svg.querySelectorAll('.loop-glyph')];
  const progress = svg.querySelector('.loop-progress');
  const title = svg.querySelector('.loop-center .t');
  const sub = svg.querySelector('.loop-center .sub');
  const particlesG = svg.querySelector('.loop-particles');
  const CX = 300, CY = 300, R = 230, CIRC = 2 * Math.PI * R;
  progress.setAttribute('stroke-dasharray', CIRC);
  progress.setAttribute('stroke-dashoffset', CIRC);

  // Nœuds : 5 positions, départ en haut, sens horaire
  nodes.forEach((n, i) => {
    const a = -Math.PI / 2 + (i / nodes.length) * Math.PI * 2;
    const x = CX + Math.cos(a) * R, y = CY + Math.sin(a) * R;
    n.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    const label = n.querySelector('text.lbl');
    if (label) {
      // étiquette vers l'extérieur
      const ox = Math.cos(a) * 34, oy = Math.sin(a) * 34;
      label.setAttribute('x', ox.toFixed(1)); label.setAttribute('y', (oy + 3).toFixed(1));
      label.setAttribute('text-anchor', Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end');
    }
  });

  let active = -1;
  const labels = steps.map((s) => s.dataset.title || s.querySelector('h3').textContent.trim());
  const subs = steps.map((s) => s.dataset.sub || '');
  function setActive(i) {
    if (i === active) return; active = i;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    nodes.forEach((n, k) => n.classList.toggle('is-active', k <= i));
    glyphs.forEach((g, k) => g.classList.toggle('is-active', k === i));
    if (title) title.textContent = labels[i] || '';
    if (sub) sub.textContent = subs[i] || '';
  }
  function setProgress(p) {
    progress.setAttribute('stroke-dashoffset', CIRC * (1 - Math.min(1, Math.max(0, p))));
  }

  if (hasGsap && !reduced && innerWidth > 960) {
    steps.forEach((s, i) => ScrollTrigger.create({ trigger: s, start: 'top 60%', end: 'bottom 40%', onEnter: () => setActive(i), onEnterBack: () => setActive(i) }));
    const wrap = document.querySelector('.chain-steps');
    ScrollTrigger.create({ trigger: wrap, start: 'top 60%', end: 'bottom 45%', scrub: 0.4, onUpdate: (self) => setProgress(self.progress) });
    setActive(0);
  } else {
    const io = new IntersectionObserver((ens) => ens.forEach((en) => { if (en.isIntersecting) { const i = steps.indexOf(en.target); setActive(i); setProgress((i + 1) / steps.length); } }), { rootMargin: '-40% 0px -40% 0px' });
    steps.forEach((s) => io.observe(s));
    setActive(0); setProgress(0.2);
  }

  // Particules de matière sur la boucle
  if (particlesG && !reduced) {
    const P = 14, parts = [];
    for (let i = 0; i < P; i++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', i % 4 === 0 ? 3 : 1.8);
      c.setAttribute('class', 'loop-particle' + (i % 3 === 0 ? ' r' : ''));
      particlesG.appendChild(c);
      parts.push({ el: c, a: (i / P) * Math.PI * 2, v: 0.0035 + Math.random() * 0.003, off: (Math.random() - 0.5) * 10 });
    }
    let visible = true;
    new IntersectionObserver((en) => (visible = en[0].isIntersecting)).observe(svg);
    (function tick() {
      requestAnimationFrame(tick);
      if (!visible) return;
      parts.forEach((p) => {
        p.a += p.v * (1 + active * 0.25);
        const r = R + p.off;
        p.el.setAttribute('cx', (CX + Math.cos(p.a) * r).toFixed(1));
        p.el.setAttribute('cy', (CY + Math.sin(p.a) * r).toFixed(1));
      });
    })();
  }
})();
