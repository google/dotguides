import {
  spawn,
  spawnSync,
  type SpawnOptions,
  type SpawnSyncOptions,
} from "child_process";

export interface ShellOutputChunk {
  source: "stdout" | "stderr";
  chunk: string;
}

export interface ShellResult {
  stdout: string;
  stderr: string;
  output: string; // interleaved
  chunks: ShellOutputChunk[];
  exitCode: number | null;
}

export function sh(
  command: string,
  options?: SpawnOptions,
): Promise<ShellResult> {
  return new Promise((resolve, reject) => {
    // Use shell:true to allow for complex commands, pipes, etc.
    const child = spawn(command, { ...options, shell: true });

    let stdout = "";
    let stderr = "";
    let interleaved = "";
    const chunks: ShellOutputChunk[] = [];

    child.stdout?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      chunks.push({ source: "stdout", chunk });
      stdout += chunk;
      interleaved += chunk;
    });

    child.stderr?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      chunks.push({ source: "stderr", chunk });
      stderr += chunk;
      interleaved += chunk;
    });

    child.on("close", (code) => {
      const result: ShellResult = {
        stdout,
        stderr,
        output: interleaved,
        chunks,
        exitCode: code,
      };
      if (code === 0) {
        resolve(result);
      } else {
        const err = new Error(`Process exited with code ${code}`) as any;
        Object.assign(err, result);
        reject(err);
      }
    });

    child.on("error", (err) => {
      const result = {
        stdout,
        stderr,
        output: interleaved,
        chunks,
        exitCode: null,
      };
      Object.assign(err, result);
      reject(err);
    });
  });
}

export interface SyncShellResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: Error;
}

export function shSync(
  command: string,
  options?: SpawnSyncOptions,
): SyncShellResult {
  const result = spawnSync(command, { ...options, shell: true });
  const syncResult: SyncShellResult = {
    stdout: result.stdout?.toString() || "",
    stderr: result.stderr?.toString() || "",
    exitCode: result.status,
  };
  if (result.error) {
    syncResult.error = result.error;
  }
  return syncResult;
}
