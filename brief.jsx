// Briefs stay in the browser until the client explicitly downloads or shares them.
const BRIEF_COPY = {
  es: { steps: ['Tu marca', 'El proyecto', 'Referencias', 'Revisar'], intro: 'Primero conocemos tu proyecto. Revisamos el alcance contigo antes de solicitar cualquier pago.', name: 'Tu nombre', email: 'Correo electrónico', brand: 'Nombre de la marca', business: '¿A qué se dedica?', audience: '¿A quién va dirigido?', goals: '¿Qué necesitas conseguir?', style: 'Estilo y personalidad', colors: 'Colores que prefieres o quieres evitar', uses: '¿Dónde se usará el logo?', slogan: 'Eslogan (opcional)', existing: '¿Es una marca nueva o un rediseño?', scope: 'Páginas, funciones o piezas que necesitas', platform: 'Web actual, plataforma o redes (opcional)', deadline: 'Fecha deseada (opcional)', links: 'Enlaces de referencia (uno por línea, opcional)', notes: '¿Qué te gusta de estas referencias? (opcional)', files: 'Cargar referencias', fileHelp: 'Hasta 5 archivos JPG, PNG, WebP o PDF. Máximo 5 MB por archivo y 20 MB en total.', fileError: 'Revisa el formato y los límites: 5 archivos, 5 MB por archivo, 20 MB en total.', remove: 'Quitar', back: 'Atrás', next: 'Continuar', close: 'Cerrar', download: 'Descargar brief y referencias', downloading: 'Preparando archivo…', handoff: 'Descarga el ZIP y adjúntalo al correo o al chat. Los archivos no se envían automáticamente.', ready: 'Archivo preparado. Adjúntalo al correo o WhatsApp para enviar tu solicitud.', send: 'Abrir WhatsApp', mail: 'Abrir correo', downloadError: 'No se pudo preparar el archivo. Tus datos siguen aquí; inténtalo de nuevo.', edit: 'Volver a editar', reference: 'Proyecto que te interesa', referencePrice: 'Precio del plan', noCharge: 'Sin pago en este paso. Confirmamos alcance y disponibilidad primero.', attachments: 'Archivos de referencia', review: 'Comprueba tus respuestas antes de enviarlas.', newOrOld: 'Indica si partes de cero o qué quieres cambiar.', styles: 'Por ejemplo: simple, cercano, elegante, atrevido…', logoUses: 'Por ejemplo: redes, envases, rótulos, web…', goalHint: 'Cuéntame el problema que quieres resolver.', requiredError: 'Completa los campos obligatorios antes de continuar.', subject: 'Solicitud de proyecto' },
  en: { steps: ['Your brand', 'The project', 'References', 'Review'], intro: 'First, tell me about your project. We review the scope together before any payment is requested.', name: 'Your name', email: 'Email', brand: 'Brand name', business: 'What does your business do?', audience: 'Who is it for?', goals: 'What do you need to achieve?', style: 'Style and personality', colors: 'Colors you prefer or want to avoid', uses: 'Where will the logo be used?', slogan: 'Tagline (optional)', existing: 'New brand or redesign?', scope: 'Pages, features or pieces you need', platform: 'Current website, platform or social accounts (optional)', deadline: 'Desired date (optional)', links: 'Reference links (one per line, optional)', notes: 'What do you like about these references? (optional)', files: 'Add reference files', fileHelp: 'Up to 5 JPG, PNG, WebP or PDF files. Maximum 5 MB each and 20 MB total.', fileError: 'Check file types and limits: 5 files, 5 MB each, 20 MB total.', remove: 'Remove', back: 'Back', next: 'Continue', close: 'Close', download: 'Download brief and references', downloading: 'Preparing file…', handoff: 'Download the ZIP and attach it to your email or chat. Files are not sent automatically.', ready: 'Your file is ready. Attach it to your email or WhatsApp to send your request.', send: 'Open WhatsApp', mail: 'Open email', downloadError: 'Could not prepare the file. Your answers are still here; try again.', edit: 'Edit answers', reference: 'Project you like', referencePrice: 'Plan price', noCharge: 'No payment at this stage. We confirm scope and availability first.', attachments: 'Reference files', review: 'Check your answers before sending.', newOrOld: 'Tell me whether you are starting from scratch or what needs to change.', styles: 'For example: simple, friendly, elegant, bold…', logoUses: 'For example: social media, packaging, signage, website…', goalHint: 'Tell me the problem you want to solve.', requiredError: 'Complete the required fields before continuing.', subject: 'Project request' }
};

