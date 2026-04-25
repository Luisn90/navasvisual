// Página Work - Navas Visual
function WorkApp() {
  const { lang, setLang, t } = useI18n();
  const [ready, setReady] = React.useState(false);
  const [transPhase, setTransPhase] = React.useState('in');
  const [filter, setFilter] = React.useState('all');

  React.useEffect(() => {
    setTimeout(() => setReady(true), 100);
    setTimeout(() => setTransPhase(null), 950);
  }, []);

  const navigate = (href) => {
    setTransPhase('out');
    setTimeout(() => { window.location.href = href; }, 600);
  };

  const allTags = ['all', ...new Set(t.work.items.map(i => i.tag))];
  const items = filter === 'all' ? t.work.items : t.work.items.filter(i => i.tag === filter);

  return (
    <React.Fragment>
      <Cursor />
      <PageTransition phase={transPhase} />
      <Nav active="work" lang={lang} setLang={setLang} t={t} ready={ready} onNavigate={navigate} />

      <main>
        <section className="nv-section" style={{ paddingTop: 80 }}>
          <div className="nv-container">
            <div className="reveal">
              <Eyebrow>{t.work.eyebrow}</Eyebrow>
              <h1 className="nv-h1" style={{ marginTop: 24, fontSize: 'clamp(56px, 11vw, 192px)' }}>
                <span className="nv-serif">{lang === 'es' ? 'Selección' : 'Selected'}</span> <br />
                {lang === 'es' ? 'de proyectos' : 'projects'}
              </h1>
              <p className="nv-work__lede" style={{ marginTop: 32, maxWidth: 540 }}>{t.work.lede}</p>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 56, flexWrap: 'wrap' }} className="reveal">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setFilter(tag)}
                  className="nv-btn"
                  style={{
                    padding: '10px 16px',
                    fontSize: 13,
                    background: filter === tag ? 'var(--fg)' : 'transparent',
                    color: filter === tag ? 'var(--bg)' : 'var(--fg)',
                    border: `1px solid ${filter === tag ? 'var(--fg)' : 'var(--bg-line)'}`,
                  }}
                >
                  {tag === 'all' ? (lang === 'es' ? 'Todos' : 'All') : tag}
                </button>
              ))}
            </div>

            <div className="nv-work-page-grid reveal-stagger" style={{ marginTop: 56 }}>
              {items.map((w, i) => (
                <div className="nv-work-card" key={i}>
                  <div className="nv-work-card__media">
                    <div className={`nv-ph nv-ph--${(i % 6) + 1}`}>
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
              ))}
            </div>
          </div>
        </section>

        <Marquee items={t.marquee} />
      </main>

      <Footer t={t} lang={lang} onNavigate={navigate} />
      <RevealMount />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<WorkApp />);
