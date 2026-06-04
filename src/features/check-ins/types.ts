export type LastCheckIn = {
  id: string;
  logged_at: string;
  time_of_day: string | null;
  eyelid_pain: number;
  temple_pain: number;
  masseter_pain: number;
  cervical_pain: number;
  orbital_pain: number;
  stress_level: number;
  trigger_type: string | null;
  trigger_types: string | null;
  pain_quality: string | null;
  notes: string | null;
} | null;
