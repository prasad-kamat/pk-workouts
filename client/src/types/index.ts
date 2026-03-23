export interface User {
  id: number;
  name: string;
  avatar_color: string;
}

export interface MuscleGroup {
  id: number;
  name: string;
  display_name: string;
  color_hex: string;
}

export interface Exercise {
  id: number;
  name: string;
  muscle_group_id: number;
  muscle_group_name: string;
  muscle_group_display: string;
  color_hex: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  video_url: string | null;   // /exercise-images/{id}/0.jpg
  exercise_db_id: string | null;
  instructions: string;       // JSON string array
  preference: 'liked' | 'disliked' | null;
}

export interface TodayWorkout {
  weekday: number;
  date: string;
  muscle_groups: {
    muscle_group: MuscleGroup;
    exercises: Exercise[];
  }[];
}
