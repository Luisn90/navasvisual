// Láminas curvas en 3D para el hero de Trabajos (usa Three.js). NVOndas(contenedor) devuelve una función para apagarlo.
window.NVOndas = function (el, opts = {}) {
  const T = window.THREE; if (!T || !el) return () => {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return () => {}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  el.appendChild(renderer.domElement);
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(30, 1, 0.1, 100);
  cam.position.set(0, 1.2, 14); cam.lookAt(0, 0, 0);

  scene.add(new T.HemisphereLight(0xffffff, 0xa9a9a4, 0.85));
  const key = new T.DirectionalLight(0xffffff, 2.2); key.position.set(-7, 10, 9); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 });
  key.shadow.radius = 6; key.shadow.bias = -0.0004; scene.add(key);
  const rim = new T.DirectionalLight(0xffffff, 0.5); rim.position.set(8, 2, -6); scene.add(rim);

  const mat = new T.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.42, metalness: 0 });
  const group = new T.Group(); scene.add(group);
  const N = opts.count || 24;
  // Cada lámina: una rebanada de anillo con grosor real (los bordes atrapan la luz), abiertas en abanico.
  const sheets = [];
  for (let i = 0; i < N; i++) {
    const k = i / (N - 1);
    const R = 3.2 + k * 1.7, band = 0.55 + k * 0.55, end = 2.5 - k * 0.55;
    const sh = new T.Shape(), steps = 90;
    for (let j = 0; j <= steps; j++) { const th = (j / steps) * end; const w = band * (0.35 + 0.65 * Math.sin(Math.PI * j / steps)); const r = R + w; j ? sh.lineTo(Math.cos(th) * r, Math.sin(th) * r * 0.85) : sh.moveTo(Math.cos(th) * r, Math.sin(th) * r * 0.85); }
    for (let j = steps; j >= 0; j--) { const th = (j / steps) * end; sh.lineTo(Math.cos(th) * R, Math.sin(th) * R * 0.85); }
    const g = new T.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 4 });
    const m = new T.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
    m.userData = { k, base: -1.05 + k * 1.55 };
    group.add(m); sheets.push(m);
  }
  function shape(t) {
    for (const m of sheets) { const { k, base } = m.userData; m.rotation.y = base + Math.sin(t * 0.45 + k * 2.6) * 0.04; m.rotation.x = Math.sin(t * 0.3 + k * 1.7) * 0.015; }
  }
  shape(0);
  const RX = opts.rx ?? 0.9, RY = opts.ry ?? -1.0, RZ = opts.rz ?? 0.5; group.rotation.set(RX, RY, RZ); group.position.set(opts.px ?? 1.9, opts.py ?? -2.0, 0);

  const resize = () => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(el); resize();
  let raf, t0 = performance.now(), mx = 0, my = 0, visible = true;
  const onMove = e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; };
  addEventListener('pointermove', onMove);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(el);
  const loop = now => {
    raf = requestAnimationFrame(loop);
    if (!visible) return;
    const t = (now - t0) / 1000;
    if (!reduced) { shape(t); group.rotation.y += ((RY + mx * 0.12) - group.rotation.y) * 0.04; group.rotation.x += ((RX + my * 0.06) - group.rotation.x) * 0.04; }
    renderer.render(scene, cam);
  };
  if (reduced) renderer.render(scene, cam); else raf = requestAnimationFrame(loop);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); removeEventListener('pointermove', onMove); renderer.dispose(); sheets.forEach(s => s.geometry.dispose()); mat.dispose(); renderer.domElement.remove(); };
};
