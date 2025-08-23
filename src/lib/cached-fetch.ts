import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";

const CACHE_DIR = path.join(os.homedir(), ".guides-cache", "urls");

interface CacheEntry {
  expires: number;
  headers: Record<string, string>;
  body: string;
  status: number;
  statusText: string;
}

async function getCachePath(url: string): Promise<string> {
  const b64 = Buffer.from(url).toString("base64url");
  return path.join(CACHE_DIR, b64);
}

async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

export async function cachedFetch(
  url: string | URL,
  options?: RequestInit
): Promise<Response> {
  await ensureCacheDir();
  const urlString = url.toString();
  const cachePath = await getCachePath(urlString);

  let staleEntry: CacheEntry | null = null;

  try {
    const cacheContents = await fs.readFile(cachePath, "utf-8");
    const entry: CacheEntry = JSON.parse(cacheContents);

    if (entry.expires > Date.now()) {
      // Cache is fresh, return it immediately.
      const headers = new Headers(entry.headers);
      return new Response(entry.body, {
        headers,
        status: entry.status,
        statusText: entry.statusText,
      });
    }
    // Cache is stale, hold onto it as a fallback.
    staleEntry = entry;
  } catch (e: any) {
    if (e.code !== "ENOENT") {
      console.warn(`Error reading cache file ${cachePath}:`, e);
    }
    // No cache or error reading, proceed to fetch.
  }

  // At this point, we either have no cache or a stale cache.
  // We need to fetch a new version.
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort("timeout"), 5000);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // Fetch was successful. Now cache it.
    const body = await response.text();

    const cacheControl = response.headers.get("cache-control");
    let maxAge = 3600; // 1 hour default

    if (cacheControl) {
      const match = cacheControl.match(/max-age=(\d+)/);
      if (match && match[1]) {
        const parsedMaxAge = parseInt(match[1], 10);
        if (parsedMaxAge > 3600) {
          maxAge = parsedMaxAge;
        }
      }
    }

    const expires = Date.now() + maxAge * 1000;

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const newEntry: CacheEntry = {
      expires,
      headers: responseHeaders,
      body,
      status: response.status,
      statusText: response.statusText,
    };

    await fs.writeFile(cachePath, JSON.stringify(newEntry), "utf-8");

    // Re-create response because the body has been consumed
    return new Response(newEntry.body, {
      headers: new Headers(newEntry.headers),
      status: response.status,
      statusText: response.statusText,
    });
  } catch (e: any) {
    // Fetch failed or timed out.
    if (staleEntry) {
      console.warn(
        `Fetch for ${urlString} failed, serving stale content from cache:`,
        e.message
      );
      const headers = new Headers(staleEntry.headers);
      return new Response(staleEntry.body, {
        headers,
        status: staleEntry.status,
        statusText: staleEntry.statusText,
      });
    }
    // No stale cache to fall back on, so re-throw the error.
    throw e;
  }
}
