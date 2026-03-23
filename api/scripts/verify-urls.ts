/**
 * npm run verify-urls
 *
 * For every exercise in the DB, constructs both front + side MuscleWiki CDN
 * URLs and fires a HEAD request to check if they actually exist (HTTP 200).
 * Prints a clear pass/fail report and writes a JSON summary to data/url-report.json
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH   = path.join(__dirname, '../../data/workout.db');
const REPORT_PATH = path.join(__dirname, '../../data/url-report.json');
const BASE = 'https://media.musclewiki.com/media/uploads/videos/branded';

interface Exercise {
  id: number;
  name: string;
  musclewiki_slug: string;
  muscle_group_name: string;
}

interface UrlResult {
  exercise_id: number;
  exercise_name: string;
  muscle_group: string;
  slug: string;
  front_url: string;
  front_ok: boolean;
  front_status: number;
  side_url: string;
  side_ok: boolean;
  side_status: number;
  best_url: string | null;
}

async function checkUrl(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.status;
  } catch {
    return 0;
  }
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('DB not found — run npm run seed first');
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });

  const exercises = db.prepare(`
    SELECT e.id, e.name, e.musclewiki_slug,
           mg.name AS muscle_group_name
    FROM   exercises e
    JOIN   muscle_groups mg ON e.muscle_group_id = mg.id
    ORDER  BY mg.display_order, e.name
  `).all() as Exercise[];

  console.log(`\nChecking ${exercises.length} exercises against MuscleWiki CDN...`);
  console.log('(This makes 2 HTTP requests per exercise, may take ~30 seconds)\n');

  const results: UrlResult[] = [];
  const failed: string[]     = [];
  const passed: string[]     = [];

  const BATCH = 5;
  for (let i = 0; i < exercises.length; i += BATCH) {
    const batch = exercises.slice(i, i + BATCH);
    await Promise.all(batch.map(async (ex) => {
      const slug     = ex.musclewiki_slug;
      const frontUrl = `${BASE}/male-Dumbbells-${slug}-front.mp4`;
      const sideUrl  = `${BASE}/male-Dumbbells-${slug}-side.mp4`;

      const [frontStatus, sideStatus] = await Promise.all([
        checkUrl(frontUrl),
        checkUrl(sideUrl),
      ]);

      const frontOk = frontStatus === 200;
      const sideOk  = sideStatus  === 200;
      const bestUrl = frontOk ? frontUrl : sideOk ? sideUrl : null;

      results.push({
        exercise_id: ex.id, exercise_name: ex.name,
        muscle_group: ex.muscle_group_name, slug,
        front_url: frontUrl, front_ok: frontOk, front_status: frontStatus,
        side_url:  sideUrl,  side_ok:  sideOk,  side_status:  sideStatus,
        best_url:  bestUrl,
      });

      const icon   = bestUrl ? '✅' : '❌';
      const detail = bestUrl
        ? `front=${frontStatus} side=${sideStatus} → ${bestUrl.split('/').pop()}`
        : `front=${frontStatus} side=${sideStatus} → NO MATCH`;
      console.log(`${icon}  [${ex.muscle_group_name.padEnd(9)}] ${ex.name.padEnd(35)} ${detail}`);

      if (bestUrl) passed.push(ex.name);
      else failed.push(`${ex.muscle_group_name} / ${ex.name}  (slug: ${slug})`);
    }));
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));

  console.log('\n' + '─'.repeat(70));
  console.log(`✅  Resolved : ${passed.length} / ${exercises.length}`);
  console.log(`❌  Not found: ${failed.length} / ${exercises.length}`);

  if (failed.length > 0) {
    console.log('\n⚠️  These slugs need fixing:');
    failed.forEach(f => console.log(`   • ${f}`));
  }

  console.log(`\n📄  Full report saved to: data/url-report.json`);
  console.log('Paste the output above back to Perplexity to fix any broken slugs.');
}

main().catch(console.error);
