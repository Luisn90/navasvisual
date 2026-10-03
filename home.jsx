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

// Busca la imagen de un proyecto cuya categoría coincida con alguna de las dadas
function imageForCats(projects, cats) {
  const lc = cats.map(c => c.toLowerCase());
  const hit = projects.find(p => p.image && p.tag && lc.includes(String(p.tag).toLowerCase()));
  return hit ? hit.image : null;
}

// Índice de servicios: filas tipográficas grandes; en escritorio, al pasar el
// cursor aparece una imagen de un trabajo de esa categoría.
function ServicesIndex({ t, projects, onPlans, onNavigate }) {
  const sv = t.svc;
  return (
    <ul className="nv-sidx">
      {sv.items.map((it) => {
        const img = imageForCats(projects, it.cats);
        const workHref = `work.html?cat=${encodeURIComponent(it.cats[0])}`;
        return (
          <li
            className="nv-sidx__row reveal"
            key={it.id}
            onMouseMove={img ? (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
              e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
            } : undefined}
          >
            <h3 className="nv-sidx__name">{it.name}</h3>
            <p className="nv-sidx__desc">{it.d}</p>
            <div className="nv-sidx__links">
              {it.tab ? (
                <button type="button" className="nv-sidx__link nv-sidx__link--strong" onClick={() => onPlans(it.tab)}>{sv.plans_link}</button>
              ) : (
                <a href="contact.html" className="nv-sidx__link nv-sidx__link--strong" onClick={(e) => { e.preventDefault(); onNavigate('contact.html'); }}>{sv.custom_link}</a>
              )}
              <a href={workHref} className="nv-sidx__link" onClick={(e) => { e.preventDefault(); onNavigate(workHref); }}>{sv.work_link}</a>
            </div>
            {img && (
              <div className="nv-sidx__peek" aria-hidden="true">
                <img src={img} alt="" loading="lazy" />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Planes: pestañas por servicio y tres niveles por pestaña
function PlansSection({ t, lang, tab, setTab, onOrder, onNavigate }) {
  const sh = t.shop;
  const current = sh.tabs.find(x => x.id === tab) || sh.tabs[0];
  const tabRefs = React.useRef([]);

  const onKeyDown = (e, i) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const n = sh.tabs.length;
    const next = e.key === 'ArrowRight' ? (i + 1) % n : (i - 1 + n) % n;
    setTab(sh.tabs[next].id);
    tabRefs.current[next] && tabRefs.current[next].focus();
  };

  const examplesHref = `work.html?cat=${encodeURIComponent(current.cats[0])}`;

  return (
    <div className="nv-plans">
      <div className="nv-plans__bar">
        <div className="nv-plans__tabs" role="tablist" aria-label={sh.eyebrow}>
          {sh.tabs.map((tb, i) => (
            <button
              key={tb.id}
              ref={el => tabRefs.current[i] = el}
              role="tab"
              id={`tab-${tb.id}`}
              aria-selected={tb.id === current.id}
              aria-controls="nv-plans-panel"
              tabIndex={tb.id === current.id ? 0 : -1}
              className={`nv-plans__tab ${tb.id === current.id ? 'is-active' : ''}`}
              onClick={() => setTab(tb.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {tb.name}
            </button>
          ))}
        </div>
      </div>

      <div className="nv-plans__context">
        <p className="nv-plans__note">{current.note}</p>
        <a href={examplesHref} className="nv-plans__examples" onClick={(e) => { e.preventDefault(); onNavigate(examplesHref); }}>{sh.examples}</a>
      </div>

      <div className="nv-plans__grid" role="tabpanel" id="nv-plans-panel" aria-labelledby={`tab-${current.id}`} key={current.id}>
        {current.plans.map((pl, i) => {
          const tier = sh.tiers[i];
          const name = `${current.name} ${tier}`;
          return (
            <article className={`nv-plan ${pl.featured ? 'nv-plan--featured' : ''}`} key={i}>
              <header className="nv-plan__head">
                <h3 className="nv-plan__tier">{tier}</h3>
                {pl.featured && <span className="nv-plan__badge">{sh.popular}</span>}
              </header>
              <div className="nv-plan__price"><span className="nv-plan__cur">$</span>{pl.price.toLocaleString(lang === 'es' ? 'de-DE' : 'en-US')}</div>
              <dl className="nv-plan__terms">
                <div><dt>{sh.delivery}</dt><dd>{pl.days} {sh.days}</dd></div>
                <div><dt>{sh.revisions}</dt><dd>{pl.revisions}</dd></div>
              </dl>
              <ul className="nv-plan__includes">
                {pl.includes.map(inc => <li key={inc}>{inc}</li>)}
              </ul>
              <button
                type="button"
                className={`nv-btn nv-plan__cta ${pl.featured ? 'nv-plan__cta--light' : 'nv-btn--primary'}`}
                onClick={() => onOrder({ name, price: pl.price, days: pl.days, revisions: pl.revisions })}
              >
                {sh.order}
              </button>
            </article>
          );
        })}
      </div>

      <div className="nv-plans__foot">
        <p className="nv-plans__more">
          {sh.more}{' '}
          <a href="contact.html" onClick={(e) => { e.preventDefault(); onNavigate('contact.html'); }}>{sh.more_link}</a>
        </p>
        <p className="nv-plans__cur-note">{sh.currency_note}</p>
      </div>
    </div>
  );
}

function HomeApp() {
  const { lang, setLang, t } = useI18n();
  const [loading, setLoading] = useStateHome(true);
  const [ready, setReady] = useStateHome(false);
  const [transPhase, setTransPhase] = useStateHome(null);
  const gyro = useGyroParallax();
  const { projects } = useProjects(t.work.items);
  const [selectedProject, setSelectedProject] = useStateHome(null);
  const [orderPkg, setOrderPkg] = useStateHome(null);
  const [openFaq, setOpenFaq] = useStateHome(-1);
  const [planTab, setPlanTab] = useStateHome(t.shop.tabs[0].id);
  const goPlans = (tabId) => { setPlanTab(tabId); scrollToId('planes'); };

  const featured = projects.some(p => p.featured) ? projects.filter(p => p.featured) : projects;

  const layer = (strength) => ({
    transform: `translate(${gyro.x * strength}px, ${gyro.y * strength}px)`,
    willChange: 'transform',
  });

  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffectHome(() => {
    if (!loading) setTimeout(() => setReady(true), 100);
  }, [loading]);

  // Si se llega con #paquetes (desde otra página), bajar a la sección al terminar el loader
  useEffectHome(() => {
    if (ready && window.location.hash) {
      setTimeout(() => scrollToId(window.location.hash.slice(1)), 250);
    }
  }, [ready]);

  const navigate = (href) => {
    // Enlaces internos del home (index.html#seccion o #seccion): solo desplazar
    const m = href.match(/^(?:index\.html)?#(.+)$/);
    if (m) { scrollToId(m[1]); history.replaceState(null, '', '#' + m[1]); return; }
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
              <div className="nv-hero__img">
                <img src="assets/hero-image.jpg" alt="" />
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
                  <a href="#planes" onClick={(e) => { e.preventDefault(); navigate('#planes'); }} className="nv-btn nv-btn--primary">
                    {t.hero.cta_packages}
                  </a>
                  <a href="contact.html" onClick={(e) => { e.preventDefault(); navigate('contact.html'); }} className="nv-btn nv-btn--ghost">
                    {t.hero.cta_custom}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="nv-hero__meta-strip" style={{ position: 'relative', zIndex: 1, ...layer(4) }}>
            {t.hero.strip.map((s) => <span key={s}>{s}</span>)}
          </div>
        </section>

        {/* SERVICIOS */}
        <section className="nv-section nv-svcx" id="servicios">
          <div className="nv-container">
            <SectionHead eyebrow={t.svc.eyebrow} title={t.svc.title} lede={t.svc.lede} />
            <ServicesIndex t={t} projects={projects} onPlans={goPlans} onNavigate={navigate} />
          </div>
        </section>

        {/* TRABAJO DESTACADO */}
        <section className="nv-section nv-section--soft nv-work">
          <div className="nv-container">
            <div className="nv-work__head reveal">
              <div className="nv-work__head-l">
                <Eyebrow>{t.featured.eyebrow}</Eyebrow>
                <h2 className="nv-h2" style={{ marginTop: 16 }}>{t.featured.title}</h2>
                <p className="nv-work__lede">{t.featured.lede}</p>
              </div>
              <a href="work.html" onClick={(e) => { e.preventDefault(); navigate('work.html'); }} className="nv-btn nv-btn--ghost">
                {t.featured.view_all}
              </a>
            </div>
          </div>
          <WorkSlider projects={featured} lang={lang} onSelect={setSelectedProject} />
        </section>

        {/* PLANES */}
        <section className="nv-section nv-shop" id="planes">
          <div className="nv-container">
            <SectionHead eyebrow={t.shop.eyebrow} title={t.shop.title} lede={t.shop.lede} />
            <PlansSection t={t} lang={lang} tab={planTab} setTab={setPlanTab} onOrder={setOrderPkg} onNavigate={navigate} />
          </div>
        </section>

        {/* CÓMO TRABAJO */}
        <section className="nv-section nv-section--soft">
          <div className="nv-container">
            <div className="nv-approach">
              <div className="nv-approach__photo reveal">
                <img src="assets/luis-portrait.png" alt="Luis Navas" loading="lazy" />
              </div>
              <div className="nv-approach__text reveal">
                <Eyebrow>{t.approach.eyebrow}</Eyebrow>
                <h2 className="nv-approach__title">{t.approach.title}</h2>
                <p className="nv-approach__body">{t.approach.body}</p>
                <dl className="nv-approach__points">
                  {t.approach.points.map((pt) => (
                    <div className="nv-approach__point" key={pt.t}>
                      <dt>{pt.t}</dt>
                      <dd>{pt.d}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* CÓMO COMPRAR */}
        <section className="nv-section">
          <div className="nv-container">
            <SectionHead eyebrow={t.how.eyebrow} title={t.how.title} lede={t.how.lede} />
            <div className="nv-process__steps reveal-stagger">
              {t.how.steps.map((s) => (
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

        {/* PROYECTOS A MEDIDA */}
        <section className="nv-section">
          <div className="nv-container">
            <div className="nv-custom reveal">
              <div className="nv-custom__text">
                <h2 className="nv-custom__title">{t.custom.title}</h2>
                <p className="nv-custom__lede">{t.custom.lede}</p>
                <ul className="nv-custom__tags">
                  {t.custom.tags.map((tag) => <li key={tag}>{tag}</li>)}
                </ul>
              </div>
              <div className="nv-custom__ctas">
                <a href="contact.html" onClick={(e) => { e.preventDefault(); navigate('contact.html'); }} className="nv-btn nv-custom__btn--primary">
                  {t.custom.cta}
                </a>
                <button type="button" onClick={() => openWhatsApp()} className="nv-btn nv-custom__btn--ghost">
                  {t.custom.cta_wa}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* PREGUNTAS */}
        <section className="nv-section" style={{ paddingTop: 0 }}>
          <div className="nv-container">
            <SectionHead eyebrow={t.shop_faq.eyebrow} title={t.shop_faq.title} />
            <div className="nv-faq__list reveal">
              {t.shop_faq.items.map((item, i) => (
                <div className={`nv-faq-item ${openFaq === i ? 'open' : ''}`} key={i}>
                  <button
                    type="button"
                    className="nv-faq-item__head"
                    aria-expanded={openFaq === i}
                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  >
                    <span className="nv-faq-item__q">{item.q}</span>
                    <span className="nv-faq-item__plus" />
                  </button>
                  <div className="nv-faq-item__a">{item.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer t={t} lang={lang} onNavigate={navigate} />
      <RevealMount />
      <WhatsAppModal lang={lang} />
      {selectedProject && (
        <ProjectModal project={selectedProject} lang={lang} onClose={() => setSelectedProject(null)} />
      )}
      {orderPkg && (
        <OrderModal pkg={orderPkg} t={t} lang={lang} onClose={() => setOrderPkg(null)} />
      )}
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<HomeApp />);
