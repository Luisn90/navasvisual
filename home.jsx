// Página Home - Navas Visual
const { useState: useStateHome, useEffect: useEffectHome, useRef: useRefHome } = React;

function useGyroParallax() {
  const [offset, setOffset] = useStateHome({ x: 0, y: 0 });
  const smooth = useRefHome({ x: 0, y: 0 });
  const target = useRefHome({ x: 0, y: 0 });
  const raf    = useRefHome(null);
  const base   = useRefHome(null);

  useEffectHome(() => {
    const onOrientation = (e) => {
      const g = e.gamma ?? 0; // left/right: -90 to 90
      const b = e.beta  ?? 0; // front/back: -180 to 180

      if (base.current === null) base.current = { x: g, y: b };

      target.current = {
        x: Math.max(-1, Math.min(1, (g - base.current.x) / 20)),
        y: Math.max(-1, Math.min(1, (b - base.current.y) / 20)),
      };
    };

    const tick = () => {
      smooth.current.x += (target.current.x - smooth.current.x) * 0.12;
      smooth.current.y += (target.current.y - smooth.current.y) * 0.12;
      setOffset({ x: +smooth.current.x.toFixed(4), y: +smooth.current.y.toFixed(4) });
      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener('deviceorientation', onOrientation, true);
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('deviceorientation', onOrientation, true);
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
  const [debug, setDebug] = useStateHome({ gamma: 'esperando...', beta: 'esperando...', x: 0, y: 0 });
  const gyro = useGyroParallax();

  // Debug: escuchar raw también
  useEffectHome(() => {
    const onOri = (e) => {
      setDebug({
        gamma: (e.gamma ?? 0).toFixed(2),
        beta:  (e.beta  ?? 0).toFixed(2),
        x: gyro.x.toFixed(3),
        y: gyro.y.toFixed(3),
      });
    };
    window.addEventListener('deviceorientation', onOri, true);
    return () => window.removeEventListener('deviceorientation', onOri, true);
  }, []);

  const layer = (strength) => ({
    transform: `translate(${gyro.x * strength}px, ${gyro.y * strength}px)`,
    willChange: 'transform',
  });

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
        <section className="nv-hero">
          <div className="nv-hero__grid">
            <div className="nv-hero__main">
              <div style={layer(6)}>
                <Eyebrow>{t.hero.eyebrow}</Eyebrow>
              </div>
              <div className="nv-hero__title" style={layer(14)}>
                <h1 className="nv-h1">
                  <span><em>{t.hero.title_1}</em></span>
                  <span><em className="nv-hero__title-2">{t.hero.title_2}</em></span>
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

            <div className="nv-hero__sidebar" style={layer(10)}>
              <div className="nv-card">
                <div className="nv-meta">
                  <span className="nv-meta__label">{lang === 'es' ? 'Disciplina' : 'Discipline'}</span>
                  <span className="nv-meta__value">{t.hero.meta_role}</span>
                </div>
              </div>
              <div className="nv-card">
                <div className="nv-meta">
                  <span className="nv-meta__label">{lang === 'es' ? 'Ubicación' : 'Location'}</span>
                  <span className="nv-meta__value">{t.hero.meta_loc}</span>
                </div>
              </div>
              <div className="nv-card nv-card--solid">
                <div className="nv-meta">
                  <span className="nv-meta__label" style={{ color: 'rgba(255,255,255,0.5)' }}>{lang === 'es' ? 'Fundado' : 'Founded'}</span>
                  <span className="nv-meta__value">{t.hero.meta_year}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="nv-hero__meta-strip" style={layer(4)}>
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
            <div className="nv-work-grid reveal-stagger">
              {t.work.items.slice(0, 4).map((w, i) => {
                const cls = i === 0 ? 'nv-work-card--lg' : 'nv-work-card--md';
                return (
                  <div className={`nv-work-card ${cls}`} key={i}>
                    <div className="nv-work-card__media">
                      <div className={`nv-ph nv-ph--${i + 1}`}>
                        <span className="nv-ph__label">[{lang === 'es' ? 'imagen del proyecto' : 'project image'}]</span>
                      </div>
                      <div className="nv-work-card__overlay" />
                    </div>
                    <div className="nv-work-card__info">
                      <div>
                        <div className="nv-work-card__title">{w.project}</div>
                        <div className="nv-work-card__client">{w.client} · {w.year}</div>
                      </div>
                      <span className="nv-work-card__tag">{w.tag}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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

      {/* DEBUG GYRO — borrar después */}
      <div style={{
        position: 'fixed', bottom: 16, left: 16, right: 16,
        background: 'rgba(0,0,0,0.85)', color: '#0f0',
        fontFamily: 'monospace', fontSize: 13, padding: 12,
        borderRadius: 10, zIndex: 99999, lineHeight: 1.8,
        pointerEvents: 'none',
      }}>
        <div>📱 Gyro debug</div>
        <div>gamma (izq/der): <b>{debug.gamma}°</b></div>
        <div>beta  (frente): <b>{debug.beta}°</b></div>
        <div>offset x: <b>{debug.x}</b></div>
        <div>offset y: <b>{debug.y}</b></div>
      </div>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<HomeApp />);
