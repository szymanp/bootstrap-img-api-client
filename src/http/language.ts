import type { ReadOptions } from "../types/common.js";

/** Normalize a `fields` selector (array or string) to the comma-joined query form. */
export function fieldsParam(fields: string | string[] | undefined): string | undefined {
  if (fields === undefined) return undefined;
  return Array.isArray(fields) ? fields.join(",") : fields;
}

/** Build the query params shared by read endpoints (`fields`, `representation`). */
export function readParams(options: ReadOptions = {}): Record<string, string | undefined> {
  return {
    fields: fieldsParam(options.fields),
    representation: options.representation,
  };
}
