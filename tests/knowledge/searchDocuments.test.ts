import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => {
  const rpc = vi.fn().mockResolvedValue({
    data: [
      { id: "doc1", content: "alpha", similarity: 0.82, metadata: { originalFileName: "alpha.txt" } },
      { id: "doc2", content: "beta", similarity: 0.74, metadata: { originalFileName: "beta.txt" } },
    ],
    error: null,
  });
  return {
    createServerClient: async () => ({ rpc }),
  };
});

vi.mock("@/lib/embeddings/providers", () => {
  return {
    embeddingService: {
      generateEmbeddings: vi.fn().mockResolvedValue({ embedding: [0.1, 0.2], provider: "mock", dimensions: 2 }),
    },
  };
});

vi.mock("@/lib/knowledge/analytics", () => {
  return {
    trackSearchQuery: vi.fn().mockResolvedValue(undefined),
    trackSearchHit: vi.fn().mockResolvedValue(undefined),
    trackContextUsage: vi.fn().mockResolvedValue(undefined),
  };
});

import { searchDocuments } from "../../lib/knowledge/actions";

describe("searchDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns documents and respects threshold and limit", async () => {
    const tenantId = "tenant-1";
    const agentId = "agent-1";
    const threshold = 0.7;
    const limit = 2;

    const result = await searchDocuments(tenantId, "query text", agentId, limit, threshold, "session-x");
    expect(result.success).toBe(true);
    expect(result.documents.length).toBe(2);
  });
});