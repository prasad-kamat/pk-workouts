const fs   = require('fs');
const path = require('path');

function write(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('  ✓', filePath);
}

console.log('\n🏗️  Creating workout-app backend...\n');

write('.gitignore', `node_modules/
dist/
.env
data/
*.db
*.db-shm
*.db-wal
`);

write('README.md', `# Workout App — workout.pkamat.com

## Structure
\`\`\`
├── backend/    → Node.js + Express + TypeScript + SQLite
└── frontend/   → Vite + React + TypeScript + Tailwind (PWA)  [Part 2]
\`\`\`

## Backend Quick Start
\`\`\`bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run verify-api
npm run dev
\`\`\`
`);

write('backend/package.json', JSON.stringify({
  name: "workout-app-backend",
  version: "1.0.0",
  scripts: {
    dev:            "ts-node-dev --respawn --transpile-only src/index.ts",
    build:          "tsc",
    start:          "node dist/index.js",
    seed:           "ts-node src/db/seed.ts",
    "verify-api":   "ts-node scripts/verify-musclewiki.ts",
    "manage-users": "ts-node scripts/manage-users.ts"
  },
  dependencies: {
    "better-sqlite3": "^9.4.3",
    cors:             "^2.8.5",
    dotenv:           "^16.4.5",
    express:          "^4.18.3"
  },
  devDependencies: {
    "@types/better-sqlite3": "^7.6.8",
    "@types/cors":           "^2.8.17",
    "@types/express":        "^4.17.21",
    "@types/node":           "^20.11.30",
    "ts-node":               "^10.9.2",
    "ts-node-dev":           "^2.0.0",
    typescript:              "^5.4.3"
  }
}, null, 2));

write('backend/tsconfig.json', JSON.stringify({
  compilerOptions: {
    target:                          "ES2020",
    module:                          "commonjs",
    lib:                             ["ES2020"],
    outDir:                          "./dist",
    rootDir:                         "./src",
    strict:                          true,
    esModuleInterop:                 true,
    skipLibCheck:                    true,
    forceConsistentCasingInFileNames:true,
    resolveJsonModule:               true
  },
  include:  ["src/**/*", "scripts/**/*"],
  exclude:  ["node_modules", "dist"]
}, null, 2));

write('backend/.env.example', `MUSCLEWIKI_API_KEY=your_api_key_here
PORT=3001
FRONTEND_URL=http://localhost:5173
`);

write('backend/src/types/index.ts', `export interface User {
  id: number;
  name: string;
  avatar_color: string;
  created_at: string;
}

export interface MuscleGroup {
  id: number;
  name: string;
  display_name: string;
  color_hex: string;
  display_order: number;
}

export interface Exercise {
  id: number;
  muscle_group_id: number;
  name: string;
  musclewiki_slug: string;
  video_url: string | null;
  video_url_cached_at: string | null;
  difficulty: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  notes: string | null;
  muscle_group_name?: string;
  muscle_group_display?: string;
  color_hex?: string;
  preference?: 'liked' | 'disliked' | null;
}

export interface WorkoutSession {
  id: number;
  user_id: number;
  session_date: string;
  weekday: number;
  completed_at: string | null;
}

export interface TodayWorkout {
  weekday: number;
  date: string;
  rest_day?: boolean;
  message?: string;
  muscle_groups: Array<{
    muscle_group: MuscleGroup;
    exercises: Exercise[];
  }>;
}
`);

