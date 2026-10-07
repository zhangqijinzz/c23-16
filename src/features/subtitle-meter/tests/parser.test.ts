import { describe, expect, it } from "vitest";
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
  it("imports equal or reversed timecodes instead of rejecting the file", () => {
    const raw =
      "1\n00:00:01,000 --> 00:00:02,000\n正常\n\n2\n00:00:05,000 --> 00:00:05,000\n相同\n\n3\n00:00:08,000 --> 00:00:06,000\n倒挂";
    const cues = parseSubtitles(raw, "srt");
    expect(cues).toHaveLength(3);
    expect(cues[1]).toMatchObject({ startMs: 5000, endMs: 5000 });
    expect(cues[2].endMs).toBeLessThan(cues[2].startMs);
  });
  it("normalizes out-of-range components and extra decimal places", () => {
    const cues = parseSubtitles(
      "1\n00:00:75,000 --> 00:00:78,5000\n异常时间码",
      "srt",
    );
    expect(cues).toHaveLength(1);
    expect(cues[0].startMs).toBe(75000);
    expect(cues[0].endMs).toBe(78500);
    expect(cues[0].anomalies).toEqual(
      expect.arrayContaining(["out-of-range", "decimal-places"]),
    );
  });
  it("skips unrecognizable blocks and fails only when nothing parses", () => {
    const raw =
      "1\n00:00:01,000 --> 00:00:02,000\n有效\n\n2\nwrong --> time\n无法识别\n\n没有时间码的块";
    const cues = parseSubtitles(raw, "srt");
    expect(cues).toHaveLength(1);
    expect(cues[0]).toMatchObject({ index: 1, text: "有效" });
    expect(() => parseSubtitles("not a subtitle block", "srt")).toThrow(
      "没有找到可用字幕条目",
    );
    expect(() => parseSubtitles("1\nwrong --> time\nOops", "srt")).toThrow(
      "没有找到可用字幕条目",
    );
  });
});
