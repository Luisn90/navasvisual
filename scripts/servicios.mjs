// Genera las páginas de servicio (servicios/*.html) y el sitemap.xml a partir de i18n.js,
// para que Google tenga una página propia por servicio con sus precios reales.
// Uso: node scripts/servicios.mjs   (vuelve a ejecutarlo si cambian los planes o los textos)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://navasvisual.com';
const WHATSAPP = '584127449626';

export function loadI18n() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8'), ctx);
  return ctx.window.NV_I18N;
}

// Cada página: datos SEO propios + de dónde salen los planes (pestaña de la portada) o, si no hay planes, «a medida».
export const SERVICIOS = [
  { slug: 'logo', tab: 'logo', svc: 'branding', nombre: 'Diseño de logo', h1: 'Diseño de logo',
    title: 'Diseño de logo con taste desde $50 — Navas Visual',
    desc: 'Diseño de logo con taste y buen gusto desde $50: varias propuestas, versiones a color y en negro y archivos PNG, JPG y SVG. Entrega en 3 a 6 días.',
    taste: 'Un logo con taste se nota en lo que no tiene: nada sobra. Elijo cada forma, peso tipográfico y espacio con buen gusto para que tu marca se vea profesional, se recuerde y funcione igual de bien en un avatar diminuto que en un letrero.' },
  { slug: 'identidad-de-marca', tab: 'identidad', svc: 'branding', nombre: 'Identidad de marca', h1: 'Identidad de marca y branding',
    title: 'Identidad de marca y branding con taste desde $200 — Navas Visual',
    desc: 'Identidad visual con taste y buen gusto: logo, paleta, tipografías, manual de marca, papelería y plantillas para redes. Planes desde $200.',
    taste: 'El taste en una identidad es la coherencia: que la paleta, las tipografías y cada pieza hablen el mismo idioma. Diseño sistemas de marca con buen gusto y reglas claras para que se vean cuidados en todas partes, también cuando los usa tu equipo.' },
  { slug: 'diseno-web-wordpress', tab: 'wordpress', svc: 'wordpress', nombre: 'Diseño web en WordPress', h1: 'Diseño web en WordPress',
    title: 'Diseño web en WordPress con taste desde $250 — Navas Visual',
    desc: 'Webs y landing pages en WordPress con taste y buen gusto que puedes editar tú mismo: diseño responsive, SEO básico y formulario. Desde $250.',
    taste: 'Una web con taste no parece una plantilla. Cuido la tipografía, los espacios, las imágenes y el ritmo de cada sección con buen gusto, para que tu web transmita confianza desde el primer segundo y siga siendo fácil de editar.' },
  { slug: 'desarrollo-web-a-medida', tab: 'vibecode', svc: 'vibecode', nombre: 'Desarrollo web y apps a medida', h1: 'Desarrollo web y apps a medida',
    title: 'Webs y apps a medida con IA y taste desde $300 — Navas Visual',
    desc: 'Landing pages, web apps y apps a medida con IA (vibecode) y taste de diseño: código propio, rápido, sin plantillas y con buen gusto. Desde $300.',
    taste: 'La IA permite construir rápido, pero el taste es lo que separa una app genérica de una que da gusto usar. Dirijo cada pantalla con criterio de diseño y buen gusto: jerarquía, microinteracciones y detalles que hacen que tu producto se sienta profesional.' },
  { slug: 'diseno-para-redes-sociales', tab: 'redes', svc: 'grafico', nombre: 'Diseño para redes sociales', h1: 'Diseño gráfico para redes sociales',
    title: 'Plantillas para redes sociales con taste desde $60 — Navas Visual',
    desc: 'Plantillas para Instagram con taste y la identidad de tu marca, editables en Canva o Figma: posts, historias y carruseles. Desde $60.',
    taste: 'En redes, el taste es lo que hace que alguien se detenga en tu perfil. Diseño plantillas con buen gusto y un estilo reconocible para que tu feed se vea cuidado y coherente, aunque las publique cualquiera de tu equipo.' },
  { slug: 'diseno-ui-ux', tab: null, svc: 'uiux', nombre: 'Diseño UI/UX de apps', h1: 'Diseño UI/UX de apps y productos digitales',
    title: 'Diseño UI/UX con taste para apps y productos — Navas Visual',
    desc: 'Diseño UI/UX con taste para apps móviles y productos digitales: del wireframe al prototipo navegable listo para desarrollar. Presupuesto a medida.',
    taste: 'En producto, el taste es el buen gusto al servicio del uso: interfaces claras, consistentes y agradables que la gente entiende sin explicaciones. Hoy los equipos lo piden como requisito, y es lo que aporto en cada flujo, componente y prototipo.' },
  { slug: 'diseno-web-framer', tab: null, svc: 'framer', nombre: 'Diseño web en Framer', h1: 'Diseño web en Framer',
    title: 'Diseño web en Framer con taste — Navas Visual',
    desc: 'Webs en Framer con taste: animaciones, buen gusto y CMS visual para marcas que quieren destacar. Presupuesto a medida según tu proyecto.',
    taste: 'Framer da libertad total, y por eso el taste importa más: animaciones con propósito, tipografía cuidada y detalles con buen gusto que hacen que tu marca destaque sin parecer recargada.' }
];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + Number(n).toLocaleString('de-DE');
const LOGO = '<svg width="30" height="30" viewBox="0 0 87 87" aria-hidden="true"><path d="M44.23 0H24.17L0 41.98H20.06L44.23 0Z" fill="#3a3a3a"/><path d="M58.9708 0H57.0508L17.6108 68.81C13.1708 76.56 18.7608 86.21 27.6908 86.21L68.0908 15.74C72.1108 8.73 67.0508 0 58.9708 0Z" fill="#3a3a3a"/><path d="M86.1206 44.23H66.0606L41.8906 86.21C54.3006 86.21 65.7706 79.58 71.9606 68.82L86.1206 44.22V44.23Z" fill="#3a3a3a"/></svg>';

