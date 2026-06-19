// Componentes compartidos para Navas Visual
const { useState, useEffect, useRef, useMemo } = React;

// === HOOKS ===
function useI18n() {
  const [lang, setLang] = useState(() => localStorage.getItem('nv-lang') || 'es');
  useEffect(() => { localStorage.setItem('nv-lang', lang); document.documentElement.lang = lang; }, [lang]);
  const t = window.NV_I18N[lang];
  return { lang, setLang, t };
}

// === SUPABASE (proyectos) ===
const NV_SUPABASE_URL = 'https://kzbhybcyjjqupojuakuw.supabase.co';
const NV_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Ymh5YmN5ampxdXBvanVha3V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjc5MzMsImV4cCI6MjA5NDcwMzkzM30.K0ICrpd3gf9WCout5_NbegpaU6Ds8QEBppRqXIqJ-AI';

function getNvSupabase() {
  if (!window._nvSupabaseClient && window.supabase) {
    window._nvSupabaseClient = window.supabase.createClient(NV_SUPABASE_URL, NV_SUPABASE_KEY);
  }
  return window._nvSupabaseClient;
}

// Carga proyectos publicados desde Supabase. Si falla o no hay datos, usa
// el fallback estático de i18n (t.work.items) para que la web nunca quede vacía.
function useProjects(fallbackItems) {
  const [projects, setProjects] = useState(null); // null = cargando
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = getNvSupabase();
        if (!sb) throw new Error('Supabase client not available');
        const { data, error } = await sb
          .from('projects')
          .select('*')
          .eq('published', true)
          .order('order_index', { ascending: true });
        if (error) throw error;
        if (!cancelled) {
          if (data && data.length > 0) {
            setProjects(data.map(p => ({
              client: p.client || '',
              project: p.title,
              year: p.year || '',
              tag: p.category,
              image: p.image_url || null,
              description: p.description || '',
              url: p.project_url || '',
              gallery: Array.isArray(p.gallery) ? p.gallery : [],
            })));
          } else {
            setProjects(fallbackItems);
          }
        }
      } catch (err) {
        console.warn('useProjects: fallback a datos estáticos', err);
        if (!cancelled) setProjects(fallbackItems);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { projects: projects || fallbackItems || [], loading };
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-stagger');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// === LOADER ===
function Loader({ onDone }) {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const dur = 1800;
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * 100));
      if (p < 1) raf = requestAnimationFrame(step);
      else {
        setTimeout(() => { setDone(true); setTimeout(onDone, 900); }, 280);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className={`nv-loader ${done ? 'done' : ''}`}>
      <div className="nv-loader__top">
        <LogoSVG color="white" size={36} />
        <span>2026</span>
      </div>
      <div>
        <div className="nv-loader__count">
          {String(count).padStart(3, '0')}<small>%</small>
        </div>
      </div>
      <div className="nv-loader__bottom">
        <span>Loading studio</span>
        <span>VEN · ES/EN</span>
      </div>
      <div className="nv-loader__bar" style={{ width: `${count}%` }} />
    </div>
  );
}

