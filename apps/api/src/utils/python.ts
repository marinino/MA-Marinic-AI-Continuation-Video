import { spawn } from "node:child_process";

export function runPythonJson<T>(scriptPath: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const pythonBin = process.env.PYTHON_BIN || "python3";

    console.log("runPythonJson pythonBin =", pythonBin);
    console.log("runPythonJson scriptPath =", scriptPath);

    const child = spawn(pythonBin, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`python failed with code ${code}: ${stderr}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout) as T);
      } catch (err) {
        reject(
          new Error(
            `failed to parse python json output: ${String(err)}\nstdout:\n${stdout}\nstderr:\n${stderr}`
          )
        );
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}