// The brief is sent only after the client confirms it; credentials stay in Vercel.
const BRIEF_COPY = {
  es: { steps: ['Tu marca', 'El proyecto', 'Referencias', 'Revisar'], intro: 'Cuéntame qué necesitas. Al enviar el brief podrás elegir entre pagar o consultar conmigo.', name: 'Tu nombre', email: 'Correo electrónico', brand: 'Nombre de la marca', business: '¿A qué se dedica?', audience: '¿A quién va dirigido?', goals: '¿Qué necesitas conseguir?', style: 'Estilo y personalidad', colors: 'Colores que prefieres o quieres evitar', uses: '¿Dónde se usará el logo?', slogan: 'Eslogan (opcional)', existing: '¿Es una marca nueva o un rediseño?', scope: 'Páginas, funciones o piezas que necesitas', platform: 'Web actual, plataforma o redes (opcional)', deadline: 'Fecha deseada (opcional)', links: 'Enlaces de referencia (uno por línea, opcional)', notes: '¿Qué te gusta de estas referencias? (opcional)', files: 'Cargar referencias', fileHelp: 'Hasta 5 archivos JPG, PNG, WebP o PDF. Máximo 3 MB en total.', fileError: 'Revisa el formato y los límites: 5 archivos y 3 MB en total.', remove: 'Quitar', back: 'Atrás', next: 'Continuar', close: 'Cerrar', submit: 'Enviar mi proyecto', sending: 'Enviando…', sent: 'Solicitud enviada', received: 'Recibí tu brief y las referencias. ¿Cómo quieres continuar?', partial: 'Tu solicitud fue recibida, pero una de las notificaciones no se completó. Consúltame para confirmar los detalles antes de pagar.', pay: 'Pagar el plan', coordinatePay: 'Coordinar el pago', consult: 'Consultar personalmente', sendError: 'No se pudo confirmar el envío. Tus respuestas y referencias siguen aquí. Inténtalo de nuevo o consúltame.', unavailable: 'El envío no está disponible en este momento. Tus datos siguen aquí; puedes consultarme directamente.', rate: 'Has realizado varios intentos. Espera unos minutos antes de volver a enviar.', privacy: 'Al enviar, compartes tus respuestas y archivos con Luis Navas para revisar tu proyecto.', receipt: 'Número de solicitud', edit: 'Volver a editar', reference: 'Proyecto que te interesa', referencePrice: 'Precio del plan', noCharge: 'Completar este formulario no realiza ningún cobro.', attachments: 'Archivos de referencia', review: 'Comprueba tus respuestas antes de enviarlas.', newOrOld: 'Indica si partes de cero o qué quieres cambiar.', styles: 'Por ejemplo: simple, cercano, elegante, atrevido…', logoUses: 'Por ejemplo: redes, envases, rótulos, web…', goalHint: 'Cuéntame el problema que quieres resolver.', requiredError: 'Completa los campos obligatorios antes de continuar.', subject: 'Solicitud de proyecto', draftRestored: 'Recuperamos lo que habías escrito en este dispositivo.', draftClear: 'Empezar de cero', closeTitle: '¿Cerrar el formulario?', closeBody: 'Lo que escribiste queda guardado en este dispositivo y lo verás al volver a abrir este plan. Los archivos adjuntos sí tendrás que volver a cargarlos.', keepEditing: 'Seguir completando', closeAnyway: 'Cerrar' },
  en: { steps: ['Your brand', 'The project', 'References', 'Review'], intro: 'Tell me what you need. After sending the brief, you can choose to pay or discuss it with me.', name: 'Your name', email: 'Email', brand: 'Brand name', business: 'What does your business do?', audience: 'Who is it for?', goals: 'What do you need to achieve?', style: 'Style and personality', colors: 'Colors you prefer or want to avoid', uses: 'Where will the logo be used?', slogan: 'Tagline (optional)', existing: 'New brand or redesign?', scope: 'Pages, features or pieces you need', platform: 'Current website, platform or social accounts (optional)', deadline: 'Desired date (optional)', links: 'Reference links (one per line, optional)', notes: 'What do you like about these references? (optional)', files: 'Add reference files', fileHelp: 'Up to 5 JPG, PNG, WebP or PDF files. Maximum 3 MB total.', fileError: 'Check file types and limits: 5 files and 3 MB total.', remove: 'Remove', back: 'Back', next: 'Continue', close: 'Close', submit: 'Send my project', sending: 'Sending…', sent: 'Request sent', received: 'I received your brief and references. How would you like to continue?', partial: 'Your request was received, but one notification could not be completed. Contact me to confirm the details before paying.', pay: 'Pay for the plan', coordinatePay: 'Arrange payment', consult: 'Discuss it with me', sendError: 'Could not confirm delivery. Your answers and references are still here. Try again or contact me.', unavailable: 'Delivery is unavailable right now. Your answers are still here; you can contact me directly.', rate: 'You have tried several times. Wait a few minutes before sending again.', privacy: 'By sending, you share your answers and files with Luis Navas to review your project.', receipt: 'Request number', edit: 'Edit answers', reference: 'Project you like', referencePrice: 'Plan price', noCharge: 'Completing this form does not charge you.', attachments: 'Reference files', review: 'Check your answers before sending.', newOrOld: 'Tell me whether you are starting from scratch or what needs to change.', styles: 'For example: simple, friendly, elegant, bold…', logoUses: 'For example: social media, packaging, signage, website…', goalHint: 'Tell me the problem you want to solve.', requiredError: 'Complete the required fields before continuing.', subject: 'Project request', draftRestored: 'We restored what you had written on this device.', draftClear: 'Start over', closeTitle: 'Close the form?', closeBody: 'Your answers are saved on this device and will be here when you open this plan again. Attached files will need to be added again.', keepEditing: 'Keep editing', closeAnyway: 'Close' }
};

