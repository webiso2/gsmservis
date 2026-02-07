import { describe, expect, it } from "vitest";

import { LINE_WIDTH, centerText, createTwoColumnRow, truncateText, wrapText } from "../printUtils";

describe("printUtils helpers", () => {
  it("centers text to line width with padding", () => {
    const centered = centerText("TEST");
    expect(centered).toHaveLength(LINE_WIDTH);
    expect(centered.trim()).toBe("TEST");
  });

  it("truncates text with ellipsis when exceeding max length", () => {
    expect(truncateText("12345", 4)).toBe("123…");
  });

  it("wraps long words into chunks of max width", () => {
    const lines = wrapText("ABCDEFGHIJ", 4);
    expect(lines).toEqual(["ABCD", "EFGH", "IJ"]);
  });

  it("creates two column row with fixed total width", () => {
    const row = createTwoColumnRow("LEFT", "RIGHT");
    expect(row).toHaveLength(LINE_WIDTH);
  });
});
