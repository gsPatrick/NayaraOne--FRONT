# Nayara One — Frontend (Next.js 14, App Router)
# Build multi-stage enxuto usando output "standalone" do Next.js.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Estágio isolado só para capturar o commit real que o build está usando (mesmo padrão do
# Dockerfile da API) — permite que GET /api/version confirme, sem depender de passo manual,
# qual versão está de fato publicada num ambiente. .git nunca chega no estágio runner: o
# runner só copia arquivos pontuais (saída "standalone"), nunca "COPY . .".
FROM node:20-alpine AS version
WORKDIR /app
RUN apk add --no-cache git
COPY .git ./.git
RUN git rev-parse HEAD > /VERSION || echo "unknown" > /VERSION

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Saída "standalone": server.js próprio + apenas as dependências realmente usadas em runtime.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=version --chown=nextjs:nodejs /VERSION ./VERSION

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
