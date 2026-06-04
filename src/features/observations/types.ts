export type { ObservationRecord, OccurrenceRecord, PrevOccurrence, PropertyDef, SaveOccurrenceInput } from "@/types/domain";

export type ObservationBody = {
  title: string;
  eye?: string;
  body_zone?: string | null;
  body_zone_custom?: string | null;
  category?: string | null;
  propertiesSchema?: import("@/types/domain").PropertyDef[];
  useIntensity?: boolean;
  useDuration?: boolean;
};
