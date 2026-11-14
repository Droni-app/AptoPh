# AptoPH API (AdonisJS) for DigitalOcean App Platform
FROM node:24-slim AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile \
 && pnpm turbo run build --filter=@apartadock/api... \
 && pnpm deploy --filter=@apartadock/api --prod --legacy /out \
 && cp -r apps/api/build/. /out/

FROM node:24-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 TZ=UTC
WORKDIR /app
COPY --from=build /out .
EXPOSE 8080
CMD ["node", "bin/server.js"]
