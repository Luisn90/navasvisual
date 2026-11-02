// Página Solicitar - formulario guiado (wizard) para pedir un servicio.
// El cliente elige el servicio, responde unas preguntas cortas y deja sus datos de contacto al final.
// La solicitud llega a Luis por correo y Telegram mediante /api/contacto.

const SOL_COPY = {
  es: {
    eyebrow: 'Solicitar servicio',
    title: 'Cuéntame qué', title2: 'necesitas',
    lede: 'Responde unas preguntas rápidas y te envío una propuesta. Toma unos 2 minutos y no tiene ningún costo.',
    steps: ['Servicio', 'Detalles', window.NV_PLANES_ACTIVOS ? 'Plan y plazo' : 'Presupuesto y plazo', 'Tu proyecto', 'Contacto'],
    stepOf: (a, b) => `Paso ${a} de ${b}`,
    q: {
      service: '¿Qué servicio necesitas?',
      details: 'Cuéntame un poco más',
      plan: '¿Qué plan te interesa?',
      budget: '¿Cuál es tu presupuesto aproximado?',
      timing: '¿Para cuándo lo necesitas?',
      project: 'Háblame de tu proyecto',
      contact: '¿Cómo te contacto?'
    },
    hint: {
      service: 'Elige el que más se acerque. Si no lo tienes claro, elige «No estoy seguro».',
      details: 'Elige las opciones que apliquen. Puedes marcar varias donde lo indique.',
      plan: window.NV_PLANES_ACTIVOS ? 'Es orientativo: revisamos juntos el alcance antes de cualquier pago.' : 'Es orientativo: me ayuda a proponerte algo que encaje contigo.',
      project: 'Con esto preparo una propuesta que encaje con tu marca.',
      contact: 'Último paso. Te respondo en menos de 24 horas.'
    },
    multi: 'Puedes elegir varias',
    custom: 'Necesito algo a medida', unsure: 'Aún no lo sé',
    days: 'días', from: 'desde',
    budgets: ['Menos de $300', '$300 – $700', '$700 – $1.500', 'Más de $1.500', 'Aún no lo sé'],
    timings: ['Lo antes posible', 'En 2 a 4 semanas', 'En 1 a 2 meses', 'Sin prisa'],
    f: {
      brand: 'Nombre de tu marca o negocio', business: '¿A qué se dedica?', description: '¿Qué necesitas conseguir?',
      descHint: 'Por ejemplo: «Abro una cafetería y necesito un logo cercano y moderno».',
      links: 'Webs o referencias que te gusten (opcional)', linksHint: 'Pega enlaces o nombres, uno por línea.',
      name: 'Tu nombre', email: 'Correo electrónico', phone: 'WhatsApp', phoneOpt: 'WhatsApp (opcional)',
      phoneHint: 'Con código de país, por ejemplo +58 412 1234567.', prefer: '¿Por dónde prefieres que te responda?',
      email_opt: 'Correo', wa_opt: 'WhatsApp'
    },
    optional: 'opcional',
    back: 'Atrás', next: 'Continuar', send: 'Enviar solicitud', sending: 'Enviando…',
    review: 'Resumen de tu solicitud', edit: 'Editar',
    privacy: 'Al enviar, compartes estas respuestas con Luis Navas solo para preparar tu propuesta.',
    err: {
      service: 'Elige un servicio para continuar.', details: 'Responde las preguntas marcadas para continuar.',
      plan: window.NV_PLANES_ACTIVOS ? 'Elige una opción de plan o presupuesto.' : 'Elige un presupuesto aproximado.', timing: 'Indica para cuándo lo necesitas.',
      description: 'Cuéntame en una frase qué necesitas (mínimo 10 caracteres).',
      name: 'Escribe tu nombre.', nameBad: 'Escribe solo tu nombre, sin enlaces.', email: 'Revisa tu correo: parece incompleto.',
      phone: 'Revisa el número de WhatsApp: usa solo números y el código de país.',
      phoneReq: 'Si prefieres WhatsApp, déjame tu número.',
      send: 'No se pudo enviar. Tus respuestas siguen aquí: inténtalo de nuevo o escríbeme por WhatsApp.',
      rate: 'Hiciste varios intentos seguidos. Espera unos minutos o escríbeme por WhatsApp.'
    },
    draft: 'Recuperé lo que habías respondido en este dispositivo.', restart: 'Empezar de cero',
    doneTitle: '¡Solicitud enviada!',
    doneBody: (n, email) => `Gracias, ${n}. Revisaré tus respuestas y te enviaré una propuesta en menos de 24 horas. También te llegó una copia a ${email}.`,
    doneWa: 'Escribirme por WhatsApp', doneHome: 'Volver al inicio', doneWork: 'Ver mis trabajos',
    waText: (n, s) => `Hola Luis, soy ${n}. Acabo de enviarte una solicitud de ${s} desde la web.`,
    summary: { service: 'Servicio', plan: 'Plan', budget: 'Presupuesto', timing: 'Plazo', brand: 'Marca', business: 'A qué se dedica', links: 'Referencias', description: 'Lo que necesita' }
  },
  en: {
    eyebrow: 'Request a service',
    title: 'Tell me what', title2: 'you need',
    lede: 'Answer a few quick questions and I’ll send you a proposal. It takes about 2 minutes and it’s free.',
    steps: ['Service', 'Details', window.NV_PLANES_ACTIVOS ? 'Plan & timing' : 'Budget & timing', 'Your project', 'Contact'],
    stepOf: (a, b) => `Step ${a} of ${b}`,
    q: {
      service: 'Which service do you need?',
      details: 'Tell me a bit more',
      plan: 'Which plan are you interested in?',
      budget: 'What is your approximate budget?',
      timing: 'When do you need it?',
      project: 'Tell me about your project',
      contact: 'How can I reach you?'
    },
    hint: {
      service: 'Pick the closest one. If you’re not sure, choose “Not sure yet”.',
      details: 'Pick the options that apply. You can choose several where noted.',
      plan: window.NV_PLANES_ACTIVOS ? 'This is just a guide: we review the scope together before any payment.' : 'Just a guide: it helps me propose something that fits you.',
      project: 'This helps me prepare a proposal that fits your brand.',
      contact: 'Last step. I reply within 24 hours.'
    },
    multi: 'Choose as many as you like',
    custom: 'I need something custom', unsure: 'Not sure yet',
    days: 'days', from: 'from',
    budgets: ['Under $300', '$300 – $700', '$700 – $1,500', 'Over $1,500', 'Not sure yet'],
    timings: ['As soon as possible', 'In 2 to 4 weeks', 'In 1 to 2 months', 'No rush'],
    f: {
      brand: 'Brand or business name', business: 'What does it do?', description: 'What do you need to achieve?',
      descHint: 'For example: “I’m opening a coffee shop and need a friendly, modern logo”.',
      links: 'Websites or references you like (optional)', linksHint: 'Paste links or names, one per line.',
      name: 'Your name', email: 'Email', phone: 'WhatsApp', phoneOpt: 'WhatsApp (optional)',
      phoneHint: 'Include the country code, e.g. +1 555 123 4567.', prefer: 'How would you like me to reply?',
      email_opt: 'Email', wa_opt: 'WhatsApp'
    },
    optional: 'optional',
    back: 'Back', next: 'Continue', send: 'Send request', sending: 'Sending…',
    review: 'Your request', edit: 'Edit',
    privacy: 'By sending, you share these answers with Luis Navas only to prepare your proposal.',
    err: {
      service: 'Choose a service to continue.', details: 'Answer the marked questions to continue.',
      plan: window.NV_PLANES_ACTIVOS ? 'Choose a plan or budget option.' : 'Choose an approximate budget.', timing: 'Tell me when you need it.',
      description: 'Tell me in one sentence what you need (at least 10 characters).',
      name: 'Enter your name.', nameBad: 'Enter just your name, without links.', email: 'Check your email: it looks incomplete.',
      phone: 'Check the WhatsApp number: use digits and the country code only.',
      phoneReq: 'If you prefer WhatsApp, leave me your number.',
      send: 'Couldn’t send. Your answers are still here: try again or message me on WhatsApp.',
      rate: 'Too many attempts in a row. Wait a few minutes or message me on WhatsApp.'
    },
    draft: 'I restored your previous answers on this device.', restart: 'Start over',
    doneTitle: 'Request sent!',
    doneBody: (n, email) => `Thanks, ${n}. I’ll review your answers and send you a proposal within 24 hours. A copy is on its way to ${email}.`,
    doneWa: 'Message me on WhatsApp', doneHome: 'Back to home', doneWork: 'See my work',
    waText: (n, s) => `Hi Luis, I'm ${n}. I just sent you a ${s} request from the website.`,
    summary: { service: 'Service', plan: 'Plan', budget: 'Budget', timing: 'Timing', brand: 'Brand', business: 'Business', links: 'References', description: 'Needs' }
  }
};

