import { existsSync } from "node:fs";
import { rename } from "node:fs/promises";
import { spawn } from "node:child_process";

const apiDir = "app/api";
const parkedApiDir = ".twincore-native-api";

if (existsSync(parkedApiDir)) {
  throw new Error("Native API parking directory already exists.");
}

let parked = false;

try {
  if (existsSync(apiDir)) {
    await rename(apiDir, parkedApiDir);
    parked = true;
  }

  const child = spawn("npx", ["next", "build"], {
    stdio: "inherit",
    env: {
      ...process.env,
      TWINCORE_NATIVE_BUILD: "1",
    },
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
} finally {
  if (parked) {
    await rename(parkedApiDir, apiDir);
  }
}
