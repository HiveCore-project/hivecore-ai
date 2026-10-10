import { describe, expect, it } from "vitest";
import { validateMission } from "../shared/mission";
import { DisabledProvider } from "../worker/providers";
describe("mission validation", () => {
  const valid = {
    title: " Energy storage ",
    objective: " Compare primary research on storage. ",
    category: "Climate",
  };
  it("normalizes text and drops client-controlled status", () =>
    expect(validateMission({ ...valid, status: "running" })).toEqual({
      title: "Energy storage",
      objective: "Compare primary research on storage.",
      category: "Climate",
    }));
  it.each([
    null,
    [],
    {},
    { ...valid, title: "a" },
    { ...valid, title: "x".repeat(121) },
    { ...valid, objective: "short" },
    { ...valid, objective: "x".repeat(2001) },
    { ...valid, category: "Unknown" },
  ])("rejects malformed mission %#", (value) =>
    expect(() => validateMission(value)).toThrow(),
  );
  it("does not execute AI", async () => {
    await expect(new DisabledProvider().investigate()).rejects.toThrow(
      "disabled",
    );
  });
});
