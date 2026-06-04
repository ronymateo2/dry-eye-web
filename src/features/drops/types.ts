export type { DropTypeRecord, DropScheduleEntry, DropTypeStats, SaveDropInput, DropEye } from "@/types/domain";

export type LastDrop = {
  id: string;
  logged_at: string;
  quantity: number;
  eye: string;
  drop_type_name: string;
  drop_type_id: string;
};

export type RecentDrop = {
  id: string;
  logged_at: string;
  quantity: number;
  eye: string;
};

export type DropTypeFull = {
  id: string;
  name: string;
  sort_order: number | null;
  interval_hours: number | null;
  start_date: string | null;
  end_date: string | null;
  suspension_note: string | null;
  is_vial: boolean;
  vial_duration: number | null;
  quick_action: boolean;
};

export type ArchivedDropType = {
  id: string;
  name: string;
  sort_order: number | null;
  interval_hours: number | null;
  start_date: string | null;
  end_date: string | null;
  suspension_note: string | null;
  archived_at: string;
  is_vial: boolean;
  vial_duration: number | null;
};

export type ActiveVial = {
  id: string;
  drop_type_id: string;
  drop_type_name: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  vial_duration: number | null;
};

export type VialHistoryEntry = {
  id: string;
  drop_type_id: string;
  drop_type_name: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  vial_duration: number | null;
};

export type DropTypeUpdate = {
  intervalHours?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  suspensionNote?: string | null;
  isVial?: boolean;
  vialDuration?: number | null;
  quickAction?: boolean;
};
