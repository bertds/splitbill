# ---- deps ----
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install curl for tessdata download
RUN apk add --no-cache curl

# NEXT_PUBLIC_* vars must be present at build time (baked into client bundles)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && mkdir -p public

# Pre-download Tesseract English language data so runtime needs no CDN access.
# The file (~8 MB) is copied into the runner image; local.ts points langPath here.
RUN mkdir -p tessdata && \
    curl -sL "https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz" \
         -o "tessdata/eng.traineddata.gz"

# ---- runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Tell local.ts where to find the bundled tessdata
ENV TESSDATA_PATH=/app/tessdata

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Standalone output — only what's needed to run
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Bundled Tesseract language data
COPY --from=builder --chown=nextjs:nodejs /app/tessdata ./tessdata

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
