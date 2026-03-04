import {
  MinHeap,
  euclideanDistance,
  mergeAllNodes,
  buildGraph,
  buildMultiFloorGraph,
  getNodeFloor,
  dijkstra,
  aStar,
  findShortestPath,
} from "../../../src/utils/pathfinding/index";

describe("pathfinding index exports", () => {
  it("exports MinHeap", () => {
    expect(MinHeap).toBeDefined();
    const heap = new MinHeap();
    expect(heap.isEmpty()).toBe(true);
  });

  it("exports graphBuilder functions", () => {
    expect(typeof euclideanDistance).toBe("function");
    expect(typeof mergeAllNodes).toBe("function");
    expect(typeof buildGraph).toBe("function");
    expect(typeof buildMultiFloorGraph).toBe("function");
    expect(typeof getNodeFloor).toBe("function");
  });

  it("exports pathfinding functions", () => {
    expect(typeof dijkstra).toBe("function");
    expect(typeof aStar).toBe("function");
    expect(typeof findShortestPath).toBe("function");
  });
});
