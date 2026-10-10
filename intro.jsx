// Local Three.js, no external models or environment-map requests.
function IntroSculpture() {
  const mount = React.useRef(null);
  const [rendered, setRendered] = React.useState(false);
  React.useEffect(() => {
    const el = mount.current;
    if (!el || !window.THREE) return;
    const T = window.THREE;
    let renderer, material, geometry, environment, pmrem, backdrop, backdropTexture;
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
      studio.background = new T.Color(0xa4a7ad);
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
      // Exact contours from assets/logo.svg; invert SVG Y before extrusion.
      const shape = () => {
        const path = new T.Shape();
        return { path, move: (x, y) => path.moveTo(x, 87 - y), line: (x, y) => path.lineTo(x, 87 - y), curve: (a, b, c, d, x, y) => path.bezierCurveTo(a, 87 - b, c, 87 - d, x, 87 - y) };
      };
      const first = shape();
      first.move(44.23, 0); first.line(24.17, 0); first.line(0, 41.98); first.line(20.06, 41.98); first.path.closePath();
      const middle = shape();
      middle.move(58.9708, 0); middle.line(57.0508, 0); middle.line(17.6108, 68.81);
      middle.curve(13.1708, 76.56, 18.7608, 86.21, 27.6908, 86.21);
      middle.line(68.0908, 15.74); middle.curve(72.1108, 8.73, 67.0508, 0, 58.9708, 0); middle.path.closePath();
      const finalPiece = shape();
      finalPiece.move(86.1206, 44.23); finalPiece.line(66.0606, 44.23); finalPiece.line(41.8906, 86.21);
      finalPiece.curve(54.3006, 86.21, 65.7706, 79.58, 71.9606, 68.82); finalPiece.line(86.1206, 44.22); finalPiece.path.closePath();
      geometry = new T.ExtrudeGeometry([first.path, middle.path, finalPiece.path], { depth: 16, steps: 1, bevelEnabled: true, bevelThickness: 2.2, bevelSize: 1.5, bevelSegments: 6, curveSegments: 24 });
      geometry.center(); geometry.scale(0.034, 0.034, 0.034);
      material = new T.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.035, transmission: 1, thickness: 0.85, ior: 1.48, clearcoat: 1, clearcoatRoughness: 0.025, envMapIntensity: 0.65 });
      // Slight wavelength separation makes the bent letter edges catch colored light.
      material.onBeforeCompile = shader => {
        const split = `
          vec4 redTransmission = getIBLVolumeRefraction(n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90, pos, modelMatrix, viewMatrix, projectionMatrix, material.ior + 0.018, material.thickness, material.attenuationColor, material.attenuationDistance);
          vec4 blueTransmission = getIBLVolumeRefraction(n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90, pos, modelMatrix, viewMatrix, projectionMatrix, material.ior - 0.018, material.thickness, material.attenuationColor, material.attenuationDistance);
          transmitted.r = redTransmission.r;
          transmitted.b = blueTransmission.b;
        `;
        shader.fragmentShader = shader.fragmentShader.replace('#include <transmission_fragment>', T.ShaderChunk.transmission_fragment.replace('material.transmissionAlpha = mix(', split + '\nmaterial.transmissionAlpha = mix('));
      };
      material.customProgramCacheKey = () => 'navas-glass-dispersion-v1';
      const sculpture = new T.Mesh(geometry, material);
      sculpture.rotation.set(0.14, -0.3, -0.08);
      scene.add(sculpture);
      // WebGL cannot refract DOM text. Render the same letters onto a plane behind
      // the glass, aligned to their actual positions and using the loaded page font.
      const textCanvas = document.createElement('canvas');
      const textContext = textCanvas.getContext('2d');
      backdropTexture = new T.CanvasTexture(textCanvas);
      backdropTexture.colorSpace = T.SRGBColorSpace;
      backdrop = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: backdropTexture, toneMapped: false, depthWrite: false }));
      backdrop.position.z = -2;
      // Only include the cloned text in Three's offscreen transmission pass.
      // The visible page keeps its real DOM letters, so no rectangular copy can cover them.
      backdrop.onBeforeRender = currentRenderer => { backdrop.material.colorWrite = currentRenderer.getRenderTarget() !== null; };
      scene.add(backdrop);
      let alive = true;
      const syncLetters = () => {
        if (!alive) return;
        const rect = el.getBoundingClientRect();
        const stage = el.closest('.nv-intro__stage');
        const dpr = Math.min(window.devicePixelRatio, 1.5);
        textCanvas.width = Math.max(1, Math.round(rect.width * dpr));
        textCanvas.height = Math.max(1, Math.round(rect.height * dpr));
        textContext.setTransform(dpr, 0, 0, dpr, 0, 0);
        textContext.fillStyle = getComputedStyle(el.closest('.nv-intro')).backgroundColor;
        textContext.fillRect(0, 0, rect.width, rect.height);
        stage.querySelectorAll('.nv-intro__title > span').forEach(line => {
          const style = getComputedStyle(line), bounds = line.getBoundingClientRect();
          textContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          textContext.fillStyle = style.color;
          textContext.textBaseline = 'alphabetic';
          const text = line.textContent, metrics = textContext.measureText(text);
          const spacing = parseFloat(style.letterSpacing) || 0;
          const width = metrics.width + spacing * text.length;
          const ascent = metrics.fontBoundingBoxAscent || parseFloat(style.fontSize) * 0.8;
          const descent = metrics.fontBoundingBoxDescent || parseFloat(style.fontSize) * 0.2;
          const baseline = bounds.top - rect.top + (bounds.height - ascent - descent) / 2 + ascent;
          let x = bounds.left - rect.left + (bounds.width - width) / 2;
          Array.from(text).forEach(char => { textContext.fillText(char, x, baseline); x += textContext.measureText(char).width + spacing; });
        });
        backdropTexture.needsUpdate = true;
        const height = 2 * (camera.position.z - backdrop.position.z) * Math.tan(T.MathUtils.degToRad(camera.fov / 2));
        backdrop.scale.set(height * camera.aspect, height, 1);
      };
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      const pointer = { x: 0, y: 0 };
      let visible = true, frame = 0, last = 0, started = performance.now();
      const draw = time => {
        frame = 0;
        if (!visible || document.hidden) return;
        if (time - last >= 32 || reduced.matches) {
          last = time;
          const elapsed = (time - started) / 1000;
          sculpture.rotation.x = 0.14 + (reduced.matches ? 0 : Math.sin(elapsed * 0.26) * 0.14 + pointer.y * 0.12);
          sculpture.rotation.y = -0.3 + (reduced.matches ? 0 : Math.sin(elapsed * 0.32) * 0.38 + pointer.x * 0.18);
          renderer.render(scene, camera);
        }
        if (!reduced.matches) frame = requestAnimationFrame(draw);
      };
      const restart = () => { if (frame) cancelAnimationFrame(frame); frame = 0; if (visible && !document.hidden) frame = requestAnimationFrame(draw); };
      const resize = () => { renderer.setSize(el.clientWidth, el.clientHeight); camera.aspect = el.clientWidth / Math.max(1, el.clientHeight); camera.updateProjectionMatrix(); syncLetters(); renderer.render(scene, camera); };
      const move = e => { const rect = el.getBoundingClientRect(); pointer.x = Math.max(-1, Math.min(1, (e.clientX - rect.left) / rect.width * 2 - 1)); pointer.y = Math.max(-1, Math.min(1, (e.clientY - rect.top) / rect.height * 2 - 1)); };
      const resizeObserver = new ResizeObserver(resize);
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; restart(); });
      resizeObserver.observe(el); resizeObserver.observe(el.closest('.nv-intro__stage')); observer.observe(el);
      const lettersObserver = new MutationObserver(() => { syncLetters(); renderer.render(scene, camera); });
      lettersObserver.observe(el.closest('.nv-intro__stage').querySelector('h1'), { subtree: true, childList: true, characterData: true });
      const fontReady = () => { if (alive) { syncLetters(); renderer.render(scene, camera); } };
      document.fonts.ready.then(fontReady);
      document.fonts.addEventListener('loadingdone', fontReady);
      window.addEventListener('resize', fontReady);
      window.addEventListener('pointermove', move, { passive: true });
      document.addEventListener('visibilitychange', restart);
      reduced.addEventListener('change', restart);
      resize(); restart(); setRendered(true);
      return () => {
        alive = false; cancelAnimationFrame(frame); observer.disconnect(); resizeObserver.disconnect(); lettersObserver.disconnect();
        document.fonts.removeEventListener('loadingdone', fontReady); window.removeEventListener('resize', fontReady);
        window.removeEventListener('pointermove', move); document.removeEventListener('visibilitychange', restart); reduced.removeEventListener('change', restart);
        geometry.dispose(); material.dispose(); environment.dispose(); pmrem.dispose(); backdrop.geometry.dispose(); backdrop.material.dispose(); backdropTexture.dispose();
        panels.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
        renderer.dispose(); renderer.domElement.remove();
      };
    } catch {
      geometry?.dispose(); material?.dispose(); environment?.dispose(); pmrem?.dispose(); backdrop?.geometry.dispose(); backdrop?.material.dispose(); backdropTexture?.dispose();
      panels.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
      renderer?.dispose(); renderer?.domElement.remove();
    }
  }, []);
  return <div className="nv-intro__sculpture" aria-hidden="true">
    <div className="nv-intro__canvas" ref={mount} />
    {!rendered && <svg className="nv-intro__fallback" viewBox="-6 -6 99 99"><defs><linearGradient id="nv-glass-logo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff"/><stop offset=".4" stopColor="#bec6d0" stopOpacity=".55"/><stop offset=".6" stopColor="#fff" stopOpacity=".8"/><stop offset="1" stopColor="#9da9b9" stopOpacity=".5"/></linearGradient></defs><g fill="url(#nv-glass-logo)" stroke="#fff" strokeWidth=".7"><path d="M44.23 0H24.17L0 41.98H20.06L44.23 0Z"/><path d="M58.9708 0H57.0508L17.6108 68.81C13.1708 76.56 18.7608 86.21 27.6908 86.21L68.0908 15.74C72.1108 8.73 67.0508 0 58.9708 0Z"/><path d="M86.1206 44.23H66.0606L41.8906 86.21C54.3006 86.21 65.7706 79.58 71.9606 68.82L86.1206 44.22V44.23Z"/></g></svg>}
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
