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
                <img src="assets/hero-premium.webp" alt="Composición escultórica en mármol y travertino" />
              </div>
              <div style={layer(6)}>
                <Eyebrow>{t.hero.eyebrow}</Eyebrow>
              </div>
              <div className="nv-hero__title">
                <h1 className="nv-h1">
                  <span><em>{t.hero.title_1}</em></span>
                  <span><em className="nv-serif">{t.hero.title_2}</em></span>
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
                  <a href="#" onClick={(e) => { e.preventDefault(); openWhatsApp(); }} className="nv-btn nv-btn--ghost">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.66 15L2 22l5.16-1.32A10 10 0 1 0 12 2Zm5.46 14.12c-.23.65-1.35 1.24-1.86 1.28-.5.05-1.13.24-3.8-.79-3.2-1.26-5.26-4.52-5.42-4.73-.16-.21-1.3-1.73-1.3-3.3s.82-2.34 1.11-2.66c.29-.32.63-.4.84-.4h.6c.2 0 .46-.07.72.55.27.64.9 2.21.98 2.37.08.16.13.35.03.56-.11.21-.16.34-.32.53-.16.19-.34.42-.48.56-.16.16-.33.34-.14.66.19.32.83 1.37 1.79 2.22 1.23 1.1 2.26 1.44 2.58 1.6.32.16.51.13.7-.08.19-.21.8-.93 1.01-1.25.21-.32.43-.27.72-.16.29.11 1.85.87 2.17 1.03.32.16.53.24.61.37.08.14.08.79-.16 1.44Z"/></svg>
                    {t.hero.cta_contact}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="nv-hero__meta-strip" style={{ position: 'relative', zIndex: 1, ...layer(4) }}>
            <span>{lang === 'es' ? 'Disponible · Q3 — 2026' : 'Available · Q3 — 2026'}</span>
            {(t.hero.proof || []).map((p, i) => (
              <span key={i} className="nv-meta-strip__proof">{p}</span>
            ))}
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
        {/* TESTIMONIALS — solo se muestra con testimonios reales en i18n.js */}
        {t.testimonials && t.testimonials.items.length > 0 && (
          <section className="nv-section nv-section--soft">
            <div className="nv-container">
              <SectionHead eyebrow={t.testimonials.eyebrow} title={t.testimonials.title} />
              <div className="nv-testimonials reveal-stagger">
                {t.testimonials.items.map((tm, i) => (
                  <figure className="nv-testimonial" key={i}>
                    <blockquote className="nv-testimonial__quote">“{tm.quote}”</blockquote>
                    <figcaption className="nv-testimonial__meta">
                      <span className="nv-testimonial__name">{tm.name}</span>
                      <span className="nv-testimonial__role">{tm.role}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA BAND */}
        <section className="nv-section nv-cta-band">
          <div className="nv-container nv-cta-band__inner reveal">
            <h2 className="nv-h2">
              {t.cta_band.title_1}{' '}
              <span className="nv-serif">{t.cta_band.title_2}</span>
            </h2>
            <p className="nv-cta-band__lede">{t.cta_band.lede}</p>
            <div className="nv-hero__ctas nv-cta-band__ctas">
              <button onClick={() => openWhatsApp()} className="nv-btn nv-btn--light">
                {t.cta_band.cta_primary}
                <span className="nv-btn__arrow">↗</span>
              </button>
              <a href="contact.html" onClick={(e) => { e.preventDefault(); navigate('contact.html'); }} className="nv-btn nv-btn--ghost-light">
                {t.cta_band.cta_secondary}
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Botón flotante de WhatsApp */}
      <button
        className="nv-float-wa"
        aria-label="WhatsApp"
        onClick={() => openWhatsApp()}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.66 15L2 22l5.16-1.32A10 10 0 1 0 12 2Zm5.46 14.12c-.23.65-1.35 1.24-1.86 1.28-.5.05-1.13.24-3.8-.79-3.2-1.26-5.26-4.52-5.42-4.73-.16-.21-1.3-1.73-1.3-3.3s.82-2.34 1.11-2.66c.29-.32.63-.4.84-.4h.6c.2 0 .46-.07.72.55.27.64.9 2.21.98 2.37.08.16.13.35.03.56-.11.21-.16.34-.32.53-.16.19-.34.42-.48.56-.16.16-.33.34-.14.66.19.32.83 1.37 1.79 2.22 1.23 1.1 2.26 1.44 2.58 1.6.32.16.51.13.7-.08.19-.21.8-.93 1.01-1.25.21-.32.43-.27.72-.16.29.11 1.85.87 2.17 1.03.32.16.53.24.61.37.08.14.08.79-.16 1.44Z"/></svg>
      </button>

      <Footer t={t} lang={lang} onNavigate={navigate} />
      <RevealMount />
      <WhatsAppModal lang={lang} />
      {selectedProject && (
        <ProjectModal project={selectedProject} lang={lang} onClose={() => setSelectedProject(null)} />
      )}
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<HomeApp />);
