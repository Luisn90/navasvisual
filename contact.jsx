// Página Contact - Navas Visual
function ContactApp() {
  const { lang, setLang, t } = useI18n();
  const [ready, setReady] = React.useState(false);
  const [transPhase, setTransPhase] = React.useState('in');
  const [openFaq, setOpenFaq] = React.useState(0);
  const [sent, setSent] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', email: '', company: '', budget: '', service: '', message: '' });

  React.useEffect(() => {
    setTimeout(() => setReady(true), 100);
    setTimeout(() => setTransPhase(null), 950);
  }, []);

  const navigate = (href) => {
    setTransPhase('out');
    setTimeout(() => { window.location.href = href; }, 600);
  };

  const submit = (e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 4000);
    setForm({ name: '', email: '', company: '', budget: '', service: '', message: '' });
  };

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <React.Fragment>
      <Cursor />
      <PageTransition phase={transPhase} />
      <Nav active="contact" lang={lang} setLang={setLang} t={t} ready={ready} onNavigate={navigate} />

      <main>
        <section className="nv-section" style={{ paddingTop: 80 }}>
          <div className="nv-container">
            <div className="reveal">
              <Eyebrow>{t.contact.eyebrow}</Eyebrow>
              <h1 className="nv-h1" style={{ marginTop: 24, fontSize: 'clamp(48px, 9vw, 156px)' }}>
                <VarTitle>{t.contact.title} <br /><span className="nv-serif">{t.contact.title_2}</span></VarTitle>
              </h1>
              <p className="nv-work__lede" style={{ marginTop: 32, maxWidth: 540 }}>{t.contact.lede}</p>
            </div>

            <div className="nv-contact-grid" style={{ marginTop: 80 }}>
              <form className="nv-form reveal" onSubmit={submit}>
                <div className="nv-field-row">
                  <div className="nv-field">
                    <label>{t.contact.form.name}</label>
                    <input type="text" required value={form.name} onChange={upd('name')} />
                  </div>
                  <div className="nv-field">
                    <label>{t.contact.form.email}</label>
                    <input type="email" required value={form.email} onChange={upd('email')} />
                  </div>
                </div>
                <div className="nv-field-row">
                  <div className="nv-field">
                    <label>{t.contact.form.company}</label>
                    <input type="text" value={form.company} onChange={upd('company')} />
                  </div>
                  <div className="nv-field">
                    <label>{t.contact.form.budget}</label>
                    <select value={form.budget} onChange={upd('budget')}>
                      <option value="">—</option>
                      {t.contact.form.budget_options.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div className="nv-field">
                  <label>{t.contact.form.service}</label>
                  <select value={form.service} onChange={upd('service')}>
                    <option value="">—</option>
                    {t.services.list.map(s => <option key={s.n} value={s.t}>{s.t}</option>)}
                  </select>
                </div>
                <div className="nv-field">
                  <label>{t.contact.form.message}</label>
                  <textarea required value={form.message} onChange={upd('message')} rows="4" />
                </div>
                <button type="submit" className="nv-btn nv-btn--primary nv-form__submit">
                  {sent ? t.contact.form.sent : t.contact.form.send}
                  <span className="nv-btn__arrow">↗</span>
                </button>
              </form>

              <div className="reveal">
                <div className="nv-direct">
                  <span className="nv-meta__label" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>{t.contact.direct}</span>
                  <a href={`mailto:${t.contact.email}`} className="nv-direct__email">{t.contact.email}</a>
                </div>

                <div className="nv-socials">
                  {t.contact.socials.map((s, i) => (
                    <a href="#" className="nv-social-row" key={i}>
                      <span className="nv-social-row__name">{s.n}</span>
                      <span className="nv-social-row__handle">{s.h} ↗</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="nv-section nv-section--soft">
          <div className="nv-container">
            <SectionHead eyebrow={t.faq.eyebrow} title={t.faq.title} />
            <div className="nv-faq__list reveal">
              {t.faq.items.map((item, i) => (
                <div className={`nv-faq-item ${openFaq === i ? 'open' : ''}`} key={i} onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                  <div className="nv-faq-item__head">
                    <span className="nv-faq-item__q">{item.q}</span>
                    <span className="nv-faq-item__plus" />
                  </div>
                  <div className="nv-faq-item__a">{item.a}</div>
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

ReactDOM.createRoot(document.getElementById('root')).render(<ContactApp />);
