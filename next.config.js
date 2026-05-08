/** @type {import('next').NextConfig} */
const nextConfig = {
  // fluent-ffmpeg はサーバーサイドのネイティブモジュールのため外部パッケージとして指定
  serverExternalPackages: ['fluent-ffmpeg'],

  // 大容量ファイルのアップロードに対応（ローカル開発 & Railway）
  experimental: {
    serverActions: {
      bodySizeLimit: '10gb',
    },
  },

  // Docker / Railway 環境向けの出力設定
  output: 'standalone',
};

module.exports = nextConfig;
