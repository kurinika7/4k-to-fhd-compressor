# 4K to FHD Compressor

4K動画をFHD（1920×1080）高画質に変換・圧縮するローカルWebアプリです。  
飲食店・イベント・SNS投稿用の動画素材を扱うカメラマンや映像制作者向けに設計しています。

---

## 機能一覧

- **ドラッグ&ドロップ**でMP4/MOV/M4Vをアップロード
- **コーデック選択**: H.264 / H.265(HEVC)
- **画質選択**: 高画質 / 標準 / 軽量（CRF値で制御）
- **フレームレート**: 元のまま / 30fps / 60fps
- **リアルタイム進捗表示**（SSEによるプログレスバー）
- **変換前後のファイルサイズ比較・圧縮率表示**
- **変換後動画のブラウザ内プレビュー**
- **ダウンロードボタン**

---

## セットアップ手順

### 1. FFmpegのインストール（まだ入っていない場合）

```bash
# Homebrew がない場合は先にインストール
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# FFmpeg をインストール
brew install ffmpeg

# インストールされたか確認
ffmpeg -version
```

### 2. プロジェクトのセットアップ

```bash
# ダウンロードしたフォルダに移動
cd 4k-to-fhd-compressor

# 依存パッケージをインストール
npm install

# 開発サーバーを起動
npm run dev
```

### 3. ブラウザでアクセス

```
http://localhost:3000
```

---

## 使い方

1. **ファイルを選択**: 動画ファイルをドロップ、またはクリックして選択
2. **設定を確認**: コーデック・画質・フレームレートを選ぶ
3. **変換を開始**: ボタンを押して待つ（目安: 1分の4K動画 → 約2〜5分）
4. **ダウンロード**: 完了後にプレビューを確認してダウンロード

---

## 技術構成

| 項目 | 内容 |
|------|------|
| フレームワーク | Next.js 14 (App Router) |
| 言語 | TypeScript |
| スタイル | Tailwind CSS |
| 動画変換 | FFmpeg + fluent-ffmpeg |
| 進捗通知 | SSE (Server-Sent Events) |
| 実行環境 | Node.js (ローカル) |

---

## FFmpegコマンドの詳細

### H.264 高画質（CRF 18）

```bash
ffmpeg -i input.mov \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -preset slow -crf 18 \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  output_FHD.mp4
```

### H.265 高画質（CRF 22）

```bash
ffmpeg -i input.mov \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx265 -preset slow -crf 22 -tag:v hvc1 \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  output_FHD.mp4
```

**フィルター解説:**
- `scale=1920:1080:force_original_aspect_ratio=decrease` — アスペクト比を維持してFHDに収める
- `pad=1920:1080:(ow-iw)/2:(oh-ih)/2` — 余白を黒で埋めて正確に1920×1080にする

---

## 画質設定の目安（CRF値）

| 画質 | H.264 CRF | H.265 CRF | 用途 |
|------|-----------|-----------|------|
| 高画質 | 18 | 22 | アーカイブ・マスター素材 |
| 標準 | 22 | 24 | SNS投稿・Web配信（推奨） |
| 軽量 | 26 | 28 | ストレージ節約・プレビュー用 |

---

## ファイル構成

```
4k-to-fhd-compressor/
├── app/
│   ├── api/
│   │   ├── convert/route.ts       # ファイル受取・変換開始API
│   │   ├── progress/[jobId]/route.ts  # SSE進捗配信API
│   │   └── download/[jobId]/route.ts  # ダウンロードAPI
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                   # メインページ（状態管理）
├── components/
│   ├── VideoUploader.tsx          # ファイルアップロードUI
│   ├── ConversionSettings.tsx     # 変換設定UI
│   ├── ProgressDisplay.tsx        # 進捗表示
│   └── ConversionResult.tsx       # 変換結果・ダウンロード
├── lib/
│   ├── types.ts                   # TypeScript型定義
│   ├── jobStore.ts                # ジョブ管理（メモリ）
│   └── ffmpeg.ts                  # FFmpeg変換ロジック
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

---

## トラブルシューティング

### `ffmpeg: command not found` が出る

```bash
brew install ffmpeg
```

### アップロードが途中で止まる

大容量ファイル（4GB以上）の場合、Node.js のデフォルトメモリが不足することがあります。

```bash
NODE_OPTIONS=--max-old-space-size=8192 npm run dev
```

### H.265変換後にApple製品で再生できない

`-tag:v hvc1` オプションが自動で付与されていますが、QuickTimeで再生できない場合はH.264に変換してください。

### 進捗バーが動かない

ブラウザの開発ツール（F12）のコンソールでエラーを確認してください。FFmpegが正しくインストールされているか確認してください。

```bash
which ffmpeg
ffmpeg -version
```

---

## 注意事項

- このアプリは**ローカル環境専用**です。外部公開には対応していません。
- 変換ファイルはOS の一時フォルダ（`/tmp/4k-compressor/`）に保存されます。
- `npm run dev` を再起動すると、変換済みファイルへのリンクは無効になります。**ダウンロードをお忘れなく。**
- 非常に大容量のファイル（8GB以上）はPCのメモリに注意してください。

---

## ライセンス

MIT License
