// Tool allowlist guard tests cover fail-closed behavior when explicit
// allowlists leave no callable tools for the selected runtime/model.
import { describe, expect, it, vi } from "vitest";
import {
  buildEmptyExplicitToolAllowlistError,
  collectExplicitToolAllowlistSources,
} from "./tool-allowlist-guard.js";

describe("tool allowlist guard", () => {
  it("fails closed when explicit allowlists resolve to no callable tools", () => {
    const error = buildEmptyExplicitToolAllowlistError({
      sources: [{ label: "tools.allow", entries: [" query_db "] }],
      callableToolNames: [],
      toolsEnabled: true,
    });

    expect(error?.message).toContain("No callable tools remain");
    expect(error?.message).toContain("tools.allow: query_db");
    expect(error?.message).toContain("no registered tools matched");
  });

  it("fails closed for runtime toolsAllow when tools are disabled", () => {
    const error = buildEmptyExplicitToolAllowlistError({
      sources: [
        { label: "runtime toolsAllow", entries: ["query_db"], enforceWhenToolsDisabled: true },
      ],
      callableToolNames: [],
      toolsEnabled: true,
      disableTools: true,
    });

    expect(error?.message).toContain("runtime toolsAllow: query_db");
    expect(error?.message).toContain("tools are disabled for this run");
  });

  it("allows inherited config allowlists when a run intentionally disables tools", () => {
    // Explicit runtime allowlists are command-time intent, while inherited
    // config allowlists should not block a deliberately text-only run.
    expect(
      buildEmptyExplicitToolAllowlistError({
        sources: [{ label: "tools.allow", entries: ["lobster", "llm-task"] }],
        callableToolNames: [],
        toolsEnabled: true,
        disableTools: true,
      }),
    ).toBeNull();
  });

  it("allows inherited config allowlists when runtime toolsAllow is explicitly empty", () => {
    expect(
      buildEmptyExplicitToolAllowlistError({
        sources: [{ label: "tools.allow", entries: ["*", "read", "cron"] }],
        callableToolNames: [],
        toolsEnabled: true,
        toolsAllowExplicitlyEmpty: true,
      }),
    ).toBeNull();
  });

  it("still enforces command-time allowlists for explicitly tool-less runs", () => {
    const error = buildEmptyExplicitToolAllowlistError({
      sources: [
        { label: "tools.allow", entries: ["read"] },
        { label: "runtime toolsAllow", entries: ["query_db"], enforceWhenToolsDisabled: true },
      ],
      callableToolNames: [],
      toolsEnabled: true,
      toolsAllowExplicitlyEmpty: true,
    });

    expect(error?.message).toContain("runtime toolsAllow: query_db");
    expect(error?.message).not.toContain("tools.allow: read");
  });

  it("fails closed when the selected model cannot use requested tools", () => {
    const error = buildEmptyExplicitToolAllowlistError({
      sources: [{ label: "agents.db.tools.allow", entries: ["query_db"] }],
      callableToolNames: [],
      toolsEnabled: false,
    });

    expect(error?.message).toContain("agents.db.tools.allow: query_db");
    expect(error?.message).toContain("the selected model does not support tools");
  });

  it("allows text-only runs without explicit allowlists", () => {
    expect(
      buildEmptyExplicitToolAllowlistError({
        sources: [],
        callableToolNames: [],
        toolsEnabled: true,
      }),
    ).toBeNull();
  });

  it("allows explicit allowlists when at least one callable tool remains", () => {
    expect(
      buildEmptyExplicitToolAllowlistError({
        sources: [{ label: "tools.allow", entries: ["read", "missing_tool"] }],
        callableToolNames: ["read"],
        toolsEnabled: true,
      }),
    ).toBeNull();
  });

  it("keeps source labels for config and runtime allowlists", () => {
    const sources = collectExplicitToolAllowlistSources([
      { label: "tools.allow", allow: [" read ", ""] },
      {
        label: "runtime toolsAllow",
        allow: ["query_db"],
        enforceWhenToolsDisabled: true,
      },
      { label: "tools.byProvider.allow" },
    ]);

    expect(sources).toEqual([
      { label: "tools.allow", entries: ["read"] },
      {
        label: "runtime toolsAllow",
        entries: ["query_db"],
        enforceWhenToolsDisabled: true,
      },
    ]);
  });

  it("warns which specific allowlisted entry is unmatched when some tools remain callable", () => {
    const warn = vi.fn();
    const result = buildEmptyExplicitToolAllowlistError({
      sources: [{ label: "tools.allow", entries: ["read", "missing_tool"] }],
      callableToolNames: ["read"],
      toolsEnabled: true,
      warn,
    });
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("missing_tool"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("tools.allow"));
  });

  it("warns for each unmatched entry by name when no tools remain callable", () => {
    const warn = vi.fn();
    buildEmptyExplicitToolAllowlistError({
      sources: [
        { label: "tools.allow", entries: ["missing_a", "missing_b"] },
        { label: "agents.db.tools.allow", entries: ["missing_c"] },
      ],
      callableToolNames: [],
      toolsEnabled: true,
      warn,
    });
    expect(warn).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("missing_a"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("missing_b"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("missing_c"));
  });

  it("does not warn for wildcard entries since they cannot be unmatched by name", () => {
    const warn = vi.fn();
    buildEmptyExplicitToolAllowlistError({
      sources: [{ label: "tools.allow", entries: ["*", "read"] }],
      callableToolNames: ["read"],
      toolsEnabled: true,
      warn,
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not warn when warn callback is omitted", () => {
    expect(() =>
      buildEmptyExplicitToolAllowlistError({
        sources: [{ label: "tools.allow", entries: ["missing_tool"] }],
        callableToolNames: [],
        toolsEnabled: true,
      }),
    ).not.toThrow();
  });
});
