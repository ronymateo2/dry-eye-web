import type { PropertyDef, PropertyValue } from "@/types/domain";

export function formatPropertyValue(def: PropertyDef, v: PropertyValue): string {
  if (def.type === "boolean") return v ? "Sí" : "No";
  if (def.type === "scale") return `${v}/10`;
  if (def.type === "number" || def.type === "text") return String(v);
  const opt = def.options.find((o) => o.value === v);
  return opt?.label ?? String(v);
}