export function datosServicio(s, es) {
  const item = es.svc.items.find(i => i.id === s.svc);
  const tab = s.tab ? es.shop.tabs.find(t => t.id === s.tab) : null;
  const plans = tab ? tab.plans.map((p, i) => ({ ...p, tier: es.shop.tiers[i] })) : [];
  return { item, tab, plans, desde: plans.length ? Math.min(...plans.map(p => p.price)) : null };
}

export function paginaServicio(s, es) {
  const { item, tab, plans, desde } = datosServicio(s, es);
  const url = `${SITE}/servicios/${s.slug}`;
  const cat = (tab?.cats || item.cats)[0];
  const ordenar = s.tab ? `/?service=${s.tab}#planes` : `/solicitar?service=${s.svc}`;
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Service', name: s.nombre, serviceType: s.nombre, description: s.desc, url,
      provider: { '@type': 'ProfessionalService', name: 'Navas Visual', url: SITE + '/', image: SITE + '/compartir.jpg', founder: { '@type': 'Person', name: 'Luis Navas' } },
      areaServed: 'Worldwide', availableLanguage: ['es', 'en'], slogan: 'Diseño con taste',
      ...(plans.length ? { offers: plans.map(p => ({ '@type': 'Offer', name: `${s.nombre} · ${p.tier}`, price: p.price, priceCurrency: 'USD', url, availability: 'https://schema.org/InStock' })) } : {}) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Navas Visual', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Servicios', item: SITE + '/#servicios' },
      { '@type': 'ListItem', position: 3, name: s.nombre, item: url } ] }
  ];
  const planes = plans.length ? `<h2>Planes y precios</h2>
      <p class="sv-note">${esc(tab.note)} Precios en dólares.</p>
      <div class="sv-plans">${plans.map(p => `
        <article class="sv-plan${p.featured ? ' sv-plan--featured' : ''}">
          <div class="sv-plan__head"><h3>${esc(p.tier)}</h3>${p.featured ? '<span>Más elegido</span>' : ''}</div>
          <p class="sv-plan__price">${money(p.price)}</p>
          <p class="sv-plan__terms">Entrega en ${p.days} días · ${p.revisions} revisiones</p>
          <ul>${p.includes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          <a class="sv-btn${p.featured ? ' sv-btn--light' : ''}" href="${ordenar}">Empezar mi proyecto</a>
        </article>`).join('')}
      </div>` : `<h2>Presupuesto a medida</h2>
      <p class="sv-note">Cada proyecto es distinto, así que preparo un presupuesto personalizado con conceptos, plazos y condiciones, que puedes ver y aceptar en línea.</p>
      <p><a class="sv-btn" href="/solicitar?service=${s.tab || s.svc}">Pedir presupuesto</a></p>`;
  const otros = SERVICIOS.filter(o => o.slug !== s.slug);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(s.title)}</title>
