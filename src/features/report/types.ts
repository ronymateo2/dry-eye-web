export type ReportResponse = {
  ok: true;
  medications: {
    name: string;
    dosage: string | null;
    start_date: string | null;
    end_date: string | null;
    phases_json: string | null;
  }[];
  [key: string]: unknown;
};
