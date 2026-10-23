import { describe, expect, it } from "vitest";
import { formatDateTime, fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";

describe("dealership time zone handling", () => {
  it("round-trips local input in the dealership zone regardless of the server zone", () => {
    const iso = fromDateTimeLocal("2026-11-03T14:30", "Asia/Almaty");
    expect(toDateTimeLocal(iso, "Asia/Almaty")).toBe("2026-11-03T14:30");
    expect(formatDateTime(iso, "Asia/Almaty")).toBe("03.11.2026 14:30");
    expect(fromDateTimeLocal("2026-11-03T14:30", "Europe/London")).toBe("2026-11-03T14:30:00.000Z");
  });
});