<meta name="description" content="${esc(s.desc)}" />
<link rel="canonical" href="${url}" />
<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/assets/icons/icon-192.png" type="image/png" sizes="192x192" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Navas Visual" />
<meta property="og:locale" content="es_ES" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${esc(s.title)}" />
<meta property="og:description" content="${esc(s.desc)}" />
<meta property="og:image" content="${SITE}/compartir.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Elms+Sans:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/servicios/servicio.css" />
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body>
<header class="sv-nav">
  <a class="sv-brand" href="/" aria-label="Navas Visual, inicio">${LOGO}<span><b>Navas Visual</b><small>Diseño visual digital</small></span></a>
  <nav aria-label="Principal"><a href="/work">Trabajo</a><a href="/#planes">Planes</a><a href="/about">Sobre mí</a><a href="/contact" class="sv-nav__cta">Contacto</a></nav>
</header>
<main>
  <nav class="sv-crumbs" aria-label="Ruta"><a href="/">Inicio</a> / <a href="/#servicios">Servicios</a> / <span>${esc(s.nombre)}</span></nav>
  <section class="sv-hero">
    <p class="sv-eyebrow">Servicio${desde ? ` · desde ${money(desde)}` : ''}</p>
    <h1>${esc(s.h1)}</h1>
    <p class="sv-lede">${esc(item.d)}</p>
    <div class="sv-actions">
      <a class="sv-btn" href="${s.tab ? ordenar : `/solicitar?service=${s.svc}`}">${s.tab ? 'Ver planes y empezar' : 'Pedir presupuesto'}</a>
      <a class="sv-btn sv-btn--ghost" href="/work?cat=${encodeURIComponent(cat)}">Ver trabajos</a>
      <a class="sv-btn sv-btn--ghost" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola Luis, quiero información sobre: ${s.nombre}`)}" target="_blank" rel="noopener">Escribir por WhatsApp</a>
    </div>
  </section>
  <section class="sv-section">
      ${planes}
  </section>
  <section class="sv-section">
    <h2>Diseño con taste</h2>
    <p class="sv-note">${esc(s.taste)}</p>
  </section>
  <section class="sv-section">
    <h2>Cómo trabajamos</h2>
    <ol class="sv-steps">${es.process.steps.map(p => `<li><b>${esc(p.t)}</b><span>${esc(p.d)}</span></li>`).join('')}</ol>
  </section>
  <section class="sv-section">
    <h2>Otros servicios</h2>
    <ul class="sv-others">${otros.map(o => `<li><a href="/servicios/${o.slug}">${esc(o.nombre)}</a></li>`).join('')}</ul>
  </section>
</main>
<footer class="sv-footer">
  <p>Navas Visual · Estudio de diseño de Luis Navas · <a href="mailto:hola@navasvisual.com">hola@navasvisual.com</a> · <a href="https://instagram.com/navasvisual.design" target="_blank" rel="noopener">Instagram</a></p>
  <p>${esc(es.footer.copy)}</p>
</footer>
</body>
</html>
`;
}

export function sitemap() {
  const urls = ['/', '/work', '/about', '/contact', '/solicitar', ...SERVICIOS.map(s => `/servicios/${s.slug}`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}
</urlset>
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const es = loadI18n().es;
  fs.mkdirSync(path.join(ROOT, 'servicios'), { recursive: true });
  for (const s of SERVICIOS) fs.writeFileSync(path.join(ROOT, 'servicios', `${s.slug}.html`), paginaServicio(s, es));
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap());
  console.log(`Generadas ${SERVICIOS.length} páginas de servicio y sitemap.xml`);
}