// === LOGO SVG ===
const LogoSVG = ({ color = 'black', size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 87 87" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M44.23 0H24.17L0 41.98H20.06L44.23 0Z" fill={color}/>
    <path d="M58.9708 0H57.0508L17.6108 68.81C13.1708 76.56 18.7608 86.21 27.6908 86.21L68.0908 15.74C72.1108 8.73 67.0508 0 58.9708 0Z" fill={color}/>
    <path d="M86.1206 44.23H66.0606L41.8906 86.21C54.3006 86.21 65.7706 79.58 71.9606 68.82L86.1206 44.22V44.23Z" fill={color}/>
  </svg>
);
function Nav({ active, lang, setLang, t, ready, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { k: 'home', href: 'index.html' },
    { k: 'work', href: 'work.html' },
    { k: 'about', href: 'about.html' },
    { k: 'contact', href: 'contact.html' },
  ];

  const handleNav = (href) => {
    setMenuOpen(false);
    setTimeout(() => onNavigate(href), 80);
  };

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <nav className={`nv-nav ${ready ? 'ready' : ''}`}>
        <div className="nv-nav__inner">
          <a href="index.html" onClick={(e) => { e.preventDefault(); handleNav('index.html'); }} className="nv-nav__logo">
            <LogoSVG size={28} />
          </a>
          <div className="nv-nav__links">
            {links.slice(1).map(l => (
              <a key={l.k}
                 href={l.href}
                 onClick={(e) => { e.preventDefault(); handleNav(l.href); }}
                 className={`nv-nav__link ${active === l.k ? 'active' : ''}`}>
                {t.nav[l.k]}
              </a>
            ))}
          </div>
          <div className="nv-nav__right">
            <div className="nv-lang">
              <button className={lang === 'es' ? 'active' : ''} onClick={() => setLang('es')}>ES</button>
              <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
            </div>
            <a href="contact.html" onClick={(e) => { e.preventDefault(); handleNav('contact.html'); }} className="nv-nav__cta nv-nav__cta--desktop">
              <span className="nv-nav__cta-dot" />
              {lang === 'es' ? 'Disponible' : 'Available'}
            </a>
            {/* Hamburger button — only mobile */}
            <button
              className={`nv-hamburger ${menuOpen ? 'open' : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menú"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div className={`nv-drawer ${menuOpen ? 'open' : ''}`}>
        <div className="nv-drawer__inner">
          <nav className="nv-drawer__links">
            {links.map((l, i) => (
              <a
                key={l.k}
                href={l.href}
                className={`nv-drawer__link ${active === l.k ? 'active' : ''}`}
                style={{ transitionDelay: menuOpen ? `${i * 0.07}s` : '0s' }}
                onClick={(e) => { e.preventDefault(); handleNav(l.href); }}
              >
                <span className="nv-drawer__link-num">0{i + 1}</span>
                <span className="nv-drawer__link-text">{t.nav[l.k] || 'Home'}</span>
                <span className="nv-drawer__link-arrow">↗</span>
              </a>
            ))}
          </nav>
          <div className="nv-drawer__footer">
            <div className="nv-lang">
              <button className={lang === 'es' ? 'active' : ''} onClick={() => setLang('es')}>ES</button>
              <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
            </div>
            <a href="contact.html" onClick={(e) => { e.preventDefault(); handleNav('contact.html'); }} className="nv-nav__cta">
              <span className="nv-nav__cta-dot" />
              {lang === 'es' ? 'Disponible' : 'Available'}
            </a>
          </div>
        </div>
      </div>
      {/* Backdrop */}
      {menuOpen && <div className="nv-drawer__backdrop" onClick={() => setMenuOpen(false)} />}
    </>
  );
}

// === FOOTER ===
function Footer({ t, lang, onNavigate }) {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      // Venezuela = UTC-4
      const vt = new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + (-4 * 3600000));
      setTime(vt.toTimeString().slice(0, 8) + ' VET');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="nv-footer nv-snap--footer">
      <div className="nv-container">
        <div className="nv-footer__cta">
          <a href="contact.html" onClick={(e) => { e.preventDefault(); onNavigate('contact.html'); }}>
            {t.footer.cta}
          </a>
        </div>
        <div className="nv-footer__cols">
          <div className="nv-footer__col">
            <h4>{lang === 'es' ? 'Estudio' : 'Studio'}</h4>
            <ul>
              <li><a href="about.html" onClick={(e) => { e.preventDefault(); onNavigate('about.html'); }}>{t.nav.about}</a></li>
              <li><a href="work.html" onClick={(e) => { e.preventDefault(); onNavigate('work.html'); }}>{t.nav.work}</a></li>
              <li><a href="contact.html" onClick={(e) => { e.preventDefault(); onNavigate('contact.html'); }}>{t.nav.contact}</a></li>
            </ul>
          </div>
          <div className="nv-footer__col">
            <h4>{lang === 'es' ? 'Redes' : 'Social'}</h4>
            <ul>
              <li><a href="#">Instagram</a></li>
              <li><a href="#">Behance</a></li>
              <li><a href="#">LinkedIn</a></li>
            </ul>
          </div>
          <div className="nv-footer__col">
            <h4>{lang === 'es' ? 'Contacto' : 'Contact'}</h4>
            <ul>
              <li><a href="mailto:hola@navasvisual.com">hola@navasvisual.com</a></li>
              <li>{time}</li>
            </ul>
          </div>
        </div>
        <div className="nv-footer__bottom">
          <span>{t.footer.copy}</span>
          <span>{t.footer.build}</span>
        </div>
      </div>
    </footer>
  );
}

// === PAGE TRANSITION (CSS only - reliable) ===
function PageTransition({ phase }) {
  if (!phase) return null;
  return (
    <div className={`nv-page-trans ${phase}`}>
      <div className="nv-page-trans__mark"><LogoSVG color="white" size={40} /></div>
    </div>
  );
}

// === CUSTOM CURSOR ===
function Cursor() {
  useEffect(() => {
    const el = document.createElement('div');
    el.className = 'nv-cursor';
    document.body.appendChild(el);
    let x = 0, y = 0, tx = 0, ty = 0;
    const onMove = (e) => {
      tx = e.clientX; ty = e.clientY;
      el.classList.add('visible');
      const target = e.target;
      const isHover = target.closest('a, button, .nv-svc-row, .nv-faq-item, .nv-work-card, .nv-process-step');
      el.classList.toggle('hover', !!isHover);
    };
    const tick = () => {
      x += (tx - x) * 0.22; y += (ty - y) * 0.22;
      el.style.left = x + 'px'; el.style.top = y + 'px';
      requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', () => el.classList.remove('visible'));
    tick();
    return () => { window.removeEventListener('mousemove', onMove); el.remove(); };
  }, []);
  return null;
}

// === MARQUEE ===
function Marquee({ items }) {
  const repeated = [...items, ...items, ...items];
  return (
    <section className="nv-marquee" aria-hidden="true">
      <div className="nv-marquee__track">
        {repeated.map((it, i) => (
          <div className="nv-marquee__item" key={i}>{it}</div>
        ))}
      </div>
    </section>
  );
}

// === EYEBROW ===
function Eyebrow({ children }) {
  return <span className="nv-eyebrow">{children}</span>;
}

// === SECTION HEAD (eyebrow + title + lede) ===
function SectionHead({ eyebrow, title, lede, right, layout = 'split' }) {
  return (
    <div className={`nv-services__head reveal-stagger`}>
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="nv-h2" style={{ marginTop: 16 }}>{title}</h2>
      </div>
      <div>
        {lede && <p className="nv-services__lede">{lede}</p>}
        {right}
      </div>
    </div>
  );
}

// === VARIABLE FONT TITLE ===
function VarTitle({ children, className = '', style = {}, gyroX = 0 }) {
  const [weight, setWeight] = React.useState(500);
  const isMobile = window.matchMedia('(hover: none)').matches;
  const currentWeight = React.useRef(500);
  const targetWeight  = React.useRef(500);
  const raf = React.useRef(null);

  React.useEffect(() => {
    if (isMobile) return;

    const onMove = (e) => {
      const relX = e.clientX / window.innerWidth; // 0 (left) → 1 (right)
      targetWeight.current = Math.round(100 + relX * 500);
    };

    const tick = () => {
      // Smooth lerp — 0.12 = fast but fluid
      currentWeight.current += (targetWeight.current - currentWeight.current) * 0.12;
      const w = Math.round(currentWeight.current);
      setWeight(w);
      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove);
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf.current);
    };
  }, [isMobile]);

  // Mobile: gyroX (-1 to 1) → weight 100-600
  React.useEffect(() => {
    if (!isMobile) return;
    setWeight(Math.round(100 + ((gyroX + 1) / 2) * 500));
  }, [gyroX, isMobile]);

  return (
    <span
      className={`nv-var-title ${className}`}
      style={{
        fontWeight: weight,
        fontVariationSettings: `'wght' ${weight}`,
        display: 'block',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// === HERO 3D SCENE ===
function Hero3DScene() {
  const mountRef = React.useRef(null);

  React.useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const tryInit = () => {
      if (window.THREE && window.Hero3D) {
        return window.Hero3D.init(el);
      }
    };

    let cleanup;
    if (window.THREE && window.Hero3D) {
      cleanup = tryInit();
    } else {
      const interval = setInterval(() => {
        if (window.THREE && window.Hero3D) {
          clearInterval(interval);
          cleanup = tryInit();
        }
      }, 50);
      return () => clearInterval(interval);
    }
    return () => { if (cleanup) cleanup(); };
  }, []);

  return (
    <div ref={mountRef} style={{
      position: 'absolute',
      top: 0, right: 0,
      width: '58%',
      height: '100%',
      zIndex: 1,
      pointerEvents: 'none',
    }} />
  );
}

// === DOT GRID (Three.js) ===
function DotGrid() {
  const mountRef = React.useRef(null);

  React.useEffect(() => {
    if (!window.THREE) return;
    const el = mountRef.current;
    if (!el) return;

    const W = el.offsetWidth, H = el.offsetHeight;
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // Build dot grid
    const COLS = 28, ROWS = 16;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const baseY = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = (c / (COLS - 1) - 0.5) * 9;
        const y = (r / (ROWS - 1) - 0.5) * 5;
        positions.push(x, y, 0);
        baseY.push(y);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.045,
      transparent: true,
      opacity: 0.5,
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Mouse / gyro tracking
    const mouse = { x: 0, y: 0 };
    const onMouseMove = (e) => {
      mouse.x =  (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onOrientation = (e) => {
      if (e.gamma === null) return;
      mouse.x = Math.max(-1, Math.min(1, (e.gamma || 0) / 30));
      mouse.y = Math.max(-1, Math.min(1, ((e.beta  || 0) - 45) / 30));
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('deviceorientation', onOrientation, true);

    let frame;
    const clock = new THREE.Clock();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const pos = geometry.attributes.position;

      for (let i = 0; i < COLS * ROWS; i++) {
        const x = pos.getX(i);
        const y = baseY[i];
        // Wave based on distance to mouse
        const mx = mouse.x * 4.5;
        const my = mouse.y * 2.5;
        const dist = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
        const wave = Math.sin(dist * 1.5 - t * 2) * 0.18;
        const lift = Math.max(0, 1 - dist / 2.5) * 0.4;
        pos.setZ(i, wave + lift);
        // Opacity via material not per-point, so just animate lift
      }
      pos.needsUpdate = true;

      // Subtle camera drift
      camera.position.x += (mouse.x * 0.3 - camera.position.x) * 0.05;
      camera.position.y += (mouse.y * 0.2 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = el.offsetWidth, h = el.offsetHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('deviceorientation', onOrientation, true);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={mountRef} style={{
      position: 'absolute', inset: 0,
      zIndex: 0, pointerEvents: 'none',
    }} />
  );
}

// === TILT CARD ===
function TiltCard({ children, className = '', style = {}, ...rest }) {
  const ref = React.useRef(null);
  const raf = React.useRef(null);
  const current = React.useRef({ rx: 0, ry: 0, shine: { x: 50, y: 50 } });
  const target  = React.useRef({ rx: 0, ry: 0, shine: { x: 50, y: 50 } });
  const [transform, setTransform] = React.useState('');
  const [shine, setShine] = React.useState({ x: 50, y: 50 });

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top)  / rect.height;
      target.current = {
        rx:  (y - 0.5) * -12,  // -6 to 6 deg
        ry:  (x - 0.5) *  12,
        shine: { x: x * 100, y: y * 100 },
      };
    };

    const onLeave = () => {
      target.current = { rx: 0, ry: 0, shine: { x: 50, y: 50 } };
    };

    const tick = () => {
      const c = current.current;
      const t = target.current;
      c.rx += (t.rx - c.rx) * 0.1;
      c.ry += (t.ry - c.ry) * 0.1;
      c.shine.x += (t.shine.x - c.shine.x) * 0.1;
      c.shine.y += (t.shine.y - c.shine.y) * 0.1;
      setTransform(`perspective(800px) rotateX(${c.rx.toFixed(2)}deg) rotateY(${c.ry.toFixed(2)}deg) scale3d(1.02,1.02,1.02)`);
      setShine({ x: +c.shine.x.toFixed(1), y: +c.shine.y.toFixed(1) });
      raf.current = requestAnimationFrame(tick);
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    raf.current = requestAnimationFrame(tick);

    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      {...rest}
      style={{
        ...style,
        transform,
        transformStyle: 'preserve-3d',
        transition: 'box-shadow 0.3s ease',
        willChange: 'transform',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {children}
      {/* Specular shine */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.12) 0%, transparent 60%)`,
        borderRadius: 'inherit',
      }} />
    </div>
  );
}

