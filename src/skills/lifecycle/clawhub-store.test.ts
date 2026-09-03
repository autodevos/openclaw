import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { useAutoCleanupTempDirTracker } from "../../../test/helpers/temp-dir.js";
import {
  readClawHubSkillsLockfile,
  readClawHubSkillsLockfileStatusSync,
} from "./clawhub-store.js";

const tempDirs = useAutoCleanupTempDirTracker(afterEach);

async function writeLockfile(workspaceDir: string, skills: Record<string, unknown>) {
  await mkdir(join(workspaceDir, ".clawhub"), { recursive: true });
  await writeFile(
    join(workspaceDir, ".clawhub", "lock.json"),
    JSON.stringify({ version: 1, skills }),
  );
}

describe("readClawHubSkillsLockfile entry validation", () => {
  it("keeps well-formed entries", async () => {
    const workspaceDir = tempDirs.make("openclaw-clawhub-store-");
    await writeLockfile(workspaceDir, {
      good: { version: "1.0.0", registry: "https://clawhub.ai", installedAt: 1 },
    });

    const lock = await readClawHubSkillsLockfile(workspaceDir);

    expect(Object.keys(lock.skills)).toEqual(["good"]);
  });

  it("drops entries with a missing version", async () => {
    const workspaceDir = tempDirs.make("openclaw-clawhub-store-");
    await writeLockfile(workspaceDir, {
      good: { version: "1.0.0", installedAt: 1 },
      "missing-version": { installedAt: 1 },
    });

    const lock = await readClawHubSkillsLockfile(workspaceDir);

    expect(Object.keys(lock.skills)).toEqual(["good"]);
  });

  it("drops entries with an empty string version", async () => {
    const workspaceDir = tempDirs.make("openclaw-clawhub-store-");
    await writeLockfile(workspaceDir, {
      good: { version: "1.0.0", installedAt: 1 },
      "empty-version": { version: "   ", installedAt: 1 },
    });

    const lock = await readClawHubSkillsLockfile(workspaceDir);

    expect(Object.keys(lock.skills)).toEqual(["good"]);
  });

  it("drops entries with a non-string version", async () => {
    const workspaceDir = tempDirs.make("openclaw-clawhub-store-");
    await writeLockfile(workspaceDir, {
      good: { version: "1.0.0", installedAt: 1 },
      "numeric-version": { version: 1, installedAt: 1 },
    });

    const lock = await readClawHubSkillsLockfile(workspaceDir);

    expect(Object.keys(lock.skills)).toEqual(["good"]);
  });

  it("drops entries with an unknown/non-string registry", async () => {
    const workspaceDir = tempDirs.make("openclaw-clawhub-store-");
    await writeLockfile(workspaceDir, {
      good: { version: "1.0.0", registry: "https://clawhub.ai", installedAt: 1 },
      "bad-registry": { version: "1.0.0", registry: 42, installedAt: 1 },
      "empty-registry": { version: "1.0.0", registry: "", installedAt: 1 },
    });

    const lock = await readClawHubSkillsLockfile(workspaceDir);

    expect(Object.keys(lock.skills)).toEqual(["good"]);
  });

  it("returns an empty lockfile when no entries are valid", async () => {
    const workspaceDir = tempDirs.make("openclaw-clawhub-store-");
    await writeLockfile(workspaceDir, {
      "missing-version": { installedAt: 1 },
    });

    const lock = await readClawHubSkillsLockfile(workspaceDir);

    expect(lock).toEqual({ version: 1, skills: {} });
  });
});

describe("readClawHubSkillsLockfileStatusSync entry validation", () => {
  it("drops malformed entries but keeps the lockfile status as found", async () => {
    const workspaceDir = tempDirs.make("openclaw-clawhub-store-");
    await writeLockfile(workspaceDir, {
      good: { version: "1.0.0", registry: "https://clawhub.ai", installedAt: 1 },
      "missing-version": { installedAt: 1 },
      "bad-registry": { version: "1.0.0", registry: 42, installedAt: 1 },
    });

    const result = readClawHubSkillsLockfileStatusSync(workspaceDir);

    expect(result.kind).toBe("found");
    if (result.kind !== "found") {
      throw new Error("expected found lockfile status");
    }
    expect(Object.keys(result.lock.skills)).toEqual(["good"]);
  });
});
