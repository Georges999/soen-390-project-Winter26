import { dijkstra, aStar, findShortestPath } from "../../../src/utils/pathfinding/pathfinding";

// ── Shared test data ──

const sampleFloorData = {
  floors: {
    "MB-S2": {
      label: "MB – Sub 2",
      nodes: [
        { id: "hall_001", type: "hallway", x: 100, y: 100, label: "" },
        { id: "hall_002", type: "hallway", x: 200, y: 100, label: "" },
        { id: "hall_003", type: "hallway", x: 300, y: 100, label: "" },
        { id: "hall_004", type: "hallway", x: 300, y: 200, label: "" },
        { id: "hall_005", type: "hallway", x: 200, y: 200, label: "" },
      ],
      rooms: [
        { id: "room_101", type: "classroom", x: 100, y: 50, label: "S2.101" },
        { id: "room_102", type: "classroom", x: 200, y: 50, label: "S2.102" },
        { id: "room_103", type: "classroom", x: 350, y: 200, label: "S2.103" },
      ],
      pois: [
        { id: "elevator_001", type: "elevator", x: 150, y: 150, label: "Elevator" },
        { id: "washroom_001", type: "washroom", x: 250, y: 150, label: "Washroom" },
      ],
      edges: [
        { from: "hall_001", to: "hall_002", weight: 100 },
        { from: "hall_002", to: "hall_003", weight: 100 },
        { from: "hall_003", to: "hall_004", weight: 100 },
        { from: "hall_004", to: "hall_005", weight: 100 },
        { from: "hall_005", to: "hall_002", weight: 100 },
        { from: "room_101", to: "hall_001", weight: 50 },
        { from: "room_102", to: "hall_002", weight: 50 },
        { from: "room_103", to: "hall_004", weight: 50 },
        { from: "elevator_001", to: "hall_001" },
        { from: "elevator_001", to: "hall_005" },
        { from: "washroom_001", to: "hall_003" },
        { from: "washroom_001", to: "hall_004" },
      ],
    },
  },
};

// Helper to build a simple graph & nodes Map manually for unit testing dijkstra/aStar
function buildSimpleGraph() {
  const graph = new Map();
  const nodes = new Map();

  // A -- 1 -- B -- 2 -- C
  //            |         |
  //            3         1
  //            |         |
  //            D -- 1 -- E
  const nodeList = [
    { id: "A", x: 0, y: 0 },
    { id: "B", x: 1, y: 0 },
    { id: "C", x: 3, y: 0 },
    { id: "D", x: 1, y: 3 },
    { id: "E", x: 3, y: 1 },
  ];
  nodeList.forEach((n) => nodes.set(n.id, n));

  graph.set("A", [{ to: "B", weight: 1 }]);
  graph.set("B", [
    { to: "A", weight: 1 },
    { to: "C", weight: 2 },
    { to: "D", weight: 3 },
  ]);
  graph.set("C", [
    { to: "B", weight: 2 },
    { to: "E", weight: 1 },
  ]);
  graph.set("D", [
    { to: "B", weight: 3 },
    { to: "E", weight: 1 },
  ]);
  graph.set("E", [
    { to: "C", weight: 1 },
    { to: "D", weight: 1 },
  ]);

  return { graph, nodes };
}

// ── dijkstra ──

describe("dijkstra", () => {
  const { graph, nodes } = buildSimpleGraph();

  it("finds shortest path between adjacent nodes", () => {
    const result = dijkstra(graph, nodes, "A", "B");
    expect(result).not.toBeNull();
    expect(result.pathNodeIds).toEqual(["A", "B"]);
    expect(result.totalWeight).toBe(1);
  });

  it("finds shortest path via intermediate nodes", () => {
    const result = dijkstra(graph, nodes, "A", "E");
    expect(result).not.toBeNull();
    // A -> B -> C -> E (1+2+1=4)  or  A -> B -> D -> E (1+3+1=5)
    expect(result.totalWeight).toBe(4);
    expect(result.pathNodeIds[0]).toBe("A");
    expect(result.pathNodeIds[result.pathNodeIds.length - 1]).toBe("E");
  });

  it("returns null when start node does not exist", () => {
    expect(dijkstra(graph, nodes, "MISSING", "A")).toBeNull();
  });

  it("returns null when end node does not exist", () => {
    expect(dijkstra(graph, nodes, "A", "MISSING")).toBeNull();
  });

  it("returns null when no path exists", () => {
    const disconnected = new Map(graph);
    disconnected.set("Z", []);
    const nodesExt = new Map(nodes);
    nodesExt.set("Z", { id: "Z", x: 99, y: 99 });
    expect(dijkstra(disconnected, nodesExt, "A", "Z")).toBeNull();
  });

  it("returns a path from node to itself", () => {
    const result = dijkstra(graph, nodes, "A", "A");
    expect(result).not.toBeNull();
    expect(result.pathNodeIds).toEqual(["A"]);
    expect(result.totalWeight).toBe(0);
  });
});

