/**
 * manage-exercises.ts
 *
 * Usage:
 *   ts-node scripts/manage-exercises.ts sync [--filter dumbbell] [--group biceps] [--dry-run]
 *   ts-node scripts/manage-exercises.ts add   --name "Cable Curl" --group biceps [--sets 3] [--reps-min 8] [--reps-max 12] [--filter cable] [--dry-run]
 *   ts-node scripts/manage-exercises.ts remove --name "Hammer Curl" [--name "Zottman Curl" ...] [--group biceps] [--keep-images]
 *   ts-node scripts/manage-exercises.ts list   [--group biceps]
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

// ─── Config ──────────────────────────────────────────────────────────────────

const DB_PATH  = path.join(__dirname, '../../data/workout.db');
const IMG_DIR  = path.join(__dirname, '../public/exercise-images');
const JSON_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

// ─── Types ───────────────────────────────────────────────────────────────────

interface YExercise {
  id: string;
  name: string;
  equipment: string | string[] | null;
  primaryMuscles: string[];
  images: string[];
  instructions: string[];
}

interface OurExercise {
  id: number;
  name: string;
  muscle_group_name: string;
  sets: number;
  reps_min: number;
  reps_max: number;
}

// ─── Overrides ───────────────────────────────────────────────────────────────
// Maps our exercise name → exact yuhonas exercise id.
// Add entries here when fuzzy matching gets the wrong result.

const OVERRIDES: Record<string, string> = {
  // Bodyweight (no equipment filter match)
  'Close Grip Push Up':            'Close-Grip_Push-Up',
  'Push Up':                       'Push-Up',
  'Bicycle Crunch':                'Bicycle_Crunch',

  // Specific overrides for bad fuzzy matches
  'Chest Supported Row':           'Bent_Over_Two-Dumbbell_Row_With_Head_On_Bench',
  'Skull Crusher':                 'Dumbbell_Lying_Tricep_Extension',
  'Incline Dumbbell Fly':          'Dumbbell_Incline_Flyes',
  'Renegade Row':                  'Renegade_Row',
  'Seal Row':                      'Bent_Over_Two-Dumbbell_Row_With_Head_On_Bench',
  'Single Arm Overhead Extension': 'One_Arm_Pronated_Dumbbell_Triceps_Extension',
  'Dumbbell Fly':                  'Dumbbell_Flyes',
  'Single Arm Row':                'One-Arm_Dumbbell_Row',
  'Hip Thrust':                    'Barbell_Hip_Thrust',
  'Hollow Hold':                   'Plank',
  'Plank':                         'Plank',
  'Russian Twist':                 'Russian_Twist',
  'Weighted Crunch':               'Decline_Crunch',
  'Spider Curl':                   'Spider_Curl',
  'Sumo Squat':                    'Dumbbell_Sumo_Squat',
  'Goblet Squat':                  'Dumbbell_Goblet_Squat',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function hasEquipment(yex: YExercise, filter: string): boolean {
  if (!filter) return true;
  const eq = yex.equipment;
  if (!eq) return false;
  if (Array.isArray(eq)) return eq.includes(filter);
  return eq === filter;
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

function parseArgs(argv: string[]) {
  const args: Record<string, string | string[] | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        // Support repeated flags: --name "A" --name "B"
        if (key in args) {
          args[key] = [...(Array.isArray(args[key]) ? args[key] as string[] : [args[key] as string]), next];
        } else {
          args[key] = next;
        }
        i++;
      }
    }
  }
  return args;
}

function asArray(v: string | string[] | boolean | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'boolean') return [];
  return [v];
}

// ─── Match one exercise against yuhonas db ───────────────────────────────────

function matchExercise(
  exName: string,
  byId: Map<string, YExercise>,
  filtered: YExercise[],
  all: YExercise[],
): { yex: YExercise; matchType: string } | null {
  // 1. Manual override
  const overrideId = OVERRIDES[exName];
  if (overrideId) {
    const yex = byId.get(overrideId);
    if (yex) return { yex, matchType: 'override' };
    console.warn(`  ⚠️  Override id "${overrideId}" not found in yuhonas db`);
  }

  // 2. Fuzzy match against filtered (e.g. dumbbell only)
  if (filtered.length > 0) {
    const scored = filtered
      .map(e => ({ e, s: score(norm(exName), norm(e.name)) }))
      .sort((a, b) => b.s - a.s);
    if (scored[0]?.s >= 0.45)
      return { yex: scored[0].e, matchType: `fuzzy(${Math.round(scored[0].s * 100)}%)` };
  }

  // 3. Fuzzy match against ALL exercises (bodyweight, etc.)
  const scoredAll = all
    .map(e => ({ e, s: score(norm(exName), norm(e.name)) }))
    .sort((a, b) => b.s - a.s);
  if (scoredAll[0]?.s >= 0.55)
    return { yex: scoredAll[0].e, matchType: `fuzzy-all(${Math.round(scoredAll[0].s * 100)}%)` };

  return null;
}

// ─── Commands ────────────────────────────────────────────────────────────────

async function cmdSync(args: ReturnType<typeof parseArgs>) {
  const filter  = (args.filter  as string) || '';
  const group   = (args.group   as string) || '';
  const dryRun  = !!args['dry-run'];

  console.log(`📥 Fetching exercises.json...`);
  const res = await fetch(JSON_URL);
  if (!res.ok) { console.error(`Failed: ${res.status}`); process.exit(1); }
  const all    = await res.json() as YExercise[];
  const byId   = new Map(all.map(e => [e.id, e]));
  const filtered = filter ? all.filter(e => hasEquipment(e, filter)) : [];
  console.log(`✅ Total: ${all.length}${filter ? ` | ${filter}: ${filtered.length}` : ''}\n`);

  const db   = new Database(DB_PATH);
  const ours = db.prepare(`
    SELECT e.id, e.name, mg.name AS muscle_group_name, e.sets, e.reps_min, e.reps_max
    FROM   exercises e
    JOIN   muscle_groups mg ON e.muscle_group_id = mg.id
    ${group ? `WHERE mg.name = ?` : ''}
    ORDER  BY mg.display_order, e.name
  `).all(...(group ? [group] : [])) as OurExercise[];

  const updateEx = db.prepare(
    `UPDATE exercises SET exercise_db_id=?, video_url=?, instructions=? WHERE id=?`
  );

  fs.mkdirSync(IMG_DIR, { recursive: true });

  const matched: any[] = [];
  const unmatched: any[] = [];
  console.log(`🔍 Matching + ${dryRun ? 'previewing' : 'downloading'} images...\n`);

  for (const ex of ours) {
    const result = matchExercise(ex.name, byId, filtered, all);

    if (result) {
      const { yex, matchType } = result;
      const loc0 = path.join(IMG_DIR, yex.id, '0.jpg');
      const loc1 = path.join(IMG_DIR, yex.id, '1.jpg');
      let dl0 = false, dl1 = false;

      if (!dryRun) {
        [dl0, dl1] = await Promise.all([
          downloadImg(`${IMG_BASE}/${yex.id}/0.jpg`, loc0),
          downloadImg(`${IMG_BASE}/${yex.id}/1.jpg`, loc1),
        ]);
        updateEx.run(yex.id, `/exercise-images/${yex.id}/0.jpg`, JSON.stringify(yex.instructions ?? []), ex.id);
      } else {
        dl0 = dl1 = true; // preview assumes success
      }

      matched.push({ our: ex.name, matched: yex.name, matchType, dl0, dl1 });
      const icon = dryRun ? '🔍' : (dl0 && dl1) ? '✅' : dl0 ? '🖼️ ' : '⚠️ ';
      console.log(`${icon}  [${ex.muscle_group_name.padEnd(9)}] ${ex.name.padEnd(35)} → "${yex.name}" [${matchType}]${dryRun ? '' : ` img0=${dl0} img1=${dl1}`}`);
    } else {
      unmatched.push(ex);
      console.log(`❌  [${ex.muscle_group_name.padEnd(9)}] ${ex.name.padEnd(35)} NO MATCH`);
    }
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`✅  Matched   : ${matched.length} / ${ours.length}`);
  console.log(`❌  Unmatched : ${unmatched.length} / ${ours.length}`);
  if (unmatched.length) {
    console.log('\n⚠️  Unmatched exercises:');
    unmatched.forEach(u => console.log(`   • ${u.muscle_group_name} / ${u.name}`));
    console.log('\n   Tip: add an entry to OVERRIDES in this script to fix these.');
  }
  if (dryRun) console.log('\n🔍 Dry run — no DB writes or image downloads performed.');
  console.log(`\n📁  Images saved to: api/public/exercise-images/`);
}

async function cmdAdd(args: ReturnType<typeof parseArgs>) {
  const name    = args.name    as string;
  const group   = args.group   as string;
  const filter  = (args.filter as string) || 'dumbbell';
  const sets    = parseInt((args.sets    as string) || '3');
  const repsMin = parseInt((args['reps-min'] as string) || '8');
  const repsMax = parseInt((args['reps-max'] as string) || '12');
  const dryRun  = !!args['dry-run'];

  if (!name || !group) {
    console.error('❌ --name and --group are required for add');
    console.error('   Example: ts-node scripts/manage-exercises.ts add --name "Cable Curl" --group biceps');
    process.exit(1);
  }

  const db = new Database(DB_PATH);

  const mg = db.prepare(`SELECT id, name FROM muscle_groups WHERE name = ?`).get(group) as { id: number; name: string } | undefined;
  if (!mg) {
    const groups = (db.prepare(`SELECT name FROM muscle_groups`).all() as any[]).map(r => r.name).join(', ');
    console.error(`❌ Unknown muscle group "${group}". Available: ${groups}`);
    process.exit(1);
  }

  const existing = db.prepare(`SELECT id FROM exercises WHERE name = ? AND muscle_group_id = ?`).get(name, mg.id);
  if (existing) {
    console.error(`❌ Exercise "${name}" already exists in ${group}`);
    process.exit(1);
  }

  console.log(`📥 Fetching exercises.json...`);
  const res = await fetch(JSON_URL);
  if (!res.ok) { console.error(`Failed: ${res.status}`); process.exit(1); }
  const all      = await res.json() as YExercise[];
  const byId     = new Map(all.map(e => [e.id, e]));
  const filtered = all.filter(e => hasEquipment(e, filter));

  const result = matchExercise(name, byId, filtered, all);

  if (!result) {
    console.error(`❌ No match found for "${name}" with filter="${filter}"`);
    console.error(`   Add an entry to OVERRIDES in this script to force a specific match.`);
    process.exit(1);
  }

  const { yex, matchType } = result;
  console.log(`\n🔍 Matched "${name}" → "${yex.name}" [${matchType}]`);

  if (dryRun) {
    console.log(`\n🔍 Dry run — would insert:`);
    console.log(`   name: ${name} | group: ${group} | sets: ${sets} | reps: ${repsMin}-${repsMax}`);
    console.log(`   yuhonas id: ${yex.id}`);
    return;
  }

  const loc0 = path.join(IMG_DIR, yex.id, '0.jpg');
  const loc1 = path.join(IMG_DIR, yex.id, '1.jpg');
  const [dl0, dl1] = await Promise.all([
    downloadImg(`${IMG_BASE}/${yex.id}/0.jpg`, loc0),
    downloadImg(`${IMG_BASE}/${yex.id}/1.jpg`, loc1),
  ]);

  db.prepare(`
    INSERT INTO exercises (name, muscle_group_id, sets, reps_min, reps_max, exercise_db_id, video_url, instructions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, mg.id, sets, repsMin, repsMax,
    yex.id,
    `/exercise-images/${yex.id}/0.jpg`,
    JSON.stringify(yex.instructions ?? [])
  );

  console.log(`✅ Added "${name}" to ${group}`);
  console.log(`   Images: img0=${dl0} img1=${dl1}`);
  console.log(`\n   If the match looks wrong, add an override to OVERRIDES and run:`);
  console.log(`   ts-node scripts/manage-exercises.ts sync --group ${group}`);
}

async function cmdRemove(args: ReturnType<typeof parseArgs>) {
  const names      = asArray(args.name);
  const group      = args.group as string | undefined;
  const keepImages = !!args['keep-images'];

  if (names.length === 0 && !group) {
    console.error('❌ Provide at least one --name "Exercise" or a --group');
    console.error('   Examples:');
    console.error('     ts-node scripts/manage-exercises.ts remove --name "Hammer Curl"');
    console.error('     ts-node scripts/manage-exercises.ts remove --name "Hammer Curl" --name "Zottman Curl"');
    console.error('     ts-node scripts/manage-exercises.ts remove --group biceps');
    process.exit(1);
  }

  const db = new Database(DB_PATH);

  let targets: { id: number; name: string; exercise_db_id: string | null }[] = [];

  if (group) {
    targets = db.prepare(`
      SELECT e.id, e.name, e.exercise_db_id
      FROM   exercises e
      JOIN   muscle_groups mg ON e.muscle_group_id = mg.id
      WHERE  mg.name = ?
    `).all(group) as any[];
  }

  if (names.length > 0) {
    const byName = db.prepare(`
      SELECT e.id, e.name, e.exercise_db_id
      FROM   exercises e
      WHERE  e.name IN (${names.map(() => '?').join(',')})
    `).all(...names) as any[];

    // Warn about any names not found
    const found = new Set(byName.map((r: any) => r.name));
    names.forEach(n => { if (!found.has(n)) console.warn(`⚠️  "${n}" not found in DB — skipping`); });

    // Merge, deduplicate
    const ids = new Set(targets.map(t => t.id));
    byName.forEach(r => { if (!ids.has(r.id)) targets.push(r); });
  }

  if (targets.length === 0) {
    console.log('Nothing to remove.');
    return;
  }

  console.log(`\n🗑️  Removing ${targets.length} exercise(s):\n`);

  const deleteEx   = db.prepare(`DELETE FROM exercises WHERE id = ?`);
  const deletePrefs = db.prepare(`DELETE FROM user_exercise_preferences WHERE exercise_id = ?`);

  for (const ex of targets) {
    deleteEx.run(ex.id);
    deletePrefs.run(ex.id);

    if (!keepImages && ex.exercise_db_id) {
      const imgDir = path.join(IMG_DIR, ex.exercise_db_id);
      if (fs.existsSync(imgDir)) {
        fs.rmSync(imgDir, { recursive: true, force: true });
        console.log(`  🗑️  ${ex.name} — removed from DB + deleted images`);
      } else {
        console.log(`  🗑️  ${ex.name} — removed from DB (no images found)`);
      }
    } else {
      console.log(`  🗑️  ${ex.name} — removed from DB${keepImages ? ' (images kept)' : ''}`);
    }
  }

  console.log(`\n✅ Done. Removed ${targets.length} exercise(s).`);
}

async function cmdList(args: ReturnType<typeof parseArgs>) {
  const group = args.group as string | undefined;

  const db = new Database(DB_PATH);
  const rows = db.prepare(`
    SELECT e.id, e.name, mg.name AS muscle_group, e.sets, e.reps_min, e.reps_max,
           e.exercise_db_id,
           CASE WHEN e.video_url IS NOT NULL THEN '✅' ELSE '❌' END AS has_image
    FROM   exercises e
    JOIN   muscle_groups mg ON e.muscle_group_id = mg.id
    ${group ? `WHERE mg.name = ?` : ''}
    ORDER  BY mg.display_order, e.name
  `).all(...(group ? [group] : [])) as any[];

  if (rows.length === 0) { console.log('No exercises found.'); return; }

  let currentGroup = '';
  for (const r of rows) {
    if (r.muscle_group !== currentGroup) {
      currentGroup = r.muscle_group;
      console.log(`\n● ${currentGroup.toUpperCase()}`);
    }
    console.log(`  ${r.has_image} [${r.id}] ${r.name.padEnd(38)} ${r.sets}×${r.reps_min}-${r.reps_max}  ${r.exercise_db_id ?? '(no db id)'}`);
  }
  console.log(`\nTotal: ${rows.length} exercise(s)`);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  const [,, command, ...rest] = process.argv;
  const args = parseArgs(rest);

  switch (command) {
    case 'sync':   await cmdSync(args);   break;
    case 'add':    await cmdAdd(args);    break;
    case 'remove': await cmdRemove(args); break;
    case 'list':   await cmdList(args);   break;
    default:
      console.log(`
manage-exercises.ts — Exercise management CLI

Commands:
  sync    Re-match and re-download images for exercises already in DB
  add     Add a new exercise to the DB and fetch its images
  remove  Remove exercise(s) from DB (and delete images)
  list    List all exercises in DB

Examples:
  ts-node scripts/manage-exercises.ts sync
  ts-node scripts/manage-exercises.ts sync --filter dumbbell --dry-run
  ts-node scripts/manage-exercises.ts sync --group biceps

  ts-node scripts/manage-exercises.ts add --name "Cable Curl" --group biceps --filter cable
  ts-node scripts/manage-exercises.ts add --name "Pull Up" --group back --sets 3 --reps-min 5 --reps-max 10 --dry-run

  ts-node scripts/manage-exercises.ts remove --name "Hammer Curl"
  ts-node scripts/manage-exercises.ts remove --name "Hammer Curl" --name "Zottman Curl"
  ts-node scripts/manage-exercises.ts remove --group biceps --keep-images

  ts-node scripts/manage-exercises.ts list
  ts-node scripts/manage-exercises.ts list --group legs
      `);
      process.exit(1);
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
