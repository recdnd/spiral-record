/**
 * Read-only 部署模式（2026-07-29 拍板）。
 *
 * 核心矛盾：不可逆登記簿需要真持久層，Vercel serverless（/tmp 短命且每實例一份）給不了。
 * 解法：本地是唯一可寫核心；線上部署為唯讀快照（build 時烘入 snapshot/spiral-record.sqlite）。
 * 日後若要線上可寫：Turso（libSQL）為既定待辦，見 README「Turso TODO」。
 */
export const IS_READ_ONLY =
  !!process.env.VERCEL || process.env.REC_READ_ONLY === '1';

export const READ_ONLY_MESSAGE =
  'This deployment is a read-only snapshot. The writable core lives locally. (唯讀快照；可寫核心在本機)';
