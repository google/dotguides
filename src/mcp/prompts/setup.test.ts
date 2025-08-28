import { describe, it, expect, vi } from "vitest";
import { setup } from "./setup.js";
import { Workspace } from "../../lib/workspace.js";
import { Guide } from "../../lib/guide.js";
import { InvalidRequestError } from "@modelcontextprotocol/sdk/server/auth/errors.js";

describe("setup prompt", () => {
  it("should return setup instructions for a package", async () => {
    const mockRenderContext = { mock: "context" };
    const mockGuide = {
      config: { name: "setup" },
      render: vi
        .fn()
        .mockResolvedValue([{ type: "text", text: "Setup instructions" }]),
    } as unknown as Guide;

    const mockPackage = {
      guides: [mockGuide],
      renderContext: vi.fn().mockReturnValue(mockRenderContext),
    };

    const mockWorkspace = {
      packageMap: {
        "test-pkg": mockPackage,
      },
    } as unknown as Workspace;

    const result = await setup.fn(
      { package: "test-pkg" },
      { workspace: mockWorkspace }
    );

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.content.text).toBe("Setup instructions");
    expect(mockGuide.render).toHaveBeenCalledWith(mockRenderContext);
  });

  it("should throw an error if package is not provided", async () => {
    const mockWorkspace = {
      packageMap: {},
    } as unknown as Workspace;

    await expect(
      setup.fn({ package: "" }, { workspace: mockWorkspace })
    ).rejects.toThrow(InvalidRequestError);
  });

  it("should throw an error if package is not found", async () => {
    const mockWorkspace = {
      packageMap: {},
    } as unknown as Workspace;

    await expect(
      setup.fn({ package: "not-found" }, { workspace: mockWorkspace })
    ).rejects.toThrow(InvalidRequestError);
  });

  it("should throw an error if setup guide is not found", async () => {
    const mockWorkspace = {
      packageMap: {
        "test-pkg": {
          guides: [],
        },
      },
    } as unknown as Workspace;

    await expect(
      setup.fn({ package: "test-pkg" }, { workspace: mockWorkspace })
    ).rejects.toThrow(InvalidRequestError);
  });
});