// Standards-compliant uncompressed ZIP, avoiding a new CDN dependency for private files.
async function briefZip(entries) {
  const encoder = new TextEncoder();
  const table = Array.from({ length: 256 }, (_, n) => {
    for (let i = 0; i < 8; i++) n = (n & 1) ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
  });
  const local = [], central = [];
  let offset = 0, centralSize = 0;
  for (const entry of entries) {
    const bytes = new Uint8Array(await entry.blob.arrayBuffer());
    const name = encoder.encode(entry.name);
    let crc = 0xffffffff;
    for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
    crc = (crc ^ 0xffffffff) >>> 0;
    const header = new Uint8Array(30 + name.length), h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true);
    h.setUint16(12, 33, true); h.setUint32(14, crc, true); h.setUint32(18, bytes.length, true); h.setUint32(22, bytes.length, true); h.setUint16(26, name.length, true); header.set(name, 30);
    const record = new Uint8Array(46 + name.length), r = new DataView(record.buffer);
    r.setUint32(0, 0x02014b50, true); r.setUint16(4, 20, true); r.setUint16(6, 20, true); r.setUint16(8, 0x800, true); r.setUint16(14, 33, true); r.setUint32(16, crc, true); r.setUint32(20, bytes.length, true); r.setUint32(24, bytes.length, true); r.setUint16(28, name.length, true); r.setUint32(42, offset, true); record.set(name, 46);
    local.push(header, bytes); central.push(record); offset += header.length + bytes.length; centralSize += record.length;
  }
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true); e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
  return new Blob([...local, ...central, end], { type: 'application/zip' });
}

