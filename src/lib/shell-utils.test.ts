/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { sh, shSync } from "./shell-utils.js";
import { spawn, spawnSync } from "child_process";
import { EventEmitter } from "events";

// Mock child_process
vi.mock("child_process", () => ({
  spawn: vi.fn(),
  spawnSync: vi.fn(),
}));

describe("shell-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sh (async)", () => {
    const tests = [
      {
        desc: "should resolve with output on successful execution",
        command: "ls -la",
        spawnEvents: [
          { stream: "stdout", data: "stdout data" },
          { stream: "stderr", data: "stderr data" },
          { stream: "close", data: 0 },
        ],
        expected: {
          exitCode: 0,
          stdout: "stdout data",
          stderr: "stderr data",
          output: "stdout datastderr data",
          chunks: [
            { source: "stdout", chunk: "stdout data" },
            { source: "stderr", chunk: "stderr data" },
          ],
        },
        expectError: false,
      },
      {
        desc: "should reject with output on failed execution",
        command: "some-error-command",
        spawnEvents: [
          { stream: "stdout", data: "stdout on error" },
          { stream: "stderr", data: "stderr on error" },
          { stream: "close", data: 1 },
        ],
        expected: {
          exitCode: 1,
          stdout: "stdout on error",
          stderr: "stderr on error",
        },
        expectError: true,
        errorMessage: "Process exited with code 1",
      },
      {
        desc: "should reject on spawn error",
        command: "another-error",
        spawnEvents: [{ stream: "error", data: new Error("spawn error") }],
        expected: {},
        expectError: true,
        errorMessage: "spawn error",
      },
    ];

    it.each(tests)(
      "$desc",
      async ({ command, spawnEvents, expected, expectError, errorMessage }) => {
        const mockChild = new EventEmitter() as any;
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();
        vi.mocked(spawn).mockReturnValue(mockChild);

        const promise = sh(command);

        for (const event of spawnEvents) {
          if (event.stream === "stdout" || event.stream === "stderr") {
            mockChild[event.stream].emit("data", event.data);
          } else {
            mockChild.emit(event.stream, event.data);
          }
        }

        if (expectError) {
          await expect(promise).rejects.toThrow(errorMessage);
          try {
            await promise;
          } catch (e: any) {
            expect(e).toEqual(expect.objectContaining(expected));
          }
        } else {
          const result = await promise;
          expect(result).toEqual(expect.objectContaining(expected));
        }
        expect(vi.mocked(spawn)).toHaveBeenCalledWith(command, { shell: true });
      },
    );
  });

  describe("shSync (sync)", () => {
    const tests = [
      {
        desc: "should return output on successful execution",
        command: "ls -la",
        mockReturn: {
          status: 0,
          stdout: Buffer.from("sync stdout"),
          stderr: Buffer.from("sync stderr"),
        },
        expected: {
          exitCode: 0,
          stdout: "sync stdout",
          stderr: "sync stderr",
        },
      },
      {
        desc: "should return output on failed execution",
        command: "error-cmd",
        mockReturn: {
          status: 1,
          stdout: Buffer.from("sync stdout on error"),
          stderr: Buffer.from("sync stderr on error"),
        },
        expected: {
          exitCode: 1,
          stdout: "sync stdout on error",
          stderr: "sync stderr on error",
        },
      },
      {
        desc: "should return error if spawn fails",
        command: "error-cmd",
        mockReturn: {
          error: new Error("spawn sync error"),
          status: null,
          stdout: null,
          stderr: null,
        },
        expected: {
          error: new Error("spawn sync error"),
        },
      },
    ];

    it.each(tests)("$desc", ({ command, mockReturn, expected }) => {
      vi.mocked(spawnSync).mockReturnValue(mockReturn as any);
      const result = shSync(command);
      expect(vi.mocked(spawnSync)).toHaveBeenCalledWith(command, {
        shell: true,
      });
      expect(result).toEqual(expect.objectContaining(expected));
    });
  });
});
