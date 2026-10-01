/* ==========================================================================
   Hero 3D — « De la matière dispersée au lingot, du lingot aux chiffres »
   1 400 fragments métalliques instanciés. Au chargement ils se rangent en
   lingot ; au défilement (hero épinglé) le lingot éclate et les cubes se
   réassemblent pour écrire, en pixels de métal, les quatre chiffres clés.
   Three.js (module), environnement PMREM pour les reflets.
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const hero = document.querySelector('.hero');
const host = document.querySelector('.hero-canvas');
const content = document.querySelector('.hero-content');
const cue = document.querySelector('.scroll-cue');
const infos = [...document.querySelectorAll('.hero-info')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}
if (host && hero && webglOK()) init();
else if (hero) hero.classList.add('no-webgl');

/* ------------------------------------------------------------ Texte → cellules
   Rend un libellé dans un canvas 2D avec la police du site, puis échantillonne
   les pixels pleins sur une grille dont le pas est choisi pour que le nombre
   de cellules tienne dans le nombre de cubes disponibles. Coordonnées
   normalisées : largeur du texte = 1. */
function rasterize(label, maxCells) {
  const W = 560, H = 160;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `800 ${Math.round(H * 0.74)}px Archivo, "Helvetica Neue", Arial, sans-serif`;
  g.fillText(label, W / 2, H / 2 + 6);
  const d = g.getImageData(0, 0, W, H).data;
  const on = (x, y) => d[(y * W + x) * 4 + 3] > 120;
  let minx = W, maxx = 0, miny = H, maxy = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (on(x, y)) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  const tw = maxx - minx || 1, cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  let step = 2, cells = [];
  for (step = 2; step <= 12; step++) {
    cells = [];
    for (let y = miny; y <= maxy; y += step) for (let x = minx; x <= maxx; x += step) if (on(x, y)) cells.push([(x - cx) / tw, (cy - y) / tw]);
    if (cells.length <= maxCells) break;
  }
  return { cells, cell: step / tw };
}

