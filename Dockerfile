# Shared build file for the API and admin UI. Select an image with
# `docker build --target api .` or `docker build --target admin .`.
FROM node:22-alpine AS api-build
WORKDIR /app
COPY digitize-api/package.json digitize-api/package-lock.json ./
RUN npm ci
COPY digitize-api/nest-cli.json digitize-api/tsconfig.json ./
COPY digitize-api/src ./src
RUN npm run build

FROM node:22-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
COPY digitize-api/package.json digitize-api/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=api-build /app/dist ./dist
COPY digitize-api/migrations ./migrations
COPY digitize-api/scripts ./scripts
EXPOSE 3000
CMD ["node", "dist/main"]

FROM node:22-alpine AS admin-build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY digitize-admin-ui/package.json digitize-admin-ui/package-lock.json ./
RUN npm ci
COPY digitize-admin-ui ./
RUN npm run build

FROM node:22-alpine AS admin
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY digitize-admin-ui/package.json digitize-admin-ui/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=admin-build /app/.next ./.next
EXPOSE 3000
CMD ["npm", "start"]
