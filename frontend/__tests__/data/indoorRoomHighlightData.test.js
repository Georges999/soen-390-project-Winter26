import {
  getRoomHighlightPoint,
  getRoomsForFloor,
  roomHighlightCoordinates,
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
});