write('backend/src/db/database.ts', `import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '../../../data/workout.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
`);
write('backend/src/db/schema.ts', `import db from './database';

export function createTables(): void {
  db.exec(\\\`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      avatar_color TEXT    DEFAULT '#3B82F6',
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS muscle_groups (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL UNIQUE,
      display_name  TEXT NOT NULL,
      color_hex     TEXT NOT NULL,
      display_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      muscle_group_id      INTEGER NOT NULL,
      name                 TEXT NOT NULL,
      musclewiki_slug      TEXT,
      video_url            TEXT,
      video_url_cached_at  DATETIME,
      difficulty           TEXT DEFAULT 'intermediate',
      sets                 INTEGER DEFAULT 3,
      reps_min             INTEGER DEFAULT 15,
      reps_max             INTEGER DEFAULT 20,
      notes                TEXT,
      FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id)
    );

    CREATE TABLE IF NOT EXISTS workout_schedule (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      weekday         INTEGER NOT NULL,
      muscle_group_id INTEGER NOT NULL,
      UNIQUE(weekday, muscle_group_id),
      FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id)
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL,
      session_date DATE    NOT NULL,
      weekday      INTEGER NOT NULL,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS session_exercises (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id     INTEGER NOT NULL,
      exercise_id    INTEGER NOT NULL,
      sets_completed INTEGER DEFAULT 0,
      reps_per_set   TEXT    DEFAULT '[]',
      FOREIGN KEY (session_id)  REFERENCES workout_sessions(id),
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );

    CREATE TABLE IF NOT EXISTS exercise_preferences (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      preference  TEXT    NOT NULL CHECK(preference IN ('liked','disliked')),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, exercise_id),
      FOREIGN KEY (user_id)     REFERENCES users(id),
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );

    CREATE TABLE IF NOT EXISTS exercise_rotation (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id                 INTEGER NOT NULL,
      muscle_group_id         INTEGER NOT NULL,
      last_shown_exercise_ids TEXT    DEFAULT '[]',
      updated_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, muscle_group_id),
      FOREIGN KEY (user_id)         REFERENCES users(id),
      FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id)
    );
  \\\`);
}
`);