// Public payment details supplied by the studio owner; these are not API credentials.
const BRIEF_PAYMENTS = {
  binancePayId: '283127648',
  mobile: { bank: '0102 - Banco de Venezuela', document: 'V18783269', phone: '04127449626' }
};

function BriefPaymentRow({ label, value, es }) {
  const [copied, setCopied] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setFailed(false); }
    catch { setFailed(true); }
  };
  return <div className="nv-brief__payment-row"><span>{label}</span><strong>{value}</strong><button type="button" onClick={copy}>{copied ? (es ? 'Copiado' : 'Copied') : (es ? 'Copiar' : 'Copy')}</button>{failed && <small role="status">{es ? 'Selecciona el dato y cópialo manualmente.' : 'Select the value and copy it manually.'}</small>}</div>;
}

// El cliente sube su comprobante: recibe un correo de «estamos verificando tu pago»
// y Luis lo confirma desde la oficina (entonces llega el correo de pago confirmado).
const PROOF_COPY = {
  es: { title: '¿Ya pagaste? Sube tu comprobante', method: 'Método de pago', reference: 'Número de referencia (opcional)', file: 'Captura o PDF del pago', fileHelp: 'JPG, PNG, WebP o PDF, máximo 3 MB.', choose: 'Elegir archivo', change: 'Cambiar archivo', send: 'Enviar comprobante', sending: 'Enviando…', note: 'Te llegará un correo confirmando que lo recibimos. Cuando verifique el pago, te llegará otro con la confirmación.', pickMethod: 'Elige cómo pagaste.', pickFile: 'Adjunta la captura o el PDF de tu pago.', fileError: 'El archivo debe ser JPG, PNG, WebP o PDF de máximo 3 MB.', error: 'No pude registrar tu comprobante. Inténtalo de nuevo o envíamelo por WhatsApp.', confirmed: 'Este pago ya está confirmado.', rate: 'Hiciste varios intentos seguidos. Espera unos minutos o envíamelo por WhatsApp.', doneTitle: 'Recibimos tu comprobante', doneEmail: email => `Te enviamos un correo a ${email} con tu constancia. Cuando verifique el pago, te llegará otro correo con la confirmación.`, doneNoEmail: 'Lo estoy verificando. Te avisaré en cuanto confirme el pago.', another: 'Enviar otro comprobante' },
  en: { title: 'Already paid? Upload your receipt', method: 'Payment method', reference: 'Reference number (optional)', file: 'Screenshot or PDF of the payment', fileHelp: 'JPG, PNG, WebP or PDF, up to 3 MB.', choose: 'Choose file', change: 'Change file', send: 'Send receipt', sending: 'Sending…', note: "You'll get an email confirming we received it. Once I verify the payment, you'll get another one with the confirmation.", pickMethod: 'Choose how you paid.', pickFile: 'Attach the screenshot or PDF of your payment.', fileError: 'The file must be a JPG, PNG, WebP or PDF up to 3 MB.', error: "I couldn't register your receipt. Try again or send it to me on WhatsApp.", confirmed: 'This payment is already confirmed.', rate: 'Too many attempts in a row. Wait a few minutes or send it on WhatsApp.', doneTitle: 'We received your receipt', doneEmail: email => `We sent an email to ${email} with your proof of submission. Once I verify the payment, you'll get another email with the confirmation.`, doneNoEmail: "I'm verifying it. I'll let you know as soon as the payment is confirmed.", another: 'Send another receipt' }
};

