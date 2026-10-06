// 產生唯讀部署快照：data/spiral-record.sqlite →（checkpoint WAL 後）→ snapshot/spiral-record.sqlite
// 用法：npm run snapshot → git add snapshot/ → commit → push（Vercel 重建即帶新快照）
import Database from 'better-sqlite3';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const SRC = join(process.cwd(), 'data', 'spiral-record.sqlite');
const OUT_DIR = join(process.cwd(), 'snapshot');
const OUT = join(OUT_DIR, 'spiral-record.sqlite');

if (!existsSync(SRC)) {
  console.error(`找不到本地庫：${SRC}`);
  process.exit(1);
}

// WAL 裡未落盤的寫入先 checkpoint 回主檔，否則快照缺最新資料
const db = new Database(SRC);
db.pragma('wal_checkpoint(TRUNCATE)');
const count = (db.prepare('SELECT COUNT(*) AS n FROM fragments').get() as { n: number }).n;
db.close();

mkdirSync(OUT_DIR, { recursive: true });
copyFileSync(SRC, OUT);
console.log(`snapshot ▸ ${OUT}（fragments: ${count}）`);
console.log('下一步：git add snapshot/ && git commit && push → Vercel 重建');
