import db from './database';
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
console.log(`✅  Seeded: ${exCount} exercises | 2 users | 12 schedule slots`);
