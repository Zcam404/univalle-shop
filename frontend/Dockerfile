# -----------------------------------------------------------------------------
# Imagen del frontend (multi-etapa).
# 1) build: instala dependencias y compila la aplicación React con Vite.
# 2) runtime: Nginx liviano que sirve los archivos estáticos y reenvía /api.
# -----------------------------------------------------------------------------

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
