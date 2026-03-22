import {
  getRoomHighlightPoint,
  getRoomsForFloor,
  roomHighlightCoordinates,
  normalizeRoomLabel,
  formatRoomLabel,
  getRoomAliases,
} from "../../src/data/indoorRoomHighlightData";

describe("indoorRoomHighlightData", () => {
  it("builds highlight data from the exported JSON files", () => {
    expect(roomHighlightCoordinates["Hall-8"]).toBeDefined();
    expect(roomHighlightCoordinates["MB-S2"]).toBeDefined();
    expect(roomHighlightCoordinates["VL-1"]).toBeDefined();
  });

  it("resolves Hall rooms using JSON-backed coordinates", () => {
    expect(getRoomHighlightPoint("Hall-8", "H837")).toEqual({
      x: 369.29,
      y: 154.82,
    });
  });

  it("resolves MB basement labels used by the UI", () => {
    expect(getRoomHighlightPoint("MB-S2", "MBS2.210")).toEqual({
      x: 580.51,
      y: 398.31,
    });
  });

  it("resolves Loyola aliases from the exported JSON labels", () => {
    expect(getRoomHighlightPoint("VL-1", "VL101")).toEqual({
      x: 586.82,
      y: 662.28,
    });
  });

  it("exposes searchable rooms parsed from the exported JSON files", () => {
    const hallRooms = getRoomsForFloor("Hall-8");
    const mbRooms = getRoomsForFloor("MB-S2");

    expect(hallRooms.some((room) => room.label === "H837")).toBe(true);
    expect(mbRooms.some((room) => room.label === "MBS2.210")).toBe(true);
  });

  // --- getRoomAliases ---

  it("generates aliases for Hall rooms", () => {
    const aliases = getRoomAliases("Hall-8", "H837");
    expect(aliases).toContain("H837");
  });

  it("generates aliases for MB rooms with MB prefix", () => {
    const aliases = getRoomAliases("MB-S2", "S2.210");
    expect(aliases.some((a) => a.startsWith("MB"))).toBe(true);
  });

  it("generates aliases for VL rooms", () => {
    const aliases = getRoomAliases("VL-1", "VLF1-101");
    expect(aliases.some((a) => a.includes("VL"))).toBe(true);
  });

  it("generates aliases for VE rooms", () => {
    const aliases = getRoomAliases("VE-2", "VE2-205");
    expect(aliases.some((a) => a.includes("VE"))).toBe(true);
  });

  it("generates aliases for CC rooms", () => {
    const aliases = getRoomAliases("CC-1", "CC1-red-101");
    expect(aliases.some((a) => a.includes("CC"))).toBe(true);
  });

  // --- normalizeRoomLabel ---

  it("normalizes room labels by removing dots and dashes", () => {
    expect(normalizeRoomLabel("MBS2.210")).toBe("MBS2210");
    expect(normalizeRoomLabel("H837")).toBe("H837");
  });

  // --- formatRoomLabel ---

  it("formats room labels for different floor prefixes", () => {
    const hallLabel = formatRoomLabel("Hall-8", "Hall8_classroom_002");
    expect(hallLabel).toBeTruthy();
    const mbLabel = formatRoomLabel("MB-S2", "S2.210");
    expect(mbLabel).toBeTruthy();
    const vlLabel = formatRoomLabel("VL-1", "VLF1-101");
    expect(vlLabel).toBeTruthy();
    const veLabel = formatRoomLabel("VE-2", "VE2-205");
    expect(veLabel).toBeTruthy();
    const ccLabel = formatRoomLabel("CC-1", "CC1-red-101");
    expect(ccLabel).toBeTruthy();
  });

  // --- getRoomHighlightPoint edge cases ---

  it("returns null for non-existent floor", () => {
    expect(getRoomHighlightPoint("NonExistent-1", "Room1")).toBeNull();
  });

  it("returns null for non-existent room on valid floor", () => {
    expect(getRoomHighlightPoint("Hall-8", "NONEXISTENT999")).toBeNull();
  });

  it("returns null for null/empty inputs", () => {
    expect(getRoomHighlightPoint(null, "H837")).toBeNull();
    expect(getRoomHighlightPoint("Hall-8", null)).toBeNull();
    expect(getRoomHighlightPoint("", "")).toBeNull();
  });

  // --- getRoomsForFloor edge cases ---

  it("returns empty array for unknown floor", () => {
    expect(getRoomsForFloor("Unknown-99")).toEqual([]);
  });

  it("returns rooms with searchKeys", () => {
    const rooms = getRoomsForFloor("Hall-8");
    expect(rooms.length).toBeGreaterThan(0);
    rooms.forEach((room) => {
      expect(room.searchKeys).toBeDefined();
      expect(Array.isArray(room.searchKeys)).toBe(true);
    });
  });
});