write('backend/src/db/seed.ts', `import db from './database';
import { createTables } from './schema';

createTables();

const muscleGroups = [
  { name: 'biceps',    display_name: 'Biceps',    color_hex: '#F59E0B', display_order: 1 },
  { name: 'triceps',   display_name: 'Triceps',   color_hex: '#F97316', display_order: 2 },
  { name: 'chest',     display_name: 'Chest',     color_hex: '#3B82F6', display_order: 3 },
  { name: 'shoulders', display_name: 'Shoulders', color_hex: '#8B5CF6', display_order: 4 },
  { name: 'back',      display_name: 'Back',      color_hex: '#10B981', display_order: 5 },
  { name: 'legs',      display_name: 'Legs',      color_hex: '#EF4444', display_order: 6 },
  { name: 'core',      display_name: 'Core',      color_hex: '#06B6D4', display_order: 7 },
];

const insertMG = db.prepare(
  'INSERT OR IGNORE INTO muscle_groups (name, display_name, color_hex, display_order) VALUES (?, ?, ?, ?)'
);
for (const mg of muscleGroups)
  insertMG.run(mg.name, mg.display_name, mg.color_hex, mg.display_order);

const getMGId = (name: string): number =>
  (db.prepare('SELECT id FROM muscle_groups WHERE name = ?').get(name) as { id: number }).id;

const exerciseData: Record<string, { name: string; slug: string }[]> = {
  biceps: [
    { name: 'Dumbbell Curl',         slug: 'dumbbell-curl' },
    { name: 'Hammer Curl',           slug: 'dumbbell-hammer-curl' },
    { name: 'Incline Dumbbell Curl', slug: 'dumbbell-incline-curl' },
    { name: 'Concentration Curl',    slug: 'dumbbell-concentration-curl' },
    { name: 'Zottman Curl',          slug: 'dumbbell-zottman-curl' },
    { name: 'Cross Body Curl',       slug: 'dumbbell-cross-body-hammer-curl' },
    { name: 'Reverse Curl',          slug: 'dumbbell-reverse-curl' },
    { name: 'Spider Curl',           slug: 'dumbbell-spider-curl' },
  ],
  triceps: [
    { name: 'Overhead Tricep Extension',     slug: 'dumbbell-overhead-tricep-extension' },
    { name: 'Tricep Kickback',               slug: 'dumbbell-tricep-kickback' },
    { name: 'Skull Crusher',                 slug: 'dumbbell-skull-crusher' },
    { name: 'Tate Press',                    slug: 'dumbbell-tate-press' },
    { name: 'Single Arm Overhead Extension', slug: 'dumbbell-single-arm-overhead-tricep-extension' },
    { name: 'Close Grip Push Up',            slug: 'close-grip-push-up' },
  ],
  chest: [
    { name: 'Dumbbell Bench Press',   slug: 'dumbbell-bench-press' },
    { name: 'Incline Dumbbell Press', slug: 'dumbbell-incline-bench-press' },
    { name: 'Decline Dumbbell Press', slug: 'dumbbell-decline-bench-press' },
    { name: 'Dumbbell Fly',           slug: 'dumbbell-fly' },
    { name: 'Incline Dumbbell Fly',   slug: 'dumbbell-incline-fly' },
    { name: 'Dumbbell Pullover',      slug: 'dumbbell-pullover' },
    { name: 'Push Up',                slug: 'push-up' },
  ],
  shoulders: [
    { name: 'Dumbbell Shoulder Press', slug: 'dumbbell-shoulder-press' },
    { name: 'Lateral Raise',           slug: 'dumbbell-lateral-raise' },
    { name: 'Front Raise',             slug: 'dumbbell-front-raise' },
    { name: 'Rear Delt Fly',           slug: 'dumbbell-rear-delt-fly' },
    { name: 'Arnold Press',            slug: 'dumbbell-arnold-press' },
    { name: 'Upright Row',             slug: 'dumbbell-upright-row' },
    { name: 'Dumbbell Shrug',          slug: 'dumbbell-shrug' },
  ],
  back: [
    { name: 'Bent Over Row',       slug: 'dumbbell-bent-over-row' },
    { name: 'Single Arm Row',      slug: 'dumbbell-single-arm-row' },
    { name: 'Renegade Row',        slug: 'dumbbell-renegade-row' },
    { name: 'Reverse Fly',         slug: 'dumbbell-reverse-fly' },
    { name: 'Dumbbell Deadlift',   slug: 'dumbbell-deadlift' },
    { name: 'Chest Supported Row', slug: 'dumbbell-chest-supported-row' },
    { name: 'Seal Row',            slug: 'dumbbell-seal-row' },
  ],
  legs: [
    { name: 'Goblet Squat',          slug: 'dumbbell-goblet-squat' },
    { name: 'Dumbbell Lunge',        slug: 'dumbbell-lunge' },
    { name: 'Romanian Deadlift',     slug: 'dumbbell-romanian-deadlift' },
    { name: 'Bulgarian Split Squat', slug: 'dumbbell-bulgarian-split-squat' },
    { name: 'Sumo Squat',            slug: 'dumbbell-sumo-squat' },
    { name: 'Step Up',               slug: 'dumbbell-step-up' },
    { name: 'Calf Raise',            slug: 'dumbbell-calf-raise' },
    { name: 'Hip Thrust',            slug: 'dumbbell-hip-thrust' },
  ],
  core: [
    { name: 'Russian Twist',   slug: 'dumbbell-russian-twist' },
    { name: 'Weighted Crunch', slug: 'dumbbell-crunch' },
    { name: 'Side Bend',       slug: 'dumbbell-side-bend' },
    { name: 'Plank',           slug: 'plank' },
    { name: 'Bicycle Crunch',  slug: 'bicycle-crunch' },
    { name: 'Leg Raise',       slug: 'lying-leg-raise' },
    { name: 'Hollow Hold',     slug: 'hollow-hold' },
  ],
};

const insertEx = db.prepare(
  'INSERT OR IGNORE INTO exercises (muscle_group_id, name, musclewiki_slug, sets, reps_min, reps_max) VALUES (?, ?, ?, 3, 15, 20)'
);
for (const [group, list] of Object.entries(exerciseData)) {
  const id = getMGId(group);
  for (const ex of list) insertEx.run(id, ex.name, ex.slug);
}

const schedule = [
  { weekday: 1, group: 'chest' },    { weekday: 1, group: 'shoulders' },
  { weekday: 2, group: 'back' },     { weekday: 2, group: 'legs' },
  { weekday: 3, group: 'biceps' },   { weekday: 3, group: 'triceps' },  { weekday: 3, group: 'core' },
  { weekday: 4, group: 'chest' },    { weekday: 4, group: 'shoulders' },
  { weekday: 5, group: 'back' },     { weekday: 5, group: 'legs' },     { weekday: 5, group: 'core' },
];
const insertSched = db.prepare(
  'INSERT OR IGNORE INTO workout_schedule (weekday, muscle_group_id) VALUES (?, ?)'
);
for (const s of schedule) insertSched.run(s.weekday, getMGId(s.group));

const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, name, avatar_color) VALUES (?, ?, ?)');
insertUser.run(1, 'Prashant', '#3B82F6');
insertUser.run(2, 'Wife',     '#8B5CF6');

const exCount = (db.prepare('SELECT COUNT(*) as c FROM exercises').get() as { c: number }).c;
console.log(\\\`✅  Seeded: \\\${exCount} exercises | 2 users | 12 schedule slots\\\`);
`);

