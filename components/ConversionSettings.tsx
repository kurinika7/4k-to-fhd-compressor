'use client';

// ============================================================
// ConversionSettings コンポーネント
//
// コーデック / 画質 / フレームレートを選べるUIパネル。
// 現在選択されているファイルの情報も一覧表示する。
// ============================================================

import { ConversionSettings, VideoInfo } from '@/lib/types';

interface ConversionSettingsProps {
  file: File;
  videoInfo: VideoInfo | null;
  settings: ConversionSettings;
  onSettingsChange: (settings: ConversionSettings) => void;
  onStart: () => void;
  onBack: () => void;
}

/** バイト数を見やすい文字列に変換 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** 秒数を mm:ss 形式に変換 */
function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ConversionSettingsPanel({
  file,
  videoInfo,
  settings,
  onSettingsChange,
  onStart,
  onBack,
}: ConversionSettingsProps) {
  // 各設定の更新ヘルパー
  const update = (patch: Partial<ConversionSettings>) =>
    onSettingsChange({ ...settings, ...patch });

  return (
    <div className="space-y-6">
      {/* ファイル情報サマリー */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
          変換元ファイル
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* ファイルアイコン */}
          <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{file.name}</p>
            <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-400">
              <span>{formatFileSize(file.size)}</span>
              {videoInfo && (
                <>
                  <span>·</span>
                  <span>
                    {videoInfo.width} × {videoInfo.height}
                  </span>
                  <span>·</span>
                  <span>{formatDuration(videoInfo.duration)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 変換後のプレビュー情報 */}
        <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-2 text-sm">
          <span className="text-gray-500">出力:</span>
          <span className="text-white font-medium">FHD 1920 × 1080</span>
          <span className="text-gray-700">→</span>
          <span className="text-green-400 text-xs px-2 py-0.5 bg-green-950 rounded-full border border-green-800">
            MP4
          </span>
        </div>
      </div>

      {/* 変換設定パネル */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-6">
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          変換設定
        </p>

        {/* --- コーデック --- */}
        <SettingSection
          title="コーデック"
          description="H.265 はより小さいファイルサイズを実現しますが、変換に時間がかかります。"
        >
          <div className="grid grid-cols-2 gap-3">
            <OptionCard
              selected={settings.codec === 'libx264'}
              onClick={() => update({ codec: 'libx264' })}
              title="H.264"
              subtitle="互換性が高い"
              badge="推奨"
            />
            <OptionCard
              selected={settings.codec === 'libx265'}
              onClick={() => update({ codec: 'libx265' })}
              title="H.265 / HEVC"
              subtitle="最大30%小容量"
            />
          </div>
        </SettingSection>

        {/* --- 画質 --- */}
        <SettingSection
          title="画質"
          description={`CRF: ${getCrfLabel(settings.codec, settings.quality)}`}
        >
          <div className="grid grid-cols-3 gap-3">
            <OptionCard
              selected={settings.quality === 'high'}
              onClick={() => update({ quality: 'high' })}
              title="高画質"
              subtitle="容量大"
            />
            <OptionCard
              selected={settings.quality === 'standard'}
              onClick={() => update({ quality: 'standard' })}
              title="標準"
              subtitle="バランス型"
              badge="推奨"
            />
            <OptionCard
              selected={settings.quality === 'light'}
              onClick={() => update({ quality: 'light' })}
              title="軽量"
              subtitle="容量小"
            />
          </div>
        </SettingSection>

        {/* --- フレームレート --- */}
        <SettingSection
          title="フレームレート"
          description="SNS 投稿用なら 30fps が一般的です。"
        >
          <div className="grid grid-cols-3 gap-3">
            <OptionCard
              selected={settings.frameRate === 'original'}
              onClick={() => update({ frameRate: 'original' })}
              title="元のまま"
              subtitle="変更なし"
            />
            <OptionCard
              selected={settings.frameRate === '30'}
              onClick={() => update({ frameRate: '30' })}
              title="30 fps"
              subtitle="SNS向け"
            />
            <OptionCard
              selected={settings.frameRate === '60'}
              onClick={() => update({ frameRate: '60' })}
              title="60 fps"
              subtitle="滑らか"
            />
          </div>
        </SettingSection>
      </div>

      {/* FFmpeg コマンドプレビュー */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
          <span>⌘</span>
          <span>FFmpeg コマンドプレビュー</span>
        </p>
        <code className="text-xs text-green-400 font-mono leading-relaxed break-all">
          {generateFFmpegCommand(settings)}
        </code>
      </div>

      {/* アクションボタン */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onBack}
          className="sm:w-auto px-6 py-3 border border-gray-700 text-gray-300 rounded-xl
                     hover:bg-gray-800 hover:text-white transition-colors text-sm font-medium"
        >
          ← ファイルを変更
        </button>
        <button
          onClick={onStart}
          className="flex-1 py-3 bg-white text-gray-950 rounded-xl font-semibold
                     hover:bg-gray-100 active:bg-gray-200 transition-colors text-sm
                     flex items-center justify-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          変換を開始
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// 補助関数
// -------------------------------------------------------

/** 選択されたコーデックと画質から CRF 値のラベルを生成 */
function getCrfLabel(
  codec: ConversionSettings['codec'],
  quality: ConversionSettings['quality']
): string {
  const crfMap = {
    libx264: { high: 18, standard: 22, light: 26 },
    libx265: { high: 22, standard: 24, light: 28 },
  };
  return `CRF ${crfMap[codec][quality]}`;
}

/** 設定に基づいて FFmpeg コマンドのプレビューを生成 */
function generateFFmpegCommand(settings: ConversionSettings): string {
  const crfMap = {
    libx264: { high: 18, standard: 22, light: 26 },
    libx265: { high: 22, standard: 24, light: 28 },
  };
  const crf = crfMap[settings.codec][settings.quality];
  const fpsOption =
    settings.frameRate !== 'original' ? ` -r ${settings.frameRate}` : '';
  const codecDisplay =
    settings.codec === 'libx264' ? 'libx264' : 'libx265';

  return `ffmpeg -i input.mp4 \\
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \\
  -c:v ${codecDisplay} -preset slow -crf ${crf}${fpsOption} \\
  -c:a aac -b:a 192k -movflags +faststart \\
  output_FHD.mp4`;
}

// -------------------------------------------------------
// 補助コンポーネント
// -------------------------------------------------------

/** セクションラッパー */
function SettingSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/** 選択肢カード */
function OptionCard({
  selected,
  onClick,
  title,
  subtitle,
  badge,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative p-3 rounded-xl border text-left transition-all duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-white
        ${
          selected
            ? 'border-white bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.1)]'
            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
        }
      `}
    >
      {/* 選択インジケーター */}
      <div
        className={`
          w-3.5 h-3.5 rounded-full border flex-shrink-0 mb-2 transition-colors
          ${selected ? 'bg-white border-white' : 'border-gray-600'}
        `}
      />
      <p
        className={`text-sm font-medium leading-tight ${
          selected ? 'text-white' : 'text-gray-300'
        }`}
      >
        {title}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>

      {/* バッジ */}
      {badge && (
        <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 bg-blue-950 text-blue-400 rounded border border-blue-800">
          {badge}
        </span>
      )}
    </button>
  );
}
