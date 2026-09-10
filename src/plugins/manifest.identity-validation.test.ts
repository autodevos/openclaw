/** Guards plugin manifests from declaring a missing/empty/non-string name or version. */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadPluginManifest } from "./manifest.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function writeManifest(manifest: Record<string, unknown>): Promise<string> {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-manifest-identity-"));
  tempDirs.push(rootDir);
  await fs.writeFile(path.join(rootDir, "openclaw.plugin.json"), JSON.stringify(manifest));
  return rootDir;
}

describe("plugin manifest name/version validation", () => {
  it("rejects a manifest whose declared name is an empty string", async () => {
    const rootDir = await writeManifest({
      id: "blank-name",
      name: "",
      configSchema: { type: "object" },
    });

    expect(loadPluginManifest(rootDir, false)).toMatchObject({
      ok: false,
      error: expect.stringContaining("name must be a non-empty string"),
    });
  });

  it("rejects a manifest whose declared name is not a string", async () => {
    const rootDir = await writeManifest({
      id: "numeric-name",
      name: 42,
      configSchema: { type: "object" },
    });

    expect(loadPluginManifest(rootDir, false)).toMatchObject({
      ok: false,
      error: expect.stringContaining("name must be a non-empty string"),
    });
  });

  it("rejects a manifest whose declared version is an empty string", async () => {
    const rootDir = await writeManifest({
      id: "blank-version",
      version: "   ",
      configSchema: { type: "object" },
    });

    expect(loadPluginManifest(rootDir, false)).toMatchObject({
      ok: false,
      error: expect.stringContaining("version must be a non-empty string"),
    });
  });

  it("rejects a manifest whose declared version is not a string", async () => {
    const rootDir = await writeManifest({
      id: "numeric-version",
      version: 2,
      configSchema: { type: "object" },
    });

    expect(loadPluginManifest(rootDir, false)).toMatchObject({
      ok: false,
      error: expect.stringContaining("version must be a non-empty string"),
    });
  });

  it("accepts a manifest that omits name and version, leaving fallback to package.json intact", async () => {
    const rootDir = await writeManifest({
      id: "no-identity-fields",
      configSchema: { type: "object" },
    });

    const result = loadPluginManifest(rootDir, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.name).toBeUndefined();
      expect(result.manifest.version).toBeUndefined();
    }
  });

  it("accepts a manifest with valid non-empty name and version", async () => {
    const rootDir = await writeManifest({
      id: "valid-identity",
      name: "Valid Plugin",
      version: "1.2.3",
      configSchema: { type: "object" },
    });

    const result = loadPluginManifest(rootDir, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.name).toBe("Valid Plugin");
      expect(result.manifest.version).toBe("1.2.3");
    }
  });
});
