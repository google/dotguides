import { describe, it, expect, vi } from "vitest";
import { calculateTokenBudget } from "./token-budget.js";
import type { Package } from "./package.js";
import type { Guide } from "./guide.js";
import type { Doc } from "./doc.js";

describe("calculateTokenBudget", () => {
  it("should calculate token budget correctly", async () => {
    const mockUsageGuide = {
      config: { name: "usage" },
      render: vi.fn().mockResolvedValue([{ type: "text", text: "Usage content" }]),
    } as unknown as Guide;

    const mockStyleGuide = {
      config: { name: "style" },
      render: vi.fn().mockResolvedValue([{ type: "text", text: "Style content" }]),
    } as unknown as Guide;

    const mockPkg = {
      guides: [mockUsageGuide, mockStyleGuide],
      docs: [],
      getDocsList: vi.fn().mockReturnValue(["- [Doc 1](docs:pkg:doc1)"]),
      systemInstructions: vi.fn().mockResolvedValue("System prompt including usage, style, and docs"),
    } as unknown as Package;

    // Mock countTokens indirectly by controlling the content length
    // Usage content: "Usage content" (13 chars) -> ~3 tokens
    // Style content: "Style content" (13 chars) -> ~3 tokens
    // Docs list: "- [Doc 1](docs:pkg:doc1)" (24 chars) -> ~6 tokens
    // System prompt: "System prompt including usage, style, and docs" (46 chars) -> ~12 tokens

    // Wait, countTokens implementation: Math.round(text.length / 4)
    // Usage: 13/4 = 3.25 -> 3
    // Style: 13/4 = 3.25 -> 3
    // Docs: 24/4 = 6
    // System: 46/4 = 11.5 -> 12

    // Expected Clerical: 12 - (3 + 3 + 6) = 0
    // Let's make system prompt longer to have clerical tokens
    // System prompt: "System prompt including usage, style, and docs plus extra overhead" (66 chars) -> 17 tokens
    // Clerical: 17 - 12 = 5

    (mockPkg.systemInstructions as any).mockResolvedValue(
      "System prompt including usage, style, and docs plus extra overhead"
    );

    const stats = await calculateTokenBudget(mockPkg);

    expect(stats.usage).toBe(3);
    expect(stats.style).toBe(3);
    expect(stats.docs).toBe(6);
    expect(stats.total).toBe(17);
    expect(stats.clerical).toBe(5);
  });

  it("should handle missing guides", async () => {
    const mockPkg = {
      guides: [],
      docs: [],
      getDocsList: vi.fn().mockReturnValue([]),
      systemInstructions: vi.fn().mockResolvedValue("System prompt"),
    } as unknown as Package;

    // System prompt: "System prompt" (13 chars) -> 3 tokens
    // Usage: 0
    // Style: 0
    // Docs: 0
    // Clerical: 3 - 0 = 3

    const stats = await calculateTokenBudget(mockPkg);

    expect(stats.usage).toBe(0);
    expect(stats.style).toBe(0);
    expect(stats.docs).toBe(0);
    expect(stats.total).toBe(3);
    expect(stats.clerical).toBe(3);
  });

  it("should clamp clerical tokens to 0", async () => {
    const mockUsageGuide = {
      config: { name: "usage" },
      render: vi.fn().mockResolvedValue([{ type: "text", text: "Usage" }]),
    } as unknown as Guide;

    const mockPkg = {
      guides: [mockUsageGuide],
      docs: [],
      getDocsList: vi.fn().mockReturnValue([]),
      systemInstructions: vi.fn().mockResolvedValue("Short"),
    } as unknown as Package;

    // Usage: "Usage" (5 chars) -> 1 token
    // System: "Short" (5 chars) -> 1 token
    // If we somehow had system prompt shorter than components (unlikely but possible with approximations)
    // Let's force it:
    // Usage: "Longer usage content" (20 chars) -> 5 tokens
    // System: "Short" (5 chars) -> 1 token
    // Clerical: 1 - 5 = -4 -> 0

    mockUsageGuide.render = vi.fn().mockResolvedValue([{ type: "text", text: "Longer usage content" }]);
    
    const stats = await calculateTokenBudget(mockPkg);

    expect(stats.usage).toBe(5);
    expect(stats.total).toBe(1); // Total comes from system prompt
    expect(stats.clerical).toBe(0);
  });
});
