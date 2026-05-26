FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/
RUN npm ci --omit=dev

FROM base AS build
COPY . .
RUN npm ci
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma

EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]

FROM base AS dev
COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/
RUN npm ci
RUN npx prisma generate
COPY . .
CMD ["sh", "-c", "npx prisma db push --skip-generate || true && npm run dev"]
