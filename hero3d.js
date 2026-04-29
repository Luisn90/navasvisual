// === HERO 3D SCENE ===
// Esfera blanca, cubo negro con N, anillo metálico, panel blanco
// Reacciona a mouse y giroscopio

window.Hero3D = (function() {

  function init(container, inputRef) {
    if (!window.THREE) return;
    const THREE = window.THREE;

    const W = container.offsetWidth;
    const H = container.offsetHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.set(0, 0.5, 7);

    // ---- LIGHTS ----
    // Key light (studio left-top)
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.5);
    keyLight.position.set(-4, 6, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width  = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far  = 20;
    keyLight.shadow.camera.left   = -5;
    keyLight.shadow.camera.right  =  5;
    keyLight.shadow.camera.top    =  5;
    keyLight.shadow.camera.bottom = -5;
    keyLight.shadow.radius = 8;
    scene.add(keyLight);

    // Fill light (right, soft)
    const fillLight = new THREE.DirectionalLight(0xf0f4ff, 1.2);
    fillLight.position.set(5, 2, 2);
    scene.add(fillLight);

    // Back/rim light
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
    rimLight.position.set(0, -2, -4);
    scene.add(rimLight);

    // Ambient
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    // ---- MATERIALS ----
    // White matte (sphere, panel)
    const matWhite = new THREE.MeshStandardMaterial({
      color: 0xf0f0f0,
      roughness: 0.35,
      metalness: 0.0,
    });

    // Black matte (cube)
    const matBlack = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.5,
      metalness: 0.1,
    });

    // Chrome ring
    const matChrome = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.05,
      metalness: 1.0,
      envMapIntensity: 2.0,
    });

    // Floor (receives shadows)
    const matFloor = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.9,
      metalness: 0.0,
    });

    // ---- OBJECTS ----
    const group = new THREE.Group();
    scene.add(group);

    // Floor plane
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floor = new THREE.Mesh(floorGeo, matFloor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.6;
    floor.receiveShadow = true;
    scene.add(floor);

    // Back wall
    const wallGeo = new THREE.PlaneGeometry(20, 10);
    const wall = new THREE.Mesh(wallGeo, matFloor);
    wall.position.set(0, 2, -4);
    wall.receiveShadow = true;
    scene.add(wall);

    // 1. Panel blanco inclinado (back-right)
    const panelGeo = new THREE.BoxGeometry(2.2, 3.0, 0.08);
    const panel = new THREE.Mesh(panelGeo, matWhite);
    panel.position.set(1.2, 0.2, -0.5);
    panel.rotation.y = -0.3;
    panel.rotation.z =  0.05;
    panel.castShadow = true;
    panel.receiveShadow = true;
    group.add(panel);

    // 2. Cubo negro con "N"
    const cubeGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
    const cube = new THREE.Mesh(cubeGeo, matBlack);
    cube.position.set(0.3, -0.35, 0.4);
    cube.rotation.y = 0.3;
    cube.castShadow = true;
    cube.receiveShadow = true;
    group.add(cube);

    // "N" embossed on cube front face — using canvas texture
    const nCanvas = document.createElement('canvas');
    nCanvas.width = 256; nCanvas.height = 256;
    const nCtx = nCanvas.getContext('2d');
    nCtx.fillStyle = '#111111';
    nCtx.fillRect(0, 0, 256, 256);
    nCtx.fillStyle = '#1a1a1a';
    nCtx.font = 'bold 160px serif';
    nCtx.textAlign = 'center';
    nCtx.textBaseline = 'middle';
    nCtx.fillText('N', 128, 135);
    const nTex = new THREE.CanvasTexture(nCanvas);
    const matCubeFront = new THREE.MeshStandardMaterial({
      color: 0x111111, roughness: 0.5, metalness: 0.1, map: nTex,
    });
    // Apply per-face materials
    const cubeMats = [matBlack, matBlack, matBlack, matBlack, matCubeFront, matBlack];
    cube.material = cubeMats;

    // 3. Esfera blanca (top-center)
    const sphereGeo = new THREE.SphereGeometry(0.72, 64, 64);
    const sphere = new THREE.Mesh(sphereGeo, matWhite);
    sphere.position.set(-0.1, 0.8, 0.6);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    group.add(sphere);

    // 4. Anillo metálico (front-right)
    const ringGeo = new THREE.TorusGeometry(0.65, 0.055, 32, 128);
    const ring = new THREE.Mesh(ringGeo, matChrome);
    ring.position.set(0.9, -0.4, 1.0);
    ring.rotation.x = Math.PI / 2 - 0.4;
    ring.rotation.z = 0.3;
    ring.castShadow = true;
    ring.receiveShadow = true;
    group.add(ring);

    // ---- ENV MAP for reflections ----
    const pmremGen = new THREE.PMREMGenerator(renderer);
    pmremGen.compileEquirectangularShader();
    // Simple procedural env
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0xf0f0f0);
    const envTex = pmremGen.fromScene(new THREE.RoomEnvironment()).texture;
    scene.environment = envTex;
    pmremGen.dispose();

    // ---- MOUSE / GYRO ----
    const mouse = { x: 0, y: 0 };
    const smooth = { x: 0, y: 0 };

    const onMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onOrientation = (e) => {
      if (e.gamma === null) return;
      mouse.x = Math.max(-1, Math.min(1, (e.gamma || 0) / 25));
      mouse.y = Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 25));
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('deviceorientation', onOrientation, true);

    // ---- ANIMATION ----
    let frameId;
    const clock = new THREE.Clock();

    function animate() {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Lerp mouse
      smooth.x += (mouse.x - smooth.x) * 0.05;
      smooth.y += (mouse.y - smooth.y) * 0.05;

      // Group reacts to mouse — subtle parallax
      group.rotation.y = smooth.x * 0.18;
      group.rotation.x = smooth.y * -0.10;

      // Individual floating animations
      sphere.position.y = 0.8 + Math.sin(t * 0.7) * 0.06;
      ring.rotation.z   = 0.3 + Math.sin(t * 0.5) * 0.08;
      ring.rotation.x   = (Math.PI / 2 - 0.4) + Math.cos(t * 0.4) * 0.04;

      // Key light follows mouse subtly
      keyLight.position.x = -4 + smooth.x * 1.5;
      keyLight.position.y =  6 + smooth.y * -1.0;

      renderer.render(scene, camera);
    }
    animate();

    // ---- RESIZE ----
    const onResize = () => {
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ---- CLEANUP ----
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('deviceorientation', onOrientation, true);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }

  return { init };
})();
