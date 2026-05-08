// ============================================================
// GET /api/download/[jobId]
//
// 変換完了した動画ファイルをストリーミングでダウンロードさせる。
// ファイルサイズが大きいため、createReadStream を使って
// メモリを節約しながら転送する。
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, existsSync } from 'fs';
import { stat } from 'fs/promises';
import { getJob } from '@/lib/jobStore';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  // ?preview=1 のとき: attachment ヘッダーなしでブラウザ内再生を許可
  const isPreview = request.nextUrl.searchParams.get('preview') === '1';

  // -------------------------------------------------------
  // 1. ジョブの状態を確認
  // -------------------------------------------------------
  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json(
      { error: 'ジョブが見つかりません。変換を最初からやり直してください。' },
      { status: 404 }
    );
  }

  if (job.status !== 'completed') {
    return NextResponse.json(
      { error: `変換が完了していません (現在の状態: ${job.status})` },
      { status: 400 }
    );
  }

  if (!existsSync(job.outputFile)) {
    return NextResponse.json(
      { error: '出力ファイルが見つかりません。変換をやり直してください。' },
      { status: 404 }
    );
  }

  // -------------------------------------------------------
  // 2. ファイル情報を取得
  // -------------------------------------------------------
  try {
    const fileStat = await stat(job.outputFile);

    // ダウンロード時のファイル名: 元のファイル名を _FHD.mp4 に変換
    const downloadName = job.originalName
      .replace(/\.[^.]+$/, '_FHD.mp4') // 拡張子を _FHD.mp4 に置換
      .replace(/[^\w\s\-_.]/g, '_');    // 特殊文字をアンダースコアに置換

    // -------------------------------------------------------
    // 3. ファイルをストリームとして返す
    //    createReadStream を使い、大容量ファイルも省メモリで転送
    // -------------------------------------------------------
    const fileStream = createReadStream(job.outputFile);

    // Node.js の ReadStream を Web の ReadableStream に変換
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => {
          controller.enqueue(
            typeof chunk === 'string' ? Buffer.from(chunk) : chunk
          );
        });
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new Response(webStream, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(fileStat.size),
        // attachment: ブラウザにダウンロードダイアログを表示させる
        // preview モード: inline でブラウザ再生 / 通常: attachment でダウンロード
        ...(isPreview
          ? {}
          : { 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}` }),
        // キャッシュしない
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[GET /api/download] エラー:', error);
    return NextResponse.json(
      { error: 'ファイルのダウンロードに失敗しました。' },
      { status: 500 }
    );
  }
}
