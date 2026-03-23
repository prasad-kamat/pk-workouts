import { Router } from 'express';
import db from '../db/database';

const router = Router();

router.get('/today', (req, res) => {
  const userId  = Number(req.query.user_id ?? 1);
  const now     = new Date();
  const weekday = req.query.weekday !== undefined
    ? Number(req.query.weekday)
    : new Date().getDay();

  if (weekday === 0 || weekday === 6)
    return res.json({ rest_day: true, message: 'Weekend — rest and recover 💪' });

  const muscleGroups = db.prepare(`
    SELECT mg.* FROM workout_schedule ws
    JOIN   muscle_groups mg ON ws.muscle_group_id = mg.id
    WHERE  ws.weekday = ?
    ORDER  BY mg.display_order
  `).all(weekday) as any[];

  const result = muscleGroups.map((mg: any) => {
    const rotation = db.prepare(`
      SELECT last_shown_exercise_ids FROM exercise_rotation
      WHERE  user_id = ? AND muscle_group_id = ?
    `).get(userId, mg.id) as { last_shown_exercise_ids: string } | undefined;

    const lastIds: number[] = rotation ? JSON.parse(rotation.last_shown_exercise_ids) : [];
    const ph = lastIds.length > 0 ? lastIds.join(',') : '0';

    const exercises = db.prepare(`
      SELECT e.*, ep.preference
      FROM   exercises e
      LEFT JOIN exercise_preferences ep ON e.id = ep.exercise_id AND ep.user_id = ?
      WHERE  e.muscle_group_id = ?
        AND  (ep.preference IS NULL OR ep.preference != 'disliked')
      ORDER  BY
        CASE WHEN ep.preference = 'liked' THEN 0 ELSE 1 END,
        CASE WHEN e.id IN (${ph})         THEN 1 ELSE 0 END,
        RANDOM()
      LIMIT 3
    `).all(userId, mg.id);

    return { muscle_group: mg, exercises };
  });

  res.json({ weekday, date: now.toISOString().split('T')[0], muscle_groups: result });
});

router.get('/', (req, res) => {
  const { muscle_group, user_id = 1 } = req.query;
  let query = `
    SELECT e.*, mg.name AS muscle_group_name, mg.display_name AS muscle_group_display,
           mg.color_hex, ep.preference
    FROM   exercises e
    JOIN   muscle_groups mg ON e.muscle_group_id = mg.id
    LEFT JOIN exercise_preferences ep ON e.id = ep.exercise_id AND ep.user_id = ?
  `;
  const params: (string | number)[] = [Number(user_id)];
  if (muscle_group) { query += ' WHERE mg.name = ?'; params.push(String(muscle_group)); }
  query += ' ORDER BY mg.display_order, e.name';
  res.json(db.prepare(query).all(...params));
});

router.patch('/:id/video-url', (req, res) => {
  const { video_url } = req.body;
  db.prepare(`
    UPDATE exercises SET video_url = ?, video_url_cached_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(video_url, req.params.id);
  res.json({ success: true });
});

export default router;
