# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                        # install all deps (including devDeps for tsc)
COPY . .
RUN npm run build                 # tsc → dist/

# ---- Production stage ----
FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev             # production deps only
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server.js"]