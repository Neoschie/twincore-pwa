import { existsSync } from "node:fs";
import { rename } from "node:fs/promises";
import { spawn } from "node:child_process";

const apiDir = "app/api";
const parkedApiDir = ".twincore-native-api";
const proxyFile = "proxy.ts";
const parkedProxyFile = ".twincore-native-proxy.ts";

if (existsSync(parkedApiDir)) {
  throw new Error("Native API parking directory already exists.");
}

if (existsSync(parkedProxyFile)) {
  throw new Error("Native proxy parking file already exists.");
}

let apiParked = false;
let proxyParked = false;

try {
  if (existsSync(apiDir)) {
    await rename(apiDir, parkedApiDir);
    apiParked = true;
  }

  if (existsSync(proxyFile)) {
    await rename(proxyFile, parkedProxyFile);
    proxyParked = true;
  }

  const child = spawn("npx", ["next", "build"], {
    stdio: "inherit",
    env: {
      ...process.env,
      TWINCORE_NATIVE_BUILD: "1",
      NEXT_PUBLIC_TWINCORE_NATIVE_REVIEW: "1",
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
  let restoreError = null;

  if (proxyParked) {
    try {
      await rename(parkedProxyFile, proxyFile);
    } catch (error) {
      restoreError = error;
    }
  }

  if (apiParked) {
    try {
      await rename(parkedApiDir, apiDir);
    } catch (error) {
      restoreError ??= error;
    }
  }

  if (restoreError) {
    throw restoreError;
  }
}