// Servicios del wizard. `tab` enlaza con los planes de i18n.js (shop.tabs) para mostrar precios reales.
// Cada pregunta: [id, etiqueta ES, etiqueta EN, opciones ES, opciones EN, múltiple?]
const SOL_SERVICES = [
  { id: 'logo', tab: 'logo', icon: '◆', es: ['Logo', 'Un logo profesional para tu marca'], en: ['Logo', 'A professional logo for your brand'],
    qs: [['kind', '¿Marca nueva o rediseño?', 'New brand or redesign?', ['Marca nueva', 'Rediseño de un logo existente'], ['New brand', 'Redesign of an existing logo']],
         ['uses', '¿Dónde lo usarás?', 'Where will you use it?', ['Redes sociales', 'Web', 'Empaques', 'Letreros', 'Impresos'], ['Social media', 'Website', 'Packaging', 'Signage', 'Print'], true]] },
  { id: 'identidad', tab: 'identidad', icon: '❖', es: ['Identidad de marca', 'Logo, colores, tipografías y manual'], en: ['Brand identity', 'Logo, colors, fonts and guidelines'],
    qs: [['kind', '¿Marca nueva o rediseño?', 'New brand or redesign?', ['Marca nueva', 'Renovar una marca existente'], ['New brand', 'Refresh an existing brand']],
         ['pieces', '¿Qué piezas necesitas además del logo?', 'What do you need besides the logo?', ['Manual de marca', 'Tarjetas y papelería', 'Plantillas para redes', 'Empaques', 'Firma de correo'], ['Brand guidelines', 'Business cards & stationery', 'Social templates', 'Packaging', 'Email signature'], true]] },
  { id: 'wordpress', tab: 'wordpress', icon: '▤', es: ['Web en WordPress', 'Una web que puedes editar tú mismo'], en: ['WordPress website', 'A site you can edit yourself'],
    qs: [['type', '¿Qué tipo de web?', 'What kind of website?', ['Landing de una página', 'Web corporativa', 'Catálogo o tienda', 'Blog o revista'], ['One-page landing', 'Business website', 'Catalog or store', 'Blog or magazine']],
         ['pages', '¿Cuántas páginas, aproximadamente?', 'Roughly how many pages?', ['1', '2 a 5', '6 a 10', 'Más de 10'], ['1', '2 to 5', '6 to 10', 'More than 10']],
         ['hosting', '¿Ya tienes dominio y hosting?', 'Do you have a domain and hosting?', ['Sí', 'No', 'No lo sé'], ['Yes', 'No', 'Not sure']]] },
  { id: 'framer', tab: null, icon: '◐', es: ['Web en Framer', 'Web con animaciones y CMS visual'], en: ['Framer website', 'Animated site with a visual CMS'],
    qs: [['type', '¿Qué tipo de web?', 'What kind of website?', ['Landing de una página', 'Web corporativa', 'Portafolio', 'Web de producto o startup'], ['One-page landing', 'Business website', 'Portfolio', 'Product or startup site']],
         ['pages', '¿Cuántas páginas, aproximadamente?', 'Roughly how many pages?', ['1', '2 a 5', '6 a 10', 'Más de 10'], ['1', '2 to 5', '6 to 10', 'More than 10']],
         ['extras', '¿Qué necesitas incluir?', 'What should it include?', ['Animaciones', 'Blog o CMS', 'Dos idiomas', 'Formularios'], ['Animations', 'Blog or CMS', 'Two languages', 'Forms'], true]] },
  { id: 'vibecode', tab: 'vibecode', icon: '⌘', es: ['Web o app a medida', 'Desarrollo con IA, sin plantillas'], en: ['Custom web or app', 'AI-built, no templates'],
    qs: [['type', '¿Qué quieres construir?', 'What do you want to build?', ['Landing page', 'Web app', 'App móvil', 'Herramienta interna'], ['Landing page', 'Web app', 'Mobile app', 'Internal tool']],
         ['features', '¿Qué funciones necesita?', 'Which features does it need?', ['Inicio de sesión', 'Base de datos y panel', 'Pagos', 'Reservas o citas', 'Integraciones'], ['User login', 'Database & admin panel', 'Payments', 'Bookings', 'Integrations'], true]] },
  { id: 'uiux', tab: null, icon: '▢', es: ['Diseño UI/UX', 'Apps y productos digitales'], en: ['UI/UX design', 'Apps and digital products'],
    qs: [['type', '¿Qué diseñamos?', 'What are we designing?', ['App móvil', 'Web app o SaaS', 'Rediseño de un producto existente'], ['Mobile app', 'Web app or SaaS', 'Redesign of an existing product']],
         ['stage', '¿En qué punto está?', 'Where is it now?', ['Solo es una idea', 'Tengo bocetos o wireframes', 'Ya existe y quiero mejorarlo'], ['Just an idea', 'I have sketches or wireframes', 'It exists and needs improving']],
         ['deliver', '¿Qué necesitas recibir?', 'What do you need delivered?', ['Wireframes', 'Diseño visual', 'Prototipo navegable', 'Sistema de diseño'], ['Wireframes', 'Visual design', 'Clickable prototype', 'Design system'], true]] },
  { id: 'redes', tab: 'redes', icon: '◎', es: ['Diseño para redes', 'Plantillas editables para tu feed'], en: ['Social media design', 'Editable templates for your feed'],
    qs: [['networks', '¿Para qué redes?', 'Which networks?', ['Instagram', 'Facebook', 'TikTok', 'LinkedIn'], ['Instagram', 'Facebook', 'TikTok', 'LinkedIn'], true],
         ['pieces', '¿Qué piezas necesitas?', 'Which pieces do you need?', ['Posts', 'Historias', 'Carruseles', 'Portadas de destacados'], ['Posts', 'Stories', 'Carousels', 'Highlight covers'], true],
         ['brand', '¿Ya tienes identidad de marca?', 'Do you already have a brand identity?', ['Sí, tengo logo y colores', 'Solo el logo', 'Todavía no'], ['Yes, logo and colors', 'Only the logo', 'Not yet']]] },
  { id: 'otro', tab: null, icon: '?', es: ['No estoy seguro', 'Te ayudo a elegir'], en: ['Not sure yet', 'I’ll help you choose'],
    qs: [['area', '¿Qué se acerca más a lo que buscas?', 'What is closest to what you need?', ['Imagen de marca', 'Una web', 'Una app', 'Piezas gráficas', 'Varias cosas'], ['Brand image', 'A website', 'An app', 'Graphic pieces', 'Several things']]] }
];

