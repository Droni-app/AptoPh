# Builds one of the Vite apps (APP = landing | web | backoffice) into /app/dist.
# App Platform serves that folder as a static site (output_dir in .do/app.yaml).
FROM node:24-slim
ARG APP
WORKDIR /repo
RUN corepack enable
COPY . .
RUN test -n "$APP" \
 && pnpm install --frozen-lockfile \
 && pnpm turbo run build --filter=@apartadock/${APP}... \
 && mkdir -p /app && cp -r apps/${APP}/dist /app/dist
