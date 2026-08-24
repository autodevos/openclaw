// Tests for readClawHubSkillsLockfile: verifies that a malformed lock.json is
// rejected with an error rather than silently treated as an empty skills map.
import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { withTestDir } from "../../test-helpers/temp-dir.js";
import { readClawHubSkillsLockfile, writeClawHubSkillsLockfile } from "./clawhub-store.js";

const DOT_DIR = ".clawhub";

describe("readClawHubSkillsLockfile", () => {
  it("returns empty skills when no lockfile exists", async () => {
    await withTestDir({ prefix: "clawhub-store-test-" }, async (dir) => {
      const result = await readClawHubSkillsLockfile(dir);
      expect(result).toEqual({ version: 1, skills: {} });
    });
  });

  it("reads a valid lockfile written by writeClawHubSkillsLockfile", async () => {
    await withTestDir({ prefix: "clawhub-store-test-" }, async (dir) => {
      const skills = {
        "alice/deploy": {
          version: "1.2.0",
          registry: "clawhub" as const,
          installedAt: "2026-01-01T00:00:00.000Z",
        },
      };
      await writeClawHubSkillsLockfile(dir, { version: 1, skills });
      const result = await readClawHubSkillsLockfile(dir);
      expect(result).toEqual({ version: 1, skills });
    });
  });

  it("throws when the canonical lockfile contains invalid JSON (truncated write)", async () => {
    await withTestDir({ prefix: "clawhub-store-test-" }, async (dir) => {
      // Write a valid lockfile, then corrupt it to simulate an interrupted write.
      const lockPath = path.join(dir, DOT_DIR, "lock.json");
      await writeClawHubSkillsLockfile(dir, {
        version: 1,
        skills: {
          "alice/deploy": {
            version: "1.0.0",
            registry: "clawhub" as const,
            installedAt: "2026-01-01T00:00:00.000Z",
          },
        },
      });
      await fs.writeFile(lockPath, '{"version":1,"skills":{', "utf8"); // truncated

      await expect(readClawHubSkillsLockfile(dir)).rejects.toThrow();
    });
  });

  it("throws when the canonical lockfile has wrong structure (not version 1)", async () => {
    await withTestDir({ prefix: "clawhub-store-test-" }, async (dir) => {
      const lockPath = path.join(dir, DOT_DIR, "lock.json");
      await fs.mkdir(path.dirname(lockPath), { recursive: true });
      await fs.writeFile(lockPath, JSON.stringify({ version: 2, skills: {} }), "utf8");

      await expect(readClawHubSkillsLockfile(dir)).rejects.toThrow(/malformed/i);
    });
  });

  it("does NOT return empty skills after a malformed lockfile — preserves install safety", async () => {
    // Regression: the old tryReadJson path returned { version:1, skills:{} } on a
    // corrupt lockfile, which caused the next install to overwrite all tracked skills.
    await withTestDir({ prefix: "clawhub-store-test-" }, async (dir) => {
      const lockPath = path.join(dir, DOT_DIR, "lock.json");
      await writeClawHubSkillsLockfile(dir, {
        version: 1,
        skills: {
          "bob/format": {
            version: "2.0.0",
            registry: "clawhub" as const,
            installedAt: "2026-01-01T00:00:00.000Z",
          },
        },
      });
      // Corrupt the lockfile.
      await fs.writeFile(lockPath, "{not valid json}", "utf8");

      // Must throw — not silently return empty skills that would be overwritten.
      await expect(readClawHubSkillsLockfile(dir)).rejects.toThrow();
    });
  });
});