function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a0b, 0.045);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, host.clientWidth / host.clientHeight, 0.1, 100);
  const CAMZ = 11.2;
  camera.position.set(0, 0.4, CAMZ);

  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const key = new THREE.DirectionalLight(0xfff3e6, 2.2); key.position.set(4, 6, 5); scene.add(key);
  const cold = new THREE.DirectionalLight(0xcfd8ff, 1.1); cold.position.set(-6, 2, 3); scene.add(cold);
  const rim = new THREE.PointLight(0xd52b1e, 40, 18, 2); rim.position.set(2.5, -2.5, -3.5); scene.add(rim);

  // Fragments
  const NX = 14, NY = 10, NZ = 10, N = NX * NY * NZ; // 1 400
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0xd8d9df, metalness: 1, roughness: 0.32, envMapIntensity: 1.25 });
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const group = new THREE.Group();
  group.add(mesh);
  scene.add(group);

  const rand = (a, b) => a + Math.random() * (b - a);
  const A = new Float32Array(N * 3), B = new Float32Array(N * 3);
  const RA = new Float32Array(N * 3), S = new Float32Array(N * 3), PH = new Float32Array(N);
  const DIR = new Float32Array(N * 3), BURST = new Float32Array(N);
  const cell = 0.27;
  const color = new THREE.Color();
  let i = 0;
  for (let x = 0; x < NX; x++) for (let y = 0; y < NY; y++) for (let z = 0; z < NZ; z++) {
    const taper = 1 - (y / (NY - 1)) * 0.14;
    B[i * 3] = (x - (NX - 1) / 2) * cell * taper;
    B[i * 3 + 1] = (y - (NY - 1) / 2) * cell;
    B[i * 3 + 2] = (z - (NZ - 1) / 2) * cell * taper;
    const ang = rand(0, Math.PI * 2), r = rand(0.8, 3.9), h = rand(-2.6, 2.6);
    A[i * 3] = Math.cos(ang) * r + 0.6;
    A[i * 3 + 1] = h * 0.75 + Math.sin(ang * 2) * 0.5;
    A[i * 3 + 2] = Math.sin(ang) * r * 0.8 - 0.8;
    RA[i * 3] = rand(0, Math.PI * 2); RA[i * 3 + 1] = rand(0, Math.PI * 2); RA[i * 3 + 2] = rand(0, Math.PI * 2);
    S[i * 3] = cell * rand(0.55, 0.98); S[i * 3 + 1] = cell * rand(0.35, 0.95); S[i * 3 + 2] = cell * rand(0.55, 0.98);
    PH[i] = rand(0, Math.PI * 2);
    // direction d'éclatement : radiale depuis le centre du lingot, un peu de hasard
    const dx = B[i * 3] + rand(-.3, .3), dy = B[i * 3 + 1] + rand(-.3, .3), dz = B[i * 3 + 2] + rand(-.3, .3);
    const l = Math.hypot(dx, dy, dz) || 1;
    DIR[i * 3] = dx / l; DIR[i * 3 + 1] = dy / l; DIR[i * 3 + 2] = dz / l;
    BURST[i] = rand(1.2, 3.2);
    const t = Math.random();
    if (t < 0.022) color.setHex(0xd52b1e);
    else if (t < 0.085) color.setHSL(0.06, 0.4, rand(0.4, 0.52));
    else color.setHSL(0.62, 0.03, rand(0.5, 0.9));
    mesh.setColorAt(i, color);
    i++;
  }
  mesh.instanceColor.needsUpdate = true;

  // Anneaux : la boucle
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.012, 12, 220), new THREE.MeshBasicMaterial({ color: 0xd52b1e }));
  ring.rotation.set(Math.PI / 2.6, 0.3, 0); group.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.004, 8, 220), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 }));
  ring2.rotation.set(Math.PI / 2.2, -0.4, 0.2); group.add(ring2);

  // Poussières
  const PN = 700, pp = new Float32Array(PN * 3);
  for (let k = 0; k < PN; k++) { pp[k * 3] = rand(-9, 9); pp[k * 3 + 1] = rand(-5, 5); pp[k * 3 + 2] = rand(-6, 4); }
  const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const dust = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.028, transparent: true, opacity: 0.35, sizeAttenuation: true, depthWrite: false }));
  scene.add(dust);
  const grid = new THREE.GridHelper(40, 40, 0x2a2a30, 0x1a1a1e);
  grid.position.y = -3.2; grid.material.transparent = true; grid.material.opacity = 0.35;
  scene.add(grid);

  /* ---------------------------------------------------------- Images clés
     K0 = lingot ; K1..K4 = chiffres écrits en cubes. Pour chaque texte, les
     cellules sont attribuées aux cubes les plus proches de leur position
     précédente, pour des trajectoires courtes ; les cubes en trop s'effacent. */
  const LABELS = infos.map((el) => el.dataset.cubes).filter(Boolean);
  const K = LABELS.length;
  const T = [], V = [], CELL = [];
  let textsReady = false;
  function buildTexts() {
    let prev = B;
    for (let k = 0; k < K; k++) {
      const { cells, cell: cs } = rasterize(LABELS[k], Math.floor(N * 0.97));
      const pos = new Float32Array(N * 3), vis = new Float32Array(N);
      const used = new Uint8Array(N);
      // attribution gloutonne : chaque cellule prend le cube libre le plus proche
      const scale = 5.6; // largeur de référence pour comparer des distances (unités monde)
      for (let c = 0; c < cells.length; c++) {
        const tx = cells[c][0] * scale, ty = cells[c][1] * scale;
        let best = -1, bd = Infinity;
        for (let j = 0; j < N; j++) {
          if (used[j]) continue;
          const dx = prev[j * 3] - tx, dy = prev[j * 3 + 1] - ty;
          const dd = dx * dx + dy * dy;
          if (dd < bd) { bd = dd; best = j; }
        }
        used[best] = 1;
        pos[best * 3] = cells[c][0]; pos[best * 3 + 1] = cells[c][1]; pos[best * 3 + 2] = rand(-0.025, 0.025);
        vis[best] = 1;
      }
      // cubes effacés : ils restent à leur dernière position et se réduisent
      for (let j = 0; j < N; j++) if (!used[j]) { pos[j * 3] = prev === B ? B[j * 3] / scale : prev[j * 3]; pos[j * 3 + 1] = prev === B ? B[j * 3 + 1] / scale : prev[j * 3 + 1]; pos[j * 3 + 2] = prev === B ? B[j * 3 + 2] / scale : prev[j * 3 + 2]; vis[j] = 0; }
      T.push(pos); V.push(vis); CELL.push(cs);
      // positions "monde" de ce texte, pour l'attribution suivante
      const world = new Float32Array(N * 3);
      for (let j = 0; j < N; j++) { world[j * 3] = pos[j * 3] * scale; world[j * 3 + 1] = pos[j * 3 + 1] * scale; world[j * 3 + 2] = 0; }
      prev = world;
    }
    textsReady = true;
  }
  if (K) {
    const run = () => { try { buildTexts(); } catch (e) { console.warn('Texte 3D indisponible', e); } };
    if (document.fonts && document.fonts.load) document.fonts.load('800 80px Archivo').then(run, run); else run();
  }

  // Chorégraphie du défilement : centres des images clés en progression p (0 → 1)
  const KF = [0, 0.26, 0.47, 0.68, 0.89].slice(0, K + 1);
  const HOLD = 0.06;
  function phase(p) {
    if (!K) return { a: 0, b: 0, u: 0 };
    for (let k = 1; k <= K; k++) {
      const start = KF[k - 1] + HOLD, end = KF[k] - HOLD;
      if (p < end) return { a: k - 1, b: k, u: Math.min(1, Math.max(0, (p - start) / (end - start))) };
      if (p <= KF[k] + HOLD || k === K) return { a: k - 1, b: k, u: 1 };
    }
    return { a: K - 1, b: K, u: 1 };
  }

  // État
  const dummy = new THREE.Object3D();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  let intro = reduced ? 1 : 0;
  let p = 0;               // progression du hero épinglé
  let visible = true, started = false;
  let tw = 5.6;            // largeur monde des textes
  let isMobile = false;
  const clock = new THREE.Clock();
  document.addEventListener('site:ready', () => { started = true; });
  if (!document.querySelector('.preloader')) started = true;
  new IntersectionObserver((en) => (visible = en[0].isIntersecting)).observe(hero);

  const onResize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    isMobile = w < 960;
    const halfW = Math.tan(THREE.MathUtils.degToRad(15)) * CAMZ * camera.aspect;
    tw = Math.min(5.6, halfW * 2 * (isMobile ? 0.7 : 0.84));
  };
  window.addEventListener('resize', onResize); onResize();

  let lastInfo = -1;
  function setInfo(k) {
    if (k === lastInfo) return; lastInfo = k;
    infos.forEach((el, idx) => el.classList.toggle('is-on', idx === k));
  }

  const tmp = new THREE.Vector3();
  const pa = [0, 0, 0], pb = [0, 0, 0];
  function target(k, j, out) {
    if (k === 0) { out[0] = B[j * 3]; out[1] = B[j * 3 + 1]; out[2] = B[j * 3 + 2]; return 1; }
    const P = T[k - 1];
    out[0] = P[j * 3] * tw; out[1] = P[j * 3 + 1] * tw; out[2] = P[j * 3 + 2] * tw;
    return V[k - 1][j];
  }
  function sizeFor(k) { return k === 0 ? cell * 0.96 : CELL[k - 1] * tw * 0.86; }

  function render() {
    requestAnimationFrame(render);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (started && intro < 1) intro = Math.min(1, intro + dt / 2.4);
    const pinDist = Math.max(1, hero.offsetHeight - innerHeight);
    const targetP = Math.min(1, Math.max(0, window.scrollY / pinDist));
    p += (targetP - p) * 0.1;

    // Lingot : l'intro amène à 0.62, le début du défilement termine l'assemblage
    const m = Math.min(1, ease(intro) * 0.62 + easeOut(Math.min(1, p / 0.05)) * 0.42);
    const loose = 1 - m;
    const ph = textsReady ? phase(p) : { a: 0, b: 0, u: 0 };
    const uu = ease(ph.u);
    const burst = Math.sin(Math.PI * ph.u); // 0 → 1 → 0 : dispersion au milieu de la transition
    const inText = ph.b > 0 && ph.u > 0.02;

    // Mise en page HTML : le texte du hero s'efface, la légende du chiffre s'allume
    const fade = Math.min(1, Math.max(0, (p - 0.03) / 0.12));
    if (content) { content.style.opacity = String(1 - fade); content.style.transform = `translateX(${-48 * fade}px)`; content.style.pointerEvents = fade > 0.5 ? 'none' : ''; }
    if (cue) cue.style.opacity = String(1 - Math.min(1, p / 0.05));
    let shown = -1;
    if (textsReady && ph.b > 0 && ph.u > 0.7) shown = ph.b - 1;
    setInfo(shown);

    // Position du groupe : il glisse vers le centre pendant la séquence
    const q = Math.min(1, Math.max(0, (p - 0.02) / 0.14));
    const gx0 = isMobile ? 0.2 : 2.6, gx1 = isMobile ? 0.1 : 1.35;
    const gy0 = isMobile ? 0.9 : 0.1, gy1 = isMobile ? 0.55 : 0.35;
    group.position.x = gx0 + (gx1 - gx0) * q;
    group.position.y = gy0 + (gy1 - gy0) * q;

    for (let j = 0; j < N; j++) {
      const j3 = j * 3;
      let x, y, z, sx, sy, sz, rx, ry, rz;
      if (!inText) {
        const wob = loose * 0.35;
        const ox = Math.sin(t * 0.6 + PH[j]) * wob, oy = Math.cos(t * 0.5 + PH[j] * 1.3) * wob, oz = Math.sin(t * 0.7 + PH[j] * 0.7) * wob;
        x = A[j3] + (B[j3] - A[j3]) * m + ox; y = A[j3 + 1] + (B[j3 + 1] - A[j3 + 1]) * m + oy; z = A[j3 + 2] + (B[j3 + 2] - A[j3 + 2]) * m + oz;
        rx = RA[j3] * loose + t * 0.15 * loose; ry = RA[j3 + 1] * loose + t * 0.1 * loose; rz = RA[j3 + 2] * loose;
        sx = S[j3] + (cell * 0.96 - S[j3]) * m; sy = S[j3 + 1] + (cell * 0.96 - S[j3 + 1]) * m; sz = S[j3 + 2] + (cell * 0.96 - S[j3 + 2]) * m;
      } else {
        const va = target(ph.a, j, pa), vb = target(ph.b, j, pb);
        const bst = burst * BURST[j];
        x = pa[0] + (pb[0] - pa[0]) * uu + DIR[j3] * bst;
        y = pa[1] + (pb[1] - pa[1]) * uu + DIR[j3 + 1] * bst * 0.7;
        z = pa[2] + (pb[2] - pa[2]) * uu + DIR[j3 + 2] * bst * 0.6;
        const sa = sizeFor(ph.a) * (va ? 1 : 0.001), sb = sizeFor(ph.b) * (vb ? 1 : 0.001);
        const s = sa + (sb - sa) * uu;
        sx = sy = sz = s;
        rx = RA[j3] * burst * 0.9; ry = RA[j3 + 1] * burst * 0.9 + burst * 2.4; rz = RA[j3 + 2] * burst * 0.5;
      }
      dummy.position.set(x, y, z);
      dummy.rotation.set(rx, ry, rz);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(j, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    // Le groupe tourne doucement tant qu'il est lingot, puis fait face à la caméra
    const face = Math.min(1, Math.max(0, (p - 0.02) / 0.12));
    group.rotation.y = (t * 0.12) * (1 - face) + Math.sin(t * 0.5) * 0.015 * face;
    group.rotation.x = (-0.12) * (1 - face) + Math.sin(t * 0.4) * 0.01 * face;
    ring.rotation.z = t * 0.25; ring2.rotation.z = -t * 0.18;
    ring.scale.setScalar(1 + loose * 0.35 + burst * 0.25); ring2.scale.setScalar(1 + loose * 0.5 + burst * 0.4);
    dust.rotation.y = t * 0.02; dust.position.y = Math.sin(t * 0.3) * 0.2;

    camera.position.x += (0 - camera.position.x) * 0.05;
    camera.position.y += (0.4 - camera.position.y) * 0.05;
    tmp.set(group.position.x * 0.5, -0.2 + 0.3 * face, 0);
    camera.lookAt(tmp);
    renderer.render(scene, camera);
  }
  render();
}
