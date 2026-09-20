import { describe, it, expect } from "vitest";
import { getCalendarDays, calculateMidpointPosition } from "@/app/_lib/board-utils";

describe("Board Service Unit Tests", () => {
  it("generates 14 calendar days in Asia/Manila timezone", () => {
    const days = getCalendarDays("Asia/Manila", 14);
    expect(days).toHaveLength(14);

    // Each item has valid YYYY-MM-DD dateStr and clean title without 'Today'
    for (const d of days) {
      expect(d.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(d.title).not.toContain("Today");
      expect(d.title).not.toContain("Tomorrow");
      expect(typeof d.title).toBe("string");
    }
  });

  it("calculates midpoint positions correctly", () => {
    // Between two positions
    expect(calculateMidpointPosition(1000, 2000)).toBe(1500);
    expect(calculateMidpointPosition(1000, 1500)).toBe(1250);

    // After a position
    expect(calculateMidpointPosition(1000, null)).toBe(2000);
    expect(calculateMidpointPosition(1000, undefined)).toBe(2000);

    // Before a position
    expect(calculateMidpointPosition(null, 1000)).toBe(500);
    expect(calculateMidpointPosition(undefined, 1000)).toBe(500);

    // Default when empty
    expect(calculateMidpointPosition(null, null)).toBe(1000);
  });
});
