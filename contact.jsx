// Página Contact - Navas Visual
function ContactApp() {
  const { lang, setLang, t } = useI18n();
  const [ready, setReady] = React.useState(false);
  const [transPhase, setTransPhase] = React.useState('in');
  const [openFaq, setOpenFaq] = React.useState(0);
  const [sent, setSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', email: '', company: '', service: '', message: '', website: '' });

  React.useEffect(() => {
    setTimeout(() => setReady(true), 100);
    setTimeout(() => setTransPhase(null), 950);
  }, []);

  const navigate = (href) => {
    setTransPhase('out');
    setTimeout(() => { window.location.href = href; }, 600);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setSendError(false);
    try {
      // El mensaje llega a Luis por correo y Telegram; el cliente recibe una confirmación.
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, lang }),
      });
      if (!res.ok) throw new Error('contacto_' + res.status);
      setSent(true);
      setTimeout(() => setSent(false), 6000);
      setForm({ name: '', email: '', company: '', service: '', message: '', website: '' });
    } catch (err) {
      console.error('Contact form submit failed:', err);
      setSendError(true);
    } finally {
      setSending(false);
    }
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
                {t.contact.title} <br /><span className="nv-serif">{t.contact.title_2}</span>
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
                    <label>{t.contact.form.service}</label>
                    <select value={form.service} onChange={upd('service')}>
                      <option value="">—</option>
                      {t.svc.items.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      <option value={lang === 'es' ? 'Otro' : 'Other'}>{lang === 'es' ? 'Otro' : 'Other'}</option>
                    </select>
                  </div>
                </div>
                <div className="nv-field">
                  <label>{t.contact.form.message}</label>
                  <textarea required value={form.message} onChange={upd('message')} rows="4" />
                </div>
                <input type="text" name="website" value={form.website} onChange={upd('website')} tabIndex="-1" autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
                <button type="submit" className="nv-btn nv-btn--primary nv-form__submit" disabled={sending}>
                  {sent ? t.contact.form.sent : sending ? (lang === 'es' ? 'Enviando…' : 'Sending…') : t.contact.form.send}
                  <span className="nv-btn__arrow">↗</span>
                </button>
                {sendError && (
                  <p style={{ marginTop: 12, fontSize: 13, color: '#e5484d' }}>
                    {lang === 'es'
                      ? `No se pudo enviar. Escríbeme directo a ${t.contact.email}.`
                      : `Couldn't send. Please email me directly at ${t.contact.email}.`}
                  </p>
                )}
              </form>

              <div className="reveal">
                <div className="nv-direct">
                  <span className="nv-meta__label" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>{t.contact.direct}</span>
                  <a href={`mailto:${t.contact.email}`} className="nv-direct__email">{t.contact.email}</a>
                </div>

                <div className="nv-socials">
                  {t.contact.socials.map((s, i) => (
                    s.n === 'WhatsApp' ? (
                      <a
                        href="#"
                        className="nv-social-row"
                        key={i}
                        onClick={(e) => { e.preventDefault(); openWhatsApp(); }}
                      >
                        <span className="nv-social-row__name">{s.n}</span>
                        <span className="nv-social-row__handle">{s.h} ↗</span>
                      </a>
                    ) : (
                      <a href={s.url} target="_blank" rel="noopener" className="nv-social-row" key={i}>
                        <span className="nv-social-row__name">{s.n}</span>
                        <span className="nv-social-row__handle">{s.h} ↗</span>
                      </a>
                    )
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
      <WhatsAppModal lang={lang} />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ContactApp />);
