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

import { decodeShare, encodeShare } from "../src/lib/watchlist";

describe("share link", () => {
  it("round-trips ids and rejects junk", () => {
    expect(decodeShare(encodeShare(["130100", "124973"]))).toEqual(["130100", "124973"]);
    expect(decodeShare("#l=130100.<script>.124973")).toEqual(["130100", "124973"]);
    expect(decodeShare("#other")).toEqual([]);
  });
});

import { normName, parseHandelingen } from "../pipeline/vlaams";

describe("Vlaams Parlement Handelingen", () => {
  const text = [
    "ONTWERP VAN DECREET over de subsidiëring van stages",
    "– 925 (2025-2026) – Nrs. 1 en 2",
    "De voorzitter: aan de orde is de hoofdelijke stemming over artikel 3.",
    "Stemming nr. 1",
    "Het Vlaams Parlement neemt het artikel aan.",
    "Individuele stemmingen Vlaamse Volksvertegenwoordigers",
    "Stemming nr. 1:",
    "JA-stemmen:",
    "Hannes Anaf, Dominiek Lootens-",
    "Stael, Jos D'Haese",
    "NEEN-stemmen:",
    "Tom Van Grieken",
    "Vlaams Parlement",
    "ONTHOUDINGEN:",
    "Suzy Wouters",
  ].join("\n");
  it("parses names, title and result", () => {
    const [v] = parseHandelingen(text);
    expect(v?.yes).toEqual(["Hannes Anaf", "Dominiek Lootens-Stael", "Jos D'Haese"]);
    expect(v?.no).toEqual(["Tom Van Grieken"]);
    expect(v?.abst).toEqual(["Suzy Wouters"]);
    expect(v?.result).toBe("ADOPTED");
    expect(v?.title).toBe("Artikel 3, ontwerp van decreet over de subsidiëring van stages");
  });
  it("normalises names to letters only", () => {
    expect(normName("Jos D'Haese")).toBe(normName("Jos DHaese"));
    expect(normName("Koen Daniëls")).toBe("koendaniels");
  });
});
