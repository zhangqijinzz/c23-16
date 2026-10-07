import type { TimeAnomaly } from "../models";
export interface ParsedTimecode {
  ms: number;
  anomalies: TimeAnomaly[];
}
export function parseTimecode(value: string): ParsedTimecode | null {
  const match = value.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})[,.](\d+)$/);
  if (!match) return null;
  const [, h, m, s, fraction] = match;
  const anomalies: TimeAnomaly[] = [];
  if (Number(m) > 59 || Number(s) > 59) anomalies.push("out-of-range");
  let millis = fraction;
  if (fraction.length > 3) {
    anomalies.push("decimal-places");
    millis = fraction.slice(0, 3);
  }
  return {
    ms:
      ((Number(h ?? 0) * 60 + Number(m)) * 60 + Number(s)) * 1000 +
      Number(millis.padEnd(3, "0")),
    anomalies,
  };
}
export function formatTimestamp(ms: number, format: "srt" | "vtt"): string {
  const safe = Math.max(0, Math.trunc(ms));
  const h = Math.floor(safe / 3600000),
    m = Math.floor(safe / 60000) % 60,
    s = Math.floor(safe / 1000) % 60,
    milli = safe % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${format === "srt" ? "," : "."}${String(milli).padStart(3, "0")}`;
}
