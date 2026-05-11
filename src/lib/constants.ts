export const APP_TABS = [
  { href: "/today", label: "Hoy" },
  { href: "/history", label: "Historial" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/report", label: "Reporte" },
  { href: "/profile", label: "Perfil" },
] as const;

export const DROP_EYES = ["left", "right", "both"] as const;

export const SLEEP_QUALITY_OPTIONS = [
  { label: "Muy malo", value: "muy_malo" },
  { label: "Malo", value: "malo" },
  { label: "Regular", value: "regular" },
  { label: "Bueno", value: "bueno" },
  { label: "Excelente", value: "excelente" },
] as const;

export const SYMPTOM_OPTIONS = [
  { id: "ardor", label: "Ardor", value: "ardor" },
  { id: "sequedad", label: "Sequedad", value: "sequedad" },
  { id: "lagrimeo_paradojico", label: "Lagrimeo paradojico", value: "lagrimeo_paradojico" },
  { id: "fotofobia", label: "Fotofobia", value: "fotofobia" },
  { id: "vision_borrosa", label: "Vision borrosa", value: "vision_borrosa" },
  { id: "sensacion_arena", label: "Sensacion de arena", value: "sensacion_arena" },
  { id: "picazon", label: "Picazon", value: "picazon" },
  { id: "hinchazon", label: "Hinchazon", value: "hinchazon" },
  { id: "enrojecimiento", label: "Enrojecimiento", value: "enrojecimiento" },
  { id: "dolor_cabeza", label: "Dolor de cabeza", value: "dolor_cabeza" },
  { id: "destellos", label: "Destellos/Chispas", value: "destellos", isAlarm: true },
  { id: "cortina_visual", label: "Cortina visual", value: "cortina_visual", isAlarm: true },
  { id: "vision_doble", label: "Vision doble", value: "vision_doble", isAlarm: true },
  { id: "moscas_empeoran", label: "Moscas que empeoran", value: "moscas_empeoran", isAlarm: true },
] as const;

export const PAIN_QUALITY_OPTIONS = [
  { id: "ardor", label: "Ardor", value: "ardor" },
  { id: "hormigueo", label: "Hormigueo", value: "hormigueo" },
  { id: "electrico", label: "Electrico", value: "electrico" },
  { id: "presion", label: "Presion", value: "presion" },
  { id: "alodinia", label: "Alodinia", value: "alodinia" },
] as const;

export const OBS_EYE_LABELS: Record<string, string> = {
  right: "OD",
  left: "OI",
  both: "AO",
  none: "",
};

export const OBS_BODY_ZONE_OPTIONS = [
  { label: "Párpado", value: "eyelid" },
  { label: "Orbital", value: "orbital" },
  { label: "Sien", value: "temple" },
  { label: "Masetero", value: "masseter" },
  { label: "Cervical", value: "cervical" },
  { label: "Otro", value: "other" },
] as const;

export const OBS_BODY_ZONE_LABELS: Record<string, string> = {
  eyelid: "Párpado",
  orbital: "Orbital",
  temple: "Sien",
  masseter: "Masetero",
  cervical: "Cervical",
  other: "Otro",
};

export const OBS_CATEGORY_OPTIONS = [
  { label: "Sensorial", value: "sensory" },
  { label: "Dolor", value: "pain" },
  { label: "Funcional", value: "functional" },
  { label: "Ambiental", value: "environmental" },
  { label: "Postural", value: "postural" },
] as const;

export const OBS_CATEGORY_LABELS: Record<string, string> = {
  sensory: "Sensorial",
  pain: "Dolor",
  functional: "Funcional",
  environmental: "Ambiental",
  postural: "Postural",
};

export const PROPERTY_TYPE_OPTIONS = [
  { label: "Escala 0-10", value: "scale" },
  { label: "Sí/No", value: "boolean" },
  { label: "Opciones", value: "select" },
  { label: "Texto", value: "text" },
] as const;

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  scale: "Escala 0-10",
  boolean: "Sí/No",
  select: "Opciones",
  text: "Texto",
};

export const TRIGGER_OPTIONS = [
  { id: "screens", label: "Pantallas", value: "screens" },
  { id: "tv", label: "TV", value: "tv" },
  { id: "stress", label: "Estres", value: "stress" },
  { id: "exercise", label: "Ejercicio", value: "exercise" },
  { id: "wind", label: "Viento", value: "climate" },
  { id: "ac", label: "AC", value: "climate" },
  { id: "humidifier", label: "Humidificador", value: "humidifier" },
  { id: "ergonomics", label: "Ergonomia", value: "ergonomics" },
  { id: "other", label: "Otro", value: "other" },
] as const;
