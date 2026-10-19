// Lint do Front (Guia §13 — etapa "lint" do CI). Flat config com o preset oficial do Next.js
// (next/core-web-vitals), sem regras desligadas. Roda em modo não interativo: `npm run lint`.
import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const compat = new FlatCompat({ baseDirectory: path.dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: ['.claude/**', '.next/**', 'node_modules/**', 'public/**', 'e2e/**/*.png', 'out/**'] },
  ...compat.extends('next/core-web-vitals'),
];

export default config;
