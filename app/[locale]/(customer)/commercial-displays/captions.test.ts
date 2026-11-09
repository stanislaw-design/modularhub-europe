import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const CAPTIONS_DIR = path.join(process.cwd(), "public", "videos", "outdoor-tv", "captions");
const LANGS = ["pl", "en", "de", "nl"] as const;

interface Cue {
  start: string;
  end: string;
  text: string;
}

function parseVtt(lang: string): Cue[] {
  const raw = readFileSync(path.join(CAPTIONS_DIR, `commercial-showcase.${lang}.vtt`), "utf8");
  expect(raw.startsWith("WEBVTT\n")).toBe(true);
  return raw
    .split(/\n\n+/)
    .slice(1)
    .filter((block) => block.trim().length > 0)
    .map((block) => {
      const [, timing, ...text] = block.trim().split("\n");
      const match = /^(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})$/.exec(timing);
      expect(match, `bad timing line "${timing}" in ${lang}`).not.toBeNull();
      return { start: match![1], end: match![2], text: text.join("\n") };
    });
}

const toSeconds = (stamp: string) => {
  const [h, m, s] = stamp.split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
};

describe("commercial-showcase captions", () => {
  const cues = Object.fromEntries(LANGS.map((lang) => [lang, parseVtt(lang)])) as Record<(typeof LANGS)[number], Cue[]>;

  it("has the same number of cues with identical timings in every language", () => {
    for (const lang of LANGS) {
      expect(cues[lang].length).toBe(cues.en.length);
      expect(cues[lang].map(({ start, end }) => [start, end])).toEqual(cues.en.map(({ start, end }) => [start, end]));
    }
  });

  it("keeps cues in order, each ending after it starts, inside the 46 s film", () => {
    let previousEnd = 0;
    for (const cue of cues.en) {
      expect(toSeconds(cue.end)).toBeGreaterThan(toSeconds(cue.start));
      expect(toSeconds(cue.start)).toBeGreaterThanOrEqual(previousEnd);
      previousEnd = toSeconds(cue.end);
    }
    expect(previousEnd).toBeLessThanOrEqual(46.3);
  });

  it("has no empty cue text and keeps the brand spelled MirageVision", () => {
    for (const lang of LANGS) {
      for (const cue of cues[lang]) expect(cue.text.trim().length).toBeGreaterThan(0);
    }
    expect(cues.en[1].text).toContain("MirageVision");
  });
});