function OrderModal({ pkg, t, lang, onClose }) {
  const c = BRIEF_COPY[lang === 'es' ? 'es' : 'en'];
  const [step, setStep] = React.useState(0);
  const [values, setValues] = React.useState({ reference: pkg.reference || '' });
  const [files, setFiles] = React.useState([]);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [prepared, setPrepared] = React.useState(false);
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
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const elements = [...box.current.querySelectorAll('button:not(:disabled), input, textarea, a[href]')].filter(el => el.getClientRects().length);
        const first = elements[0], last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, []);
  React.useEffect(() => { box.current.scrollTop = 0; box.current.querySelector('.nv-brief__heading').focus(); }, [step]);
  const change = (key, value) => { setValues(v => ({ ...v, [key]: value })); setPrepared(false); };
  const addFiles = e => {
    const added = [...e.target.files]; e.target.value = '';
    const next = [...files, ...added];
    if (next.length > 5 || next.some(f => f.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(f.type)) || next.reduce((n, f) => n + f.size, 0) > 20 * 1024 * 1024) { setError(c.fileError); return; }
    setFiles(next); setError(''); setPrepared(false);
  };
  const summary = [c.subject + ': ' + pkg.name, c.referencePrice + ': $' + pkg.price, c.noCharge,
    ...allFields.filter(([key]) => values[key]).map(([key, label]) => label + ': ' + values[key]),
    ...(values.reference ? [c.reference + ': ' + values.reference] : []), c.attachments + ': ' + files.map(f => f.name).join(', ')].join('\n\n');
  const handoffMessage = lang === 'es'
    ? `Hola Luis, soy ${values.name}. Quiero solicitar el plan ${pkg.name} ($${pkg.price}) para ${values.brand}. Mi correo: ${values.email}. He preparado el brief y las referencias para adjuntarlos. Revisemos el alcance antes del pago.`
    : `Hi Luis, I'm ${values.name}. I'd like the ${pkg.name} plan ($${pkg.price}) for ${values.brand}. My email: ${values.email}. I've prepared the brief and reference files to attach. Let's review the scope before payment.`;
  const download = async () => {
    setBusy(true); setError('');
    try {
      const entries = [{ name: 'brief.txt', blob: new Blob([summary], { type: 'text/plain;charset=utf-8' }) }, ...files.map((f, i) => ({ name: `references/${i + 1}-${f.name.replace(/[\\/\u0000-\u001f]/g, '_')}`, blob: f }))];
      const zip = await briefZip(entries), url = URL.createObjectURL(zip), a = document.createElement('a');
      a.href = url; a.download = 'navas-visual-brief.zip'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); setPrepared(true);
    } catch { setError(c.downloadError); } finally { setBusy(false); }
  };
  return (
    <div className="nv-modal-overlay nv-modal-overlay--in" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nv-modal-box nv-order nv-brief" ref={box} role="dialog" aria-modal="true" aria-labelledby="brief-title">
        <button type="button" className="nv-order__close" onClick={onClose} aria-label={c.close}>✕</button>
        <p className="nv-order__meta">{pkg.name} · ${pkg.price}</p>
        <h2 id="brief-title" className="nv-brief__heading" tabIndex="-1">{c.steps[step]}</h2>
        <ol className="nv-brief__progress">{c.steps.map((label, i) => <li key={label} aria-current={i === step ? 'step' : undefined} className={i === step ? 'is-active' : ''}>{i + 1}. {label}</li>)}</ol>
        <p className="nv-order__text">{step === 3 ? c.review : c.intro}</p>
        {values.reference && <p className="nv-order__text">{c.reference}: {values.reference}</p>}
        <form ref={form} onSubmit={e => { e.preventDefault(); if (fields[step].some(([key, , , required = true]) => required && !values[key]?.trim())) { setError(c.requiredError); return; } setError(''); setStep(s => Math.min(3, s + 1)); }}>
          {step < 3 ? <div className="nv-brief__fields">{fields[step].map(([key, label, type = 'text', required = true, placeholder]) => <label key={key} htmlFor={`brief-${key}`}><span>{label}{required ? ' *' : ''}</span>{type === 'textarea' ? <textarea id={`brief-${key}`} value={values[key] || ''} onChange={e => change(key, e.target.value)} required={required} maxLength={2000} placeholder={placeholder} rows="3" /> : <input id={`brief-${key}`} type={type} value={values[key] || ''} onChange={e => change(key, e.target.value)} required={required} maxLength={200} autoComplete={key === 'name' ? 'name' : key === 'email' ? 'email' : 'off'} />}</label>)}</div> : <pre className="nv-brief__summary">{summary}</pre>}
          {step === 2 && <div className="nv-brief__upload"><label htmlFor="brief-files">{c.files}</label><input id="brief-files" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={addFiles} aria-describedby="brief-file-help" /><p id="brief-file-help" className="nv-order__text">{c.fileHelp}</p><ul>{files.map((f, i) => <li key={i}><span>{f.name} ({(f.size / 1024).toFixed(0)} KB)</span><button type="button" onClick={() => { setFiles(a => a.filter((_, j) => i !== j)); setPrepared(false); }}>{c.remove}</button></li>)}</ul></div>}
          {error && <p role="alert" className="nv-brief__error">{error}</p>}
          <div className="nv-order__actions">{step > 0 && <button type="button" className="nv-btn nv-btn--ghost" onClick={() => { setStep(s => s - 1); setError(''); }}>{step === 3 ? c.edit : c.back}</button>}{step < 3 ? <button type="submit" className="nv-btn nv-btn--primary">{c.next}</button> : <button type="button" disabled={busy} className="nv-btn nv-btn--primary" onClick={download}>{busy ? c.downloading : c.download}</button>}</div>
        </form>
        {step === 3 && <><p className="nv-order__text" role="status">{prepared ? c.ready : c.handoff}</p>{prepared && <div className="nv-order__actions"><a className="nv-btn nv-btn--primary" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${NV_WHATSAPP_NUMBER}?text=${encodeURIComponent(handoffMessage)}`}>{c.send}</a><a className="nv-btn nv-btn--ghost" href={`mailto:${NV_CONTACT_EMAIL}?subject=${encodeURIComponent(c.subject + ': ' + pkg.name)}&body=${encodeURIComponent(handoffMessage)}`}>{c.mail}</a></div>}</>}
        <p className="nv-order__note">{c.noCharge}</p>
      </div>
    </div>
  );
}
