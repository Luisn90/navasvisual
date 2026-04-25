// Página About - Navas Visual
function AboutApp() {
  const { lang, setLang, t } = useI18n();
  const [ready, setReady] = React.useState(false);
  const [transPhase, setTransPhase] = React.useState('in');

  React.useEffect(() => {
    setTimeout(() => setReady(true), 100);
    setTimeout(() => setTransPhase(null), 950);
  }, []);

  const navigate = (href) => {
    setTransPhase('out');
    setTimeout(() => { window.location.href = href; }, 600);
  };

  return (
    <React.Fragment>
      <Cursor />
      <PageTransition phase={transPhase} />
      <Nav active="about" lang={lang} setLang={setLang} t={t} ready={ready} onNavigate={navigate} />

      <main>
        <section className="nv-section nv-about-hero">
          <div className="nv-container">
            <div className="nv-about-grid">
              <div className="nv-about-portrait reveal">
                <span className="nv-about-portrait__tag">{t.about.eyebrow}</span>
                <img src="assets/luis-portrait.png" alt="Luis Navas" />
              </div>
              <div className="nv-about-text reveal">
                <Eyebrow>{t.about.role}</Eyebrow>
                <h1 className="nv-h2"><VarTitle>{t.about.title}</VarTitle></h1>
                <div className="nv-about-text__bio">
                  <p>{t.about.bio_1}</p>
                  <p>{t.about.bio_2}</p>
                  <p>{t.about.bio_3}</p>
                </div>
                <div style={{ marginTop: 32 }}>
                  <span className="nv-meta__label" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>{t.about.tools_label}</span>
                  <div className="nv-tools">
                    {t.about.tools.map(tool => <span className="nv-tool" key={tool}>{tool}</span>)}
                  </div>
                </div>
                <div style={{ marginTop: 40 }}>
                  <a href="contact.html" onClick={(e) => { e.preventDefault(); navigate('contact.html'); }} className="nv-btn nv-btn--primary">
                    {t.about.cta} <span className="nv-btn__arrow">↗</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="nv-stats reveal-stagger">
              {t.about.stats.map((s, i) => (
                <div className="nv-stat" key={i}>
                  <div className="nv-stat__num">{s.n}</div>
                  <div className="nv-stat__label">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Marquee items={t.marquee} />

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

ReactDOM.createRoot(document.getElementById('root')).render(<AboutApp />);
