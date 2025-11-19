import { describe, it, expect } from "vitest";
import { chunkDocument } from "../../lib/knowledge/actions";

describe("chunkDocument", () => {
  it("returns single chunk when under max size", () => {
    const content = "Paragraph one.\n\nParagraph two.";
    const chunks = chunkDocument(content, 1000);
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toContain("Paragraph one");
    expect(chunks[0]).toContain("Paragraph two");
  });

  it("splits by paragraphs when exceeding max size", () => {
    const p1 = "A".repeat(800);
    const p2 = "B".repeat(800);
    const content = `${p1}\n\n${p2}`;
    const chunks = chunkDocument(content, 900);
    expect(chunks.length).toBe(2);
    expect(chunks[0].length).toBeLessThanOrEqual(900);
    expect(chunks[1].length).toBeLessThanOrEqual(900);
  });

  it("splits by sentences when a paragraph is still too large", () => {
    const sentences = Array.from({ length: 20 }, (_, i) => `Sentence ${i + 1}`);
    const bigParagraph = sentences.join(". ");
    const content = `${bigParagraph}`;
    const chunks = chunkDocument(content, 100);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(110));
  });

  it("filters out empty chunks", () => {
    const content = "\n\n\n";
    const chunks = chunkDocument(content, 50);
    expect(chunks).toEqual([]);
  });
});