function PaymentProof({ paymentKey, lang, whatsappUrl }) {
  const p = PROOF_COPY[lang === 'es' ? 'es' : 'en'];
  const [metodo, setMetodo] = React.useState('');
  const [referencia, setReferencia] = React.useState('');
  const [file, setFile] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [done, setDone] = React.useState(null);
  const [serverError, setServerError] = React.useState(false);
  const pick = e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    if (f.size > 3 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(f.type)) { setError(p.fileError); return; }
    setFile(f); setError('');
  };
  const submit = async e => {
    e.preventDefault();
    if (busy) return;
    if (!metodo) { setError(p.pickMethod); return; }
    if (!file) { setError(p.pickFile); return; }
    setBusy(true); setError(''); setServerError(false);
    try {
      const body = new FormData();
      body.set('key', paymentKey); body.set('metodo', metodo); body.set('referencia', referencia.trim()); body.set('lang', lang === 'es' ? 'es' : 'en');
      body.set('comprobante', file);
      const response = await fetch('/api/pago', { method: 'POST', body, signal: AbortSignal.timeout(40000) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) { setServerError(data.error !== 'file'); setError(data.error === 'confirmed' ? p.confirmed : data.error === 'rate' ? p.rate : data.error === 'file' ? p.fileError : p.error); return; }
      setDone({ email: data.emailed ? data.email : null });
    } catch { setServerError(true); setError(p.error); } finally { setBusy(false); }
  };
  if (done) return <article className="nv-brief__payment nv-brief__proof nv-brief__proof--done" role="status">
    <h3>✓ {p.doneTitle}</h3>
    <p className="nv-order__text">{done.email ? p.doneEmail(done.email) : p.doneNoEmail}</p>
    <button type="button" className="nv-plan__examples nv-brief__linkbtn" onClick={() => { setDone(null); setFile(null); setReferencia(''); }}>{p.another}</button>
  </article>;
  return <form className="nv-brief__payment nv-brief__proof" onSubmit={submit} noValidate>
    <h3>{p.title}</h3>
    <fieldset className="nv-brief__methods"><legend>{p.method}</legend>
      {[['binance', 'Binance Pay'], ['pagomovil', 'Pago Móvil']].map(([value, label]) => <label key={value} className={metodo === value ? 'is-active' : ''}><input type="radio" name="proof-method" value={value} checked={metodo === value} onChange={() => { setMetodo(value); setError(''); }} />{label}</label>)}
    </fieldset>
    <label className="nv-brief__proof-field" htmlFor="proof-ref"><span>{p.reference}</span><input id="proof-ref" type="text" value={referencia} maxLength={80} onChange={e => setReferencia(e.target.value.replace(/[\r\n]/g, ''))} autoComplete="off" /></label>
    <div className="nv-brief__upload"><p className="nv-brief__proof-label">{p.file}</p><div className="nv-brief__filepick"><input id="proof-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={pick} aria-describedby="proof-help" /><label htmlFor="proof-file">{file ? p.change : p.choose}</label><span id="proof-help">{file ? `${file.name} · ${Math.max(1, Math.round(file.size / 1024))} KB` : p.fileHelp}</span></div></div>
    {error && <p role="alert" className="nv-brief__error">{error}{serverError && whatsappUrl && <> <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp</a></>}</p>}
    <button type="submit" className="nv-btn nv-btn--primary" disabled={busy}>{busy ? p.sending : p.send}</button>
    <p className="nv-order__text">{p.note}</p>
  </form>;
}

