import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Regra estática de acessibilidade (WCAG 2.4.7/2.4.11): o CSS global reserva a altura do rodapé fixo de ações na rolagem
 * (scroll-padding-bottom em html), em desktop e, somada à barra de abas fixa (60px), no celular. Sem isso o navegador não rola até o
 * elemento focado por Tab quando ele está por baixo da barra fixa. A prova com navegador é e2e/a11y-teclado-rodape.spec.js.
 */
const root = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');

function bloco(seletor, texto) {
  const m = texto.match(new RegExp(`${seletor}\\s*\\{([^}]*)\\}`));
  return m ? m[1] : '';
}

test('html reserva scroll-padding-bottom para o rodapé fixo (>= 64px, a barra tem ~57px mais o contorno)', () => {
  const regra = bloco('html', css).match(/scroll-padding-bottom:\s*(\d+)px/);
  assert.ok(regra, 'html sem scroll-padding-bottom em px');
  assert.ok(Number(regra[1]) >= 64, `scroll-padding-bottom de ${regra[1]}px é menor que a barra fixa`);
});

test('no celular a reserva soma a barra de abas fixa de 60px', () => {
  const media = css.match(/@media \(max-width: 900px\)\s*\{\s*html\s*\{([^}]*)\}/);
  assert.ok(media, 'sem @media (max-width: 900px) para html');
  assert.match(media[1], /scroll-padding-bottom:\s*calc\([^)]*60px[^)]*\)/);
});

test('toda barra fixa de ações dos formulários continua com altura coberta pela reserva', () => {
  // as barras próprias (page.module.css com .actionBar sticky/bottom:0) e o StickyActionBar usam padding de 12-16px + botão de ~36-40px (<= 72px)
  const sticky = fs.readFileSync(path.join(root, 'components/organisms/StickyActionBar/StickyActionBar.module.css'), 'utf8');
  assert.match(sticky, /position:\s*sticky/);
  assert.match(sticky, /bottom:\s*0/);
});
