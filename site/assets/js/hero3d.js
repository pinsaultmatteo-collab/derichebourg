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

/* ------------------------------------------------------------ Textes → cellules
   Rend chaque libellé dans un canvas 2D avec la police du site, puis
   échantillonne les pixels pleins sur une grille commune dont le pas est
   choisi pour que l'ensemble tienne dans le nombre de cubes disponibles.
   Coordonnées en pixels du canvas, relatives au centre de chaque libellé. */
function rasterizeAll(labels, maxCells) {
  const FONT = 150, PAD = 40;
  const W = 1600, H = FONT + PAD * 2;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.font = `800 ${FONT}px Archivo, "Helvetica Neue", Arial, sans-serif`;
  g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  const items = labels.map((label) => {
    g.clearRect(0, 0, W, H);
    g.fillText(label, PAD, H - PAD - FONT * 0.12);
    const d = g.getImageData(0, 0, W, H).data;
    let minx = W, maxx = 0, miny = H, maxy = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 120) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    return { label, d, minx, maxx, miny, maxy, w: maxx - minx, h: maxy - miny, cx: (minx + maxx) / 2, cy: (miny + maxy) / 2 };
  });
  const capTop = Math.min(...items.map((i) => i.miny)), base = Math.max(...items.map((i) => i.maxy));
  const midY = (capTop + base) / 2; // même ligne de base pour tous les libellés
  let step = 2;
  for (step = 2; step <= 16; step++) {
    let total = 0;
    for (const it of items) {
      it.cells = [];
      for (let y = it.miny; y <= it.maxy; y += step) for (let x = it.minx; x <= it.maxx; x += step) if (it.d[(y * W + x) * 4 + 3] > 120) it.cells.push([x - it.cx, y - midY]);
      total += it.cells.length;
    }
    if (total <= maxCells) break;
  }
  return { items: items.map((it) => ({ label: it.label, w: it.w, cells: it.cells })), step, fontH: base - capTop };
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

  /* ---------------------------------------------------------- Tableau de bord
     Une seule image clé après le lingot : les quatre chiffres écrits côte à
     côte (en grille 2 × 2 sur mobile). Les cellules sont attribuées aux cubes
     les plus proches de leur position dans le lingot ; les cubes en trop
     s'effacent. Les légendes HTML sont projetées sous chaque chiffre. */
  const LABELS = infos.map((el) => el.dataset.cubes).filter(Boolean);
  let board = null;          // { T, V, step, fontH, anchors }  — positions en pixels canvas
  let kw = 0.01;             // pixels canvas → unités monde (dépend de la largeur visible)
  let boardLayout = null;    // positions des libellés (px), recalculées au redimensionnement
  let raster = null;
  function layoutBoard() {
    if (!raster) return;
    const mobile = isMobile;
    const rows = mobile ? [[0, 1], [2, 3]] : [[0, 1, 2, 3]];
    const gap = raster.fontH * (mobile ? 0.55 : 0.75);
    const rowH = raster.fontH * (mobile ? 4.3 : 1);
    const centers = [];
    let maxW = 0;
    rows.forEach((row) => { maxW = Math.max(maxW, row.reduce((a, i) => a + raster.items[i].w, 0) + gap * (row.length - 1)); });
    rows.forEach((row, r) => {
      const widths = row.map((i) => raster.items[i].w);
      const total = widths.reduce((a, b) => a + b, 0) + gap * (row.length - 1);
      const y = ((rows.length - 1) / 2 - r) * rowH;
      if (mobile) {
        // grille : une colonne par chiffre, pour que les légendes ne se chevauchent pas
        const slot = maxW / row.length;
        row.forEach((i, j) => { centers[i] = { x: (j + 0.5 - row.length / 2) * slot, y }; });
      } else {
        let x = -total / 2;
        row.forEach((i, j) => { centers[i] = { x: x + widths[j] / 2, y }; x += widths[j] + gap; });
      }
    });
    boardLayout = { centers, width: maxW };
    kw = boardW / maxW / group.scale.x; // le groupe est réduit sur mobile, le tableau garde sa largeur visible
    if (board) rebuildBoard();
  }
  function rebuildBoard() {
    const T = new Float32Array(N * 3), V = new Float32Array(N);
    const used = new Uint8Array(N);
    const flat = [];
    raster.items.forEach((it, i) => it.cells.forEach((c) => flat.push([c[0] + boardLayout.centers[i].x, -(c[1] - boardLayout.centers[i].y)])));
    // attribution gloutonne depuis le lingot
    for (let c = 0; c < flat.length; c++) {
      const tx = flat[c][0] * kw, ty = flat[c][1] * kw;
      let best = -1, bd = Infinity;
      for (let j = 0; j < N; j++) {
        if (used[j]) continue;
        const dx = B[j * 3] - tx, dy = B[j * 3 + 1] - ty, dd = dx * dx + dy * dy;
        if (dd < bd) { bd = dd; best = j; }
      }
      used[best] = 1;
      T[best * 3] = flat[c][0]; T[best * 3 + 1] = flat[c][1]; T[best * 3 + 2] = rand(-3, 3); V[best] = 1;
    }
    for (let j = 0; j < N; j++) if (!used[j]) { T[j * 3] = B[j * 3] / kw; T[j * 3 + 1] = B[j * 3 + 1] / kw; T[j * 3 + 2] = B[j * 3 + 2] / kw; V[j] = 0; }
    board = { T, V };
  }
  function buildTexts() {
    raster = rasterizeAll(LABELS, Math.floor(N * 0.97));
    layoutBoard();
    rebuildBoard();
  }
  if (LABELS.length) {
    const run = () => { try { buildTexts(); } catch (e) { console.warn('Tableau 3D indisponible', e); } };
    if (document.fonts && document.fonts.load) document.fonts.load('800 80px Archivo').then(run, run); else run();
  }

  // Chorégraphie : lingot (hold) → éclatement → tableau de bord (hold)
  const P_START = 0.08, P_END = 0.6;
  function phase(p) { return Math.min(1, Math.max(0, (p - P_START) / (P_END - P_START))); }

  // État
  const dummy = new THREE.Object3D();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  let intro = reduced ? 1 : 0;
  let p = 0;
  let visible = true, started = false;
  let boardW = 8;            // largeur monde du tableau de bord
  let isMobile = false;
  const clock = new THREE.Clock();
  document.addEventListener('site:ready', () => { started = true; });
  if (!document.querySelector('.preloader')) started = true;
  new IntersectionObserver((en) => (visible = en[0].isIntersecting)).observe(hero);

  const onResize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    isMobile = w < 960;
    group.scale.setScalar(isMobile ? 0.6 : 1); // sur mobile, lingot et nuage tiennent dans l'écran
    const halfW = Math.tan(THREE.MathUtils.degToRad(15)) * CAMZ * camera.aspect;
    boardW = halfW * 2 * (isMobile ? 0.82 : 0.84);
    layoutBoard();
  };
  window.addEventListener('resize', onResize); onResize();

  let labelsOn = false;
  const v3 = new THREE.Vector3();
  function placeLabels(show) {
    if (labelsOn !== show) { labelsOn = show; infos.forEach((el) => el.classList.toggle('is-on', show)); }
    if (!show || !boardLayout || !raster) return;
    const w = host.clientWidth, h = host.clientHeight;
    infos.forEach((el, i) => {
      const c = boardLayout.centers[i]; if (!c) return;
      v3.set(c.x * kw, (c.y - raster.fontH * 0.72) * kw, 0);
      group.localToWorld(v3); v3.project(camera);
      el.style.left = ((v3.x + 1) / 2 * w).toFixed(1) + 'px';
      el.style.top = ((1 - v3.y) / 2 * h).toFixed(1) + 'px';
    });
  }

  const tmp = new THREE.Vector3();
  let frames = 0;
  function render() {
    requestAnimationFrame(render);
    if (!visible) return;
    frames++;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (started && intro < 1) intro = Math.min(1, intro + dt / 2.4);
    const pinDist = Math.max(1, hero.offsetHeight - innerHeight);
    const targetP = Math.min(1, Math.max(0, window.scrollY / pinDist));
    p += (targetP - p) * 0.12;

    const m = Math.min(1, ease(intro) * 0.62 + easeOut(Math.min(1, p / 0.05)) * 0.42);
    const loose = 1 - m;
    const u = board ? phase(p) : 0;
    const uu = ease(u);
    const burst = Math.sin(Math.PI * u);
    const inBoard = u > 0.001;

    const fade = Math.min(1, Math.max(0, (p - 0.03) / 0.12));
    if (content) {
      content.style.opacity = String(1 - fade);
      content.style.transform = `translate3d(${-48 * fade}px, 0, 0)`;
      content.style.pointerEvents = fade > 0.5 ? 'none' : '';
    }
    if (cue) cue.style.opacity = String(1 - Math.min(1, p / 0.05));

    const q = Math.min(1, Math.max(0, (p - 0.02) / 0.16));
    const gx0 = isMobile ? 0.2 : 2.6, gy0 = isMobile ? 0.9 : 0.1, gy1 = isMobile ? 0.6 : 0.5;
    group.position.x = gx0 * (1 - q);
    group.position.y = gy0 + (gy1 - gy0) * q;

    const boardSize = board ? raster.step * kw * 0.86 : cell;
    for (let j = 0; j < N; j++) {
      const j3 = j * 3;
      let x, y, z, sx, sy, sz, rx, ry, rz;
      if (!inBoard) {
        const wob = loose * 0.35;
        const ox = Math.sin(t * 0.6 + PH[j]) * wob, oy = Math.cos(t * 0.5 + PH[j] * 1.3) * wob, oz = Math.sin(t * 0.7 + PH[j] * 0.7) * wob;
        x = A[j3] + (B[j3] - A[j3]) * m + ox; y = A[j3 + 1] + (B[j3 + 1] - A[j3 + 1]) * m + oy; z = A[j3 + 2] + (B[j3 + 2] - A[j3 + 2]) * m + oz;
        rx = RA[j3] * loose + t * 0.15 * loose; ry = RA[j3 + 1] * loose + t * 0.1 * loose; rz = RA[j3 + 2] * loose;
        sx = S[j3] + (cell * 0.96 - S[j3]) * m; sy = S[j3 + 1] + (cell * 0.96 - S[j3 + 1]) * m; sz = S[j3 + 2] + (cell * 0.96 - S[j3 + 2]) * m;
      } else {
        const bx = board.T[j3] * kw, by = board.T[j3 + 1] * kw, bz = board.T[j3 + 2] * kw * 0.5;
        const bst = burst * BURST[j];
        x = B[j3] + (bx - B[j3]) * uu + DIR[j3] * bst;
        y = B[j3 + 1] + (by - B[j3 + 1]) * uu + DIR[j3 + 1] * bst * 0.7;
        z = B[j3 + 2] + (bz - B[j3 + 2]) * uu + DIR[j3 + 2] * bst * 0.6;
        const sb = boardSize * (board.V[j] ? 1 : 0.001);
        const s = cell * 0.96 + (sb - cell * 0.96) * uu;
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

    const face = Math.min(1, Math.max(0, (p - 0.02) / 0.12));
    group.rotation.y = (t * 0.12) * (1 - face) + Math.sin(t * 0.5) * 0.012 * face;
    group.rotation.x = (-0.12) * (1 - face) + Math.sin(t * 0.4) * 0.008 * face;
    ring.rotation.z = t * 0.25; ring2.rotation.z = -t * 0.18;
    const ringGrow = 1 + loose * 0.35 + burst * 0.3 + uu * 0.55; // l'anneau s'élargit autour du tableau
    ring.scale.setScalar(ringGrow); ring2.scale.setScalar(ringGrow * 1.08);
    dust.rotation.y = t * 0.02; dust.position.y = Math.sin(t * 0.3) * 0.2;

    camera.position.x += (0 - camera.position.x) * 0.05;
    camera.position.y += (0.4 - camera.position.y) * 0.05;
    tmp.set(group.position.x * 0.5, -0.2 + 0.4 * face, 0);
    camera.lookAt(tmp);
    group.updateMatrixWorld();
    placeLabels(u > 0.72);
    renderer.render(scene, camera);
  }
  render();
}