write('backend/src/index.ts', `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createTables } from './db/schema';
import exercisesRouter   from './routes/exercises';
import workoutsRouter    from './routes/workouts';
import usersRouter       from './routes/users';
import preferencesRouter from './routes/preferences';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
createTables();

app.use('/api/exercises',   exercisesRouter);
app.use('/api/workouts',    workoutsRouter);
app.use('/api/users',       usersRouter);
app.use('/api/preferences', preferencesRouter);

app.get('/api/health', (_, res) =>
  res.json({ status: 'ok', ts: new Date().toISOString() })
);

app.listen(PORT, () =>
  console.log(\\\`🏋️  Workout API → http://localhost:\\\${PORT}\\\`)
);
`);

write('backend/src/routes/users.ts', `import { Router } from 'express';
import db from '../db/database';

const router = Router();

router.get('/', (_, res) => {
  res.json(
    db.prepare('SELECT id, name, avatar_color, created_at FROM users ORDER BY id').all()
  );
});

export default router;
`);

write('backend/src/routes/preferences.ts', `import { Router } from 'express';
import db from '../db/database';

const router = Router();

router.get('/:user_id', (req, res) => {
  const rows = db.prepare(\\\`
    SELECT ep.*, e.name AS exercise_name,
           mg.display_name AS muscle_group, mg.color_hex
    FROM   exercise_preferences ep
    JOIN   exercises e     ON ep.exercise_id    = e.id
    JOIN   muscle_groups mg ON e.muscle_group_id = mg.id
    WHERE  ep.user_id = ?
    ORDER  BY ep.preference, e.name
  \\\`).all(req.params.user_id);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { user_id, exercise_id, preference } = req.body;
  if (!['liked', 'disliked'].includes(preference))
    return res.status(400).json({ error: "preference must be 'liked' or 'disliked'" });
  db.prepare(\\\`
    INSERT OR REPLACE INTO exercise_preferences (user_id, exercise_id, preference)
    VALUES (?, ?, ?)
  \\\`).run(user_id, exercise_id, preference);
  res.json({ success: true });
});

router.delete('/:user_id/:exercise_id', (req, res) => {
  db.prepare(
    'DELETE FROM exercise_preferences WHERE user_id = ? AND exercise_id = ?'
  ).run(req.params.user_id, req.params.exercise_id);
  res.json({ success: true });
});

export default router;
`);
write('backend/src/routes/exercises.ts', `import { Router } from 'express';
import db from '../db/database';

const router = Router();

router.get('/today', (req, res) => {
  const userId  = Number(req.query.user_id ?? 1);
  const now     = new Date();
  const weekday = now.getDay();

  if (weekday === 0 || weekday === 6)
    return res.json({ rest_day: true, message: 'Weekend — rest and recover 💪' });

  const muscleGroups = db.prepare(\\\`
    SELECT mg.* FROM workout_schedule ws
    JOIN   muscle_groups mg ON ws.muscle_group_id = mg.id
    WHERE  ws.weekday = ?
    ORDER  BY mg.display_order
  \\\`).all(weekday) as any[];

  const result = muscleGroups.map((mg: any) => {
    const rotation = db.prepare(\\\`
      SELECT last_shown_exercise_ids FROM exercise_rotation
      WHERE  user_id = ? AND muscle_group_id = ?
    \\\`).get(userId, mg.id) as { last_shown_exercise_ids: string } | undefined;

    const lastIds: number[] = rotation ? JSON.parse(rotation.last_shown_exercise_ids) : [];
    const ph = lastIds.length > 0 ? lastIds.join(',') : '0';

    const exercises = db.prepare(\\\`
      SELECT e.*, ep.preference
      FROM   exercises e
      LEFT JOIN exercise_preferences ep ON e.id = ep.exercise_id AND ep.user_id = ?
      WHERE  e.muscle_group_id = ?
        AND  (ep.preference IS NULL OR ep.preference != 'disliked')
      ORDER  BY
        CASE WHEN ep.preference = 'liked' THEN 0 ELSE 1 END,
        CASE WHEN e.id IN (\\\${ph})         THEN 1 ELSE 0 END,
        RANDOM()
      LIMIT 3
    \\\`).all(userId, mg.id);

    return { muscle_group: mg, exercises };
  });

  res.json({ weekday, date: now.toISOString().split('T')[0], muscle_groups: result });
});

router.get('/', (req, res) => {
  const { muscle_group, user_id = 1 } = req.query;
  let query = \\\`
    SELECT e.*, mg.name AS muscle_group_name, mg.display_name AS muscle_group_display,
           mg.color_hex, ep.preference
    FROM   exercises e
    JOIN   muscle_groups mg ON e.muscle_group_id = mg.id
    LEFT JOIN exercise_preferences ep ON e.id = ep.exercise_id AND ep.user_id = ?
  \\\`;
  const params: (string | number)[] = [Number(user_id)];
  if (muscle_group) { query += ' WHERE mg.name = ?'; params.push(String(muscle_group)); }
  query += ' ORDER BY mg.display_order, e.name';
  res.json(db.prepare(query).all(...params));
});

router.patch('/:id/video-url', (req, res) => {
  const { video_url } = req.body;
  db.prepare(\\\`
    UPDATE exercises SET video_url = ?, video_url_cached_at = CURRENT_TIMESTAMP WHERE id = ?
  \\\`).run(video_url, req.params.id);
  res.json({ success: true });
});

export default router;
`);

