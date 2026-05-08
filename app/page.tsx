'use client';

// ============================================================
// メインページ (page.tsx)
//
// アプリの状態を管理し、各ステップのコンポーネントを切り替える。
//
// ステップフロー:
//   upload → settings → converting → completed
//                                  ↘ error
// ============================================================

import { useState, useCallback } from 'react';
import VideoUploader from '@/components/VideoUploader';
import ConversionSettings from '@/components/ConversionSettings';
import ProgressDisplay from '@/components/ProgressDisplay';
import ConversionResult from '@/components/ConversionResult';
import { ConversionSettings as ConversionSettingsType, VideoInfo } from '@/lib/types';

// アプリの状態の型
type AppStep = 'upload' | 'settings' | 'converting' | 'completed' | 'error';

// デフォルトの変換設定
const DEFAULT_SETTINGS: ConversionSettingsType = {
  codec: 'libx264',    // H.264 (互換性重視)
  quality: 'standard', // 標準画質 (バランス型)
  frameRate: 'original', // 元のフレームレートを維持
};

export default function HomePage() {
  // -------------------------------------------------------
  // アプリ状態の管理
  // -------------------------------------------------------
  const [step, setStep] = useState<AppStep>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [settings, setSettings] = useState<ConversionSettingsType>(DEFAULT_SETTINGS);
  const [jobId, setJobId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // -------------------------------------------------------
  // ハンドラー
  // -------------------------------------------------------

  /** ファイル選択完了 → 設定画面へ */
  const handleFileSelected = useCallback(
    (file: File, info: VideoInfo) => {
      setVideoFile(file);
      setVideoInfo(info);
      setStep('settings');
      setErrorMessage(null);
    },
    []
  );

  /** 変換開始ボタンが押された */
  const handleStartConversion = useCallback(async () => {
    if (!videoFile) return;

    setStep('converting');
    setErrorMessage(null);

    try {
      // FormData を作成してAPIへ送信
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('settings', JSON.stringify(settings));

      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error ?? `サーバーエラー (HTTP ${response.status})`
        );
      }

      const { jobId: newJobId } = await response.json();
      setJobId(newJobId);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : '変換の開始に失敗しました。もう一度お試しください。';
      setErrorMessage(msg);
      setStep('error');
    }
  }, [videoFile, settings]);

  /** 変換完了コールバック */
  const handleConversionComplete = useCallback(() => {
    setStep('completed');
  }, []);

  /** 変換エラーコールバック */
  const handleConversionError = useCallback((msg: string) => {
    setErrorMessage(msg);
    setStep('error');
  }, []);

  /** リセット (最初から) */
  const handleReset = useCallback(() => {
    setStep('upload');
    setVideoFile(null);
    setVideoInfo(null);
    setJobId(null);
    setErrorMessage(null);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // -------------------------------------------------------
  // 描画
  // -------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ヘッダー */}
      <header className="border-b border-gray-800/60 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          {/* ロゴ */}
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-gray-950 text-xs font-black tracking-tighter">
              4K
            </span>
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-none">
              4K to FHD Compressor
            </h1>
            <p className="text-[11px] text-gray-500 mt-0.5">
              4K 動画を FHD 高画質に変換
            </p>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 pb-16">
        {/* ステップインジケーター */}
        {(step === 'upload' || step === 'settings') && (
          <StepIndicator currentStep={step} />
        )}

        {/* エラー画面 */}
        {step === 'error' && (
          <ErrorPanel message={errorMessage} onRetry={handleReset} />
        )}

        {/* 各ステップのコンポーネント */}
        {step === 'upload' && (
          <VideoUploader onFileSelected={handleFileSelected} />
        )}

        {step === 'settings' && videoFile && (
          <ConversionSettings
            file={videoFile}
            videoInfo={videoInfo}
            settings={settings}
            onSettingsChange={setSettings}
            onStart={handleStartConversion}
            onBack={() => setStep('upload')}
          />
        )}

        {/* アップロード中のローディング表示 (jobId がまだ未取得の場合) */}
        {step === 'converting' && !jobId && (
          <div className="flex flex-col items-center gap-6 py-20">
            <div className="w-14 h-14 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-white font-semibold">動画をアップロード中...</p>
              <p className="text-sm text-gray-400 mt-1">大きなファイルは数十秒かかる場合があります</p>
            </div>
          </div>
        )}

        {step === 'converting' && jobId && (
          <ProgressDisplay
            jobId={jobId}
            inputSize={videoFile?.size ?? 0}
            onComplete={handleConversionComplete}
            onError={handleConversionError}
          />
        )}

        {step === 'completed' && jobId && (
          <ConversionResult
            jobId={jobId}
            originalName={videoFile?.name ?? 'video'}
            onReset={handleReset}
          />
        )}
      </main>

      {/* フッター */}
      <footer className="border-t border-gray-800/60 py-6 text-center">
        <p className="text-xs text-gray-600">
          Powered by FFmpeg · Next.js · Tailwind CSS
        </p>
      </footer>
    </div>
  );
}

// -------------------------------------------------------
// 補助コンポーネント: ステップインジケーター
// -------------------------------------------------------
function StepIndicator({ currentStep }: { currentStep: 'upload' | 'settings' }) {
  const steps = [
    { key: 'upload', label: 'ファイル選択' },
    { key: 'settings', label: '変換設定' },
    { key: 'done', label: '変換・DL' },
  ];

  const currentIndex = currentStep === 'upload' ? 0 : 1;

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          {/* ステップ番号 */}
          <div
            className={`
              w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center
              ${
                i < currentIndex
                  ? 'bg-white text-gray-950' // 完了済み
                  : i === currentIndex
                  ? 'bg-white text-gray-950' // 現在
                  : 'bg-gray-800 text-gray-500' // 未来
              }
            `}
          >
            {i < currentIndex ? '✓' : i + 1}
          </div>
          {/* ラベル */}
          <span
            className={`text-sm hidden sm:inline ${
              i <= currentIndex ? 'text-white' : 'text-gray-500'
            }`}
          >
            {s.label}
          </span>
          {/* 区切り */}
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-px w-8 sm:w-12 ${
                i < currentIndex ? 'bg-white' : 'bg-gray-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// -------------------------------------------------------
// 補助コンポーネント: エラーパネル
// -------------------------------------------------------
function ErrorPanel({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="bg-red-950/30 border border-red-800/50 rounded-2xl p-8 text-center space-y-4">
      <div className="w-14 h-14 bg-red-900/50 rounded-full flex items-center justify-center mx-auto">
        <svg
          className="w-7 h-7 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div>
        <p className="text-lg font-semibold text-white">エラーが発生しました</p>
        {message && (
          <p className="text-sm text-red-300 mt-2 max-w-md mx-auto leading-relaxed">
            {message}
          </p>
        )}
      </div>
      <button
        onClick={onRetry}
        className="
          px-6 py-2.5 bg-white text-gray-950 rounded-xl font-medium text-sm
          hover:bg-gray-100 transition-colors
        "
      >
        最初からやり直す
      </button>
    </div>
  );
}
