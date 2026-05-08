// ============================================================
// GET /api/progress/[jobId]
//
// SSE (Server-Sent Events) を使って変換の進捗をリアルタイム配信する。
// クライアントは EventSource でこのエンドポイントを購読し、
// 進捗バーや完了通知に利用する。
// ============================================================

import { NextRequest } from 'next/server';
import { getJob } from '@/lib/jobStore';

// SSE のポーリング間隔 (ミリ秒)
const POLL_INTERVAL_MS = 500;

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  const encoder = new TextEncoder();

  // SSE ストリームを作成
  const stream = new ReadableStream({
    start(controller) {
      // 定期的にジョブの状態をチェックして送信
      const intervalId = setInterval(() => {
        const job = getJob(jobId);

        if (!job) {
          // ジョブが見つからない場合はエラーを送信して終了
          const data = JSON.stringify({ error: 'ジョブが見つかりません' });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          clearInterval(intervalId);
          controller.close();
          return;
        }

        // 進捗データを送信
        const progressData = {
          status: job.status,
          progress: job.progress,
          error: job.error,
          inputSize: job.inputSize,
          outputSize: job.outputSize,
          startTime: job.startTime,
          endTime: job.endTime,
          duration: job.duration,
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`)
        );

        // 変換完了またはエラーでストリームを閉じる
        if (job.status === 'completed' || job.status === 'error') {
          clearInterval(intervalId);
          // 少し待ってから閉じる (最後のデータが確実に届くように)
          setTimeout(() => {
            try {
              controller.close();
            } catch {
              // すでに閉じている場合は無視
            }
          }, 200);
        }
      }, POLL_INTERVAL_MS);

      // クライアントが接続を切断した場合 (ブラウザを閉じるなど) にクリーンアップ
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        try {
          controller.close();
        } catch {
          // すでに閉じている場合は無視
        }
      });
    },
  });

  // SSE に必要なヘッダーを設定してストリームを返す
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx などのバッファリングを無効化
    },
  });
}
