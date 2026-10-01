/* ==========================================================================
   Hero 3D — « De la matière dispersée au lingot »
   1 400 fragments métalliques instanciés : dispersés au chargement, ils se
   rangent en lingot au fil du défilement. Anneau rouge : la boucle de la
   matière. Three.js (module), environnement PMREM pour les reflets.
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host = document.querySelector('.hero-canvas');
const hero = document.querySelector('.hero');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}
if (host && hero && webglOK()) init();

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
  camera.position.set(0, 0.4, 10.5);

  // Lumières
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
  group.position.set(1.9, -0.1, 0);
  group.add(mesh);
  scene.add(group);

  const rand = (a, b) => a + Math.random() * (b - a);
  const A = new Float32Array(N * 3), B = new Float32Array(N * 3);
  const RA = new Float32Array(N * 3), S = new Float32Array(N * 3), PH = new Float32Array(N);
  const cell = 0.27;
  const color = new THREE.Color();
  let i = 0;
  for (let x = 0; x < NX; x++) for (let y = 0; y < NY; y++) for (let z = 0; z < NZ; z++) {
    // état B : lingot (léger fruit trapézoïdal)
    const taper = 1 - (y / (NY - 1)) * 0.14;
    B[i * 3] = (x - (NX - 1) / 2) * cell * taper;
    B[i * 3 + 1] = (y - (NY - 1) / 2) * cell;
    B[i * 3 + 2] = (z - (NZ - 1) / 2) * cell * taper;
    // état A : nuage dispersé en spirale large
    const ang = rand(0, Math.PI * 2), r = rand(0.8, 3.9), h = rand(-2.6, 2.6);
    A[i * 3] = Math.cos(ang) * r + 0.6;
    A[i * 3 + 1] = h * 0.75 + Math.sin(ang * 2) * 0.5;
    A[i * 3 + 2] = Math.sin(ang) * r * 0.8 - 0.8;
    RA[i * 3] = rand(0, Math.PI * 2); RA[i * 3 + 1] = rand(0, Math.PI * 2); RA[i * 3 + 2] = rand(0, Math.PI * 2);
    // tailles : plaquettes irrégulières puis cellules pleines
    S[i * 3] = cell * rand(0.55, 0.98); S[i * 3 + 1] = cell * rand(0.35, 0.95); S[i * 3 + 2] = cell * rand(0.55, 0.98);
    PH[i] = rand(0, Math.PI * 2);
    // teinte : acier, quelques cuivres et un soupçon de rouge marque
    const t = Math.random();
    if (t < 0.022) color.setHex(0xd52b1e);
    else if (t < 0.085) color.setHSL(0.06, 0.4, rand(0.4, 0.52)); // cuivre
    else color.setHSL(0.62, 0.03, rand(0.5, 0.9));
    mesh.setColorAt(i, color);
    i++;
  }
  mesh.instanceColor.needsUpdate = true;

  // Anneau : la boucle
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.012, 12, 220), new THREE.MeshBasicMaterial({ color: 0xd52b1e }));
  ring.rotation.set(Math.PI / 2.6, 0.3, 0);
  group.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.004, 8, 220), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 }));
  ring2.rotation.set(Math.PI / 2.2, -0.4, 0.2);
  group.add(ring2);

  // Poussières
  const PN = 700, pp = new Float32Array(PN * 3);
  for (let k = 0; k < PN; k++) { pp[k * 3] = rand(-9, 9); pp[k * 3 + 1] = rand(-5, 5); pp[k * 3 + 2] = rand(-6, 4); }
  const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const dust = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.028, transparent: true, opacity: 0.35, sizeAttenuation: true, depthWrite: false }));
  scene.add(dust);

  // Sol réfléchissant discret (grille technique)
  const grid = new THREE.GridHelper(40, 40, 0x2a2a30, 0x1a1a1e);
  grid.position.y = -3.2; grid.material.transparent = true; grid.material.opacity = 0.35;
  scene.add(grid);

  // État
  const dummy = new THREE.Object3D();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let intro = reduced ? 1 : 0;           // 0 → 1 après le préchargeur
  let scrollM = 0;                        // 0 → 1 selon défilement
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  let visible = true, started = false;
  const clock = new THREE.Clock();

  document.addEventListener('site:ready', () => { started = true; });
  if (!document.querySelector('.preloader')) started = true;

  // Pas de suivi de la souris : la scène vit par sa rotation propre et le défilement.
  new IntersectionObserver((en) => (visible = en[0].isIntersecting)).observe(hero);

  const onResize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    group.position.x = w < 960 ? 0.2 : 2.6;
    group.position.y = w < 960 ? 0.9 : 0.1;
  };
  window.addEventListener('resize', onResize); onResize();

  const tmp = new THREE.Vector3();
  function render() {
    requestAnimationFrame(render);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (started && intro < 1) intro = Math.min(1, intro + dt / 2.4);
    const hh = hero.offsetHeight || innerHeight;
    scrollM += (Math.min(1, Math.max(0, window.scrollY / (hh * 0.85))) - scrollM) * 0.08;
    mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;

    // m : 0 dispersé → 1 lingot. Intro amène à 0.62, le défilement termine.
    const base = ease(intro) * 0.62;
    const m = Math.min(1, base + ease(scrollM) * 0.42);
    const loose = 1 - m;

    for (let k = 0; k < N; k++) {
      const k3 = k * 3;
      const wob = loose * 0.35;
      const ox = Math.sin(t * 0.6 + PH[k]) * wob, oy = Math.cos(t * 0.5 + PH[k] * 1.3) * wob, oz = Math.sin(t * 0.7 + PH[k] * 0.7) * wob;
      dummy.position.set(A[k3] + (B[k3] - A[k3]) * m + ox, A[k3 + 1] + (B[k3 + 1] - A[k3 + 1]) * m + oy, A[k3 + 2] + (B[k3 + 2] - A[k3 + 2]) * m + oz);
      dummy.rotation.set(RA[k3] * loose + t * 0.15 * loose, RA[k3 + 1] * loose + t * 0.1 * loose, RA[k3 + 2] * loose);
      const sx = S[k3] + (cell * 0.96 - S[k3]) * m, sy = S[k3 + 1] + (cell * 0.96 - S[k3 + 1]) * m, sz = S[k3 + 2] + (cell * 0.96 - S[k3 + 2]) * m;
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    group.rotation.y = t * 0.12 + mx * 0.25 + scrollM * 0.9;
    group.rotation.x = -0.12 + my * 0.08 + scrollM * 0.25;
    ring.rotation.z = t * 0.25; ring2.rotation.z = -t * 0.18;
    ring.scale.setScalar(1 + loose * 0.35); ring2.scale.setScalar(1 + loose * 0.5);
    dust.rotation.y = t * 0.02; dust.position.y = Math.sin(t * 0.3) * 0.2;

    camera.position.x += ((mx * 0.6) - camera.position.x) * 0.05;
    camera.position.y += ((0.4 - my * 0.35 - scrollM * 1.2) - camera.position.y) * 0.05;
    camera.position.z = 11.2 - scrollM * 1.5;
    tmp.set(group.position.x * 0.5, -0.2 - scrollM * 0.6, 0);
    camera.lookAt(tmp);
    renderer.render(scene, camera);
  }
  render();
}
