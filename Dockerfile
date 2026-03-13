FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache python3 make g++ sqlite

COPY package.json package-lock.json ./
RUN npm i

FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++ sqlite

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache sqlite

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/database.sqlite

RUN mkdir -p /app/data && chmod 777 /app/data

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