write('backend/src/routes/workouts.ts', `import { Router } from 'express';
import db from '../db/database';

const router = Router();

router.post('/session/start', (req, res) => {
  const { user_id } = req.body;
  const dateStr = new Date().toISOString().split('T')[0];
  const weekday = new Date().getDay();
  const existing = db.prepare(
    'SELECT id FROM workout_sessions WHERE user_id = ? AND session_date = ?'
  ).get(user_id, dateStr) as { id: number } | undefined;
  if (existing) return res.json({ id: existing.id, resumed: true });
  const r = db.prepare(
    'INSERT INTO workout_sessions (user_id, session_date, weekday) VALUES (?, ?, ?)'
  ).run(user_id, dateStr, weekday);
  res.json({ id: r.lastInsertRowid, resumed: false });
});

router.post('/session/:id/complete', (req, res) => {
  db.prepare('UPDATE workout_sessions SET completed_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(req.params.id);
  res.json({ success: true });
});

router.post('/session/:id/log', (req, res) => {
  const { exercise_id, sets_completed, reps_per_set } = req.body;
  const existing = db.prepare(
    'SELECT id FROM session_exercises WHERE session_id = ? AND exercise_id = ?'
  ).get(req.params.id, exercise_id) as { id: number } | undefined;
  if (existing) {
    db.prepare('UPDATE session_exercises SET sets_completed=?, reps_per_set=? WHERE id=?')
      .run(sets_completed, JSON.stringify(reps_per_set), existing.id);
  } else {
    db.prepare(
      'INSERT INTO session_exercises (session_id, exercise_id, sets_completed, reps_per_set) VALUES (?,?,?,?)'
    ).run(req.params.id, exercise_id, sets_completed, JSON.stringify(reps_per_set));
  }
  res.json({ success: true });
});

router.post('/rotation', (req, res) => {
  const { user_id, muscle_group_id, exercise_ids } = req.body;
  db.prepare(\\\`
    INSERT OR REPLACE INTO exercise_rotation
      (user_id, muscle_group_id, last_shown_exercise_ids, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  \\\`).run(user_id, muscle_group_id, JSON.stringify(exercise_ids));
  res.json({ success: true });
});

router.get('/history/:user_id', (req, res) => {
  res.json(db.prepare(\\\`
    SELECT   ws.id, ws.session_date, ws.weekday, ws.completed_at,
             COUNT(se.id) AS exercises_logged
    FROM     workout_sessions ws
    LEFT JOIN session_exercises se ON ws.id = se.session_id
    WHERE    ws.user_id = ?
    GROUP BY ws.id
    ORDER BY ws.session_date DESC
    LIMIT    60
  \\\`).all(req.params.user_id));
});

router.get('/streak/:user_id', (req, res) => {
  const sessions = db.prepare(\\\`
    SELECT DISTINCT session_date FROM workout_sessions
    WHERE  user_id = ? AND completed_at IS NOT NULL
    ORDER  BY session_date DESC
  \\\`).all(req.params.user_id) as { session_date: string }[];
  let streak = 0;
  const today = new Date(); today.setHours(0,0,0,0);
  for (const { session_date } of sessions) {
    const d = new Date(session_date); d.setHours(0,0,0,0);
    if (Math.round((today.getTime()-d.getTime())/86400000) <= streak+1) streak++;
    else break;
  }
  res.json({ streak });
});

export default router;
`);