// Acepta tanto los ids del wizard como los de la sección de servicios de la portada.
const SOL_ALIAS = { branding: 'logo', grafico: 'redes' };
const SOL_DRAFT = 'nv-solicitar-draft';
const SOL_EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i;
const SOL_PHONE = /^\+?[0-9 ()\-.]{7,25}$/;
const SOL_EMPTY = { service: '', answers: {}, plan: '', budget: '', timing: '', brand: '', business: '', description: '', links: '', name: '', email: '', phone: '', prefer: 'email' };

function SolChoice({ name, options, value, multi, onChange, error }) {
  const selected = multi ? (Array.isArray(value) ? value : []) : value;
  const toggle = i => {
    if (!multi) return onChange(i);
    onChange(selected.includes(i) ? selected.filter(x => x !== i) : [...selected, i].sort((a, b) => a - b));
  };
  return <div className={`nv-sol__chips ${error ? 'is-error' : ''}`}>
    {options.map((label, i) => {
      const on = multi ? selected.includes(i) : selected === i;
      return <label key={i} className={`nv-sol__chip ${on ? 'is-on' : ''}`}>
        <input type={multi ? 'checkbox' : 'radio'} name={name} checked={on} onChange={() => toggle(i)} />
        {multi && <span className="nv-sol__check" aria-hidden="true">{on ? '✓' : ''}</span>}
        {label}
      </label>;
    })}
  </div>;
}