// === PROJECT MODAL (lightbox de caso de estudio) ===
function ProjectModal({ project, lang, onClose }) {
  const [closing, setClosing] = useState(false);
  const [slide, setSlide] = useState(0);

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 280); // debe coincidir con la duración de la animación de salida en CSS
  };

  const images = project ? [project.image, ...(project.gallery || [])].filter(Boolean) : [];

  const prevSlide = () => setSlide((s) => (s - 1 + images.length) % images.length);
  const nextSlide = () => setSlide((s) => (s + 1) % images.length);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose();
      if (e.key === 'ArrowLeft' && images.length > 1) prevSlide();
      if (e.key === 'ArrowRight' && images.length > 1) nextSlide();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [images.length]);

  if (!project) return null;

  return (
    <div
      onClick={requestClose}
      className={`nv-modal-overlay ${closing ? 'nv-modal-overlay--out' : 'nv-modal-overlay--in'}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`nv-modal-box ${closing ? 'nv-modal-box--out' : 'nv-modal-box--in'}`}
      >
        <button
          onClick={requestClose}
          aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
          style={{
            position: 'absolute', top: 16, right: 16, zIndex: 3,
            width: 40, height: 40, borderRadius: '50%', border: 'none',
            background: 'var(--bg)', color: 'var(--fg)', cursor: 'pointer',
            fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          }}
        >
          ✕
        </button>

        <div style={{ position: 'relative', width: '100%', paddingTop: '62%', background: 'var(--bg-line)', overflow: 'hidden' }}>
          {images.map((src, i) => (
            <img
              key={src + i}
              src={src}
              alt={`${project.project} ${i + 1}`}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                opacity: i === slide ? 1 : 0,
                transition: 'opacity 0.4s var(--easing)',
                pointerEvents: i === slide ? 'auto' : 'none',
              }}
            />
          ))}

          {images.length > 1 && (
            <React.Fragment>
              <button
                onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                aria-label={lang === 'es' ? 'Anterior' : 'Previous'}
                className="nv-modal-carousel__arrow nv-modal-carousel__arrow--prev"
              >
                ←
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                aria-label={lang === 'es' ? 'Siguiente' : 'Next'}
                className="nv-modal-carousel__arrow nv-modal-carousel__arrow--next"
              >
                →
              </button>

              <div className="nv-modal-carousel__counter">{slide + 1} / {images.length}</div>

              <div className="nv-modal-carousel__dots">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setSlide(i); }}
                    aria-label={`${lang === 'es' ? 'Imagen' : 'Image'} ${i + 1}`}
                    className={`nv-modal-carousel__dot ${i === slide ? 'is-active' : ''}`}
                  />
                ))}
              </div>
            </React.Fragment>
          )}
        </div>

        <div style={{ padding: '32px 36px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{project.project}</h3>
              <div style={{ color: 'var(--fg-muted)', fontSize: 14, marginTop: 6 }}>
                {[project.client, project.year].filter(Boolean).join(' · ')}
              </div>
            </div>
            {project.tag && (
              <span style={{
                fontSize: 12, padding: '6px 14px', borderRadius: 999,
                border: '1px solid var(--bg-line)', color: 'var(--fg-muted)', whiteSpace: 'nowrap',
              }}>
                {project.tag}
              </span>
            )}
          </div>

          {project.description && (
            <p style={{ marginTop: 24, fontSize: 15, lineHeight: 1.7, color: 'var(--fg-muted)', maxWidth: 640 }}>
              {project.description}
            </p>
          )}

          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="nv-btn nv-btn--primary"
              style={{ marginTop: 28, display: 'inline-flex' }}
            >
              {lang === 'es' ? 'Visitar sitio' : 'Visit site'}
              <span className="nv-btn__arrow">↗</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// === REVEAL HOOK COMPONENT ===
function RevealMount() { useReveal(); return null; }

// Export to window
Object.assign(window, {
  useI18n, useReveal, useProjects,
  Loader, Nav, Footer, PageTransition, Cursor, Marquee, Eyebrow, SectionHead, RevealMount, VarTitle, TiltCard, DotGrid, Hero3DScene, ProjectModal
});
