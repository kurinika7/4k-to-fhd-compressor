// ============================================================
// ジョブストア - 変換ジョブをサーバーのメモリ上で管理します
//
// ※ これは MVP 用のシンプルな実装です。
//    本番環境では Redis などのデータストアを使用してください。
//    `next dev` 中にサーバーを再起動するとジョブ情報はリセットされます。
// ============================================================

import { Job } from './types';

// グローバルスコープに保存することで Next.js のホットリロード時も維持
// (globalThis を使うのは Next.js dev モード対策)
const globalStore = globalThis as typeof globalThis & {
  __jobStore?: Map<string, Job>;
};

if (!globalStore.__jobStore) {
  globalStore.__jobStore = new Map<string, Job>();
}

const jobs = globalStore.__jobStore;

/** ジョブを登録する */
export function setJob(id: string, job: Job): void {
  jobs.set(id, job);
}

/** ジョブを取得する */
export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

/** ジョブの一部フィールドを更新する */
export function updateJob(id: string, updates: Partial<Job>): void {
  const job = jobs.get(id);
  if (job) {
    jobs.set(id, { ...job, ...updates });
  }
}

/** ジョブを削除する */
export function deleteJob(id: string): void {
  jobs.delete(id);
}
