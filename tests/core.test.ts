import { describe, expect, it } from "vitest";
import { parseCsvLine, slug } from "../pipeline/util";
import { mrzLines } from "../src/components/IdCard";
import { ORG_SHARDS, orgShard } from "../src/lib/shard";

describe("orgShard", () => {
  it("is stable and within range", () => {
    expect(orgShard("58744833263-19")).toBe(orgShard("58744833263-19"));
    const n = Number.parseInt(orgShard("n-voka"), 16);
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThan(ORG_SHARDS);
  });
});

describe("parseCsvLine", () => {
  it("handles quotes and commas", () => {
    expect(parseCsvLine('1,"a, b","say ""hi""",')).toEqual(["1", "a, b", 'say "hi"', ""]);
  });
});

describe("slug", () => {
  it("strips accents and punctuation", () => {
    expect(slug("Fédération Wallonie-Bruxelles!")).toBe("federation-wallonie-bruxelles");
  });
});

describe("mrzLines", () => {
  it("builds two 36-char lines", () => {
    const [a, b] = mrzLines({ id: "130100", name: "Hilde Vautmans", sort: "Vautmans", country: "BE" }, "2015-01-01");
    expect(a).toBe("IMBE<EP<2015<130100<<<<<<<<<<<<<<<<<");
    expect(b?.startsWith("VAUTMANS<<HILDE<<WORKS<FOR<US")).toBe(true);
    expect(b).toHaveLength(36);
  });
});
