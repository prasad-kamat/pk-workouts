import { Router } from 'express';
import db from '../db/database';

const router = Router();

router.get('/', (_, res) => {
  res.json(
    db.prepare('SELECT id, name, avatar_color, created_at FROM users ORDER BY id').all()
  );
});

export default router;
