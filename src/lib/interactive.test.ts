import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  selectContextBudget,
  selectPackages,
  selectAgent,
} from "./interactive.js";
import { Package } from "./package.js";
import type { AgentAdapter } from "./agents/types.js";

// Mock the @clack/prompts module
vi.mock("@clack/prompts", () => ({
  select: vi.fn(),
  multiselect: vi.fn(),
}));

const { select, multiselect } = await import("@clack/prompts");

describe("interactive", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  describe("selectContextBudget", () => {
    it("should return the selected budget", async () => {
      (select as any).mockResolvedValue("high");
      const budget = await selectContextBudget();
      expect(budget).toBe("high");
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          initialValue: "medium",
        }),
      );
    });

    it("should return null on cancellation", async () => {
      (select as any).mockResolvedValue(Symbol("cancel"));
      const budget = await selectContextBudget();
      expect(budget).toBeNull();
    });

    it("should use the provided initial value", async () => {
      (select as any).mockResolvedValue("low");
      await selectContextBudget("low");
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          initialValue: "low",
        }),
      );
    });
  });

  describe("selectPackages", () => {
    const mockPackages = [
      { name: "pkg1", guides: [] },
      { name: "pkg2", guides: [] },
      { name: "pkg3", guides: [] },
    ] as unknown as Package[];

    it("should return an empty array if no packages are provided", async () => {
      const selected = await selectPackages([], [], []);
      expect(selected).toEqual([]);
    });

    it("should return selected packages", async () => {
      (multiselect as any).mockResolvedValue([
        mockPackages[0]!,
        mockPackages[2]!,
      ]);
      const selected = await selectPackages(
        mockPackages,
        [mockPackages[0]!],
        [mockPackages[2]!],
      );
      expect(selected).toEqual([mockPackages[0], mockPackages[2]]);
      expect(multiselect).toHaveBeenCalledWith(
        expect.objectContaining({
          initialValues: [mockPackages[0]],
        }),
      );
    });

    it("should return null on cancellation", async () => {
      (multiselect as any).mockResolvedValue(Symbol("cancel"));
      const selected = await selectPackages(mockPackages, [], []);
      expect(selected).toBeNull();
    });

    it("should label new packages", async () => {
      (multiselect as any).mockResolvedValue([]);
      await selectPackages(mockPackages, [], [mockPackages[1]!]);
      const options = (multiselect as any).mock.calls[0][0].options;
      const pkg2 = options.find((o: any) => o.value.name === "pkg2");
      expect(pkg2).toBeDefined();
      expect(pkg2!.hint).toContain("new!");
    });
  });

  describe("selectAgent", () => {
    const mockAgents: AgentAdapter[] = [
      { name: "agent1", title: "Agent 1", detect: vi.fn(), up: vi.fn() },
      { name: "agent2", title: "Agent 2", detect: vi.fn(), up: vi.fn() },
    ];

    it("should return null if no agents are provided", async () => {
      const agent = await selectAgent([]);
      expect(agent).toBeNull();
    });

    it("should return the agent if only one is provided", async () => {
      const agent = await selectAgent([mockAgents[0]!]);
      expect(agent).toBe(mockAgents[0]);
    });

    it("should return the selected agent", async () => {
      (select as any).mockResolvedValue(mockAgents[1]);
      const agent = await selectAgent(mockAgents);
      expect(agent).toBe(mockAgents[1]);
    });

    it("should return null if 'None of these' is selected", async () => {
      (select as any).mockResolvedValue(null);
      const agent = await selectAgent(mockAgents);
      expect(agent).toBeNull();
    });

    it("should return null on cancellation", async () => {
      (select as any).mockResolvedValue(Symbol("cancel"));
      const agent = await selectAgent(mockAgents);
      expect(agent).toBeNull();
    });
  });
});
