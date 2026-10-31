import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadI18n, SERVICIOS, paginaServicio, sitemap, datosServicio } from '../scripts/servicios.mjs';

const es = loadI18n().es;

test('las páginas de servicio están al día con los planes (si falla: node scripts/servicios.mjs)', () => {
  for (const s of SERVICIOS) {
    assert.equal(fs.readFileSync(`servicios/${s.slug}.html`, 'utf8'), paginaServicio(s, es), `servicios/${s.slug}.html desactualizada`);
  }
  assert.equal(fs.readFileSync('sitemap.xml', 'utf8'), sitemap());
});

test('cada página tiene título, descripción, canonical y datos estructurados válidos', () => {
  for (const s of SERVICIOS) {
    const html = paginaServicio(s, es);
    assert.match(html, /<title>[^<]{20,70}<\/title>/);
    assert.ok(s.desc.length <= 165, `${s.slug}: descripción larga`);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://navasvisual.com/servicios/${s.slug}"`));
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(ld[0]['@type'], 'Service');
    const { plans, desde } = datosServicio(s, es);
    if (plans.length) {
      assert.equal(ld[0].offers.length, plans.length);
      assert.ok(s.title.includes(`$${desde}`), `${s.slug}: el título debe decir «desde $${desde}»`);
    }
  }
});

test('robots y sitemap', () => {
  const robots = fs.readFileSync('robots.txt', 'utf8');
  assert.match(robots, /Sitemap: https:\/\/navasvisual.com\/sitemap.xml/);
  assert.match(robots, /Disallow: \/admin.html/);
  for (const s of SERVICIOS) assert.match(sitemap(), new RegExp(`/servicios/${s.slug}<`));
  assert.ok(!sitemap().includes('.html'), 'el sitemap usa direcciones sin .html');
  const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.equal(vercel.cleanUrls, true);
  const home = fs.readFileSync('index.html', 'utf8');
  JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
});
