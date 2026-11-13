# -----------------------------------------------------------------------------
# Imagen del servicio de Usuarios (multi-etapa).
# 1) build: instala todas las dependencias y compila TypeScript a dist/.
# 2) runtime: imagen final liviana solo con dist/ y dependencias de producción.
# -----------------------------------------------------------------------------

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# Se ejecuta con el usuario sin privilegios que trae la imagen oficial de Node.
USER node
EXPOSE 3001

# Docker marca el contenedor como "healthy" cuando /health responde 200 (MongoDB arriba).
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3001/health > /dev/null || exit 1

CMD ["node", "dist/main.js"]