function OrderModal({ pkg, t, lang, onClose }) {
  const c = BRIEF_COPY[lang === 'es' ? 'es' : 'en'];
  const [step, setStep] = React.useState(0);
  // Borrador por plan: se guarda en este dispositivo mientras escriben y se borra al enviar.
  const draftKey = `nv-brief-draft:${pkg.service}:${pkg.tier}`;
  const [restored, setRestored] = React.useState(false);
  const [values, setValues] = React.useState(() => {
    const base = { reference: pkg.reference || '' };
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (saved && saved.values && Date.now() - saved.at < 14 * 864e5) return { ...saved.values, ...base, restored: true };
    } catch {}
    return base;
  });
  const [confirmClose, setConfirmClose] = React.useState(false);
  const [files, setFiles] = React.useState([]);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [website, setWebsite] = React.useState('');
  const [showPayments, setShowPayments] = React.useState(false);
  const [rate, setRate] = React.useState(null);
  const [rateState, setRateState] = React.useState('idle');
  const es = lang === 'es';
  const busyRef = React.useRef(false);
  const dirtyRef = React.useRef(false), pressedOverlay = React.useRef(false);
  // Si ya escribieron algo, cerrar pide confirmación en vez de perder el formulario.
  const requestClose = () => {
    if (busyRef.current) return;
    if (dirtyRef.current) { setConfirmClose(true); return; }
    onClose();
  };
  const closeRef = React.useRef(requestClose);
  closeRef.current = requestClose;
  const box = React.useRef(null), form = React.useRef(null);
  const logo = ['logo', 'identidad'].includes(pkg.service);
  const fields = [
    [['name', c.name], ['email', c.email, 'email'], ['brand', c.brand], ['business', c.business, 'textarea'], ['audience', c.audience, 'textarea']],
    logo ? [['existing', c.existing, 'textarea', true, c.newOrOld], ['goals', c.goals, 'textarea', true, c.goalHint], ['style', c.style, 'textarea', true, c.styles], ['colors', c.colors, 'textarea', false], ['uses', c.uses, 'textarea', true, c.logoUses], ['slogan', c.slogan, 'text', false], ['deadline', c.deadline, 'date', false]] : [['goals', c.goals, 'textarea', true, c.goalHint], ['scope', c.scope, 'textarea'], ['style', c.style, 'textarea', false], ['platform', c.platform, 'text', false], ['deadline', c.deadline, 'date', false]],
    [['links', c.links, 'textarea', false], ['notes', c.notes, 'textarea', false]]
  ];
  const allFields = fields.flat();
  React.useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = e => {
      if (e.key === 'Escape' && !busyRef.current) { e.preventDefault(); closeRef.current(); }
      if (e.key === 'Tab') {
        const elements = [...box.current.querySelectorAll('button:not(:disabled), input, textarea, a[href]')].filter(el => el.tabIndex >= 0 && el.getClientRects().length);
        const first = elements[0], last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, []);
  React.useEffect(() => { box.current.scrollTop = 0; box.current.querySelector('.nv-brief__heading').focus(); }, [step, result]);
  const change = (key, value) => { setValues(v => ({ ...v, [key]: value })); };
  React.useEffect(() => {
    if (values.restored) { setRestored(true); setValues(({ restored: _, ...v }) => v); }
  }, []);
  const filled = Object.entries(values).some(([k, v]) => !['reference', 'restored'].includes(k) && String(v || '').trim());
  dirtyRef.current = !result && (filled || files.length > 0);
  React.useEffect(() => {
    try {
      if (result) localStorage.removeItem(draftKey);
      else if (filled) { const { restored: _, ...v } = values; localStorage.setItem(draftKey, JSON.stringify({ values: v, at: Date.now() })); }
    } catch {}
  }, [values, result]);
  const clearDraft = () => {
    try { localStorage.removeItem(draftKey); } catch {}
    setValues({ reference: pkg.reference || '' }); setFiles([]); setStep(0); setRestored(false); setError('');
  };
  const addFiles = e => {
    const added = [...e.target.files]; e.target.value = '';
    const next = [...files, ...added];
    if (next.length > 5 || next.some(f => f.size > 3 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(f.type)) || next.reduce((n, f) => n + f.size, 0) > 3 * 1024 * 1024) { setError(c.fileError); return; }
    setFiles(next); setError('');
  };
  const summary = [c.subject + ': ' + pkg.name, c.referencePrice + ': $' + pkg.price, c.noCharge,
    ...allFields.filter(([key]) => values[key]).map(([key, label]) => label + ': ' + values[key]),
    ...(values.reference ? [c.reference + ': ' + values.reference] : []), c.attachments + ': ' + files.map(f => f.name).join(', ')].join('\n\n');
  const consultation = lang === 'es'
    ? `Hola Luis, soy ${values.name || ''}. Me interesa el plan ${pkg.name} ($${pkg.price}) para ${values.brand || ''}.${result ? ' Solicitud: ' + result.requestId + '.' : ''} Quisiera consultarte personalmente.`
    : `Hi Luis, I'm ${values.name || ''}. I'm interested in ${pkg.name} ($${pkg.price}) for ${values.brand || ''}.${result ? ' Request: ' + result.requestId + '.' : ''} I'd like to discuss it with you.`;
  const consultUrl = `https://wa.me/${NV_WHATSAPP_NUMBER}?text=${encodeURIComponent(consultation)}`;
  React.useEffect(() => {
    if (!showPayments) return;
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 12000);
    setRateState('loading');
    fetch('/api/payment-rate', { signal: controller.signal }).then(async response => {
      const quote = await response.json();
      if (!response.ok || !Number.isFinite(quote.rate) || quote.rate <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(quote.date)) throw new Error('rate');
      if (active) { setRate(quote); setRateState('ready'); }
    }).catch(() => { if (active) setRateState('unavailable'); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [showPayments]);
  const submitBrief = async () => {
    if (busyRef.current) return;
    setBusy(true); busyRef.current = true; setError('');
    try {
      const body = new FormData();
      body.set('brief', JSON.stringify({ service: pkg.service, tier: pkg.tier, values }));
      body.set('website', website);
      files.forEach(file => body.append('files', file));
      const response = await fetch('/api/brief', { method: 'POST', body, signal: AbortSignal.timeout(45000) });
      const data = await response.json();
      if (!response.ok || !data.accepted) {
        setError(data.error === 'unavailable' ? c.unavailable : data.error === 'rate' ? c.rate : data.error === 'files' || data.error === 'size' ? c.fileError : c.sendError);
        return;
      }
      let safePaymentUrl = null;
      try { const url = new URL(data.paymentUrl); if (url.protocol === 'https:') safePaymentUrl = url.href; } catch {}
      setResult({ requestId: data.requestId, complete: data.complete, paymentUrl: safePaymentUrl, paymentKey: /^[0-9a-f]{64}$/.test(data.paymentKey || '') ? data.paymentKey : null });
    } catch { setError(c.sendError); } finally { setBusy(false); busyRef.current = false; }
  };
  return (
    <div className="nv-modal-overlay nv-modal-overlay--in"
      onPointerDown={e => { pressedOverlay.current = e.target === e.currentTarget; }}
      onClick={e => {
        // Solo un clic que empieza y termina fuera del formulario cuenta; y con datos escritos, no cierra.
        const outside = e.target === e.currentTarget && pressedOverlay.current;
        pressedOverlay.current = false;
        if (outside && !dirtyRef.current) requestClose();
      }}>
      <div className="nv-modal-box nv-order nv-brief" ref={box} role="dialog" aria-modal="true" aria-labelledby="brief-title">
        <button type="button" className="nv-order__close" onClick={requestClose} disabled={busy} aria-label={c.close}>✕</button>
        <p className="nv-order__meta">{pkg.name} · ${pkg.price}</p>
        <h2 id="brief-title" className="nv-brief__heading" tabIndex="-1">{result ? c.sent : c.steps[step]}</h2>
        {!result && <ol className="nv-brief__progress">{c.steps.map((label, i) => <li key={label} aria-current={i === step ? 'step' : undefined} className={i === step ? 'is-active' : ''}>{i + 1}. {label}</li>)}</ol>}
        {confirmClose && <div className="nv-brief__confirm" role="alertdialog" aria-labelledby="brief-close-title" aria-describedby="brief-close-body">
          <p id="brief-close-title"><strong>{c.closeTitle}</strong></p>
          <p id="brief-close-body" className="nv-order__text">{c.closeBody}</p>
          <div className="nv-order__actions">
            <button type="button" className="nv-btn nv-btn--primary" autoFocus onClick={() => setConfirmClose(false)}>{c.keepEditing}</button>
            <button type="button" className="nv-btn nv-btn--ghost" onClick={onClose}>{c.closeAnyway}</button>
          </div>
        </div>}
        {restored && !result && <p className="nv-brief__restored" role="status">{c.draftRestored} <button type="button" onClick={clearDraft}>{c.draftClear}</button></p>}
        <p className="nv-order__text">{result ? (result.complete ? c.received : c.partial) : step === 3 ? c.review : c.intro}</p>
        {values.reference && <p className="nv-order__text">{c.reference}: {values.reference}</p>}
        {!result && <form ref={form} onSubmit={e => { e.preventDefault(); if (step === 3) { submitBrief(); return; } if (fields[step].some(([key, , , required = true]) => required && !values[key]?.trim())) { setError(c.requiredError); return; } setError(''); setStep(s => Math.min(3, s + 1)); }}>
          {step < 3 ? <div className="nv-brief__fields">{fields[step].map(([key, label, type = 'text', required = true, placeholder]) => <label key={key} htmlFor={`brief-${key}`}><span>{label}{required ? ' *' : ''}</span>{type === 'textarea' ? <textarea id={`brief-${key}`} value={values[key] || ''} onChange={e => change(key, e.target.value)} required={required} maxLength={2000} placeholder={placeholder} rows="3" /> : <input id={`brief-${key}`} type={type} value={values[key] || ''} onChange={e => change(key, e.target.value)} required={required} maxLength={200} autoComplete={key === 'name' ? 'name' : key === 'email' ? 'email' : 'off'} />}</label>)}</div> : <pre className="nv-brief__summary">{summary}</pre>}
          {step === 2 && <div className="nv-brief__upload"><label htmlFor="brief-files">{c.files}</label><input id="brief-files" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={addFiles} aria-describedby="brief-file-help" /><p id="brief-file-help" className="nv-order__text">{c.fileHelp}</p><ul>{files.map((f, i) => <li key={i}><span>{f.name} ({(f.size / 1024).toFixed(0)} KB)</span><button type="button" onClick={() => { setFiles(a => a.filter((_, j) => i !== j)); }}>{c.remove}</button></li>)}</ul></div>}
          {error && <p role="alert" className="nv-brief__error">{error}</p>}
          <div className="nv-order__actions">{step > 0 && <button disabled={busy} type="button" className="nv-btn nv-btn--ghost" onClick={() => { setStep(s => s - 1); setError(''); }}>{step === 3 ? c.edit : c.back}</button>}{step < 3 ? <button type="submit" className="nv-btn nv-btn--primary">{c.next}</button> : <button type="button" disabled={busy} className="nv-btn nv-btn--primary" onClick={submitBrief}>{busy ? c.sending : c.submit}</button>}</div>
          <div className="nv-brief__trap" aria-hidden="true"><label htmlFor="brief-website">Website<input id="brief-website" type="text" autoComplete="off" tabIndex="-1" value={website} onChange={e => setWebsite(e.target.value)} /></label></div>
          {step === 3 && <p className="nv-order__text">{c.privacy}</p>}
        </form>}
        {result && <>
          <p className="nv-order__meta">{c.receipt}: {result.requestId}</p>
          <div className="nv-order__actions">
            {result.complete && <button type="button" className="nv-btn nv-btn--primary" aria-expanded={showPayments} aria-controls="brief-payment-methods" onClick={() => setShowPayments(v => !v)}>{es ? 'Ver opciones de pago' : 'See payment options'}</button>}
            <a className="nv-btn nv-btn--ghost" target="_blank" rel="noopener noreferrer" href={consultUrl}>{c.consult}</a>
          </div>
          {showPayments && result.complete && <section id="brief-payment-methods" className="nv-brief__payments" aria-label={es ? 'Métodos de pago' : 'Payment methods'}>
            <article className="nv-brief__payment">
              <h3>Binance Pay · USDT</h3>
              <a href="assets/Binance%20qr.jpg" target="_blank" rel="noopener noreferrer" aria-label={es ? 'Abrir QR de Binance en tamaño completo' : 'Open full-size Binance QR'}><img className="nv-brief__payment-qr" src="assets/Binance%20qr.jpg" alt={es ? 'Código QR de Binance Pay' : 'Binance Pay QR code'} /></a>
              <a className="nv-plan__examples" href="assets/Binance%20qr.jpg" download>{es ? 'Descargar QR de Binance' : 'Download Binance QR'}</a>
              <BriefPaymentRow label="Binance Pay ID" value={BRIEF_PAYMENTS.binancePayId} es={es} />
              <p className="nv-order__text">{es ? 'En Binance Pay, selecciona USDT y usa este ID. Confirma el destinatario y el importe antes de enviar.' : 'In Binance Pay, select USDT and use this ID. Confirm the recipient and amount before sending.'}</p>
            </article>
            <article className="nv-brief__payment">
              <h3>{es ? 'Pago Móvil · Venezuela' : 'Pago Móvil · Venezuela (local bank payment)'}</h3>
              <a href="assets/9110928d-686f-4cf4-8912-67fc551e44a4.jpg" target="_blank" rel="noopener noreferrer" aria-label={es ? 'Abrir QR de Pago Móvil en tamaño completo' : 'Open full-size Pago Móvil QR'}><img className="nv-brief__payment-qr" src="assets/9110928d-686f-4cf4-8912-67fc551e44a4.jpg" alt={es ? 'Código QR de Pago Móvil' : 'Pago Móvil QR code'} /></a>
              <a className="nv-plan__examples" href="assets/9110928d-686f-4cf4-8912-67fc551e44a4.jpg" download>{es ? 'Descargar QR de Pago Móvil' : 'Download Pago Móvil QR'}</a>
              <BriefPaymentRow label={es ? 'Banco' : 'Bank'} value={BRIEF_PAYMENTS.mobile.bank} es={es} />
              <BriefPaymentRow label={es ? 'Cédula' : 'ID document'} value={BRIEF_PAYMENTS.mobile.document} es={es} />
              <BriefPaymentRow label={es ? 'Teléfono' : 'Phone'} value={BRIEF_PAYMENTS.mobile.phone} es={es} />
              {rateState === 'loading' && <p className="nv-order__text" role="status">{es ? 'Consultando la tasa BCV del día…' : 'Checking today’s BCV exchange rate…'}</p>}
              {rateState === 'ready' && rate && <>
                <BriefPaymentRow label={es ? 'Monto en bolívares' : 'Amount in bolívares'} value={(pkg.price * rate.rate).toFixed(2)} es={es} />
                <p className="nv-order__text">{es ? 'Tasa BCV' : 'BCV rate'}: {rate.rate.toLocaleString(es ? 'es-VE' : 'en-US', { maximumFractionDigits: 8 })} Bs/USD · {rate.date}. <a href="https://www.bcv.org.ve/" target="_blank" rel="noopener noreferrer">{es ? 'Fuente oficial' : 'Official source'}</a></p>
              </>}
              {rateState === 'unavailable' && <p className="nv-order__text" role="status">{es ? 'No pude verificar la tasa BCV con fecha de hoy. Confirma conmigo el monto antes de pagar.' : 'Today’s BCV rate could not be verified. Confirm the amount with me before paying.'}</p>}
              <a className="nv-plan__examples" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${NV_WHATSAPP_NUMBER}?text=${encodeURIComponent((es ? 'Hola Luis, quiero confirmar el monto en bolívares para pagar por Pago Móvil. Plan: ' : 'Hi Luis, please confirm the amount in bolívares for Pago Móvil. Plan: ') + pkg.name + '. Solicitud: ' + result.requestId)}`}>{es ? 'Consultar monto en bolívares' : 'Confirm local currency amount'}</a>
            </article>
            {result.paymentKey && <PaymentProof paymentKey={result.paymentKey} lang={lang} whatsappUrl={`https://wa.me/${NV_WHATSAPP_NUMBER}?text=${encodeURIComponent((es ? 'Hola Luis, te envío el comprobante para la solicitud ' : 'Hi Luis, here is my receipt for request ') + result.requestId + ' (' + pkg.name + ').')}`} />}
            <p className="nv-order__text">{result.paymentKey ? (es ? 'El pago se verifica personalmente: la confirmación te llega por correo cuando lo reviso. Si prefieres, también puedes enviarme el comprobante por WhatsApp.' : 'Payments are verified personally: the confirmation reaches you by email once I review it. You can also send me the receipt on WhatsApp.') : (es ? 'Después de pagar, envíame el comprobante con tu número de solicitud. El pago se verifica personalmente; esta página no lo confirma automáticamente.' : 'After paying, send me your receipt and request number. Payment is verified personally; this page does not confirm it automatically.')}</p>
            <a className="nv-btn nv-btn--ghost" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${NV_WHATSAPP_NUMBER}?text=${encodeURIComponent((es ? 'Hola Luis, te envío el comprobante para la solicitud ' : 'Hi Luis, here is my receipt for request ') + result.requestId + ' (' + pkg.name + ').')}`}>{es ? 'Enviar comprobante por WhatsApp' : 'Send receipt via WhatsApp'}</a>
          </section>}
        </>}
        {!result && error && <a className="nv-plan__examples" href={consultUrl} target="_blank" rel="noopener noreferrer">{c.consult}</a>}
        <p className="nv-order__note">{c.noCharge}</p>
      </div>
    </div>
  );
}
