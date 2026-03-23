import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const DB_PATH   = path.join(__dirname, '../../data/workout.db');
const JSON_URL  = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMG_BASE  = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

interface YExercise {
  id: string;
  name: string;
  equipment: string | null;
  primaryMuscles: string[];
  images: string[];
  instructions: string[];
}
interface OurExercise { id: number; name: string; muscle_group_name: string; }

function norm(s: string): string {
  return s.toLowerCase()
    .replace(/dumbbell\s*/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

function score(a: string, b: string): number {
  const wa = new Set(a.split(' ').filter(Boolean));
  const wb = new Set(b.split(' ').filter(Boolean));
  let hits = 0;
  wa.forEach(w => { if (wb.has(w)) hits++; });
  return hits / Math.max(wa.size, wb.size);
}

async function main() {
  // 1. Download exercises.json
  console.log('📥 Fetching exercises.json from yuhonas...');
  const res = await fetch(JSON_URL);
  if (!res.ok) { console.error(`Failed to fetch: ${res.status}`); process.exit(1); }
  const all = await res.json() as YExercise[];

  const dumbbells = all.filter(e => e.equipment === 'dumbbell');
  console.log(`✅ Total exercises: ${all.length} | Dumbbell: ${dumbbells.length}\n`);

  // 2. Load our exercises
  const db   = new Database(DB_PATH);
  const ours = db.prepare(`
    SELECT e.id, e.name, mg.name AS muscle_group_name
    FROM   exercises e
    JOIN   muscle_groups mg ON e.muscle_group_id = mg.id
    ORDER  BY mg.display_order, e.name
  `).all() as OurExercise[];

  // Store yuhonas id in exercise_db_id, instructions in instructions col
  const updateEx = db.prepare(`
    UPDATE exercises
    SET exercise_db_id = ?,
        video_url      = ?,
        instructions   = ?
    WHERE id = ?
  `);

  const matched:   any[] = [];
  const unmatched: any[] = [];

  console.log(`🔍 Matching ${ours.length} exercises against ${dumbbells.length} dumbbell exercises...\n`);

  for (const ex of ours) {
    const ourNorm = norm(ex.name);
    const scored  = dumbbells
      .map(e => ({ e, s: score(ourNorm, norm(e.name)) }))
      .sort((a, b) => b.s - a.s);

    const best = scored[0];

    if (best && best.s >= 0.45) {
      const yid  = best.e.id;
      const img0 = `${IMG_BASE}/${yid}/0.jpg`;
      // Store img0 as video_url; frontend derives img1 by replacing 0 with 1
      const instructions = JSON.stringify(best.e.instructions ?? []);

      updateEx.run(yid, img0, instructions, ex.id);
      matched.push({ our: ex.name, matched: best.e.name, score: Math.round(best.s * 100), yid });
      console.log(`✅  [${ex.muscle_group_name.padEnd(9)}] ${ex.name.padEnd(35)} → "${best.e.name}" (${Math.round(best.s * 100)}%)`);
    } else {
      unmatched.push({ our: ex.name, group: ex.muscle_group_name, best: best?.e.name, score: Math.round((best?.s ?? 0) * 100) });
      console.log(`❌  [${ex.muscle_group_name.padEnd(9)}] ${ex.name.padEnd(35)} NO MATCH${best ? ` (best: "${best.e.name}" @ ${Math.round(best.s * 100)}%)` : ''}`);
    }
  }

  // Save report
  const report = { matched, unmatched };
  fs.writeFileSync(path.join(__dirname, '../../data/yuhonas-report.json'), JSON.stringify(report, null, 2));

  console.log('\n' + '─'.repeat(70));
  console.log(`✅  Matched   : ${matched.length} / ${ours.length}`);
  console.log(`❌  Unmatched : ${unmatched.length} / ${ours.length}`);
  if (unmatched.length) {
    console.log('\n⚠️  Unmatched:');
    unmatched.forEach(u =>
      console.log(`   • ${u.group} / ${u.our}${u.best ? ` (best: "${u.best}" @ ${u.score}%)` : ''}`)
    );
  }
  console.log('\n📄  Report saved to data/yuhonas-report.json');
  console.log('Paste output back to Perplexity to fix unmatched ones.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
