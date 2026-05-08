# ============================================================
# Dockerfile — 4K to FHD Compressor
# Node.js 20 Alpine + FFmpeg で Next.js standalone を起動
# ============================================================

# ---- ビルドステージ ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- 本番ステージ ----
FROM node:20-alpine AS runner

# FFmpeg をインストール（動画変換に必須）
RUN apk add --no-cache ffmpeg

WORKDIR /app

# standalone モードのサーバーをコピー
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 一時ファイル保存用ディレクトリ
RUN mkdir -p /tmp/4k-compressor

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
