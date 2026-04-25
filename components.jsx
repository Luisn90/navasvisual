// Componentes compartidos para Navas Visual
const { useState, useEffect, useRef, useMemo } = React;

// === HOOKS ===
function useI18n() {
  const [lang, setLang] = useState(() => localStorage.getItem('nv-lang') || 'es');
  useEffect(() => { localStorage.setItem('nv-lang', lang); document.documentElement.lang = lang; }, [lang]);
  const t = window.NV_I18N[lang];
  return { lang, setLang, t };
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-stagger');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// === LOADER ===
function Loader({ onDone }) {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const dur = 1800;
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * 100));
      if (p < 1) raf = requestAnimationFrame(step);
      else {
        setTimeout(() => { setDone(true); setTimeout(onDone, 900); }, 280);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className={`nv-loader ${done ? 'done' : ''}`}>
      <div className="nv-loader__top">
        <span>Navas Visual</span>
        <span>2026</span>
      </div>
      <div>
        <div className="nv-loader__count">
          {String(count).padStart(3, '0')}<small>%</small>
        </div>
      </div>
      <div className="nv-loader__bottom">
        <span>Loading studio</span>
        <span>VEN · ES/EN</span>
      </div>
      <div className="nv-loader__bar" style={{ width: `${count}%` }} />
    </div>
  );
}

// === NAV ===
function Nav({ active, lang, setLang, t, ready, onNavigate }) {
  return (
    <nav className={`nv-nav ${ready ? 'ready' : ''}`}>
      <div className="nv-nav__inner">
        <a href="index.html" onClick={(e) => { e.preventDefault(); onNavigate('index.html'); }} className="nv-nav__logo">
          <span className="nv-nav__logo-mark">N</span>
          <span>Navas Visual</span>
        </a>
        <div className="nv-nav__links">
          {[
            { k: 'work', href: 'work.html' },
            { k: 'about', href: 'about.html' },
            { k: 'contact', href: 'contact.html' },
          ].map(l => (
            <a key={l.k}
               href={l.href}
               onClick={(e) => { e.preventDefault(); onNavigate(l.href); }}
               className={`nv-nav__link ${active === l.k ? 'active' : ''}`}>
              {t.nav[l.k]}
            </a>
          ))}
        </div>
        <div className="nv-nav__right">
          <div className="nv-lang">
            <button className={lang === 'es' ? 'active' : ''} onClick={() => setLang('es')}>ES</button>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
          <a href="contact.html" onClick={(e) => { e.preventDefault(); onNavigate('contact.html'); }} className="nv-nav__cta">
            <span className="nv-nav__cta-dot" />
            {lang === 'es' ? 'Disponible' : 'Available'}
          </a>
        </div>
      </div>
    </nav>
  );
}

// === FOOTER ===
function Footer({ t, lang, onNavigate }) {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      // Venezuela = UTC-4
      const vt = new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + (-4 * 3600000));
      setTime(vt.toTimeString().slice(0, 8) + ' VET');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="nv-footer">
      <div className="nv-container">
        <div className="nv-footer__cta">
          <a href="contact.html" onClick={(e) => { e.preventDefault(); onNavigate('contact.html'); }}>
            {t.footer.cta}
          </a>
        </div>
        <div className="nv-footer__cols">
          <div className="nv-footer__col">
            <h4>{lang === 'es' ? 'Estudio' : 'Studio'}</h4>
            <ul>
              <li><a href="about.html" onClick={(e) => { e.preventDefault(); onNavigate('about.html'); }}>{t.nav.about}</a></li>
              <li><a href="work.html" onClick={(e) => { e.preventDefault(); onNavigate('work.html'); }}>{t.nav.work}</a></li>
              <li><a href="contact.html" onClick={(e) => { e.preventDefault(); onNavigate('contact.html'); }}>{t.nav.contact}</a></li>
            </ul>
          </div>
          <div className="nv-footer__col">
            <h4>{lang === 'es' ? 'Redes' : 'Social'}</h4>
            <ul>
              <li><a href="#">Instagram</a></li>
              <li><a href="#">Behance</a></li>
              <li><a href="#">LinkedIn</a></li>
            </ul>
          </div>
          <div className="nv-footer__col">
            <h4>{lang === 'es' ? 'Contacto' : 'Contact'}</h4>
            <ul>
              <li><a href="mailto:hola@navasvisual.com">hola@navasvisual.com</a></li>
              <li>{time}</li>
            </ul>
          </div>
        </div>
        <div className="nv-footer__bottom">
          <span>{t.footer.copy}</span>
          <span>{t.footer.build}</span>
        </div>
      </div>
    </footer>
  );
}

// === PAGE TRANSITION ===
function PageTransition({ phase }) {
  return <div className={`nv-page-trans ${phase || ''}`} />;
}

// === CUSTOM CURSOR ===
function Cursor() {
  useEffect(() => {
    const el = document.createElement('div');
    el.className = 'nv-cursor';
    document.body.appendChild(el);
    let x = 0, y = 0, tx = 0, ty = 0;
    const onMove = (e) => {
      tx = e.clientX; ty = e.clientY;
      el.classList.add('visible');
      const target = e.target;
      const isHover = target.closest('a, button, .nv-svc-row, .nv-faq-item, .nv-work-card, .nv-process-step');
      el.classList.toggle('hover', !!isHover);
    };
    const tick = () => {
      x += (tx - x) * 0.22; y += (ty - y) * 0.22;
      el.style.left = x + 'px'; el.style.top = y + 'px';
      requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', () => el.classList.remove('visible'));
    tick();
    return () => { window.removeEventListener('mousemove', onMove); el.remove(); };
  }, []);
  return null;
}

// === MARQUEE ===
function Marquee({ items }) {
  const repeated = [...items, ...items, ...items];
  return (
    <section className="nv-marquee" aria-hidden="true">
      <div className="nv-marquee__track">
        {repeated.map((it, i) => (
          <div className="nv-marquee__item" key={i}>{it}</div>
        ))}
      </div>
    </section>
  );
}

// === EYEBROW ===
function Eyebrow({ children }) {
  return <span className="nv-eyebrow">{children}</span>;
}

// === SECTION HEAD (eyebrow + title + lede) ===
function SectionHead({ eyebrow, title, lede, right, layout = 'split' }) {
  return (
    <div className={`nv-services__head reveal-stagger`}>
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="nv-h2" style={{ marginTop: 16 }}>{title}</h2>
      </div>
      <div>
        {lede && <p className="nv-services__lede">{lede}</p>}
        {right}
      </div>
    </div>
  );
}

// === REVEAL HOOK COMPONENT ===
function RevealMount() { useReveal(); return null; }

// Export to window
Object.assign(window, {
  useI18n, useReveal,
  Loader, Nav, Footer, PageTransition, Cursor, Marquee, Eyebrow, SectionHead, RevealMount
});
