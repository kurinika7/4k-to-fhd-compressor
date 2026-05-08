'use client';

// ============================================================
// ProgressDisplay コンポーネント
//
// SSE (Server-Sent Events) で変換の進捗をリアルタイム表示する。
// プログレスバー・処理時間・ステータスメッセージを表示。
// ============================================================

import { useEffect, useState } from 'react';
import { ProgressData } from '@/lib/types';

interface ProgressDisplayProps {
  jobId: string;
  inputSize: number;
  onComplete: () => void;
  onError: (message: string) => void;
}

/** バイト数を読みやすい文字列に変換 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** 経過時間を mm:ss 形式に変換 */
function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 進捗に応じたメッセージを生成 */
function getStatusMessage(progress: number): string {
  if (progress < 5) return '変換を準備中...';
  if (progress < 20) return '動画を解析しています...';
  if (progress < 50) return '4K→FHD に変換中...';
  if (progress < 80) return 'エンコード処理中...';
  if (progress < 95) return 'もうすぐ完了します...';
  return '後処理を実行中...';
}

export default function ProgressDisplay({
  jobId,
  inputSize,
  onComplete,
  onError,
}: ProgressDisplayProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startTime] = useState(Date.now());

  // -------------------------------------------------------
  // 経過時間タイマー
  // -------------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  // -------------------------------------------------------
  // SSE で進捗を購読
  // -------------------------------------------------------
  useEffect(() => {
    const eventSource = new EventSource(`/api/progress/${jobId}`);

    eventSource.onmessage = (event) => {
      try {
        const data: ProgressData & { error?: string } = JSON.parse(event.data);

        if (data.error && !data.status) {
          // ジョブが見つからないなどのエラー
          onError(data.error);
          eventSource.close();
          return;
        }

        setProgress(data);

        // 完了 or エラー時にコールバックを呼ぶ
        if (data.status === 'completed') {
          eventSource.close();
          onComplete();
        } else if (data.status === 'error') {
          eventSource.close();
          onError(data.error ?? '変換中にエラーが発生しました');
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    eventSource.onerror = () => {
      // SSE 接続エラー (サーバーが落ちた場合など)
      eventSource.close();
      onError('サーバーとの接続が切断されました。ページをリロードしてください。');
    };

    return () => {
      eventSource.close();
    };
  }, [jobId, onComplete, onError]);

  const currentProgress = progress?.progress ?? 0;
  const statusMessage =
    progress?.status === 'pending'
      ? 'アップロードを処理中...'
      : getStatusMessage(currentProgress);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white">変換中</h2>
        <p className="text-gray-400 mt-1 text-sm">
          ブラウザを閉じないでください
        </p>
      </div>

      {/* プログレスバー */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6">
        {/* アニメーション付きアイコン */}
        <div className="flex justify-center">
          <div className="relative w-20 h-20">
            {/* 外側のリング (アニメーション) */}
            <svg
              className="w-20 h-20 -rotate-90 animate-spin"
              style={{ animationDuration: '3s' }}
              viewBox="0 0 80 80"
            >
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="#1f2937"
                strokeWidth="4"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34 * (currentProgress / 100)} ${2 * Math.PI * 34}`}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            </svg>
            {/* 中央のパーセント表示 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {currentProgress}%
              </span>
            </div>
          </div>
        </div>

        {/* リニアプログレスバー */}
        <div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500 ease-out"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>

        {/* ステータスメッセージ */}
        <div className="text-center">
          <p className="text-white font-medium">{statusMessage}</p>
        </div>

        {/* 統計グリッド */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            label="経過時間"
            value={formatElapsed(elapsedMs)}
            icon="⏱"
          />
          <StatCard
            label="入力サイズ"
            value={formatFileSize(inputSize)}
            icon="📥"
          />
          <StatCard
            label="進捗"
            value={`${currentProgress} %`}
            icon="📊"
            className="sm:col-span-1 col-span-2"
          />
        </div>
      </div>

      {/* ヒント */}
      <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl text-sm text-gray-500 space-y-1">
        <p className="font-medium text-gray-400">処理時間の目安</p>
        <p>• 1分の4K動画 → 約2〜5分 (H.264) / 約5〜10分 (H.265)</p>
        <p>• ご利用のMacの性能により処理時間は異なります</p>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// 補助コンポーネント: 統計カード
// -------------------------------------------------------
function StatCard({
  label,
  value,
  icon,
  className = '',
}: {
  label: string;
  value: string;
  icon: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-gray-800 rounded-xl p-3 text-center ${className}`}
    >
      <p className="text-lg mb-0.5">{icon}</p>
      <p className="text-white font-semibold text-sm">{value}</p>
      <p className="text-gray-500 text-xs mt-0.5">{label}</p>
    </div>
  );
}
