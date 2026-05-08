'use client';

// ============================================================
// ConversionResult コンポーネント
//
// 変換完了後に表示する画面。
// - 変換前後のファイルサイズ比較
// - 圧縮率表示
// - 変換後動画のプレビュー
// - ダウンロードボタン
// ============================================================

import { useEffect, useState } from 'react';
import { ProgressData } from '@/lib/types';

interface ConversionResultProps {
  jobId: string;
  originalName: string;
  onReset: () => void;
}

/** バイト数を読みやすい文字列に変換 */
function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '-- MB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** 経過時間を hh:mm:ss 形式に変換 */
function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0)
    return `${h}時間${String(m).padStart(2, '0')}分${String(s).padStart(2, '0')}秒`;
  if (m > 0) return `${m}分${String(s).padStart(2, '0')}秒`;
  return `${s}秒`;
}

export default function ConversionResult({
  jobId,
  originalName,
  onReset,
}: ConversionResultProps) {
  const [jobData, setJobData] = useState<ProgressData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);

  // -------------------------------------------------------
  // 完了したジョブの情報を SSE の最後のメッセージから取得
  // (ここでは最終データを親から受け取る代わりに、
  //  ProgressDisplay で完了時に state を共有してもよいが、
  //  シンプルさのため progress API を一度だけポーリングする)
  // -------------------------------------------------------
  useEffect(() => {
    // progress エンドポイントを一度だけ呼んで最終状態を取得
    const eventSource = new EventSource(`/api/progress/${jobId}`);

    const handleMessage = (event: MessageEvent) => {
      try {
        const data: ProgressData = JSON.parse(event.data);
        if (data.status === 'completed') {
          setJobData(data);
          eventSource.close();
        }
      } catch {
        // パースエラーは無視
      }
    };

    eventSource.onmessage = handleMessage;
    eventSource.onerror = () => eventSource.close();

    // すでに completed なのに SSE が来ない場合のフォールバック
    const fallbackTimer = setTimeout(() => {
      eventSource.close();
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
      eventSource.close();
    };
  }, [jobId]);

  const inputSize = jobData?.inputSize ?? 0;
  const outputSize = jobData?.outputSize ?? 0;
  const processingTimeMs =
    jobData?.startTime && jobData?.endTime
      ? jobData.endTime - jobData.startTime
      : 0;

  // 圧縮率計算
  const compressionRatio =
    inputSize > 0 && outputSize > 0
      ? Math.round((1 - outputSize / inputSize) * 100)
      : 0;

  // ダウンロードファイル名
  const downloadName = originalName.replace(/\.[^.]+$/, '_FHD.mp4');

  // -------------------------------------------------------
  // 描画
  // -------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* 完了バナー */}
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-green-950 border border-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-white">変換完了！</h2>
        <p className="text-gray-400 mt-1 text-sm">
          {processingTimeMs > 0
            ? `処理時間: ${formatDuration(processingTimeMs)}`
            : '動画の変換が完了しました'}
        </p>
      </div>

      {/* ファイルサイズ比較 */}
      {inputSize > 0 && outputSize > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-5">
            ファイルサイズ比較
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* 変換前 */}
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-500 mb-1">変換前 (4K)</p>
              <p className="text-2xl font-bold text-white">
                {formatFileSize(inputSize)}
              </p>
            </div>

            {/* 矢印 + 圧縮率 */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  compressionRatio > 0
                    ? 'bg-green-950 text-green-400 border border-green-800'
                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}
              >
                {compressionRatio > 0 ? `▼ ${compressionRatio}%` : '変換済み'}
              </div>
              <svg
                className="w-6 h-6 text-gray-600 hidden sm:block"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </div>

            {/* 変換後 */}
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-500 mb-1">変換後 (FHD)</p>
              <p className="text-2xl font-bold text-green-400">
                {formatFileSize(outputSize)}
              </p>
            </div>
          </div>

          {/* 圧縮率バー */}
          {compressionRatio > 0 && (
            <div className="mt-5">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${Math.min(compressionRatio, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-right">
                {compressionRatio}% 削減 ({formatFileSize(inputSize - outputSize)} 節約)
              </p>
            </div>
          )}
        </div>
      )}

      {/* 動画プレビュー */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <p className="text-xs text-gray-500 uppercase tracking-wider p-4 pb-0">
          プレビュー (変換後)
        </p>
        <div className="p-4">
          {isLoadingPreview && (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              プレビューを読み込み中...
            </div>
          )}
          <video
            controls
            className={`w-full rounded-xl bg-black aspect-video ${
              isLoadingPreview ? 'hidden' : 'block'
            }`}
            onCanPlay={() => setIsLoadingPreview(false)}
            onError={() => setIsLoadingPreview(false)}
            src={`/api/download/${jobId}?preview=1`}
            preload="metadata"
          />
        </div>
      </div>

      {/* ダウンロードボタン */}
      <a
        href={`/api/download/${jobId}`}
        download={downloadName}
        className="
          flex items-center justify-center gap-3 w-full py-4 px-6
          bg-white text-gray-950 rounded-2xl font-semibold text-base
          hover:bg-gray-100 active:bg-gray-200 transition-colors
          focus:outline-none focus-visible:ring-2 focus-visible:ring-white
        "
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        ダウンロード — {downloadName}
      </a>

      {/* 別の動画を変換するボタン */}
      <button
        onClick={onReset}
        className="
          w-full py-3 border border-gray-700 text-gray-400 rounded-xl text-sm
          hover:bg-gray-800 hover:text-white hover:border-gray-600 transition-colors
        "
      >
        + 別の動画を変換する
      </button>

      {/* 補足情報 */}
      <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl text-xs text-gray-500 space-y-1">
        <p>
          💡 プレビューが表示されない場合は、ダウンロードして直接再生してください。
        </p>
        <p>
          ⚠ 変換後のファイルはサーバーを再起動すると削除されます。ダウンロードをお忘れなく。
        </p>
      </div>
    </div>
  );
}
