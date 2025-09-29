import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  readSettings,
  readWorkspaceSettings,
  writeWorkspaceSettings,
  type Settings,
} from "./settings.js";
import os from "os";
import { join } from "path";

// Mock fs/promises
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

const { readFile, writeFile } = await import("fs/promises");

const SETTINGS_FILE = ".guides.config.json";

describe("settings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("readWorkspaceSettings", () => {
    it("should read and parse workspace settings", async () => {
      const mockSettings: Settings = { agent: "gemini-cli" };
      (readFile as any).mockResolvedValue(JSON.stringify(mockSettings));

      const settings = await readWorkspaceSettings();

      expect(readFile).toHaveBeenCalledWith(
        join(process.cwd(), SETTINGS_FILE),
        "utf-8",
      );
      expect(settings).toEqual(mockSettings);
    });

    it("should return an empty object if settings file does not exist", async () => {
      const error = new Error("File not found");
      (error as any).code = "ENOENT";
      (readFile as any).mockRejectedValue(error);

      const settings = await readWorkspaceSettings();

      expect(settings).toEqual({});
    });

    it("should throw an error for other read errors", async () => {
      const error = new Error("Read error");
      (readFile as any).mockRejectedValue(error);

      await expect(readWorkspaceSettings()).rejects.toThrow("Read error");
    });
  });

  describe("readSettings", () => {
    it("should merge user and workspace settings", async () => {
      const userSettings: Settings = {
        agent: "user-agent",
        contextBudget: "low",
        packages: { disabled: ["pkg1"], discovered: ["pkg1", "pkg2"] },
      };
      const workspaceSettings: Settings = {
        agent: "workspace-agent",
        packages: { disabled: ["pkg3"], discovered: ["pkg2", "pkg3"] },
      };

      (readFile as any).mockImplementation((path: string) => {
        if (path === join(os.homedir(), SETTINGS_FILE)) {
          return Promise.resolve(JSON.stringify(userSettings));
        }
        if (path === join(process.cwd(), SETTINGS_FILE)) {
          return Promise.resolve(JSON.stringify(workspaceSettings));
        }
        return Promise.reject(new Error("File not found"));
      });

      const settings = await readSettings();

      expect(settings).toEqual({
        agent: "workspace-agent",
        contextBudget: "low",
        packages: {
          disabled: ["pkg1", "pkg3"],
          discovered: ["pkg1", "pkg2", "pkg3"],
        },
      });
    });

    it("workspace contextBudget overrides user", async () => {
      const userSettings: Settings = {
        contextBudget: "low",
      };
      const workspaceSettings: Settings = {
        contextBudget: "high",
      };

      (readFile as any).mockImplementation((path: string) => {
        if (path === join(os.homedir(), SETTINGS_FILE)) {
          return Promise.resolve(JSON.stringify(userSettings));
        }
        if (path === join(process.cwd(), SETTINGS_FILE)) {
          return Promise.resolve(JSON.stringify(workspaceSettings));
        }
        return Promise.reject(new Error("File not found"));
      });

      const settings = await readSettings();

      expect(settings.contextBudget).toBe("high");
    });

    it("should handle missing settings files", async () => {
      const error = new Error("File not found");
      (error as any).code = "ENOENT";
      (readFile as any).mockRejectedValue(error);

      const settings = await readSettings();

      expect(settings).toEqual({
        packages: {
          disabled: [],
          discovered: [],
        },
      });
    });
  });

  describe("writeWorkspaceSettings", () => {
    it("should write settings to the workspace file", async () => {
      const mockSettings: Settings = {
        agent: "gemini-cli",
        contextBudget: "medium",
      };

      await writeWorkspaceSettings(mockSettings);

      expect(writeFile).toHaveBeenCalledWith(
        join(process.cwd(), SETTINGS_FILE),
        JSON.stringify(mockSettings, null, 2),
      );
    });
  });
});
