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

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# O Easypanel baixa o repositório como arquivo (não faz "git clone"), então não existe pasta
# .git no contexto de build — não dá pra rodar "git rev-parse HEAD" aqui. Em compensação, ele
# já injeta o commit publicado sozinho via --build-arg GIT_SHA (confirmado no log de build).
# Grava isso num arquivo VERSION, que GET /api/version lê pra responder qual commit está no ar.
ARG GIT_SHA=unknown
RUN echo "$GIT_SHA" > /app/VERSION

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Saída "standalone": server.js próprio + apenas as dependências realmente usadas em runtime.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
