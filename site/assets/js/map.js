/* ==========================================================================
   Carte interactive des implantations — d3-geo + TopoJSON
   Trois vues (Europe, France, Monde), filtres par pays et par métier,
   sites phares avec info-bulle.
   ========================================================================== */
(async () => {
  const stage = document.querySelector('.map-stage');
  if (!stage || typeof d3 === 'undefined' || typeof topojson === 'undefined') return;
  const svg = d3.select(stage).select('svg');
  const tip = stage.querySelector('.map-tip');
  const hud = stage.querySelector('.hud b');
  const ISO = { FR: 250, DE: 276, ES: 724, CZ: 203, PL: 616, IT: 380, BE: 56, SI: 705, LU: 442, AT: 40, RO: 642, HU: 348, SK: 703, NL: 528, CA: 124, US: 840, MX: 484 };
  const NAMES = { FR: 'France', DE: 'Allemagne', ES: 'Espagne', CZ: 'République tchèque', PL: 'Pologne', IT: 'Italie', BE: 'Belgique', SI: 'Slovénie', LU: 'Luxembourg', AT: 'Autriche', RO: 'Roumanie', HU: 'Hongrie', SK: 'Slovaquie', NL: 'Pays-Bas', CA: 'Canada', US: 'États-Unis', MX: 'Mexique' };
  const METIERS = { ferrailles: 'Ferrailles', 'non-ferreux': 'Non ferreux', vhu: 'VHU', deee: 'DEEE', collectivites: 'Collectivités', cables: 'Câbles cuivre', broyage: 'Broyage', 'papier-plastiques': 'Papier · plastiques' };
  const NUM2ISO = Object.fromEntries(Object.entries(ISO).map(([k, v]) => [v, k]));

  const [topo, data] = await Promise.all([fetch('assets/data/countries-50m.json').then((r) => r.json()), fetch('assets/data/sites.json').then((r) => r.json())]);
  const countries = topojson.feature(topo, topo.objects.countries);
  const W = 1200, H = 825;
  svg.attr('viewBox', `0 0 ${W} ${H}`);
  const gLand = svg.append('g'), gGrat = svg.append('g'), gSites = svg.append('g'), gFlags = svg.append('g');

  const VIEWS = {
    europe: { proj: () => d3.geoConicConformal().parallels([40, 55]).rotate([-10, 0]), box: [[-14, 34], [34, 62]], r: 2.4 },
    france: { proj: () => d3.geoConicConformal().parallels([44, 49]).rotate([-3, 0]), box: [[-6.5, 41], [10.5, 51.6]], r: 4.2 },
    monde: { proj: () => d3.geoNaturalEarth1(), box: [[-140, -50], [160, 78]], r: 1.6 },
  };
  let view = stage.dataset.view || 'europe', activeCountry = stage.dataset.country || null, activeMetier = null;
  let projection, pathGen;

  // d3-geo attend des anneaux extérieurs dans le sens horaire (convention sphérique)
  const boxFeature = ([[x0, y0], [x1, y1]]) => ({ type: 'Polygon', coordinates: [[[x0, y0], [x0, y1], [x1, y1], [x1, y0], [x0, y0]]] });
  function setProjection() {
    const v = VIEWS[view];
    projection = v.proj();
    projection.fitExtent([[24, 24], [W - 24, H - 24]], boxFeature(v.box));
    pathGen = d3.geoPath(projection);
  }

  function visible(s) { return (!activeCountry || s[2] === activeCountry) && (!activeMetier || s[3] === activeMetier); }

  function render() {
    setProjection();
    const v = VIEWS[view];
    gLand.selectAll('path').data(countries.features, (d) => d.id).join('path')
      .attr('class', (d) => 'land' + (NUM2ISO[parseInt(d.id, 10)] ? ' is-present' : ''))
      .attr('d', pathGen)
      .on('mousemove', (e, d) => { const iso = NUM2ISO[parseInt(d.id, 10)]; if (!iso) return hide(); const n = data.sites.filter((s) => s[2] === iso).length; show(e, `<em>${NAMES[iso]}</em><b>${n} implantation${n > 1 ? 's' : ''}</b><span>${iso === 'FR' ? 'Réseau historique, maillage national' : ['DE', 'CZ', 'PL', 'SI'].includes(iso) ? 'Rejoint via Scholz Recycling · 2026' : 'Présence Derichebourg'}</span>`); })
      .on('mouseleave', hide)
      .on('click', (e, d) => { const iso = NUM2ISO[parseInt(d.id, 10)]; if (iso) setCountry(activeCountry === iso ? null : iso); });
    gGrat.selectAll('path').data([d3.geoGraticule().step([10, 10])()]).join('path').attr('class', 'graticule').attr('d', pathGen);

    const pts = data.sites.map((s) => ({ s, p: projection([s[0], s[1]]) })).filter((o) => o.p && isFinite(o.p[0]));
    gSites.selectAll('circle').data(pts).join('circle')
      .attr('class', 'site').attr('r', v.r)
      .attr('cx', (o) => o.p[0]).attr('cy', (o) => o.p[1])
      .classed('dim', (o) => !visible(o.s));

    const fl = data.flagships.map((f) => ({ f, p: projection([f.lon, f.lat]) })).filter((o) => o.p && isFinite(o.p[0]));
    const fg = gFlags.selectAll('g').data(fl, (o) => o.f.name).join((enter) => { const g = enter.append('g'); g.append('circle').attr('class', 'flag-ring').attr('r', v.r * 2.6); g.append('circle').attr('class', 'flag').attr('r', v.r * 1.4); return g; });
    fg.attr('transform', (o) => `translate(${o.p[0]},${o.p[1]})`).style('display', (o) => (!activeCountry || o.f.iso === activeCountry) ? '' : 'none');
    fg.select('.flag-ring').attr('r', v.r * 2.6); fg.select('.flag').attr('r', v.r * 1.4);
    fg.on('mousemove', (e, o) => show(e, `<em>${o.f.city}</em><b>${o.f.name}</b><span>${o.f.desc}</span>`)).on('mouseleave', hide);

    const n = data.sites.filter(visible).length;
    if (hud) hud.textContent = n;
    document.querySelectorAll('.map-list li').forEach((li) => li.classList.toggle('is-active', li.dataset.iso === activeCountry));
    document.querySelectorAll('[data-country]').forEach((c) => c.classList.toggle('is-active', (c.dataset.country || null) === (activeCountry || '')));
    document.querySelectorAll('[data-metier]').forEach((c) => c.classList.toggle('is-active', (c.dataset.metier || null) === (activeMetier || '')));
    document.querySelectorAll('.map-stage .zoom button').forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
    svg.style('opacity', 0).transition().duration(450).style('opacity', 1);
  }
  function show(e, html) { if (!tip) return; const r = stage.getBoundingClientRect(); tip.innerHTML = html; tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; tip.classList.add('is-on'); }
  function hide() { tip && tip.classList.remove('is-on'); }
  function setCountry(iso) {
    activeCountry = iso;
    if (iso === 'FR' && view !== 'france') view = 'france';
    else if (iso && ['CA', 'US', 'MX'].includes(iso) && view !== 'monde') view = 'monde';
    else if (iso && !['CA', 'US', 'MX', 'FR'].includes(iso) && view === 'monde') view = 'europe';
    render();
  }

  document.querySelectorAll('[data-country]').forEach((c) => c.addEventListener('click', () => setCountry(c.dataset.country || null)));
  document.querySelectorAll('[data-metier]').forEach((c) => c.addEventListener('click', () => { activeMetier = c.dataset.metier || null; render(); }));
  document.querySelectorAll('.map-stage .zoom button').forEach((b) => b.addEventListener('click', () => { view = b.dataset.view; render(); }));
  document.querySelectorAll('.map-list li').forEach((li) => li.addEventListener('click', () => setCountry(activeCountry === li.dataset.iso ? null : li.dataset.iso)));

  // Liste des pays
  const list = document.querySelector('.map-list');
  if (list) {
    const counts = {};
    data.sites.forEach((s) => (counts[s[2]] = (counts[s[2]] || 0) + 1));
    Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([iso, n]) => {
      const li = document.createElement('li'); li.dataset.iso = iso; li.innerHTML = `<span>${NAMES[iso]}</span><b>${n}</b>`;
      li.addEventListener('click', () => setCountry(activeCountry === iso ? null : iso));
      list.appendChild(li);
    });
  }
  render();
})();
