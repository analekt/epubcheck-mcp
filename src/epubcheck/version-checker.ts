import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CACHE_DIR = join(homedir(), ".cache", "epubcheck-mcp");
const VERSION_CACHE_FILE = join(CACHE_DIR, "version-check.json");
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

interface VersionCache {
  lastCheck: number;
  latestVersion: string | null;
  currentVersion: string;
}

let cachedLatestVersion: string | null = null;
let versionCheckPromise: Promise<void> | null = null;

/**
 * Get the cached latest version (non-blocking)
 */
export function getCachedLatestVersion(): string | null {
  return cachedLatestVersion;
}

/**
 * Load version cache from disk
 */
function loadCache(): VersionCache | null {
  try {
    if (existsSync(VERSION_CACHE_FILE)) {
      const data = readFileSync(VERSION_CACHE_FILE, "utf-8");
      return JSON.parse(data) as VersionCache;
    }
  } catch {
    // Ignore cache read errors
  }
  return null;
}

/**
 * Save version cache to disk
 */
function saveCache(cache: VersionCache): void {
  try {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true });
    }
    writeFileSync(VERSION_CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch {
    // Ignore cache write errors
  }
}

/**
 * Fetch the latest EPUBCheck version from GitHub API
 */
async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/w3c/epubcheck/releases/latest",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "epubcheck-mcp",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { tag_name: string };
    // Remove 'v' prefix if present (e.g., "v5.3.0" -> "5.3.0")
    return data.tag_name?.replace(/^v/, "") || null;
  } catch {
    return null;
  }
}

/**
 * Check for updates in the background (non-blocking)
 * Only performs the check once per CHECK_INTERVAL
 */
export function checkForUpdatesAsync(currentVersion: string): void {
  // Only run one check at a time
  if (versionCheckPromise) {
    return;
  }

  // Load cache and check if we need to fetch
  const cache = loadCache();

  if (cache) {
    // Use cached latest version immediately
    cachedLatestVersion = cache.latestVersion;

    // Check if cache is still valid
    if (Date.now() - cache.lastCheck < CHECK_INTERVAL) {
      return; // Cache is fresh, no need to check
    }
  }

  // Perform background check
  versionCheckPromise = (async () => {
    try {
      const latestVersion = await fetchLatestVersion();

      if (latestVersion) {
        cachedLatestVersion = latestVersion;

        saveCache({
          lastCheck: Date.now(),
          latestVersion,
          currentVersion,
        });
      }
    } catch {
      // Silently ignore errors - don't disrupt the main functionality
    } finally {
      versionCheckPromise = null;
    }
  })();
}

/**
 * Compare versions and return true if update is available
 */
export function isUpdateAvailable(
  currentVersion: string,
  latestVersion: string | null
): boolean {
  if (!latestVersion) {
    return false;
  }

  // Simple version comparison (assumes semver-like format)
  const current = currentVersion.split(".").map(Number);
  const latest = latestVersion.split(".").map(Number);

  for (let i = 0; i < Math.max(current.length, latest.length); i++) {
    const c = current[i] || 0;
    const l = latest[i] || 0;

    if (l > c) return true;
    if (l < c) return false;
  }

  return false;
}

/**
 * Get update notification message if update is available
 */
export function getUpdateNotification(currentVersion: string): string | null {
  const latestVersion = getCachedLatestVersion();

  if (isUpdateAvailable(currentVersion, latestVersion)) {
    return `\n---\nNote: EPUBCheck ${latestVersion} is available (current: ${currentVersion}). Visit https://github.com/w3c/epubcheck/releases for details.`;
  }

  return null;
}
