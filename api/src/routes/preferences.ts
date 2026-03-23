import { Router } from 'express';
import db from '../db/database';

const router = Router();

router.get('/:user_id', (req, res) => {
  const rows = db.prepare(`
    SELECT ep.*, e.name AS exercise_name,
           mg.display_name AS muscle_group, mg.color_hex
    FROM   exercise_preferences ep
    JOIN   exercises e     ON ep.exercise_id    = e.id
    JOIN   muscle_groups mg ON e.muscle_group_id = mg.id
    WHERE  ep.user_id = ?
    ORDER  BY ep.preference, e.name
  `).all(req.params.user_id);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { user_id, exercise_id, preference } = req.body;
  if (!['liked', 'disliked'].includes(preference))
    return res.status(400).json({ error: "preference must be 'liked' or 'disliked'" });
  db.prepare(`
    INSERT OR REPLACE INTO exercise_preferences (user_id, exercise_id, preference)
    VALUES (?, ?, ?)
  `).run(user_id, exercise_id, preference);
  res.json({ success: true });
});

router.delete('/:user_id/:exercise_id', (req, res) => {
  db.prepare(
    'DELETE FROM exercise_preferences WHERE user_id = ? AND exercise_id = ?'
  ).run(req.params.user_id, req.params.exercise_id);
  res.json({ success: true });
});

export default router;
