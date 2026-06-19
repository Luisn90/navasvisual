// Página Home - Navas Visual
const { useState: useStateHome, useEffect: useEffectHome, useRef: useRefHome } = React;

function useGyroParallax() {
  const [offset, setOffset] = useStateHome({ x: 0, y: 0 });
  const smooth = useRefHome({ x: 0, y: 0 });
  const target = useRefHome({ x: 0, y: 0 });
  const raf    = useRefHome(null);
  const base   = useRefHome(null);

  useEffectHome(() => {
    let hasOrientation = false;

    // Primary: deviceorientation (gamma/beta)
    const onOrientation = (e) => {
      if (e.gamma === null && e.beta === null) return;
      hasOrientation = true;
      const g = e.gamma ?? 0;
      const b = e.beta  ?? 0;
      if (base.current === null) base.current = { x: g, y: b };
      target.current = {
        x: Math.max(-1, Math.min(1, (g - base.current.x) / 10)),
        y: Math.max(-1, Math.min(1, (b - base.current.y) / 10)),
      };
    };

    // Fallback: devicemotion (acceleration)
    const onMotion = (e) => {
      if (hasOrientation) return;
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      target.current = {
        x: Math.max(-1, Math.min(1, -(acc.x ?? 0) / 9)),
        y: Math.max(-1, Math.min(1,  (acc.y ?? 0) / 9)),
      };
    };

    const tick = () => {
      smooth.current.x += (target.current.x - smooth.current.x) * 0.12;
      smooth.current.y += (target.current.y - smooth.current.y) * 0.12;
      setOffset({ x: +smooth.current.x.toFixed(4), y: +smooth.current.y.toFixed(4) });
      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener('deviceorientation', onOrientation, true);
    window.addEventListener('devicemotion',      onMotion,      true);
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('deviceorientation', onOrientation, true);
      window.removeEventListener('devicemotion',      onMotion,      true);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return offset;
}

function HomeApp() {
  const { lang, setLang, t } = useI18n();
  const [loading, setLoading] = useStateHome(true);
  const [ready, setReady] = useStateHome(false);
  const [transPhase, setTransPhase] = useStateHome(null);
  const gyro = useGyroParallax();
  const { projects } = useProjects(t.work.items);
  const [selectedProject, setSelectedProject] = useStateHome(null);

  const layer = (strength) => ({
    transform: `translate(${gyro.x * strength}px, ${gyro.y * strength}px)`,
    willChange: 'transform',
  });

  // Gyro X (-1 a 1) → font-weight 100 a 900
  const gyroX = gyro.x;

  useEffectHome(() => {
    if (!loading) setTimeout(() => setReady(true), 100);
  }, [loading]);

  const navigate = (href) => {
    setTransPhase('out');
    setTimeout(() => { window.location.href = href; }, 600);
  };

  return (
    <React.Fragment>
      {loading && <Loader onDone={() => setLoading(false)} />}
      <Cursor />
      <PageTransition phase={transPhase} />
      <Nav active="home" lang={lang} setLang={setLang} t={t} ready={ready} onNavigate={navigate} />

      <main>
        {/* HERO */}
        <section className="nv-hero" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="nv-hero__grid" style={{ position: 'relative', zIndex: 1 }}>
            <div className="nv-hero__main">
              {/* Imagen — derecha en desktop, abajo en móvil */}
              <div className="nv-hero__img">
                <img src="assets/hero-image.jpg" alt="Composición escultórica" />
              </div>
              <div style={layer(6)}>
                <Eyebrow>{t.hero.eyebrow}</Eyebrow>
              </div>
              <div className="nv-hero__title">
                <h1 className="nv-h1">
                  <span><em>{t.hero.title_1}</em></span>
                  <span><em>{t.hero.title_2}</em></span>
                  <span><em>{t.hero.title_3}</em></span>
                </h1>
              </div>
              <div className="nv-hero__bottom" style={layer(8)}>
                <p className="nv-hero__lede">{t.hero.lede}</p>
                <div className="nv-hero__ctas">
                  <a href="work.html" onClick={(e) => { e.preventDefault(); navigate('work.html'); }} className="nv-btn nv-btn--primary">
                    {t.hero.cta_work}
                    <span className="nv-btn__arrow">↗</span>
                  </a>
                  <a href="contact.html" onClick={(e) => { e.preventDefault(); navigate('contact.html'); }} className="nv-btn nv-btn--ghost">
                    {t.hero.cta_contact}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="nv-hero__meta-strip" style={{ position: 'relative', zIndex: 1, ...layer(4) }}>
            <span>{lang === 'es' ? 'Disponible para nuevos proyectos' : 'Available for new projects'}</span>
            <span>{lang === 'es' ? 'Q2 — 2026' : 'Q2 — 2026'}</span>
            <span>{lang === 'es' ? 'Caracas, VEN' : 'Caracas, VEN'}</span>
            <span>↓</span>
          </div>
        </section>

        {/* MARQUEE */}
        <Marquee items={t.marquee} />

        {/* SERVICES */}
        <section className="nv-section nv-services">
          <div className="nv-container">
            <SectionHead eyebrow={t.services.eyebrow} title={t.services.title} lede={t.services.lede} />
            <div className="nv-svc-list reveal-stagger">
              {t.services.list.map((svc) => (
                <div className="nv-svc-row" key={svc.n}>
                  <span className="nv-svc-num">{svc.n}</span>
                  <span className="nv-svc-title">{svc.t}</span>
                  <span className="nv-svc-desc">{svc.d}</span>
                  <span className="nv-svc-arrow">↗</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WORK PREVIEW */}
        <section className="nv-section nv-section--soft nv-work">
          <div className="nv-container">
            <div className="nv-work__head reveal">
              <div className="nv-work__head-l">
                <Eyebrow>{t.work.eyebrow}</Eyebrow>
                <h2 className="nv-h2" style={{ marginTop: 16 }}>{t.work.title}</h2>
                <p className="nv-work__lede">{t.work.lede}</p>
              </div>
              <a href="work.html" onClick={(e) => { e.preventDefault(); navigate('work.html'); }} className="nv-btn nv-btn--ghost">
                {t.work.view_all} <span className="nv-btn__arrow">↗</span>
              </a>
            </div>
          </div>
          <WorkSlider projects={projects} lang={lang} onSelect={setSelectedProject} />
        </section>

        {/* PROCESS */}
        <section className="nv-section">
          <div className="nv-container">
            <SectionHead eyebrow={t.process.eyebrow} title={t.process.title} lede={t.process.lede} />
            <div className="nv-process__steps reveal-stagger">
              {t.process.steps.map((s) => (
                <div className="nv-process-step" key={s.n}>
                  <div>
                    <span className="nv-process-step__num">{s.n}</span>
                    <h3 className="nv-process-step__title">{s.t}</h3>
                  </div>
                  <p className="nv-process-step__desc">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer t={t} lang={lang} onNavigate={navigate} />
      <RevealMount />
      {selectedProject && (
        <ProjectModal project={selectedProject} lang={lang} onClose={() => setSelectedProject(null)} />
      )}
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<HomeApp />);
