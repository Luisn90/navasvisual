// Página Home - Navas Visual
const { useState: useStateHome, useEffect: useEffectHome } = React;

function HomeApp() {
  const { lang, setLang, t } = useI18n();
  const [loading, setLoading] = useStateHome(true);
  const [ready, setReady] = useStateHome(false);
  const [transPhase, setTransPhase] = useStateHome(null);

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
              <div>
                <Eyebrow>{t.hero.eyebrow}</Eyebrow>
              </div>
              <div className="nv-hero__title">
                <h1 className="nv-h1">
                  <span><em>{t.hero.title_1}</em></span>
                  <span><em className="nv-hero__title-2">{t.hero.title_2}</em></span>
                  <span><em>{t.hero.title_3}</em></span>
                </h1>
              </div>
              <div className="nv-hero__bottom">
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

            <div className="nv-hero__sidebar">
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

          <div className="nv-hero__meta-strip">
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
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<HomeApp />);
