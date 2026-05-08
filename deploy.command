#!/bin/bash
# ============================================================
# deploy.command — GitHub へプッシュするセットアップスクリプト
# このファイルをダブルクリックして実行してください
# ============================================================

cd "$(dirname "$BASH_SOURCE")"

echo "================================"
echo "  4K to FHD Compressor"
echo "  GitHub デプロイセットアップ"
echo "================================"
echo ""

# git がインストールされているか確認
if ! command -v git &> /dev/null; then
  echo "⚠ git が見つかりません。Xcode Command Line Tools をインストールしてください:"
  echo "  xcode-select --install"
  read -p "Enterキーを押すと終了します..."
  exit 1
fi

echo "✓ git: $(git --version)"
echo ""

# すでに git リポジトリか確認
if [ -d ".git" ]; then
  echo "✓ git リポジトリは初期化済みです"
else
  echo "📦 git リポジトリを初期化中..."
  git init
  git branch -M main
fi

echo ""

# GitHub リポジトリの URL を入力させる
echo "─────────────────────────────────────"
echo "GitHub でリポジトリを作成してください:"
echo "  1. https://github.com/new を開く"
echo "  2. Repository name: 4k-to-fhd-compressor"
echo "  3. Public または Private を選択"
echo "  4. 「Create repository」をクリック"
echo "  5. 表示された HTTPS の URL をコピー"
echo "─────────────────────────────────────"
echo ""
read -p "GitHub リポジトリの URL を貼り付けてください: " REPO_URL

if [ -z "$REPO_URL" ]; then
  echo "⚠ URL が入力されていません。終了します。"
  read -p "Enterキーを押すと終了します..."
  exit 1
fi

echo ""
echo "📝 ファイルをステージング中..."
git add .

echo "💾 コミット中..."
git commit -m "Initial commit: 4K to FHD Compressor" 2>/dev/null || echo "(コミット済みの場合はスキップ)"

echo "🔗 リモートを設定中..."
git remote remove origin 2>/dev/null
git remote add origin "$REPO_URL"

echo "🚀 GitHub にプッシュ中..."
git push -u origin main

if [ $? -eq 0 ]; then
  echo ""
  echo "================================"
  echo "  ✓ GitHub へのプッシュ完了！"
  echo "================================"
  echo ""
  echo "次のステップ — Railway でデプロイ:"
  echo "  1. https://railway.app を開く"
  echo "  2. 「New Project」→「Deploy from GitHub repo」"
  echo "  3. 「4k-to-fhd-compressor」を選択"
  echo "  4. 自動でビルド＆デプロイが始まります"
  echo ""
  echo "デプロイ完了後、Railway が生成した URL でアクセスできます。"
else
  echo ""
  echo "⚠ プッシュに失敗しました。以下を確認してください:"
  echo "  - GitHub にログインしているか"
  echo "  - リポジトリ URL が正しいか"
  echo "  - 認証設定（SSH キーまたは Personal Access Token）"
fi

echo ""
read -p "Enterキーを押すと終了します..."
