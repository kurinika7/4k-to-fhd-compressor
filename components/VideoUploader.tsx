'use client';

// ============================================================
// VideoUploader コンポーネント
//
// ドラッグ&ドロップ または クリックで動画ファイルを選択できる。
// ブラウザの Video 要素を使ってファイルのメタ情報 (解像度・長さ) を取得し、
// 親コンポーネントに渡す。
// ============================================================

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { VideoInfo } from '@/lib/types';

// 対応するファイルタイプ
const ACCEPTED_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/x-m4v'];
const ACCEPTED_EXTENSIONS = ['.mp4', '.mov', '.m4v'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB

interface VideoUploaderProps {
  onFileSelected: (file: File, info: VideoInfo) => void;
}

// -------------------------------------------------------
// ユーティリティ関数
// -------------------------------------------------------

/** バイト数を人間が読みやすい形式に変換 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** 秒数を mm:ss または hh:mm:ss 形式に変換 */
function formatDuration(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** ファイルを動画から解像度・再生時間を取得する */
function getVideoMetadata(file: File): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      const info: VideoInfo = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      URL.revokeObjectURL(url);
      resolve(info);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('動画のメタデータを読み込めませんでした'));
    };

    video.src = url;
  });
}

// -------------------------------------------------------
// メインコンポーネント
// -------------------------------------------------------

export default function VideoUploader({ onFileSelected }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** ファイルのバリデーション */
  const validateFile = (file: File): string | null => {
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
    const isValidType =
      ACCEPTED_EXTENSIONS.includes(ext) ||
      ACCEPTED_MIME_TYPES.includes(file.type);

    if (!isValidType) {
      return 'MP4、MOV、M4V 形式のファイルのみ対応しています。';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `ファイルサイズが上限 (10GB) を超えています。\n現在のサイズ: ${formatFileSize(file.size)}`;
    }
    return null;
  };

  /** ファイルを受け取って処理 */
  const processFile = async (file: File) => {
    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setSelectedFile(file);

    try {
      const info = await getVideoMetadata(file);
      setVideoInfo(info);
      onFileSelected(file, info);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '動画ファイルの読み込みに失敗しました。'
      );
      setSelectedFile(null);
      setVideoInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ドラッグ操作のハンドラ
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await processFile(file);
  };

  // ファイル選択ダイアログのハンドラ
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    // 同じファイルを再選択できるようにリセット
    e.target.value = '';
  };

  // -------------------------------------------------------
  // 描画
  // -------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* ドロップゾーン */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-2xl p-16 text-center
          cursor-pointer transition-all duration-200 outline-none
          focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2
          focus-visible:ring-offset-gray-950
          ${
            isDragging
              ? 'border-white bg-gray-800 scale-[1.01]'
              : 'border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-900'
          }
        `}
      >
        {isLoading ? (
          /* ローディング状態 */
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">動画情報を読み込み中...</p>
          </div>
        ) : (
          /* 通常状態 / ドラッグ中 */
          <div className="flex flex-col items-center gap-5">
            {/* アイコン */}
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
                isDragging ? 'bg-gray-700' : 'bg-gray-800'
              }`}
            >
              <svg
                className="w-10 h-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                />
              </svg>
            </div>

            <div>
              <p className="text-xl font-semibold text-white leading-snug">
                {isDragging ? 'ここにドロップ' : '4K 動画をドラッグ&ドロップ'}
              </p>
              <p className="text-sm text-gray-400 mt-1.5">
                または{' '}
                <span className="text-white underline underline-offset-2">
                  クリックしてファイルを選択
                </span>
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
              {['MP4', 'MOV', 'M4V'].map((ext) => (
                <span
                  key={ext}
                  className="px-2 py-0.5 bg-gray-800 rounded border border-gray-700"
                >
                  {ext}
                </span>
              ))}
              <span className="px-2 py-0.5 bg-gray-800 rounded border border-gray-700">
                最大 10 GB
              </span>
            </div>
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-4 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-sm whitespace-pre-line">
          <span className="font-medium">⚠ </span>
          {error}
        </div>
      )}

      {/* 選択したファイルの情報 (読み込み成功後に表示) */}
      {selectedFile && videoInfo && !isLoading && !error && (
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">
            選択中のファイル
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InfoItem label="ファイル名" value={selectedFile.name} truncate />
            <InfoItem
              label="ファイルサイズ"
              value={formatFileSize(selectedFile.size)}
            />
            <InfoItem
              label="解像度"
              value={`${videoInfo.width} × ${videoInfo.height}`}
            />
            <InfoItem
              label="再生時間"
              value={formatDuration(videoInfo.duration)}
            />
          </div>
        </div>
      )}

      {/* 非表示ファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp4,.mov,.m4v,video/mp4,video/quicktime,video/x-m4v"
        onChange={handleFileChange}
        className="hidden"
        aria-label="動画ファイルを選択"
      />
    </div>
  );
}

// -------------------------------------------------------
// 補助コンポーネント: 情報アイテム
// -------------------------------------------------------
function InfoItem({
  label,
  value,
  truncate = false,
}: {
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p
        className={`text-sm text-white font-medium ${
          truncate ? 'truncate' : ''
        }`}
        title={truncate ? value : undefined}
      >
        {value}
      </p>
    </div>
  );
}
