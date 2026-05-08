// ============================================================
// 型定義ファイル - アプリ全体で使う TypeScript 型をまとめています
// ============================================================

/** 動画コーデック: H.264 または H.265/HEVC */
export type VideoCodec = 'libx264' | 'libx265';

/** 画質プリセット */
export type VideoQuality = 'high' | 'standard' | 'light';

/** フレームレート設定 */
export type FrameRate = 'original' | '30' | '60';

/** 変換設定 - ユーザーが選択したオプション */
export interface ConversionSettings {
  codec: VideoCodec;
  quality: VideoQuality;
  frameRate: FrameRate;
}

/** 変換ジョブのステータス */
export type JobStatusType = 'pending' | 'processing' | 'completed' | 'error';

/** 変換ジョブの全情報 */
export interface Job {
  id: string;
  status: JobStatusType;
  /** 変換進捗 (0〜100) */
  progress: number;
  /** 入力ファイルのパス (サーバー側) */
  inputFile: string;
  /** 出力ファイルのパス (サーバー側) */
  outputFile: string;
  /** 入力ファイルのバイト数 */
  inputSize: number;
  /** 出力ファイルのバイト数 (完了後に設定) */
  outputSize?: number;
  /** 動画の長さ（秒） */
  duration?: number;
  /** 変換開始時刻 (Unix ms) */
  startTime: number;
  /** 変換完了時刻 (Unix ms) */
  endTime?: number;
  /** エラーメッセージ */
  error?: string;
  /** 元のファイル名 */
  originalName: string;
}

/** SSE で返すプログレスデータ */
export interface ProgressData {
  status: JobStatusType;
  progress: number;
  error?: string;
  inputSize: number;
  outputSize?: number;
  startTime: number;
  endTime?: number;
}

/** ブラウザで取得した動画のメタ情報 */
export interface VideoInfo {
  duration: number;   // 秒
  width: number;      // ピクセル
  height: number;     // ピクセル
}
