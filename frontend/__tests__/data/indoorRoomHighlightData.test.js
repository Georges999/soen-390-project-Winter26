import {
  getRoomHighlightPoint,
  getRoomsForFloor,
  roomHighlightCoordinates,
  roomsByFloor,
  normalizeRoomLabel,
  formatRoomLabel,
  getRoomAliases,
} from '../../src/data/indoorRoomHighlightData';

describe('indoorRoomHighlightData', () => {
  it('normalizes labels to uppercase alphanumeric characters', () => {
    expect(normalizeRoomLabel(' mb-s2 204A ')).toBe('MBS2204A');
    expect(normalizeRoomLabel('cc1-red-123')).toBe('CC1RED123');
    expect(normalizeRoomLabel()).toBe('');
  });

  it('formats labels for Hall and MB floors', () => {
    expect(formatRoomLabel('Hall-9', 'H-920')).toBe('H920');
    expect(formatRoomLabel('MB-1', ' MB 2 10 ')).toBe('MB210');
    expect(formatRoomLabel('MB-S2', 'S2204')).toBe('MBS2204');
    expect(formatRoomLabel('MB-S2', 'MB 204')).toBe('MB204');
  });

  it('formats labels for VL, VE, and CC floors', () => {
    expect(formatRoomLabel('VL-2', 'VLF2-205')).toBe('205');
    expect(formatRoomLabel('VE-2', 'VE-204')).toBe('204');
    expect(formatRoomLabel('CC-1', 'CC1-red-102')).toBe('102');
    expect(formatRoomLabel('CC-1', 'CC-205')).toBe('205');
  });

  it('builds aliases for MB, VL, VE and CC labels', () => {
    const mbAliases = getRoomAliases('MB-1', '204');
    expect(mbAliases).toEqual(expect.arrayContaining(['204', 'MB204']));

    const vlAliases = getRoomAliases('VL-2', 'VLF2-205');
    expect(vlAliases).toEqual(expect.arrayContaining(['VLF2205', '205', 'VL205']));

    const veAliases = getRoomAliases('VE-2', 'VE-310');
    expect(veAliases).toEqual(expect.arrayContaining(['VE310', '310']));

    const ccAliases = getRoomAliases('CC-1', 'CC1-red-102');
    expect(ccAliases).toEqual(expect.arrayContaining(['CC1RED102', 'CC102', '102']));
  });

  it('returns null when floor or room is missing/unknown', () => {
    expect(getRoomHighlightPoint()).toBeNull();
    expect(getRoomHighlightPoint('Hall-9')).toBeNull();
    expect(getRoomHighlightPoint('UNKNOWN', 'H920')).toBeNull();
  });

  it('returns room highlight coordinates for existing aliases', () => {
    const hallRoom = getRoomsForFloor('Hall-9')[0];
    expect(hallRoom).toBeDefined();

    const pointFromRaw = getRoomHighlightPoint('Hall-9', hallRoom.rawLabel);
    const pointFromLabel = getRoomHighlightPoint('Hall-9', hallRoom.label);

    expect(pointFromRaw).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
    expect(pointFromLabel).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
  });

  it('returns room list with deduplicated ids and search keys', () => {
    const hallRooms = getRoomsForFloor('Hall-9');
    expect(hallRooms.length).toBeGreaterThan(0);

    const ids = hallRooms.map((room) => room.id);
    expect(new Set(ids).size).toBe(ids.length);

    hallRooms.slice(0, 10).forEach((room) => {
      expect(room.floor).toBe('Hall-9');
      expect(room.searchKeys).toEqual(expect.arrayContaining([normalizeRoomLabel(room.rawLabel)]));
    });

    expect(getRoomsForFloor('NO-FLOOR')).toEqual([]);
  });

  it('exports precomputed maps with expected floors', () => {
    expect(roomHighlightCoordinates).toEqual(expect.objectContaining({
      'Hall-1': expect.any(Object),
      'Hall-2': expect.any(Object),
      'Hall-9': expect.any(Object),
      'MB-1': expect.any(Object),
      'MB-S2': expect.any(Object),
      'VL-2': expect.any(Object),
      'CC-1': expect.any(Object),
    }));

    expect(roomsByFloor).toEqual(expect.objectContaining({
      'Hall-1': expect.any(Array),
      'Hall-2': expect.any(Array),
      'Hall-9': expect.any(Array),
      'MB-1': expect.any(Array),
      'MB-S2': expect.any(Array),
      'VL-2': expect.any(Array),
      'CC-1': expect.any(Array),
    }));
  });
});
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
    expect(aliases).toContain("HALL837");
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
