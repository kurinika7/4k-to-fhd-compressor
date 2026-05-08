#!/bin/bash
# 4K to FHD Compressor - 起動スクリプト
# Finderでダブルクリックするとターミナルが開いてアプリが起動します

cd "$(dirname "$BASH_SOURCE")"

echo "================================"
echo "  4K to FHD Compressor"
echo "================================"
echo ""

# -------------------------------------------------------
# Homebrew の確認
# -------------------------------------------------------
if ! command -v brew &> /dev/null; then
  echo "⚠ Homebrew が見つかりません。インストールしています..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# -------------------------------------------------------
# FFmpeg の確認・インストール
# -------------------------------------------------------
if ! command -v ffmpeg &> /dev/null; then
  echo "📦 FFmpeg が見つかりません。自動インストールしています..."
  echo "   (数分かかることがあります)"
  brew install ffmpeg
  echo ""
fi

echo "✓ FFmpeg: $(ffmpeg -version 2>&1 | head -1 | cut -c1-60)"
echo ""

# -------------------------------------------------------
# Node.js の確認
# -------------------------------------------------------
if ! command -v node &> /dev/null; then
  echo "⚠ Node.js が見つかりません。以下でインストールしてください:"
  echo "  https://nodejs.org/"
  read -p "Enterキーを押すと終了します..."
  exit 1
fi

echo "✓ Node.js: $(node --version)  /  npm: $(npm --version)"
echo ""

# -------------------------------------------------------
# npm install（初回のみ）
# -------------------------------------------------------
if [ ! -d "node_modules" ]; then
  echo "📦 パッケージをインストール中... (初回のみ・数分かかります)"
  npm install
  echo ""
fi

# -------------------------------------------------------
# 開発サーバー起動
# -------------------------------------------------------
echo "🚀 サーバーを起動中..."
echo ""
echo "   ブラウザで以下を開いてください:"
echo "   → http://localhost:3000"
echo ""
echo "   終了するには Ctrl+C を押してください"
echo ""
npm run dev
