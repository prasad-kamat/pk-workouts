import db from './database';

export function createTables(): void {
  db.exec(`
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
      exercise_db_id TEXT,
      instructions   TEXT DEFAULT '[]',
      overview       TEXT,
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
  `);
}
