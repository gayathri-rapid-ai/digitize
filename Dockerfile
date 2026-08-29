# Shared build file for the API and admin UI. Select an image with
# `docker build --target admin-api .`, `customer-api`, `admin-ui`, or `ui`.
FROM node:22-alpine AS admin-api-build
WORKDIR /app
COPY digitize-admin-api/package.json digitize-admin-api/package-lock.json ./
RUN npm ci
COPY digitize-admin-api/nest-cli.json digitize-admin-api/tsconfig.json ./
COPY digitize-admin-api/src ./src
RUN npm run build

FROM node:22-alpine AS admin-api
WORKDIR /app
ENV NODE_ENV=production
COPY digitize-admin-api/package.json digitize-admin-api/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=admin-api-build /app/dist ./dist
COPY digitize-admin-api/migrations ./migrations
COPY digitize-admin-api/scripts ./scripts
EXPOSE 3000
CMD ["node", "dist/main"]

FROM node:22-alpine AS customer-api-build
WORKDIR /app
COPY digitize-customer-api/package.json digitize-customer-api/package-lock.json ./
RUN npm ci
COPY digitize-customer-api/nest-cli.json digitize-customer-api/tsconfig.json ./
COPY digitize-customer-api/src ./src
RUN npm run build

FROM node:22-alpine AS customer-api
WORKDIR /app
ENV NODE_ENV=production
COPY digitize-customer-api/package.json digitize-customer-api/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=customer-api-build /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main"]

FROM node:22-alpine AS admin-ui-build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY digitize-admin-ui/package.json digitize-admin-ui/package-lock.json ./
RUN npm ci
COPY digitize-admin-ui ./
RUN npm run build

FROM node:22-alpine AS admin-ui
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY digitize-admin-ui/package.json digitize-admin-ui/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=admin-ui-build /app/.next ./.next
EXPOSE 3000
CMD ["npm", "start"]

FROM node:22-alpine AS ui-build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_CUSTOMER_API_URL=
ENV NEXT_PUBLIC_CUSTOMER_API_URL=$NEXT_PUBLIC_CUSTOMER_API_URL
COPY digitize-ui/package.json digitize-ui/package-lock.json ./
RUN npm ci
COPY digitize-ui ./
RUN npm run build

FROM node:22-alpine AS ui
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY digitize-ui/package.json digitize-ui/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=ui-build /app/.next ./.next
EXPOSE 3000
CMD ["npm", "start"]
