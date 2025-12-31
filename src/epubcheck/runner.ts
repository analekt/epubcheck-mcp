import { spawn } from "child_process";
import { existsSync } from "fs";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import type { EpubCheckResult, ValidateOptions } from "./types.js";
import { checkForUpdatesAsync } from "./version-checker.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cached version to avoid repeated subprocess calls
let cachedVersion: string | null = null;

function getJarPath(): string {
  // Environment variable override
  if (process.env.EPUBCHECK_JAR_PATH) {
    return process.env.EPUBCHECK_JAR_PATH;
  }

  // Try multiple possible locations
  const possiblePaths = [
    // When running from dist/ (bundled)
    join(__dirname, "..", "bin", "epubcheck.jar"),
    // When running from project root
    join(__dirname, "bin", "epubcheck.jar"),
    // Absolute path from project structure
    join(process.cwd(), "bin", "epubcheck.jar"),
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return p;
    }
  }

  throw new Error(
    `EPUBCheck JAR not found. Searched in: ${possiblePaths.join(", ")}. Set EPUBCHECK_JAR_PATH environment variable or ensure bin/epubcheck.jar exists.`
  );
}

export async function runEpubCheck(
  options: ValidateOptions
): Promise<EpubCheckResult> {
  const jarPath = getJarPath();
  const jsonOutputPath = join(tmpdir(), `epubcheck-${randomUUID()}.json`);

  const args = buildArgs(options, jsonOutputPath);

  return new Promise((resolve, reject) => {
    const process = spawn("java", ["-jar", jarPath, ...args], {
      cwd: dirname(jarPath),
    });

    let stderr = "";

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", async (code) => {
      try {
        // EPUBCheck returns non-zero on validation errors, but still produces JSON
        if (existsSync(jsonOutputPath)) {
          const jsonContent = await readFile(jsonOutputPath, "utf-8");
          await unlink(jsonOutputPath).catch(() => {});
          const result = JSON.parse(jsonContent) as EpubCheckResult;
          resolve(result);
        } else {
          reject(
            new Error(`EPUBCheck failed to produce output: ${stderr || `exit code ${code}`}`)
          );
        }
      } catch (error) {
        reject(error);
      }
    });

    process.on("error", (error) => {
      reject(new Error(`Failed to run EPUBCheck: ${error.message}`));
    });
  });
}

export async function getEpubCheckVersion(): Promise<string> {
  // Return cached version if available
  if (cachedVersion) {
    return cachedVersion;
  }

  const jarPath = getJarPath();

  return new Promise((resolve, reject) => {
    const proc = spawn("java", ["-jar", jarPath, "--version"]);

    let stdout = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.on("close", () => {
      const match = stdout.match(/EPUBCheck v([\d.]+)/);
      if (match) {
        cachedVersion = match[1];
        // Trigger background update check
        checkForUpdatesAsync(cachedVersion);
        resolve(cachedVersion);
      } else {
        resolve(stdout.trim() || "unknown");
      }
    });

    proc.on("error", (error) => {
      reject(new Error(`Failed to get EPUBCheck version: ${error.message}`));
    });
  });
}

function buildArgs(options: ValidateOptions, jsonOutputPath: string): string[] {
  const args: string[] = [];

  // Output format
  args.push("--json", jsonOutputPath);

  // Mode
  if (options.mode && options.mode !== "epub") {
    args.push("--mode", options.mode);
  }

  // Profile
  if (options.profile && options.profile !== "default") {
    args.push("--profile", options.profile);
  }

  // Version (only for single file mode)
  if (options.version && options.mode && options.mode !== "epub") {
    args.push("-v", options.version);
  }

  // Input path (must be last)
  args.push(options.path);

  return args;
}