write('backend/scripts/verify-musclewiki.ts', `import dotenv from 'dotenv';
dotenv.config();

const API_KEY  = process.env.MUSCLEWIKI_API_KEY ?? '';
const BASE_URL = 'https://api.musclewiki.com';

interface MWExercise {
  id: number; name: string; slug?: string;
  male?:   { video?: string; animation?: string };
  female?: { video?: string; animation?: string };
}

async function main() {
  if (!API_KEY) { console.error('MUSCLEWIKI_API_KEY missing in .env'); process.exit(1); }
  console.log('Querying MuscleWiki API...\\n');

  const res = await fetch(\\\`\\\${BASE_URL}/exercises/?equipment=dumbbells&limit=6\\\`, {
    headers: { 'X-Api-Key': API_KEY },
  });
  if (!res.ok) { console.error(\\\`HTTP \\\${res.status}: \\\${await res.text()}\\\`); process.exit(1); }

  const data  = await res.json() as { results?: MWExercise[] } | MWExercise[];
  const exs: MWExercise[] = Array.isArray(data) ? data : (data.results ?? []);
  console.log(\\\`Received \\\${exs.length} exercises\\n\\\`);

  for (const ex of exs) {
    const url  = ex.male?.video ?? ex.female?.video ?? '(none)';
    const safe = !/expires|X-Amz|token=/i.test(url);
    console.log(\\\`Exercise : \\\${ex.name}\\\`);
    console.log(\\\`Slug     : \\\${ex.slug ?? ex.id}\\\`);
    console.log(\\\`Video URL: \\\${url}\\\`);
    console.log(\\\`Cacheable: \\\${safe ? 'YES' : 'NO - has expiry token'}\\n\\\`);
  }

  const sample = exs[0]?.male?.video ?? '';
  console.log('--- Summary ---');
  console.log(\\\`Sample   : \\\${sample}\\\`);
  console.log(\\\`Cacheable: \\\${!/expires|X-Amz/i.test(sample) ? 'YES - safe to cache' : 'NO - do not cache'}\\\`);
  console.log('\\nPaste this output back to Perplexity before starting Part 2.');
}

main().catch(console.error);
`);

write('backend/scripts/manage-users.ts', `import db from '../src/db/database';
import { createTables } from '../src/db/schema';

createTables();
const [,, cmd, arg] = process.argv;

switch (cmd) {
  case 'add': {
    if (!arg) { console.error('Usage: npm run manage-users add "Name"'); process.exit(1); }
    const r = db.prepare('INSERT INTO users (name) VALUES (?)').run(arg);
    console.log(\\\`Added "\\\${arg}" id=\\\${r.lastInsertRowid}\\\`);
    break;
  }
  case 'remove': {
    const id = Number(arg);
    if (!id) { console.error('Usage: npm run manage-users remove <id>'); process.exit(1); }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    console.log(\\\`Removed user id=\\\${id}\\\`);
    break;
  }
  default:
    console.table(db.prepare('SELECT * FROM users ORDER BY id').all());
}
`);

console.log('\n✅  All files created!\n');
console.log('Next steps:');
console.log('  cd backend');
console.log('  copy .env.example .env    <- add your MUSCLEWIKI_API_KEY');
console.log('  npm install');
console.log('  npm run seed');
console.log('  npm run verify-api        <- paste output back to Perplexity');
console.log('  npm run dev');
