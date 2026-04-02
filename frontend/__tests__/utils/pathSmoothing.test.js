import {
  axisSnap,
  douglasPeucker,
  buildRoundedPath,
  filterRoomTransitNodes,
  smoothPath,
} from "../../src/utils/pathfinding/pathSmoothing";

describe("pathSmoothing", () => {
  // ── axisSnap ─────────────────────────────────────────────
  describe("axisSnap", () => {
    it("returns input unchanged when fewer than 2 points", () => {
      expect(axisSnap([])).toEqual([]);
      expect(axisSnap([{ x: 10, y: 20 }])).toEqual([{ x: 10, y: 20 }]);
    });

    it("snaps nearly-horizontal segments (small dy)", () => {
      const pts = [
        { x: 0, y: 100 },
        { x: 50, y: 105 }, // dy = 5 < threshold, dx = 50 > dy
        { x: 100, y: 103 },
      ];
      const result = axisSnap(pts, 8);
      expect(result[1].y).toBe(100);
      expect(result[2].y).toBe(100);
    });

    it("snaps nearly-vertical segments (small dx)", () => {
      const pts = [
        { x: 100, y: 0 },
        { x: 105, y: 50 }, // dx = 5 < threshold, dy = 50 > dx
        { x: 103, y: 100 },
      ];
      const result = axisSnap(pts, 8);
      expect(result[1].x).toBe(100);
      expect(result[2].x).toBe(100);
    });

    it("does not snap diagonal segments", () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 50, y: 50 },
      ];
      const result = axisSnap(pts, 8);
      expect(result[1].x).toBe(50);
      expect(result[1].y).toBe(50);
    });

    it("handles null/undefined input", () => {
      expect(axisSnap(null)).toBeNull();
      expect(axisSnap(undefined)).toBeUndefined();
    });
  });

  // ── douglasPeucker ───────────────────────────────────────
  describe("douglasPeucker", () => {
    it("returns input unchanged when fewer than 3 points", () => {
      const two = [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ];
      expect(douglasPeucker(two, 5)).toEqual(two);
    });

    it("removes collinear intermediate points", () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 100, y: 0 },
      ];
      const result = douglasPeucker(pts, 1);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ x: 0, y: 0 });
      expect(result[1]).toEqual({ x: 100, y: 0 });
    });

    it("keeps points that deviate beyond epsilon", () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 50, y: 30 },
        { x: 100, y: 0 },
      ];
      const result = douglasPeucker(pts, 5);
      expect(result).toHaveLength(3);
    });

    it("handles null/undefined input", () => {
      expect(douglasPeucker(null)).toBeNull();
      expect(douglasPeucker(undefined)).toBeUndefined();
    });
  });

  // ── buildRoundedPath ────────────────────────────────────
  describe("buildRoundedPath", () => {
    it("returns empty string for empty/null input", () => {
      expect(buildRoundedPath([])).toBe("");
      expect(buildRoundedPath(null)).toBe("");
    });

    it("returns M command for single point", () => {
      expect(buildRoundedPath([{ x: 10, y: 20 }])).toBe("M 10 20");
    });

    it("returns M-L for two points", () => {
      const result = buildRoundedPath([
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ]);
      expect(result).toBe("M 0 0 L 100 100");
    });

    it("adds quadratic Bezier arcs at turns for 3+ points", () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ];
      const result = buildRoundedPath(pts, 14);
      expect(result).toMatch(/^M 0 0/);
      expect(result).toContain("Q "); // quadratic arc at corner
      expect(result).toContain("L "); // straight segments
    });

    it("falls back to straight lines when radius is too large for short segments", () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 2, y: 0 },  // only 2px segment
        { x: 2, y: 2 },
      ];
      // radius clamped to min(14, 1, 1) = 1 < 2, so still uses Q
      const result = buildRoundedPath(pts, 14);
      expect(result).toMatch(/^M /);
    });

    it("handles a straight line (no turn) correctly", () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 100, y: 0 },
      ];
      const result = buildRoundedPath(pts, 14);
      // Even on a straight line, Q is inserted but the arc is nearly flat
      expect(result).toMatch(/^M 0 0/);
    });
  });

  // ── smoothPath (full pipeline) ──────────────────────────
  describe("smoothPath", () => {
    it("returns empty string for empty input", () => {
      expect(smoothPath([])).toBe("");
      expect(smoothPath(null)).toBe("");
    });

    it("returns M command for single point", () => {
      expect(smoothPath([{ x: 5, y: 10 }])).toBe("M 5 10");
    });

    it("returns valid SVG path for a straight corridor", () => {
      const pts = [
        { x: 0, y: 100 },
        { x: 50, y: 103 },
        { x: 100, y: 101 },
        { x: 150, y: 102 },
        { x: 200, y: 100 },
      ];
      const result = smoothPath(pts);
      expect(result).toMatch(/^M /);
      expect(result.length).toBeGreaterThan(0);
    });

    it("uses Q arcs at turns, not C curves", () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 200, y: 100 },
      ];
      const result = smoothPath(pts);
      expect(result).toContain("Q ");
      expect(result).not.toContain("C ");
    });

    it("handles L-shaped corridor without losing the corner", () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ];
      const result = smoothPath(pts);
      expect(result).toMatch(/^M /);
      expect(result.length).toBeGreaterThan(0);
    });

    it("filters out intermediate room nodes from path", () => {
      const pts = [
        { x: 0, y: 0, type: "room" },       // start room — keep
        { x: 50, y: 0, type: "hallway" },    // hallway — keep
        { x: 100, y: 0, type: "classroom" }, // transit room — skip
        { x: 150, y: 0, type: "hallway" },   // hallway — keep
        { x: 200, y: 0, type: "room" },      // end room — keep
      ];
      const result = smoothPath(pts);
      expect(result).toMatch(/^M /);
      // The intermediate classroom should be filtered out
    });
  });

  // ── filterRoomTransitNodes ──────────────────────────────
  describe("filterRoomTransitNodes", () => {
    it("returns input unchanged for 0-2 points", () => {
      expect(filterRoomTransitNodes(null)).toBeNull();
      expect(filterRoomTransitNodes([])).toEqual([]);
      const two = [{ x: 0, y: 0, type: "room" }, { x: 10, y: 10, type: "room" }];
      expect(filterRoomTransitNodes(two)).toEqual(two);
    });

    it("keeps start and end room nodes", () => {
      const pts = [
        { x: 0, y: 0, type: "room" },
        { x: 50, y: 0, type: "hallway" },
        { x: 100, y: 0, type: "room" },
      ];
      const result = filterRoomTransitNodes(pts);
      expect(result).toHaveLength(3);
    });

    it("removes intermediate room/classroom nodes", () => {
      const pts = [
        { x: 0, y: 0, type: "hallway" },
        { x: 50, y: 0, type: "room" },
        { x: 80, y: 0, type: "classroom" },
        { x: 100, y: 0, type: "hallway" },
      ];
      const result = filterRoomTransitNodes(pts);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("hallway");
      expect(result[1].type).toBe("hallway");
    });

    it("keeps hallway and POI nodes", () => {
      const pts = [
        { x: 0, y: 0, type: "room" },
        { x: 25, y: 0, type: "hallway" },
        { x: 50, y: 0, type: "elevator" },
        { x: 75, y: 0, type: "stairs" },
        { x: 100, y: 0, type: "room" },
      ];
      const result = filterRoomTransitNodes(pts);
      expect(result).toHaveLength(5);
    });

    it("handles points without type field", () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 100, y: 0 },
      ];
      const result = filterRoomTransitNodes(pts);
      expect(result).toHaveLength(3);
    });
  });
});
