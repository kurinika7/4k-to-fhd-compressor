import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '4K to FHD Compressor',
  description:
    '4K動画をFHD(1920×1080)高画質に変換・圧縮するWebアプリ。飲食店・イベント・SNS投稿用の動画素材に最適。',
  keywords: ['4K', 'FHD', '動画変換', '圧縮', 'FFmpeg', '1920x1080'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  );
}
