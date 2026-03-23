export interface User {
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
