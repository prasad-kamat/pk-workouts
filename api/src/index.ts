import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createTables } from './db/schema';
import exercisesRouter   from './routes/exercises';
import workoutsRouter    from './routes/workouts';
import usersRouter       from './routes/users';
import preferencesRouter from './routes/preferences';
import path from 'path';

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
app.use('/exercise-images', express.static(path.join(__dirname, '../../public/exercise-images')));

app.get('/api/health', (_, res) =>
  res.json({ status: 'ok', ts: new Date().toISOString() })
);

// Serve React client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () =>
  console.log(`🏋️  Workout API → http://localhost:${PORT}`)
);
