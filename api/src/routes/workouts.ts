import { Router } from 'express';
import db from '../db/database';

const router = Router();

router.post('/session/start', (req, res) => {
  const { user_id } = req.body;
  const dateStr = new Date().toISOString().split('T')[0];
  const weekday = req.query.weekday !== undefined
    ? Number(req.query.weekday)
    : new Date().getDay();
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
  db.prepare(`
    INSERT OR REPLACE INTO exercise_rotation
      (user_id, muscle_group_id, last_shown_exercise_ids, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `).run(user_id, muscle_group_id, JSON.stringify(exercise_ids));
  res.json({ success: true });
});

router.get('/history/:user_id', (req, res) => {
  res.json(db.prepare(`
    SELECT   ws.id, ws.session_date, ws.weekday, ws.completed_at,
             COUNT(se.id) AS exercises_logged
    FROM     workout_sessions ws
    LEFT JOIN session_exercises se ON ws.id = se.session_id
    WHERE    ws.user_id = ?
    GROUP BY ws.id
    ORDER BY ws.session_date DESC
    LIMIT    60
  `).all(req.params.user_id));
});

router.get('/streak/:user_id', (req, res) => {
  const sessions = db.prepare(`
    SELECT DISTINCT session_date FROM workout_sessions
    WHERE  user_id = ? AND completed_at IS NOT NULL
    ORDER  BY session_date DESC
  `).all(req.params.user_id) as { session_date: string }[];
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