function SolicitarApp() {
  const { lang, setLang, t } = useI18n();
  const c = SOL_COPY[lang === 'en' ? 'en' : 'es'];
  const L = lang === 'en' ? 'en' : 'es';
  const [ready, setReady] = React.useState(false);
  const [transPhase, setTransPhase] = React.useState('in');
  const [restored, setRestored] = React.useState(false);
  const [v, setV] = React.useState(() => {
    const param = new URLSearchParams(window.location.search).get('service') || '';
    const fromUrl = SOL_SERVICES.some(s => s.id === (SOL_ALIAS[param] || param)) ? (SOL_ALIAS[param] || param) : '';
    try {
      const saved = JSON.parse(localStorage.getItem(SOL_DRAFT) || 'null');
      if (saved && saved.v && Date.now() - saved.at < 14 * 864e5 && (!fromUrl || saved.v.service === fromUrl)) return { ...SOL_EMPTY, ...saved.v, _restored: true, _step: saved.step || 0 };
    } catch {}
    return { ...SOL_EMPTY, service: fromUrl, _step: fromUrl ? 1 : 0 };
  });
  const [step, setStep] = React.useState(v._step || 0);
  const [error, setError] = React.useState('');
  const [missing, setMissing] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(null);
  const [website, setWebsite] = React.useState('');
  const heading = React.useRef(null);
  const firstRender = React.useRef(true);

  React.useEffect(() => {
    setTimeout(() => setReady(true), 100);
    setTimeout(() => setTransPhase(null), 950);
    if (v._restored) setRestored(true);
    setV(({ _restored, _step, ...rest }) => rest);
  }, []);

  const navigate = href => { setTransPhase('out'); setTimeout(() => { window.location.href = href; }, 600); };

  const svc = SOL_SERVICES.find(s => s.id === v.service);
  const tab = svc?.tab ? t.shop.tabs.find(x => x.id === svc.tab) : null;
  // Planes en pausa (ver i18n.js): sin planes, el paso 3 pregunta el presupuesto aproximado.
  const plans = tab && window.NV_PLANES_ACTIVOS ? tab.plans : [];

  // Borrador: se guarda en este dispositivo mientras responden y se borra al enviar.
  React.useEffect(() => {
    try {
      if (done) { localStorage.removeItem(SOL_DRAFT); return; }
      const { _restored, _step, ...rest } = v;
      if (rest.service) localStorage.setItem(SOL_DRAFT, JSON.stringify({ v: rest, step, at: Date.now() }));
    } catch {}
  }, [v, step, done]);

  React.useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    heading.current?.focus({ preventScroll: true });
    const top = heading.current?.closest('.nv-sol__card')?.getBoundingClientRect().top;
    if (top !== undefined && top < 80) window.scrollBy({ top: top - 100, behavior: 'smooth' });
  }, [step, done]);

  const set = (k, val) => { setV(s => ({ ...s, [k]: val })); setError(''); setMissing(m => m.filter(x => x !== k)); };
  const setAnswer = (k, val) => { setV(s => ({ ...s, answers: { ...s.answers, [k]: val } })); setError(''); setMissing(m => m.filter(x => x !== 'q:' + k)); };

  const pickService = id => {
    // Al cambiar de servicio, las respuestas y el plan anteriores ya no aplican.
    setV(s => s.service === id ? s : { ...s, service: id, answers: {}, plan: '', budget: '' });
    setError(''); setMissing([]);
    setTimeout(() => setStep(1), 220);
  };

  const planLabel = () => {
    if (v.plan === 'custom') return c.custom;
    if (v.plan === 'unsure') return c.unsure;
    const i = Number(v.plan), p = plans[i];
    return p ? `${t.shop.tiers[i]} · $${p.price}` : '';
  };

  const validate = s => {
    const miss = [];
    let msg = '';
    if (s === 0 && !v.service) msg = c.err.service;
    if (s === 1 && svc) {
      svc.qs.forEach(([id, , , , , multi]) => { if (!multi && v.answers[id] === undefined) miss.push('q:' + id); });
      if (miss.length) msg = c.err.details;
    }
    if (s === 2) {
      if (plans.length ? !v.plan : v.budget === '') { miss.push(plans.length ? 'plan' : 'budget'); msg = c.err.plan; }
      if (v.timing === '') { miss.push('timing'); msg = msg || c.err.timing; }
    }
    if (s === 3 && v.description.trim().length < 10) { miss.push('description'); msg = c.err.description; }
    if (s === 4) {
      if (!v.name.trim()) { miss.push('name'); msg = c.err.name; }
      if (!SOL_EMAIL.test(v.email.trim())) { miss.push('email'); msg = msg || c.err.email; }
      if (v.prefer === 'whatsapp' && !v.phone.trim()) { miss.push('phone'); msg = msg || c.err.phoneReq; }
      else if (v.phone.trim() && !SOL_PHONE.test(v.phone.trim())) { miss.push('phone'); msg = msg || c.err.phone; }
    }
    setMissing(miss); setError(msg);
    return !msg;
  };

  const details = () => {
    const rows = [[c.summary.service, svc ? svc[L][0] : '']];
    svc?.qs.forEach(([id, es, en, oEs, oEn, multi]) => {
      const opts = L === 'en' ? oEn : oEs, a = v.answers[id];
      const text = multi ? (Array.isArray(a) ? a.map(i => opts[i]).join(', ') : '') : (a !== undefined ? opts[a] : '');
      if (text) rows.push([L === 'en' ? en : es, text]);
    });
    if (plans.length) rows.push([c.summary.plan, planLabel()]);
    else if (v.budget !== '') rows.push([c.summary.budget, c.budgets[v.budget]]);
    if (v.timing !== '') rows.push([c.summary.timing, c.timings[v.timing]]);
    if (v.brand.trim()) rows.push([c.summary.brand, v.brand.trim()]);
    if (v.business.trim()) rows.push([c.summary.business, v.business.trim()]);
    if (v.links.trim()) rows.push([c.summary.links, v.links.trim().split(/\n+/).join(' · ')]);
    return rows.filter(r => r[1]);
  };

  const submit = async () => {
    if (busy || !validate(4)) return;
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/contacto', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'wizard', lang: L, website,
          name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), prefer: v.prefer,
          company: v.brand.trim(), service: svc ? svc[L][0] : '', message: v.description.trim(), details: details()
        }),
        signal: AbortSignal.timeout(30000)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data.error === 'email') { setMissing(['email']); setError(c.err.email); }
        else if (data.error === 'phone') { setMissing(['phone']); setError(c.err.phone); }
        else if (data.error === 'name') { setMissing(['name']); setError(c.err.nameBad); }
        else setError(res.status === 429 ? c.err.rate : c.err.send);
        return;
      }
      setDone({ name: v.name.trim().split(' ')[0], email: v.email.trim(), service: svc ? svc[L][0] : '' });
    } catch { setError(c.err.send); } finally { setBusy(false); }
  };

  const next = e => {
    e.preventDefault();
    if (!validate(step)) return;
    if (step === 4) { submit(); return; }
    setStep(s => s + 1);
  };
  const back = () => { setError(''); setMissing([]); setStep(s => Math.max(0, s - 1)); };
  const restart = () => {
    try { localStorage.removeItem(SOL_DRAFT); } catch {}
    setV({ ...SOL_EMPTY }); setStep(0); setRestored(false); setError(''); setMissing([]);
  };
  const waUrl = done ? `https://wa.me/${NV_WHATSAPP_NUMBER}?text=${encodeURIComponent(c.waText(done.name, done.service))}` : '';
  const total = c.steps.length;
  const titles = [c.q.service, c.q.details, plans.length ? c.q.plan : c.q.budget, c.q.project, c.q.contact];
  const hints = [c.hint.service, c.hint.details, c.hint.plan, c.hint.project, c.hint.contact];
  const bad = k => missing.includes(k);

  const field = (k, label, { type = 'text', area = false, hint, required, auto = 'off', max = 200 } = {}) =>
    <div className={`nv-field nv-sol__field ${bad(k) ? 'is-error' : ''}`}>
      <label htmlFor={`sol-${k}`}>{label}{required ? ' *' : ''}</label>
      {area
        ? <textarea id={`sol-${k}`} rows="3" maxLength={2000} value={v[k]} onChange={e => set(k, e.target.value)} aria-invalid={bad(k) || undefined} aria-describedby={hint ? `sol-${k}-hint` : undefined} />
        : <input id={`sol-${k}`} type={type} maxLength={max} value={v[k]} onChange={e => set(k, e.target.value)} autoComplete={auto} aria-invalid={bad(k) || undefined} aria-describedby={hint ? `sol-${k}-hint` : undefined} />}
      {hint && <small id={`sol-${k}-hint`} className="nv-sol__hint">{hint}</small>}
    </div>;

  const fromPrice = s => {
    const tb = s.tab ? t.shop.tabs.find(x => x.id === s.tab) : null;
    return tb && window.NV_PLANES_ACTIVOS ? Math.min(...tb.plans.map(p => p.price)) : null;
  };

  return (
    <React.Fragment>
      <Cursor />
      <PageTransition phase={transPhase} />
      <header className="nv-sol__top">
        <div className="nv-sol__topbar">
          <a className="nv-sol__logo" href="/" aria-label="Navas Visual" onClick={e => { e.preventDefault(); navigate('/'); }}>
            <LogoSVG size={28} color="#3a3a3a" />
            <span className="nv-nav__wordmark">
              <span className="nv-nav__name">Navas Visual</span>
              <span className="nv-nav__tagline">{L === 'en' ? 'Digital visual design' : 'Diseño visual digital'}</span>
            </span>
          </a>
          <ol className="nv-sol__steps" aria-label={c.eyebrow}>
            {c.steps.map((label, i) => {
              const state = done || i < step ? 'is-done' : i === step ? 'is-active' : '';
              return <li key={label} className={state} aria-current={!done && i === step ? 'step' : undefined}>
                {!done && i < step
                  ? <button type="button" onClick={() => { setError(''); setMissing([]); setStep(i); }}><span>✓</span><em>{label}</em></button>
                  : <span className="nv-sol__stepname"><span>{done || i < step ? '✓' : i + 1}</span><em>{label}</em></span>}
              </li>;
            })}
          </ol>
          <a className="nv-sol__exit" href="/" aria-label={L === 'en' ? 'Exit to home' : 'Salir al inicio'} onClick={e => { e.preventDefault(); navigate('/'); }}>✕</a>
        </div>
        <div className="nv-sol__bar" aria-hidden="true"><span style={{ width: `${done ? 100 : ((step + 1) / total) * 100}%` }} /></div>
      </header>
      <main>
        <section className="nv-sol">
          <div className="nv-container">
            <div className="nv-sol__wrap">
              <div className="nv-sol__card">
                {done ? <div className="nv-sol__done" role="status">
                  <div className="nv-sol__done-mark" aria-hidden="true">✓</div>
                  <h2 ref={heading} tabIndex="-1" className="nv-sol__q">{c.doneTitle}</h2>
                  <p className="nv-sol__p">{c.doneBody(done.name, done.email)}</p>
                  <div className="nv-sol__actions">
                    <a className="nv-btn nv-btn--primary" href={waUrl} target="_blank" rel="noopener noreferrer">{c.doneWa} <span className="nv-btn__arrow">↗</span></a>
                    <a className="nv-btn nv-btn--ghost" href="/work" onClick={e => { e.preventDefault(); navigate('/work'); }}>{c.doneWork}</a>
                  </div>
                  <a className="nv-sol__link" href="/" onClick={e => { e.preventDefault(); navigate('/'); }}>{c.doneHome}</a>
                </div> : <form onSubmit={next} noValidate>
                  <p className="nv-sol__count">{c.stepOf(step + 1, total)}{svc && step > 0 ? ` · ${svc[L][0]}` : ''}</p>
                  <h2 ref={heading} tabIndex="-1" className="nv-sol__q">{titles[step]}</h2>
                  <p className="nv-sol__p">{hints[step]}</p>
                  {restored && <p className="nv-sol__restored" role="status">{c.draft} <button type="button" onClick={restart}>{c.restart}</button></p>}

                  {step === 0 && <div className="nv-sol__services" role="radiogroup" aria-label={c.q.service}>
                    {SOL_SERVICES.map(s => {
                      const price = fromPrice(s);
                      return <button type="button" role="radio" aria-checked={v.service === s.id} key={s.id} className={`nv-sol__svc ${v.service === s.id ? 'is-on' : ''}`} onClick={() => pickService(s.id)}>
                        <span className="nv-sol__svc-icon" aria-hidden="true">{s.icon}</span>
                        <span className="nv-sol__svc-name">{s[L][0]}</span>
                        <span className="nv-sol__svc-desc">{s[L][1]}</span>
                        {price && <span className="nv-sol__svc-price">{c.from} ${price}</span>}
                      </button>;
                    })}
                  </div>}

                  {step === 1 && svc && <div className="nv-sol__group">
                    {svc.qs.map(([id, es, en, oEs, oEn, multi]) => <fieldset key={id} className={`nv-sol__fs ${bad('q:' + id) ? 'is-error' : ''}`}>
                      <legend>{L === 'en' ? en : es}{multi ? <small> · {c.multi}</small> : ' *'}</legend>
                      <SolChoice name={`sol-${id}`} options={L === 'en' ? oEn : oEs} value={v.answers[id]} multi={multi} onChange={val => setAnswer(id, val)} error={bad('q:' + id)} />
                    </fieldset>)}
                  </div>}

                  {step === 2 && <div className="nv-sol__group">
                    {plans.length ? <fieldset className={`nv-sol__fs ${bad('plan') ? 'is-error' : ''}`}>
                      <legend className="nv-sol__sr">{c.q.plan}</legend>
                      <div className="nv-sol__plans">
                        {plans.map((p, i) => <label key={i} className={`nv-sol__plan ${v.plan === String(i) ? 'is-on' : ''}`}>
                          <input type="radio" name="sol-plan" checked={v.plan === String(i)} onChange={() => set('plan', String(i))} />
                          <span className="nv-sol__plan-top"><strong>{t.shop.tiers[i]}</strong>{p.featured && <em>{t.shop.popular}</em>}</span>
                          <span className="nv-sol__plan-price">${p.price}</span>
                          <span className="nv-sol__plan-meta">{p.days} {c.days} · {p.revisions} {t.shop.revisions.toLowerCase()}</span>
                          <ul>{p.includes.slice(0, 3).map(x => <li key={x}>{x}</li>)}</ul>
                        </label>)}
                      </div>
                      <SolChoice name="sol-plan-extra" options={[c.custom, c.unsure]} value={v.plan === 'custom' ? 0 : v.plan === 'unsure' ? 1 : undefined} onChange={i => set('plan', i === 0 ? 'custom' : 'unsure')} />
                    </fieldset> : <fieldset className={`nv-sol__fs ${bad('budget') ? 'is-error' : ''}`}>
                      <legend className="nv-sol__sr">{c.q.budget}</legend>
                      <SolChoice name="sol-budget" options={c.budgets} value={v.budget === '' ? undefined : v.budget} onChange={i => set('budget', i)} />
                    </fieldset>}
                    <fieldset className={`nv-sol__fs ${bad('timing') ? 'is-error' : ''}`}>
                      <legend>{c.q.timing} *</legend>
                      <SolChoice name="sol-timing" options={c.timings} value={v.timing === '' ? undefined : v.timing} onChange={i => set('timing', i)} />
                    </fieldset>
                  </div>}

                  {step === 3 && <div className="nv-sol__group nv-sol__group--fields">
                    <div className="nv-field-row">
                      {field('brand', c.f.brand, { auto: 'organization' })}
                      {field('business', c.f.business)}
                    </div>
                    {field('description', c.f.description, { area: true, hint: c.f.descHint, required: true })}
                    {field('links', c.f.links, { area: true, hint: c.f.linksHint })}
                  </div>}

                  {step === 4 && <div className="nv-sol__group nv-sol__group--fields">
                    <div className="nv-field-row">
                      {field('name', c.f.name, { required: true, auto: 'name', max: 120 })}
                      {field('email', c.f.email, { type: 'email', required: true, auto: 'email', max: 160 })}
                    </div>
                    {field('phone', v.prefer === 'whatsapp' ? c.f.phone : c.f.phoneOpt, { type: 'tel', hint: c.f.phoneHint, required: v.prefer === 'whatsapp', auto: 'tel', max: 25 })}
                    <fieldset className="nv-sol__fs">
                      <legend>{c.f.prefer}</legend>
                      <SolChoice name="sol-prefer" options={[c.f.email_opt, c.f.wa_opt]} value={v.prefer === 'whatsapp' ? 1 : 0} onChange={i => set('prefer', i === 1 ? 'whatsapp' : 'email')} />
                    </fieldset>
                    <details className="nv-sol__review">
                      <summary>{c.review}</summary>
                      <dl>{[...details(), [c.summary.description, v.description.trim()]].map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}</dl>
                    </details>
                    <p className="nv-sol__privacy">{c.privacy}</p>
                  </div>}

                  <div className="nv-sol__trap" aria-hidden="true"><label>Website<input type="text" tabIndex="-1" autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label></div>
                  {error && <p role="alert" className="nv-sol__error">{error}{error === c.err.send || error === c.err.rate ? <> <a href="#" onClick={e => { e.preventDefault(); openWhatsApp(); }}>WhatsApp ↗</a></> : null}</p>}

                  {step > 0 && <div className="nv-sol__actions">
                    <button type="button" className="nv-btn nv-btn--ghost" onClick={back} disabled={busy}>← {c.back}</button>
                    <button type="submit" className="nv-btn nv-btn--primary" disabled={busy}>
                      {step === 4 ? (busy ? c.sending : c.send) : c.next} <span className="nv-btn__arrow">{step === 4 ? '↗' : '→'}</span>
                    </button>
                  </div>}
                </form>}
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="nv-sol__foot">
        <span>© {new Date().getFullYear()} Navas Visual</span>
        <nav aria-label={L === 'en' ? 'Contact' : 'Contacto'}>
          <a href="mailto:hola@navasvisual.com">hola@navasvisual.com</a>
          <a href="https://instagram.com/navasvisual.design" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="#" onClick={e => { e.preventDefault(); openWhatsApp(); }}>WhatsApp</a>
        </nav>
      </footer>
      <RevealMount />
      <WhatsAppModal lang={lang} />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<SolicitarApp />);