// ── aStar ──

describe("aStar", () => {
  const { graph, nodes } = buildSimpleGraph();

  it("finds shortest path between adjacent nodes", () => {
    const result = aStar(graph, nodes, "A", "B");
    expect(result).not.toBeNull();
    expect(result.pathNodeIds).toEqual(["A", "B"]);
    expect(result.totalWeight).toBe(1);
  });

  it("finds shortest path via intermediate nodes", () => {
    const result = aStar(graph, nodes, "A", "E");
    expect(result).not.toBeNull();
    expect(result.totalWeight).toBe(4);
    expect(result.pathNodeIds[0]).toBe("A");
    expect(result.pathNodeIds[result.pathNodeIds.length - 1]).toBe("E");
  });

  it("returns null when start node not in graph", () => {
    expect(aStar(graph, nodes, "MISSING", "A")).toBeNull();
  });

  it("returns null when start node not in nodes map", () => {
    const graphExt = new Map(graph);
    graphExt.set("GHOST", []);
    expect(aStar(graphExt, nodes, "GHOST", "A")).toBeNull();
  });

  it("returns null when end node not in graph", () => {
    expect(aStar(graph, nodes, "A", "MISSING")).toBeNull();
  });

  it("returns null when end node not in nodes map", () => {
    const graphExt = new Map(graph);
    graphExt.set("GHOST", []);
    expect(aStar(graphExt, nodes, "A", "GHOST")).toBeNull();
  });

  it("returns null when no path exists", () => {
    const disconnected = new Map(graph);
    disconnected.set("Z", []);
    const nodesExt = new Map(nodes);
    nodesExt.set("Z", { id: "Z", x: 99, y: 99 });
    expect(aStar(disconnected, nodesExt, "A", "Z")).toBeNull();
  });

  it("produces same or better result than dijkstra", () => {
    const d = dijkstra(graph, nodes, "A", "D");
    const a = aStar(graph, nodes, "A", "D");
    expect(a.totalWeight).toBe(d.totalWeight);
  });
});

// ── findShortestPath (unified API) ──

