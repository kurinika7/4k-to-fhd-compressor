// ============================================================
// POST /api/convert
//
// 動画ファイルを受け取り、FFmpeg で変換を開始するAPIルート。
// 受け付けたらすぐにジョブIDを返し、変換はバックグラウンドで実行する。
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import os from 'os';
import { setJob } from '@/lib/jobStore';
import { ConversionSettings } from '@/lib/types';
import { convertVideo } from '@/lib/ffmpeg';

// 一時ファイルの保存先 (/tmp/4k-compressor/)
const TEMP_DIR = join(os.tmpdir(), '4k-compressor');

// リクエストボディの上限を設定 (大容量動画対応)
export const maxDuration = 300; // 最大5分のタイムアウト

export async function POST(request: NextRequest) {
  try {
    // -------------------------------------------------------
    // 1. フォームデータを解析
    // -------------------------------------------------------
    const formData = await request.formData();
    const file = formData.get('video') as File | null;
    const settingsJson = formData.get('settings') as string | null;

    // バリデーション
    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: '動画ファイルが見つかりません。ファイルを選択してください。' },
        { status: 400 }
      );
    }

    if (!settingsJson) {
      return NextResponse.json(
        { error: '変換設定が見つかりません。' },
        { status: 400 }
      );
    }

    // 設定を JSON でパース
    let settings: ConversionSettings;
    try {
      settings = JSON.parse(settingsJson);
    } catch {
      return NextResponse.json(
        { error: '変換設定の形式が不正です。' },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // 2. 一時ディレクトリの作成とファイル保存
    // -------------------------------------------------------
    await mkdir(TEMP_DIR, { recursive: true });

    const jobId = uuidv4();
    const inputExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const inputPath = join(TEMP_DIR, `${jobId}_input.${inputExt}`);
    const outputPath = join(TEMP_DIR, `${jobId}_output.mp4`);

    // ファイルをバッファとして読み込み、一時ディレクトリに保存
    // 注意: 非常に大容量のファイル (>8GB) はメモリに注意してください
    const bytes = await file.arrayBuffer();
    await writeFile(inputPath, Buffer.from(bytes));

    // -------------------------------------------------------
    // 3. ジョブを登録
    // -------------------------------------------------------
    setJob(jobId, {
      id: jobId,
      status: 'pending',
      progress: 0,
      inputFile: inputPath,
      outputFile: outputPath,
      inputSize: file.size,
      startTime: Date.now(),
      originalName: file.name,
    });

    // -------------------------------------------------------
    // 4. 変換をバックグラウンドで開始 (await しない)
    //    レスポンスをすぐに返し、変換は非同期で実行
    // -------------------------------------------------------
    convertVideo(jobId, inputPath, outputPath, settings).catch((err) => {
      console.error(`[Job ${jobId}] 変換エラー:`, err);
    });

    // ジョブIDを返す (クライアントはこれを使って進捗を監視する)
    return NextResponse.json({ jobId });
  } catch (error) {
    console.error('[POST /api/convert] エラー:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '変換を開始できませんでした。もう一度お試しください。',
      },
      { status: 500 }
    );
  }
}
