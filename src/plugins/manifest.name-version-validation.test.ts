/** Regression tests: plugin manifests with missing or empty name/version are rejected. */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadPluginManifest } from "./manifest.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function makeTempDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-name-version-manifest-"));
  tempDirs.push(dir);
  return dir;
}

const VALID_BASE = { id: "test-plugin", configSchema: { type: "object" } } as const;

describe("plugin manifest name/version validation", () => {
  it("rejects a manifest with no name field", async () => {
    const rootDir = await makeTempDir();
    await fs.writeFile(
      path.join(rootDir, "openclaw.plugin.json"),
      JSON.stringify({ ...VALID_BASE, version: "1.0.0" }),
    );

    expect(loadPluginManifest(rootDir, false)).toMatchObject({
      ok: false,
      error: "plugin manifest requires a non-empty name",
    });
  });

  it("rejects a manifest with an empty name string", async () => {
    const rootDir = await makeTempDir();
    await fs.writeFile(
      path.join(rootDir, "openclaw.plugin.json"),
      JSON.stringify({ ...VALID_BASE, name: "", version: "1.0.0" }),
    );

    expect(loadPluginManifest(rootDir, false)).toMatchObject({
      ok: false,
      error: "plugin manifest requires a non-empty name",
    });
  });

  it("rejects a manifest with a whitespace-only name", async () => {
    const rootDir = await makeTempDir();
    await fs.writeFile(
      path.join(rootDir, "openclaw.plugin.json"),
      JSON.stringify({ ...VALID_BASE, name: "   ", version: "1.0.0" }),
    );

    expect(loadPluginManifest(rootDir, false)).toMatchObject({
      ok: false,
      error: "plugin manifest requires a non-empty name",
    });
  });

  it("rejects a manifest with a non-string name", async () => {
    const rootDir = await makeTempDir();
    await fs.writeFile(
      path.join(rootDir, "openclaw.plugin.json"),
      JSON.stringify({ ...VALID_BASE, name: 42, version: "1.0.0" }),
    );

    expect(loadPluginManifest(rootDir, false)).toMatchObject({
      ok: false,
      error: "plugin manifest requires a non-empty name",
    });
  });

  it("rejects a manifest with no version field", async () => {
    const rootDir = await makeTempDir();
    await fs.writeFile(
      path.join(rootDir, "openclaw.plugin.json"),
      JSON.stringify({ ...VALID_BASE, name: "Test Plugin" }),
    );

    expect(loadPluginManifest(rootDir, false)).toMatchObject({
      ok: false,
      error: "plugin manifest requires a non-empty version",
    });
  });

  it("rejects a manifest with an empty version string", async () => {
    const rootDir = await makeTempDir();
    await fs.writeFile(
      path.join(rootDir, "openclaw.plugin.json"),
      JSON.stringify({ ...VALID_BASE, name: "Test Plugin", version: "" }),
    );

    expect(loadPluginManifest(rootDir, false)).toMatchObject({
      ok: false,
      error: "plugin manifest requires a non-empty version",
    });
  });

  it("rejects a manifest with a whitespace-only version", async () => {
    const rootDir = await makeTempDir();
    await fs.writeFile(
      path.join(rootDir, "openclaw.plugin.json"),
      JSON.stringify({ ...VALID_BASE, name: "Test Plugin", version: "   " }),
    );

    expect(loadPluginManifest(rootDir, false)).toMatchObject({
      ok: false,
      error: "plugin manifest requires a non-empty version",
    });
  });

  it("rejects a manifest with a non-string version", async () => {
    const rootDir = await makeTempDir();
    await fs.writeFile(
      path.join(rootDir, "openclaw.plugin.json"),
      JSON.stringify({ ...VALID_BASE, name: "Test Plugin", version: true }),
    );

    expect(loadPluginManifest(rootDir, false)).toMatchObject({
      ok: false,
      error: "plugin manifest requires a non-empty version",
    });
  });

  it("accepts a manifest with valid non-empty name and version", async () => {
    const rootDir = await makeTempDir();
    await fs.writeFile(
      path.join(rootDir, "openclaw.plugin.json"),
      JSON.stringify({ ...VALID_BASE, name: "Test Plugin", version: "1.2.3" }),
    );

    const result = loadPluginManifest(rootDir, false);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.name).toBe("Test Plugin");
      expect(result.manifest.version).toBe("1.2.3");
    }
  });
});
