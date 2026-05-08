/** @type {import('next').NextConfig} */
const nextConfig = {
  // 大容量ファイルのアップロードに対応（ローカル開発 & Railway）
  experimental: {
    // fluent-ffmpeg はサーバーサイドのネイティブモジュールのため外部パッケージとして指定
    serverComponentsExternalPackages: ['fluent-ffmpeg'],
    serverActions: {
      bodySizeLimit: '10gb',
    },
  },

  // Docker / Railway 環境向けの出力設定
  output: 'standalone',
};

module.exports = nextConfig;
