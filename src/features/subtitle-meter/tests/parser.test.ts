import { describe, expect, it } from "vitest";
import { detectIssues } from "../analyzers/issueDetector";
import { parseSubtitles } from "../parsers/subtitleParser";
import { formatSubtitles } from "../formatters/subtitleFormatter";
describe("subtitle parser and formatter", () => {
  it("parses multiline SRT and preserves text on round trip", () => {
    const raw =
      "1\n00:00:01,120 --> 00:00:03,500\n第一行\n第二行\n\n2\n00:00:04,000 --> 00:00:06,000\n结束";
    const cues = parseSubtitles(raw, "srt");
    expect(cues[0]).toMatchObject({
      startMs: 1120,
      endMs: 3500,
      text: "第一行\n第二行",
    });
    expect(parseSubtitles(formatSubtitles(cues, "srt"), "srt")).toEqual(cues);
  });
  it("parses WebVTT headers and cue settings", () => {
    const cues = parseSubtitles(
      "WEBVTT\n\n00:00:00.500 --> 00:00:02.000 align:start\nHello\n\n00:00:02.100 --> 00:00:03.000\nWorld",
      "vtt",
    );
    expect(cues).toHaveLength(2);
    expect(cues[0].startMs).toBe(500);
  });
  it("imports cues with equal or reversed times and flags them in inspection", () => {
    const cues = parseSubtitles(
      "1\n00:00:01,000 --> 00:00:02,000\n正常\n\n2\n00:00:05,000 --> 00:00:05,000\n起止相同\n\n3\n00:00:08,000 --> 00:00:06,000\n时间倒挂",
      "srt",
    );
    expect(cues).toHaveLength(3);
    expect(cues[1]).toMatchObject({ startMs: 5000, endMs: 5000 });
    expect(cues[2]).toMatchObject({ startMs: 8000, endMs: 6000 });
    const invalid = detectIssues(cues).filter(
      (issue) => issue.type === "invalid-time",
    );
    expect(invalid.map((issue) => issue.cueId)).toEqual(
      expect.arrayContaining([cues[1].id, cues[2].id]),
    );
    expect(invalid).toHaveLength(2);
  });
  it("normalizes out-of-range and over-precise timecodes", () => {
    const cues = parseSubtitles(
      "1\n00:00:75,000 --> 00:00:76,5000\n越界进位与小数位截断",
      "srt",
    );
    expect(cues).toHaveLength(1);
    expect(cues[0]).toMatchObject({ startMs: 75000, endMs: 76500 });
  });
  it("skips unrecognizable blocks and keeps every recognizable cue", () => {
    const cues = parseSubtitles(
      "这段文字不是字幕\n\n1\n00:00:01,000 --> 00:00:02,000\n有效一\n\n2\nwrong --> time\n时间码无法识别\n\n3\n00:00:03,000 --> 00:00:04,000\n有效二",
      "srt",
    );
    expect(cues).toHaveLength(2);
    expect(cues.map((cue) => cue.text)).toEqual(["有效一", "有效二"]);
  });
  it("fails only when the file has no recognizable cue at all", () => {
    expect(() => parseSubtitles("not a subtitle block", "srt")).toThrow(
      "没有找到可用字幕条目",
    );
    expect(() => parseSubtitles("1\nwrong --> time\nOops", "srt")).toThrow(
      "没有找到可用字幕条目",
    );
  });
});
