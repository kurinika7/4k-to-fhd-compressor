// ============================================================
// FFmpeg 変換ロジック
//
// fluent-ffmpeg を使って4K動画を FHD(1920×1080) に変換します。
// 変換はサーバー側で非同期実行され、進捗はジョブストアで管理します。
// ============================================================

import ffmpeg from 'fluent-ffmpeg';
import { unlink, stat } from 'fs/promises';
import { ConversionSettings, VideoCodec, VideoQuality } from './types';
import { updateJob } from './jobStore';

// -------------------------------------------------------
// CRF 値マッピング
// CRF (Constant Rate Factor): 数値が低いほど高画質・大容量
// -------------------------------------------------------
const CRF_VALUES: Record<VideoCodec, Record<VideoQuality, number>> = {
  libx264: {
    high: 18,       // H.264 高画質
    standard: 22,   // H.264 標準
    light: 26,      // H.264 軽量
  },
  libx265: {
    high: 22,       // H.265 高画質 (H.264 の18相当)
    standard: 24,   // H.265 標準
    light: 28,      // H.265 軽量
  },
};

// -------------------------------------------------------
// 動画変換のメイン関数
// -------------------------------------------------------
export async function convertVideo(
  jobId: string,
  inputPath: string,
  outputPath: string,
  settings: ConversionSettings
): Promise<void> {
  const crf = CRF_VALUES[settings.codec][settings.quality];

  // ジョブを「処理中」に更新
  updateJob(jobId, { status: 'processing', progress: 0 });

  return new Promise((resolve, reject) => {
    // -------------------------------------------------------
    // FFmpeg のビデオフィルター設定
    //
    // 1. scale: アスペクト比を維持しながら1920x1080に収まるようスケール
    // 2. pad: 余白を黒で埋めて正確に1920x1080にする (レターボックス)
    // -------------------------------------------------------
    const videoFilter = [
      'scale=1920:1080:force_original_aspect_ratio=decrease',
      'pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
    ].join(',');

    // FFmpeg コマンド構築
    let command = ffmpeg(inputPath)
      // 映像: スケール変換
      .videoFilter(videoFilter)
      // コーデック: libx264 (H.264) または libx265 (H.265)
      .videoCodec(settings.codec)
      // プリセット: slow = 品質重視 (高画質・低ビットレートのバランス)
      .addOutputOption('-preset', 'slow')
      // CRF: 品質設定の核心値
      .addOutputOption('-crf', String(crf))
      // 音声: AAC 192kbps
      .audioCodec('aac')
      .audioBitrate('192k')
      // faststart: Web再生に最適化 (メタデータをファイル先頭に移動)
      .addOutputOption('-movflags', '+faststart');

    // フレームレートが指定されている場合のみ設定 (original の場合は変更しない)
    if (settings.frameRate !== 'original') {
      command = command.fps(Number(settings.frameRate));
    }

    // H.265 の場合、一部のプレーヤー互換性のためタグを設定
    if (settings.codec === 'libx265') {
      command = command.addOutputOption('-tag:v', 'hvc1');
    }

    // 変換の総時間を格納 (進捗計算に使用)
    let totalDurationSec = 0;

    command
      // -------------------------------------------------------
      // codecData: 入力ファイルのメタ情報を受け取る
      // -------------------------------------------------------
      .on('codecData', (data) => {
        // duration 例: "00:02:30.00" → 150秒
        const match = data.duration?.match(/(\d+):(\d+):(\d+\.?\d*)/);
        if (match) {
          totalDurationSec =
            Number(match[1]) * 3600 +
            Number(match[2]) * 60 +
            Number(match[3]);
          updateJob(jobId, { duration: totalDurationSec });
        }
      })
      // -------------------------------------------------------
      // progress: 変換進捗を定期的に受け取る
      // -------------------------------------------------------
      .on('progress', (progress) => {
        // percent が NaN になることがあるため、timemark から計算することもある
        let percent = progress.percent ?? 0;

        // percent が信頼できない場合は timemark から計算
        if ((!percent || isNaN(percent)) && progress.timemark && totalDurationSec > 0) {
          const timeMatch = progress.timemark.match(/(\d+):(\d+):(\d+\.?\d*)/);
          if (timeMatch) {
            const currentSec =
              Number(timeMatch[1]) * 3600 +
              Number(timeMatch[2]) * 60 +
              Number(timeMatch[3]);
            percent = (currentSec / totalDurationSec) * 100;
          }
        }

        // 99% を上限に (100% は完了後に設定)
        updateJob(jobId, { progress: Math.min(Math.round(percent), 99) });
      })
      // -------------------------------------------------------
      // end: 変換完了
      // -------------------------------------------------------
      .on('end', async () => {
        try {
          // 出力ファイルのサイズを取得
          const outputStat = await stat(outputPath);
          updateJob(jobId, {
            status: 'completed',
            progress: 100,
            outputSize: outputStat.size,
            endTime: Date.now(),
          });
          // 入力ファイルを削除 (ストレージ節約)
          await unlink(inputPath).catch(console.error);
          resolve();
        } catch (err) {
          updateJob(jobId, {
            status: 'error',
            error: '変換後の処理でエラーが発生しました',
          });
          reject(err);
        }
      })
      // -------------------------------------------------------
      // error: FFmpeg エラー
      // -------------------------------------------------------
      .on('error', (err) => {
        console.error('[FFmpeg Error]', err.message);
        updateJob(jobId, {
          status: 'error',
          error: `FFmpeg 変換エラー: ${err.message}`,
        });
        // 入力ファイルを削除
        unlink(inputPath).catch(console.error);
        reject(err);
      })
      // 出力先を指定して変換開始
      .save(outputPath);
  });
}
