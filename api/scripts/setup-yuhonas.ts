import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const DB_PATH  = path.join(__dirname, '../../data/workout.db');
const IMG_DIR  = path.join(__dirname, '../../public/exercise-images');
const JSON_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

interface YExercise {
  id: string; name: string; equipment: string | null;
  primaryMuscles: string[]; images: string[]; instructions: string[];
}
interface OurExercise { id: number; name: string; muscle_group_name: string; }

// Manual overrides: our exercise name → exact yuhonas id
const OVERRIDES: Record<string, string> = {
  // --- fixes for 4 unmatched ---
  'Close Grip Push Up':           'Close-Grip_Push-Up',
  'Push Up':                      'Push-Up',
  'Chest Supported Row':          'Bent_Over_Two-Dumbbell_Row_With_Head_On_Bench',
  'Bicycle Crunch':               'Bicycle_Crunch',

  // --- fixes for bad fuzzy matches ---
  'Skull Crusher':                'Dumbbell_Lying_Tricep_Extension',
  'Incline Dumbbell Fly':         'Dumbbell_Incline_Flyes',
  'Renegade Row':                 'Renegade_Row',
  'Seal Row':                     'Bent_Over_Two-Dumbbell_Row_With_Head_On_Bench',

  // --- already correct overrides, keep these ---
  'Single Arm Overhead Extension':'One_Arm_Pronated_Dumbbell_Triceps_Extension',
  'Dumbbell Fly':                 'Dumbbell_Flyes',
  'Single Arm Row':               'One-Arm_Dumbbell_Row',
  'Hip Thrust':                   'Barbell_Hip_Thrust',
  'Hollow Hold':                  'Plank',
  'Plank':                        'Plank',
  'Russian Twist':                'Russian_Twist',
  'Weighted Crunch':              'Decline_Crunch',
  'Spider Curl':                  'Spider_Curl',
  'Sumo Squat':                   'Dumbbell_Sumo_Squat',
  'Goblet Squat':                 'Dumbbell_Goblet_Squat',
};

function norm(s: string): string {
  return s.toLowerCase().replace(/dumbbell\s*/g, '').replace(/[^a-z0-9 ]/g, '').trim();
}
function score(a: string, b: string): number {
  const wa = new Set(a.split(' ').filter(Boolean));
  const wb = new Set(b.split(' ').filter(Boolean));
  let hits = 0;
  wa.forEach(w => { if (wb.has(w)) hits++; });
  return hits / Math.max(wa.size, wb.size);
}
async function downloadImg(url: string, dest: string): Promise<boolean> {
  try {
    const r = await fetch(url);
    if (!r.ok) return false;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    return true;
  } catch { return false; }
}

async function main() {
  console.log('📥 Fetching exercises.json...');
  const res = await fetch(JSON_URL);
  if (!res.ok) { console.error(`Failed: ${res.status}`); process.exit(1); }
  const all = await res.json() as YExercise[];
  const byId = new Map(all.map(e => [e.id, e]));
  const dumbbells = all.filter(e => e.equipment === 'dumbbell');
  console.log(`✅ Total: ${all.length} | Dumbbell: ${dumbbells.length}\n`);

  const db   = new Database(DB_PATH);
  const ours = db.prepare(`
    SELECT e.id, e.name, mg.name AS muscle_group_name
    FROM   exercises e
    JOIN   muscle_groups mg ON e.muscle_group_id = mg.id
    ORDER  BY mg.display_order, e.name
  `).all() as OurExercise[];

  const updateEx = db.prepare(`
    UPDATE exercises SET exercise_db_id=?, video_url=?, instructions=? WHERE id=?
  `);

  fs.mkdirSync(IMG_DIR, { recursive: true });

  const matched: any[] = []; const unmatched: any[] = [];
  console.log('🔍 Matching + downloading images...\n');

  for (const ex of ours) {
    let yex: YExercise | undefined;
    let matchType = '';

    // 1. Manual override takes priority
    const overrideId = OVERRIDES[ex.name];
    if (overrideId) {
      yex = byId.get(overrideId);
      matchType = yex ? 'override' : 'override-missing';
    }

    // 2. Fuzzy match against dumbbells
    if (!yex) {
      const scored = dumbbells
        .map(e => ({ e, s: score(norm(ex.name), norm(e.name)) }))
        .sort((a, b) => b.s - a.s);
      if (scored[0]?.s >= 0.45) { yex = scored[0].e; matchType = `fuzzy(${Math.round(scored[0].s*100)}%)`; }
    }

    // 3. Fuzzy match against ALL exercises (for bodyweight etc)
    if (!yex) {
      const scored = all
        .map(e => ({ e, s: score(norm(ex.name), norm(e.name)) }))
        .sort((a, b) => b.s - a.s);
      if (scored[0]?.s >= 0.55) { yex = scored[0].e; matchType = `fuzzy-all(${Math.round(scored[0].s*100)}%)`; }
    }

    if (yex) {
      const yid  = yex.id;
      const img0 = `${IMG_BASE}/${yid}/0.jpg`;
      const img1 = `${IMG_BASE}/${yid}/1.jpg`;
      const loc0 = path.join(IMG_DIR, yid, '0.jpg');
      const loc1 = path.join(IMG_DIR, yid, '1.jpg');

      const [dl0, dl1] = await Promise.all([
        downloadImg(img0, loc0),
        downloadImg(img1, loc1),
      ]);

      updateEx.run(yid, `/exercise-images/${yid}/0.jpg`, JSON.stringify(yex.instructions ?? []), ex.id);
      matched.push({ our: ex.name, matched: yex.name, matchType, dl0, dl1 });

      const icon = (dl0 && dl1) ? '✅' : dl0 ? '🖼️ ' : '⚠️ ';
      console.log(`${icon}  [${ex.muscle_group_name.padEnd(9)}] ${ex.name.padEnd(35)} → "${yex.name}" [${matchType}] img0=${dl0} img1=${dl1}`);
    } else {
      unmatched.push({ our: ex.name, group: ex.muscle_group_name });
      console.log(`❌  [${ex.muscle_group_name.padEnd(9)}] ${ex.name.padEnd(35)} NO MATCH`);
    }
  }

  console.log('\n' + '─'.repeat(70));
  const both = matched.filter(m => m.dl0 && m.dl1).length;
  console.log(`✅  Matched     : ${matched.length} / ${ours.length}`);
  console.log(`🖼️   Both images : ${both} / ${matched.length}`);
  console.log(`❌  Unmatched   : ${unmatched.length} / ${ours.length}`);
  if (unmatched.length) {
    console.log('\n⚠️  Still unmatched:');
    unmatched.forEach(u => console.log(`   • ${u.group} / ${u.our}`));
  }
  console.log(`\n📁  Images saved to: api/public/exercise-images/`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
