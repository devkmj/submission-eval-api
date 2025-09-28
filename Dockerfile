FROM node:20-alpine AS build
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --include=dev

COPY . .
COPY prisma ./prisma

RUN npm run build

# ===========================
# Runtime Stage
# ===========================
FROM node:20-alpine AS runtime
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma

CMD ["node", "dist/main.js"]

# ===========================
# E2E Test Stage
# ===========================
FROM build AS e2e
CMD ["npm", "run", "test:e2e"]