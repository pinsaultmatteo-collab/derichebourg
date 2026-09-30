/* ==========================================================================
   Le procédé — SVG dynamique piloté par le défilement
   Six étapes : réception, cisaillage, broyage, séparation magnétique,
   courants de Foucault & tri, matières aux spécifications.
   Des particules de matière suivent les chemins SVG selon leur nature.
   ========================================================================== */
(() => {
  const root = document.querySelector('.process-pin');
  if (!root) return;
  const svg = root.querySelector('svg');
  const stages = [...svg.querySelectorAll('.pr-stage')];
  const captions = [...root.querySelectorAll('.process-caption div')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

  const routes = {
    fer: svg.querySelector('#route-fer'),
    alu: svg.querySelector('#route-alu'),
    cu: svg.querySelector('#route-cu'),
    res: svg.querySelector('#route-res'),
  };
  const lens = Object.fromEntries(Object.entries(routes).map(([k, p]) => [k, p.getTotalLength()]));
  const layer = svg.querySelector('.pr-particles');
  const COLORS = { fer: '#c9c9d0', alu: '#f1f1f4', cu: '#c8753f', res: '#5a5a63' };
  const MIX = ['fer', 'fer', 'fer', 'fer', 'alu', 'alu', 'cu', 'res', 'res'];
  const N = reduced ? 0 : 54;
  const parts = [];
  const shredAt = 0.36; // fraction du trajet où la matière est broyée (taille réduite)
  for (let i = 0; i < N; i++) {
    const type = MIX[i % MIX.length];
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    el.setAttribute('fill', COLORS[type]);
    el.setAttribute('rx', 1);
    layer.appendChild(el);
    parts.push({ el, type, t: Math.random(), v: 0.0011 + Math.random() * 0.0007, big: 6 + Math.random() * 6, small: 2.2 + Math.random() * 2.2, rot: Math.random() * 90, jit: (Math.random() - 0.5) * 8 });
  }

  let active = 0, visible = true;
  new IntersectionObserver((en) => (visible = en[0].isIntersecting)).observe(root);
  function setActive(i) {
    if (i === active) return; active = i;
    stages.forEach((s, k) => s.classList.toggle('is-active', k === i));
    captions.forEach((c, k) => c.classList.toggle('is-active', k === i));
  }
  stages[0] && stages[0].classList.add('is-active'); captions[0] && captions[0].classList.add('is-active');

  if (hasGsap && !reduced) {
    ScrollTrigger.create({ trigger: root, start: 'top top', end: 'bottom bottom', onUpdate: (self) => setActive(Math.min(stages.length - 1, Math.floor(self.progress * stages.length))) });
  } else {
    let k = 0; setInterval(() => { k = (k + 1) % stages.length; setActive(k); }, 2600);
  }

  (function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;
    parts.forEach((p) => {
      p.t += p.v * (0.8 + active * 0.08);
      if (p.t > 1) { p.t = 0; p.rot = Math.random() * 90; }
      const path = routes[p.type], len = lens[p.type];
      const pt = path.getPointAtLength(p.t * len);
      const shredded = p.t > shredAt;
      const s = shredded ? p.small : p.big;
      const jit = shredded ? p.jit * 0.5 : p.jit;
      p.el.setAttribute('width', s); p.el.setAttribute('height', s * (shredded ? 0.9 : 0.6));
      p.el.setAttribute('transform', `translate(${(pt.x - s / 2).toFixed(1)} ${(pt.y - s / 2 + jit).toFixed(1)}) rotate(${(p.rot + p.t * 360).toFixed(0)} ${s / 2} ${s / 2})`);
      p.el.setAttribute('opacity', p.t < 0.03 ? p.t / 0.03 : p.t > 0.97 ? (1 - p.t) / 0.03 : 1);
    });
  })();
})();
