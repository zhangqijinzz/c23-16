import type { Format, SubtitleCue, TimeAnomaly } from "../models";
import { parseTimecode } from "./timecode";
export function detectFormat(name: string): Format {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "srt" || ext === "vtt") return ext;
  throw new Error("仅支持 .srt 或 .vtt 文件");
}
export function parseSubtitles(raw: string, format: Format): SubtitleCue[] {
  const source = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const blocks = source
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const cues: SubtitleCue[] = [];
  for (const [blockIndex, block] of blocks.entries()) {
    const lines = block.split("\n");
    if (format === "vtt" && blockIndex === 0 && lines[0]?.startsWith("WEBVTT"))
      continue;
    if (/^(NOTE|STYLE|REGION)(\s|$)/.test(lines[0] ?? "")) continue;
    const timeIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeIndex < 0) continue;
    const [from, toWithSettings] = lines[timeIndex].split("-->");
    const start = parseTimecode(from),
      end = parseTimecode(toWithSettings.trim().split(/\s+/)[0]);
    if (!start || !end) continue;
    const anomalies: TimeAnomaly[] = [
      ...new Set([...start.anomalies, ...end.anomalies]),
    ];
    const cue: SubtitleCue = {
      id: `cue-${cues.length + 1}`,
      index: cues.length + 1,
      startMs: start.ms,
      endMs: end.ms,
      text: lines
        .slice(timeIndex + 1)
        .join("\n")
        .trim(),
    };
    if (anomalies.length) cue.anomalies = anomalies;
    cues.push(cue);
  }
  if (!cues.length) throw new Error("没有找到可用字幕条目");
  return cues;
}
