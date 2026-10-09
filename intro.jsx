// Local Three.js, no external models or environment-map requests.
function IntroSculpture() {
  const mount = React.useRef(null);
  const [rendered, setRendered] = React.useState(false);
  React.useEffect(() => {
    const el = mount.current;
    if (!el || !window.THREE) return;
    const T = window.THREE;
    let renderer, material, geometry, environment, pmrem;
    const studio = new T.Scene();
    const panels = [];
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);
      // A procedural studio creates broad white highlights and dark reflections.
      studio.background = new T.Color(0x17191c);
      const panel = (width, height, x, y, z, color, intensity) => {
        const mesh = new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshBasicMaterial({ color, side: T.DoubleSide }));
        mesh.material.color.multiplyScalar(intensity);
        mesh.position.set(x, y, z); mesh.lookAt(0, 0, 0); studio.add(mesh); panels.push(mesh);
      };
      panel(8, 4, 0, 5, 2, 0xffffff, 4);
      panel(3, 8, -5, 0, 3, 0xffffff, 3);
      panel(2, 8, 5, 1, 0, 0xe5eaff, 3);
      panel(8, 1.5, 0, -4, 4, 0xffffff, 2);
      panel(2, 5, 3, -1, -4, 0xaec7ff, 0.5);
      pmrem = new T.PMREMGenerator(renderer);
      environment = pmrem.fromScene(studio, 0.03);
      const scene = new T.Scene();
      scene.environment = environment.texture;
      const camera = new T.PerspectiveCamera(34, 1, 0.1, 30);
      camera.position.z = 7.4;
      geometry = new T.TorusKnotGeometry(1.12, 0.26, 180, 32, 2, 3);
      material = new T.MeshStandardMaterial({ color: 0xe9edf2, metalness: 1, roughness: 0.085, envMapIntensity: 1.15 });
      const sculpture = new T.Mesh(geometry, material);
      sculpture.rotation.set(0.55, -0.4, -0.35);
      scene.add(sculpture);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      const pointer = { x: 0, y: 0 };
      let visible = true, frame = 0, last = 0, started = performance.now();
      const draw = time => {
        frame = 0;
        if (!visible || document.hidden) return;
        if (time - last >= 32 || reduced.matches) {
          last = time;
          const elapsed = (time - started) / 1000;
          sculpture.rotation.x = 0.55 + (reduced.matches ? 0 : Math.sin(elapsed * 0.26) * 0.2 + pointer.y * 0.14);
          sculpture.rotation.y = -0.4 + (reduced.matches ? 0 : elapsed * 0.11 + pointer.x * 0.2);
          renderer.render(scene, camera);
        }
        if (!reduced.matches) frame = requestAnimationFrame(draw);
      };
      const restart = () => { if (frame) cancelAnimationFrame(frame); frame = 0; if (visible && !document.hidden) frame = requestAnimationFrame(draw); };
      const resize = () => { renderer.setSize(el.clientWidth, el.clientHeight); camera.aspect = el.clientWidth / Math.max(1, el.clientHeight); camera.updateProjectionMatrix(); renderer.render(scene, camera); };
      const move = e => { const rect = el.getBoundingClientRect(); pointer.x = Math.max(-1, Math.min(1, (e.clientX - rect.left) / rect.width * 2 - 1)); pointer.y = Math.max(-1, Math.min(1, (e.clientY - rect.top) / rect.height * 2 - 1)); };
      const resizeObserver = new ResizeObserver(resize);
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; restart(); });
      resizeObserver.observe(el); observer.observe(el);
      window.addEventListener('pointermove', move, { passive: true });
      document.addEventListener('visibilitychange', restart);
      reduced.addEventListener('change', restart);
      resize(); restart(); setRendered(true);
      return () => {
        cancelAnimationFrame(frame); observer.disconnect(); resizeObserver.disconnect();
        window.removeEventListener('pointermove', move); document.removeEventListener('visibilitychange', restart); reduced.removeEventListener('change', restart);
        geometry.dispose(); material.dispose(); environment.dispose(); pmrem.dispose();
        panels.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
        renderer.dispose(); renderer.domElement.remove();
      };
    } catch {
      geometry?.dispose(); material?.dispose(); environment?.dispose(); pmrem?.dispose();
      panels.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
      renderer?.dispose(); renderer?.domElement.remove();
    }
  }, []);
  return <div className="nv-intro__sculpture" aria-hidden="true">
    <div className="nv-intro__canvas" ref={mount} />
    {!rendered && <svg className="nv-intro__fallback" viewBox="0 0 400 400"><defs><linearGradient id="nv-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff"/><stop offset=".25" stopColor="#717780"/><stop offset=".45" stopColor="#fff"/><stop offset=".62" stopColor="#151719"/><stop offset=".8" stopColor="#e5e9ed"/><stop offset="1" stopColor="#fff"/></linearGradient></defs><g fill="none" stroke="url(#nv-metal)" strokeWidth="30"><ellipse cx="200" cy="200" rx="125" ry="65" transform="rotate(-35 200 200)"/><ellipse cx="200" cy="200" rx="125" ry="65" transform="rotate(85 200 200)"/></g></svg>}
  </div>;
}

function IntroHero({ t, onNavigate }) {
  const c = t.intro;
  const navigate = (e, href) => { e.preventDefault(); onNavigate(href); };
  return <section className="nv-intro" aria-labelledby="nv-intro-title">
    <div className="nv-intro__stage">
      <h1 id="nv-intro-title" className="nv-intro__title">{c.lines.map(line => <span key={line}>{line}</span>)}</h1>
      <IntroSculpture />
    </div>
    <div className="nv-intro__footer">
      <div className="nv-intro__identity"><span>NAVAS VISUAL</span><p>{c.description}</p></div>
      <div className="nv-intro__links"><a href="work.html" onClick={e => navigate(e, 'work.html')}>{c.work} <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 13 13 3M3 3h10v10"/></svg></a><a href="contact.html" onClick={e => navigate(e, 'contact.html')}>{c.contact} <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 13 13 3M3 3h10v10"/></svg></a></div>
      <a className="nv-intro__explore" href="#visual" onClick={e => navigate(e, '#visual')}>{c.explore} <span aria-hidden="true">↓</span></a>
    </div>
  </section>;
}
