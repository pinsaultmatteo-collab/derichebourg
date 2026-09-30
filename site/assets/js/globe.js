/* ==========================================================================
   Globe — 17 pays, 455 implantations
   Continents en matrice de points, pays du groupe éclairés, sites en rouge,
   arcs logistiques depuis Paris. Rotation automatique + glisser pour tourner.
   ========================================================================== */
import * as THREE from 'three';

const wrap = document.querySelector('.globe-wrap');
if (wrap) init().catch((e) => console.warn('Globe indisponible', e));

const PRESENT = new Set([250, 276, 724, 203, 616, 380, 56, 705, 442, 40, 642, 348, 703, 528, 124, 840, 484]);
const toXYZ = (lon, lat, r) => {
  const phi = (90 - lat) * Math.PI / 180, theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
};

async function init() {
  const [dots, sites] = await Promise.all([
    fetch('assets/data/dots.json').then((r) => r.json()),
    fetch('assets/data/sites.json').then((r) => r.json()),
  ]);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  wrap.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.2, 4.35);
  camera.lookAt(0, 0, 0);

  const globe = new THREE.Group();
  scene.add(globe);
  const R = 1;

  // Sphère d'occlusion
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.992, 64, 64), new THREE.MeshBasicMaterial({ color: 0x0d0d0f })));

  // Points de continents
  const n = dots.dots.length;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const cGrey = new THREE.Color(0x45454f), cOn = new THREE.Color(0xb4b4c0);
  dots.dots.forEach((d, i) => {
    const v = toXYZ(d[0], d[1], R);
    pos.set([v.x, v.y, v.z], i * 3);
    const c = PRESENT.has(d[2]) ? cOn : cGrey;
    col.set([c.r, c.g, c.b], i * 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  globe.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.017, vertexColors: true, sizeAttenuation: true })));

  // Sites
  const sn = sites.sites.length;
  const sp = new Float32Array(sn * 3);
  sites.sites.forEach((s, i) => { const v = toXYZ(s[0], s[1], R * 1.006); sp.set([v.x, v.y, v.z], i * 3); });
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sitesPts = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xff3b2e, size: 0.03, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  globe.add(sitesPts);
  const glow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xd52b1e, size: 0.085, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
  globe.add(glow);

  // Sites phares : marqueurs plus grands
  const fl = sites.flagships;
  const fp = new Float32Array(fl.length * 3);
  fl.forEach((f, i) => { const v = toXYZ(f.lon, f.lat, R * 1.012); fp.set([v.x, v.y, v.z], i * 3); });
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  const flagPts = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, transparent: true, opacity: 0.95, depthWrite: false }));
  globe.add(flagPts);

  // Arcs depuis Paris
  const paris = toXYZ(2.35, 48.85, R * 1.01);
  const arcs = [];
  fl.filter((f) => !(Math.abs(f.lon - 2.35) < 0.3 && Math.abs(f.lat - 48.85) < 0.3)).forEach((f) => {
    const end = toXYZ(f.lon, f.lat, R * 1.01);
    const dist = paris.distanceTo(end);
    const mid = paris.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(R * (1.05 + dist * 0.28));
    const curve = new THREE.QuadraticBezierCurve3(paris, mid, end);
    const pts = curve.getPoints(80);
    const lg = new THREE.BufferGeometry().setFromPoints(pts);
    const lm = new THREE.LineDashedMaterial({ color: 0xd52b1e, dashSize: 0.05, gapSize: 0.035, transparent: true, opacity: 0.75 });
    const line = new THREE.Line(lg, lm); line.computeLineDistances();
    globe.add(line); arcs.push(lm);
  });

  // Halo atmosphérique (fresnel)
  const halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.02, 64, 64), new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { c: { value: new THREE.Color(0x8a8a96) } },
    vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 c; varying vec3 vN; varying vec3 vP; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(-vP))), 3.5); gl_FragColor = vec4(c, f * 0.9); }',
  }));
  scene.add(halo);

  // Anneau orbital fin (signature)
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(R * 1.1, 0.0025, 8, 240), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 }));
  orbit.rotation.set(Math.PI / 2.4, 0.4, 0); scene.add(orbit);

  // Orientation initiale : Europe face caméra
  // rotation.y = -(longitude centrée + 90°) amène cette longitude face caméra
  let rotY = -(12 + 90) * Math.PI / 180, rotX = 0.62;
  let velY = 0, dragging = false, px = 0, py = 0, auto = 0.0016;
  const el = renderer.domElement;
  el.style.cursor = 'grab';
  el.addEventListener('pointerdown', (e) => { dragging = true; px = e.clientX; py = e.clientY; el.style.cursor = 'grabbing'; });
  window.addEventListener('pointerup', () => { dragging = false; el.style.cursor = 'grab'; });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
    velY = dx * 0.004; rotX = Math.max(-1.1, Math.min(1.1, rotX + dy * 0.003));
  });

  let visible = true;
  new IntersectionObserver((en) => (visible = en[0].isIntersecting), { threshold: 0.05 }).observe(wrap);
  const onResize = () => { const s = wrap.clientWidth; renderer.setSize(s, wrap.clientHeight || s); camera.aspect = s / (wrap.clientHeight || s); camera.updateProjectionMatrix(); };
  window.addEventListener('resize', onResize); onResize();

  const clock = new THREE.Clock();
  (function render() {
    requestAnimationFrame(render);
    if (!visible) return;
    const t = clock.getElapsedTime();
    if (!dragging) { velY *= 0.94; rotY += auto + velY; } else rotY += velY, velY *= 0.6;
    globe.rotation.set(rotX, rotY, 0);
    halo.rotation.copy(globe.rotation);
    orbit.rotation.z = t * 0.05;
    arcs.forEach((m, i) => (m.dashOffset = -t * 0.12 - i * 0.02));
    glow.material.opacity = 0.14 + Math.sin(t * 1.6) * 0.06;
    glow.material.size = 0.085 + Math.sin(t * 1.6) * 0.015;
    renderer.render(scene, camera);
  })();
}