describe("findShortestPath", () => {
  it("returns a successful result with A* by default", () => {
    const result = findShortestPath({
      floorsData: sampleFloorData,
      startNodeId: "room_101",
      endNodeId: "room_103",
    });
    expect(result.ok).toBe(true);
    expect(result.algorithm).toBe("astar");
    expect(result.totalWeight).toBeGreaterThan(0);
    expect(result.pathNodeIds.length).toBeGreaterThanOrEqual(2);
    expect(result.pathCoords.length).toBe(result.pathNodeIds.length);
  });

  it("uses dijkstra when specified", () => {
    const result = findShortestPath({
      floorsData: sampleFloorData,
      startNodeId: "room_101",
      endNodeId: "room_103",
      algorithm: "dijkstra",
    });
    expect(result.ok).toBe(true);
    expect(result.algorithm).toBe("dijkstra");
  });

  it("defaults to astar for unknown algorithm names", () => {
    const result = findShortestPath({
      floorsData: sampleFloorData,
      startNodeId: "room_101",
      endNodeId: "room_103",
      algorithm: "unknown",
    });
    expect(result.ok).toBe(true);
    expect(result.algorithm).toBe("astar");
  });

  it("pathCoords contain id, x, y, floor, label, type", () => {
    const result = findShortestPath({
      floorsData: sampleFloorData,
      startNodeId: "room_101",
      endNodeId: "room_102",
    });
    expect(result.ok).toBe(true);
    result.pathCoords.forEach((coord) => {
      expect(coord).toHaveProperty("id");
      expect(coord).toHaveProperty("x");
      expect(coord).toHaveProperty("y");
      expect(coord).toHaveProperty("floor");
      expect(coord).toHaveProperty("label");
      expect(coord).toHaveProperty("type");
    });
  });

  // ── Error / validation cases ──

  it("returns error when floorsData is null", () => {
    const result = findShortestPath({
      floorsData: null,
      startNodeId: "a",
      endNodeId: "b",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/floorsData/i);
  });

  it("returns error when startNodeId is missing", () => {
    const result = findShortestPath({
      floorsData: sampleFloorData,
      startNodeId: "",
      endNodeId: "room_103",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/startNodeId/i);
  });

  it("returns error when endNodeId is missing", () => {
    const result = findShortestPath({
      floorsData: sampleFloorData,
      startNodeId: "room_101",
      endNodeId: "",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/endNodeId/i);
  });

  it("returns error for empty graph (no floors)", () => {
    const result = findShortestPath({
      floorsData: { floors: {} },
      startNodeId: "a",
      endNodeId: "b",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/empty graph/i);
  });

  it("returns error when start node not found", () => {
    const result = findShortestPath({
      floorsData: sampleFloorData,
      startNodeId: "nonexistent",
      endNodeId: "room_103",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/start node/i);
  });

  it("returns error when end node not found", () => {
    const result = findShortestPath({
      floorsData: sampleFloorData,
      startNodeId: "room_101",
      endNodeId: "nonexistent",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/end node/i);
  });

  it("returns error when nodes are on different floors", () => {
    const multiFloor = {
      floors: {
        F1: {
          nodes: [{ id: "f1_n", x: 0, y: 0 }],
          rooms: [],
          pois: [],
          edges: [],
        },
        F2: {
          nodes: [{ id: "f2_n", x: 0, y: 0 }],
          rooms: [],
          pois: [],
          edges: [],
        },
      },
    };
    const result = findShortestPath({
      floorsData: multiFloor,
      startNodeId: "f1_n",
      endNodeId: "f2_n",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/different floors/i);
    expect(result.startFloor).toBe("F1");
    expect(result.endFloor).toBe("F2");
  });

  it("returns error when no path exists between disconnected nodes", () => {
    const disconnected = {
      floors: {
        F1: {
          nodes: [
            { id: "a", x: 0, y: 0 },
            { id: "b", x: 100, y: 100 },
          ],
          rooms: [],
          pois: [],
          edges: [], // no edges → no path
        },
      },
    };
    const result = findShortestPath({
      floorsData: disconnected,
      startNodeId: "a",
      endNodeId: "b",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/no path/i);
  });

  // ── Path between POIs ──

  it("finds path between POIs (elevator → washroom)", () => {
    const result = findShortestPath({
      floorsData: sampleFloorData,
      startNodeId: "elevator_001",
      endNodeId: "washroom_001",
    });
    expect(result.ok).toBe(true);
    expect(result.pathNodeIds[0]).toBe("elevator_001");
    expect(result.pathNodeIds[result.pathNodeIds.length - 1]).toBe("washroom_001");
  });

  // ── Accessible routing ──

  it("avoids stairs when accessible=true", () => {
    // Graph: room_A --stairs_node-- room_B  (only path goes through stairs)
    const floorData = {
      floors: {
        F1: {
          label: "F1",
          nodes: [
            { id: "hall_a", type: "hallway", x: 0, y: 0 },
            { id: "stairs_mid", type: "stairs", x: 50, y: 0 },
            { id: "hall_b", type: "hallway", x: 100, y: 0 },
          ],
          rooms: [
            { id: "room_a", type: "classroom", x: 0, y: 10, label: "A" },
            { id: "room_b", type: "classroom", x: 100, y: 10, label: "B" },
          ],
          pois: [],
          edges: [
            { from: "room_a", to: "hall_a", weight: 10 },
            { from: "hall_a", to: "stairs_mid", weight: 50 },
            { from: "stairs_mid", to: "hall_b", weight: 50 },
            { from: "hall_b", to: "room_b", weight: 10 },
          ],
        },
      },
    };

    // Without accessibility: should find a path through stairs
    const normalResult = findShortestPath({
      floorsData: floorData,
      startNodeId: "room_a",
      endNodeId: "room_b",
      accessible: false,
    });
    expect(normalResult.ok).toBe(true);
    expect(normalResult.pathNodeIds).toContain("stairs_mid");

    // With accessibility: should fail (no accessible path exists)
    const accessibleResult = findShortestPath({
      floorsData: floorData,
      startNodeId: "room_a",
      endNodeId: "room_b",
      accessible: true,
    });
    expect(accessibleResult.ok).toBe(false);
    expect(accessibleResult.reason).toMatch(/accessible/i);
  });

  it("routes via elevator when accessible=true and alternative exists", () => {
    const floorData = {
      floors: {
        F1: {
          label: "F1",
          nodes: [
            { id: "hall_a", type: "hallway", x: 0, y: 0 },
            { id: "stairs_mid", type: "stairs", x: 50, y: 0 },
            { id: "elev_mid", type: "elevator", x: 50, y: 50 },
            { id: "hall_b", type: "hallway", x: 100, y: 0 },
          ],
          rooms: [
            { id: "room_a", type: "classroom", x: 0, y: 10, label: "A" },
            { id: "room_b", type: "classroom", x: 100, y: 10, label: "B" },
          ],
          pois: [],
          edges: [
            { from: "room_a", to: "hall_a", weight: 10 },
            { from: "hall_a", to: "stairs_mid", weight: 50 },
            { from: "stairs_mid", to: "hall_b", weight: 50 },
            { from: "hall_a", to: "elev_mid", weight: 60 },
            { from: "elev_mid", to: "hall_b", weight: 60 },
            { from: "hall_b", to: "room_b", weight: 10 },
          ],
        },
      },
    };

    const result = findShortestPath({
      floorsData: floorData,
      startNodeId: "room_a",
      endNodeId: "room_b",
      accessible: true,
    });
    expect(result.ok).toBe(true);
    expect(result.pathNodeIds).toContain("elev_mid");
    expect(result.pathNodeIds).not.toContain("stairs_mid");
    expect(result.accessible).toBe(true);
  });

  it("routes to nearest elevator on cross-floor with accessible=true", () => {
    const multiFloor = {
      floors: {
        F1: {
          label: "F1",
          nodes: [
            { id: "f1_hall", type: "hallway", x: 0, y: 0 },
          ],
          rooms: [
            { id: "f1_room", type: "classroom", x: 10, y: 0, label: "101" },
          ],
          pois: [
            { id: "f1_elev", type: "elevator", x: 50, y: 0, label: "Elevator" },
          ],
          edges: [
            { from: "f1_room", to: "f1_hall", weight: 10 },
            { from: "f1_hall", to: "f1_elev", weight: 50 },
          ],
        },
        F2: {
          label: "F2",
          nodes: [{ id: "f2_hall", x: 0, y: 0 }],
          rooms: [{ id: "f2_room", type: "classroom", x: 10, y: 0, label: "201" }],
          pois: [],
          edges: [{ from: "f2_room", to: "f2_hall", weight: 10 }],
        },
      },
    };

    const result = findShortestPath({
      floorsData: multiFloor,
      startNodeId: "f1_room",
      endNodeId: "f2_room",
      accessible: true,
    });
    expect(result.ok).toBe(true);
    // Should reroute to elevator on F1
    expect(result.pathNodeIds[result.pathNodeIds.length - 1]).toBe("f1_elev");
  });

  it("returns error on cross-floor without accessible when no support", () => {
    const multiFloor = {
      floors: {
        F1: {
          nodes: [{ id: "f1_n", x: 0, y: 0 }],
          rooms: [],
          pois: [],
          edges: [],
        },
        F2: {
          nodes: [{ id: "f2_n", x: 0, y: 0 }],
          rooms: [],
          pois: [],
          edges: [],
        },
      },
    };
    const result = findShortestPath({
      floorsData: multiFloor,
      startNodeId: "f1_n",
      endNodeId: "f2_n",
      accessible: false,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/different floors/i);
  });

  it("returns error on cross-floor accessible with no elevator on floor", () => {
    const multiFloor = {
      floors: {
        F1: {
          nodes: [{ id: "f1_n", type: "hallway", x: 0, y: 0 }],
          rooms: [],
          pois: [],
          edges: [],
        },
        F2: {
          nodes: [{ id: "f2_n", type: "hallway", x: 0, y: 0 }],
          rooms: [],
          pois: [],
          edges: [],
        },
      },
    };
    const result = findShortestPath({
      floorsData: multiFloor,
      startNodeId: "f1_n",
      endNodeId: "f2_n",
      accessible: true,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/elevator/i);
  });
});
