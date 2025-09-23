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

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { cachedFetch } from "./cached-fetch.js";

vi.mock("fs", () => ({
  promises: {
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock("os", () => ({
  homedir: vi.fn(() => "/tmp"),
}));

global.fetch = vi.fn();

const mockedFs = vi.mocked(fs);
const mockedOs = vi.mocked(os);
const mockedFetch = vi.mocked(global.fetch);

const CACHE_DIR = "/tmp/.guides-cache/urls";

describe("cachedFetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));

    mockedFetch.mockClear();
    mockedFs.mkdir.mockClear();
    mockedFs.readFile.mockClear();
    mockedFs.writeFile.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const getCachePath = (url: string) => {
    const b64 = Buffer.from(url).toString("base64url");
    return path.join(CACHE_DIR, b64);
  };

  describe("when fetching and caching new responses", () => {
    const cases = [
      {
        desc: "should fetch a URL and cache it with a default TTL",
        url: "https://example.com/no-cache-control",
        responseBody: "Hello, world!",
        responseHeaders: new Headers({ "content-type": "text/plain" }),
        getExpectedExpires: () => Date.now() + 3600 * 1000,
      },
      {
        desc: "should fetch a URL and cache it with a long TTL from cache-control",
        url: "https://example.com/long-cache",
        responseBody: "This should be cached for a long time",
        responseHeaders: new Headers({ "cache-control": "max-age=7200" }),
        getExpectedExpires: () => Date.now() + 7200 * 1000,
      },
      {
        desc: "should use the default TTL if cache-control max-age is less than 1 hour",
        url: "https://example.com/short-cache",
        responseBody: "This should have default cache time",
        responseHeaders: new Headers({ "cache-control": "max-age=1800" }),
        getExpectedExpires: () => Date.now() + 3600 * 1000,
      },
    ];

    it.each(cases)(
      "$desc",
      async ({ url, responseBody, responseHeaders, getExpectedExpires }) => {
        const expectedExpires = getExpectedExpires();
        const response = new Response(responseBody, {
          headers: responseHeaders,
          status: 200,
          statusText: "OK",
        });

        mockedFetch.mockResolvedValue(response);
        mockedFs.readFile.mockRejectedValue({ code: "ENOENT" });

        const result = await cachedFetch(url);

        expect(mockedFetch).toHaveBeenCalledTimes(1);
        expect(mockedFs.writeFile).toHaveBeenCalledTimes(1);

        const writtenData = JSON.parse(
          mockedFs.writeFile.mock.calls[0]?.[1] as string,
        );

        expect(writtenData.body).toBe(responseBody);
        expect(writtenData.expires).toBe(expectedExpires);
        expect(result.status).toBe(200);
        const resultBody = await result.text();
        expect(resultBody).toBe(responseBody);
      },
    );
  });

  describe("when dealing with existing cache entries", () => {
    it("should return a fresh cached response without fetching", async () => {
      const url = "https://example.com/cached";
      const cachedEntry = {
        expires: Date.now() + 10000, // Expires in 10 seconds
        headers: { "content-type": "text/plain" },
        body: "This is from the cache",
        status: 200,
        statusText: "OK",
      };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(cachedEntry));

      const result = await cachedFetch(url);
      const body = await result.text();

      expect(body).toBe("This is from the cache");
      expect(mockedFetch).not.toHaveBeenCalled();
    });
  });

  describe("when revalidating a stale cache", () => {
    const url = "https://example.com/stale";
    let staleEntry: {
      expires: number;
      headers: { "content-type": string };
      body: string;
      status: number;
      statusText: string;
    };

    beforeEach(() => {
      staleEntry = {
        expires: Date.now() - 10000, // Expired 10 seconds ago
        headers: { "content-type": "text/plain" },
        body: "This is stale",
        status: 200,
        statusText: "OK",
      };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(staleEntry));
    });

    it("should return fresh content if revalidation succeeds", async () => {
      const freshBody = "This is fresh";
      const freshResponse = new Response(freshBody, { status: 200 });
      mockedFetch.mockResolvedValue(freshResponse);

      const result = await cachedFetch(url);
      const body = await result.text();

      expect(body).toBe(freshBody);
      expect(mockedFetch).toHaveBeenCalledTimes(1);
      expect(mockedFs.writeFile).toHaveBeenCalledTimes(1);
      const writtenData = JSON.parse(
        mockedFs.writeFile.mock.calls[0]?.[1] as string,
      );
      expect(writtenData.body).toBe(freshBody);
    });

    it("should return stale content if revalidation fails", async () => {
      mockedFetch.mockRejectedValue(new Error("Network error"));

      const result = await cachedFetch(url);
      const body = await result.text();

      expect(body).toBe(staleEntry.body);
      expect(mockedFetch).toHaveBeenCalledTimes(1);
      expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });

    it("should return stale content if revalidation times out", async () => {
      mockedFetch.mockImplementation((_url, opts) => {
        return new Promise((resolve, reject) => {
          if (opts?.signal?.aborted) {
            return reject(new DOMException("Aborted", "AbortError"));
          }
          const timeout = setTimeout(() => {
            resolve(new Response("This is fresh"));
          }, 6000);
          opts?.signal?.addEventListener("abort", () => {
            clearTimeout(timeout);
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      });

      const resultPromise = cachedFetch(url);
      await vi.advanceTimersByTimeAsync(5001);
      const result = await resultPromise;
      const body = await result.text();

      expect(body).toBe(staleEntry.body);
      expect(mockedFetch).toHaveBeenCalledTimes(1);
      expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });
  });

  it("should throw an error if fetch fails and there is no cache", async () => {
    mockedFs.readFile.mockRejectedValue({ code: "ENOENT" });
    mockedFetch.mockRejectedValue(new Error("Network error"));

    await expect(
      cachedFetch("https://example.com/no-cache-error"),
    ).rejects.toThrow("Network error");
  });
});
