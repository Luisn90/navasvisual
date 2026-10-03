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

// Lista de paquetes en formato tarifa: una fila por paquete, agrupadas por servicio
function PackageList({ t, lang, onOrder, onNavigate }) {
  const sh = t.shop;
  return (
    <div className="nv-shop__groups">
      {sh.groups.map((g) => (
        <div className="nv-shop__group reveal" key={g.id}>
          <div className="nv-shop__group-head">
            <h3 className="nv-shop__group-name">{g.name}</h3>
            <p className="nv-shop__group-desc">{g.desc}</p>
            <a
              href={`work.html?cat=${encodeURIComponent(g.category)}`}
              onClick={(e) => { e.preventDefault(); onNavigate(`work.html?cat=${encodeURIComponent(g.category)}`); }}
              className="nv-shop__examples"
            >
              {sh.examples}
            </a>
          </div>
          <div className="nv-shop__list">
            {g.items.map((pkg) => (
              <article className="nv-pkg" key={pkg.id}>
                <div className="nv-pkg__main">
                  <h4 className="nv-pkg__name">{pkg.name}</h4>
                  <ul className="nv-pkg__includes">
                    {pkg.includes.map((inc) => <li key={inc}>{inc}</li>)}
                  </ul>
                </div>
                <dl className="nv-pkg__terms">
                  <div><dt>{sh.delivery}</dt><dd>{pkg.days} {sh.days}</dd></div>
                  <div><dt>{sh.revisions}</dt><dd>{pkg.revisions}</dd></div>
                </dl>
                <div className="nv-pkg__buy">
                  <div className="nv-pkg__price">${pkg.price}</div>
                  <button type="button" className="nv-btn nv-btn--primary" onClick={() => onOrder(pkg)}>
                    {sh.order}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
      <p className="nv-shop__note">{sh.currency_note}</p>
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
                  <a href="#paquetes" onClick={(e) => { e.preventDefault(); navigate('#paquetes'); }} className="nv-btn nv-btn--primary">
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

        {/* PAQUETES */}
        <section className="nv-section nv-shop" id="paquetes">
          <div className="nv-container">
            <SectionHead eyebrow={t.shop.eyebrow} title={t.shop.title} lede={t.shop.lede} />
            <PackageList t={t} lang={lang} onOrder={setOrderPkg} onNavigate={navigate} />
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section className="nv-section nv-section--soft">
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
