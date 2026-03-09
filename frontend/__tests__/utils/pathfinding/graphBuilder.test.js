import {
  euclideanDistance,
  mergeAllNodes,
  buildGraph,
  buildMultiFloorGraph,
  getNodeFloor,
  isStairsNode,
  isElevatorNode,
} from "../../../src/utils/pathfinding/graphBuilder";

// ── Shared test data ──

const sampleFloorData = {
  label: "Floor 1",
  nodes: [
    { id: "hall_001", type: "hallway", x: 100, y: 100, label: "" },
    { id: "hall_002", type: "hallway", x: 200, y: 100, label: "" },
  ],
  rooms: [
    { id: "room_101", type: "classroom", x: 100, y: 50, label: "H-101" },
    { id: "room_102", type: "classroom", x: 200, y: 50, label: "H-102" },
  ],
  pois: [
    { id: "elev_001", type: "elevator", x: 150, y: 150, label: "Elevator" },
    { id: "wash_001", type: "washroom", x: 250, y: 150, label: "Washroom" },
  ],
  edges: [
    { from: "hall_001", to: "hall_002", weight: 100 },
    { from: "room_101", to: "hall_001", weight: 50 },
    { from: "room_102", to: "hall_002", weight: 50 },
    { from: "elev_001", to: "hall_001" }, // no weight → Euclidean
    { from: "wash_001", to: "hall_002" },
  ],
};

describe("euclideanDistance", () => {
  it("returns 0 for the same point", () => {
    expect(euclideanDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it("computes horizontal distance", () => {
    expect(euclideanDistance({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3);
  });

  it("computes vertical distance", () => {
    expect(euclideanDistance({ x: 0, y: 0 }, { x: 0, y: 4 })).toBe(4);
  });

  it("computes diagonal distance (3-4-5 triangle)", () => {
    expect(euclideanDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe("mergeAllNodes", () => {
  it("merges nodes, rooms, and pois into a single map", () => {
    const map = mergeAllNodes(sampleFloorData);
    expect(map.size).toBe(6); // 2 halls + 2 rooms + 2 pois
  });

  it("sets correct type and floor label for each node", () => {
    const map = mergeAllNodes(sampleFloorData);
    expect(map.get("hall_001").type).toBe("hallway");
    expect(map.get("room_101").type).toBe("classroom");
    expect(map.get("elev_001").type).toBe("elevator");
    expect(map.get("hall_001").floor).toBe("Floor 1");
  });

  it("handles missing nodes array", () => {
    const map = mergeAllNodes({ rooms: sampleFloorData.rooms, pois: [] });
    expect(map.size).toBe(2);
  });

  it("handles missing rooms array", () => {
    const map = mergeAllNodes({ nodes: sampleFloorData.nodes, pois: [] });
    expect(map.size).toBe(2);
  });

  it("handles missing pois array", () => {
    const map = mergeAllNodes({ nodes: sampleFloorData.nodes, rooms: [] });
    expect(map.size).toBe(2);
  });

  it("handles completely empty floor data", () => {
    const map = mergeAllNodes({});
    expect(map.size).toBe(0);
  });

  it("defaults type to 'hallway' for nodes without type", () => {
    const map = mergeAllNodes({
      nodes: [{ id: "n1", x: 0, y: 0 }],
      rooms: [],
      pois: [],
    });
    expect(map.get("n1").type).toBe("hallway");
  });

  it("defaults type to 'room' for rooms without type", () => {
    const map = mergeAllNodes({
      nodes: [],
      rooms: [{ id: "r1", x: 0, y: 0 }],
      pois: [],
    });
    expect(map.get("r1").type).toBe("room");
  });

  it("defaults type to 'poi' for pois without type", () => {
    const map = mergeAllNodes({
      nodes: [],
      rooms: [],
      pois: [{ id: "p1", x: 0, y: 0 }],
    });
    expect(map.get("p1").type).toBe("poi");
  });

  it("defaults label to empty string when missing", () => {
    const map = mergeAllNodes({
      nodes: [{ id: "n1", x: 0, y: 0 }],
      rooms: [],
      pois: [],
    });
    expect(map.get("n1").label).toBe("");
  });
});

describe("buildGraph", () => {
  it("builds an adjacency list from floor data", () => {
    const { graph, nodes } = buildGraph(sampleFloorData);
    expect(nodes.size).toBe(6);
    expect(graph.size).toBe(6);
  });

  it("creates bidirectional edges", () => {
    const { graph } = buildGraph(sampleFloorData);
    // hall_001 -> hall_002 and hall_002 -> hall_001
    const hall001Edges = graph.get("hall_001");
    const hall002Edges = graph.get("hall_002");
    expect(hall001Edges.some((e) => e.to === "hall_002")).toBe(true);
    expect(hall002Edges.some((e) => e.to === "hall_001")).toBe(true);
  });

  it("uses provided weight for edges", () => {
    const { graph } = buildGraph(sampleFloorData);
    const edge = graph.get("hall_001").find((e) => e.to === "hall_002");
    expect(edge.weight).toBe(100);
  });

  it("computes Euclidean weight when weight is not provided", () => {
    const { graph } = buildGraph(sampleFloorData);
    // elev_001 (150,150) to hall_001 (100,100) → distance ~70.71
    const edge = graph.get("elev_001").find((e) => e.to === "hall_001");
    expect(edge.weight).toBeCloseTo(70.71, 1);
  });

  it("skips edges referencing non-existent nodes", () => {
    const data = {
      ...sampleFloorData,
      edges: [{ from: "hall_001", to: "nonexistent", weight: 10 }],
    };
    const { graph } = buildGraph(data);
    expect(graph.get("hall_001")).toEqual([]);
  });

  it("skips duplicate edges (same pair)", () => {
    const data = {
      ...sampleFloorData,
      edges: [
        { from: "hall_001", to: "hall_002", weight: 100 },
        { from: "hall_001", to: "hall_002", weight: 100 },
        { from: "hall_002", to: "hall_001", weight: 100 },
      ],
    };
    const { graph } = buildGraph(data);
    // Only one bidirectional pair should exist
    const forward = graph.get("hall_001").filter((e) => e.to === "hall_002");
    expect(forward.length).toBe(1);
  });

  it("handles empty edges array", () => {
    const data = { ...sampleFloorData, edges: [] };
    const { graph } = buildGraph(data);
    graph.forEach((edges) => expect(edges).toEqual([]));
  });

  it("handles missing edges property", () => {
    const data = {
      nodes: sampleFloorData.nodes,
      rooms: sampleFloorData.rooms,
      pois: sampleFloorData.pois,
    };
    const { graph } = buildGraph(data);
    graph.forEach((edges) => expect(edges).toEqual([]));
  });

  it("handles null weight as unset and computes Euclidean", () => {
    const data = {
      nodes: [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 3, y: 4 },
      ],
      rooms: [],
      pois: [],
      edges: [{ from: "a", to: "b", weight: null }],
    };
    const { graph } = buildGraph(data);
    const edge = graph.get("a").find((e) => e.to === "b");
    expect(edge.weight).toBe(5);
  });
});

describe("buildMultiFloorGraph", () => {
  const multiFloorData = {
    floors: {
      "F1": {
        label: "Floor 1",
        nodes: [{ id: "f1_h1", x: 0, y: 0 }],
        rooms: [{ id: "f1_r1", x: 10, y: 10, label: "101" }],
        pois: [],
        edges: [{ from: "f1_h1", to: "f1_r1", weight: 14 }],
      },
      "F2": {
        label: "Floor 2",
        nodes: [{ id: "f2_h1", x: 0, y: 0 }],
        rooms: [{ id: "f2_r1", x: 20, y: 20, label: "201" }],
        pois: [],
        edges: [{ from: "f2_h1", to: "f2_r1", weight: 28 }],
      },
    },
  };

  it("combines nodes from all floors", () => {
    const { nodes } = buildMultiFloorGraph(multiFloorData);
    expect(nodes.size).toBe(4); // 2 per floor
  });

  it("combines graph edges from all floors", () => {
    const { graph } = buildMultiFloorGraph(multiFloorData);
    expect(graph.has("f1_h1")).toBe(true);
    expect(graph.has("f2_h1")).toBe(true);
  });

  it("populates floorMap correctly", () => {
    const { floorMap } = buildMultiFloorGraph(multiFloorData);
    expect(floorMap.get("f1_h1")).toBe("F1");
    expect(floorMap.get("f2_r1")).toBe("F2");
  });

  it("returns empty structures when floorsData is null", () => {
    const { graph, nodes, floorMap } = buildMultiFloorGraph(null);
    expect(graph.size).toBe(0);
    expect(nodes.size).toBe(0);
    expect(floorMap.size).toBe(0);
  });

  it("returns empty structures when floorsData.floors is missing", () => {
    const { graph, nodes, floorMap } = buildMultiFloorGraph({});
    expect(graph.size).toBe(0);
    expect(nodes.size).toBe(0);
    expect(floorMap.size).toBe(0);
  });

  it("returns empty structures when floorsData.floors is empty", () => {
    const { graph } = buildMultiFloorGraph({ floors: {} });
    expect(graph.size).toBe(0);
  });
});

describe("getNodeFloor", () => {
  it("returns floor ID for a known node", () => {
    const floorMap = new Map([["node1", "F1"], ["node2", "F2"]]);
    expect(getNodeFloor("node1", floorMap)).toBe("F1");
  });

  it("returns null for an unknown node", () => {
    const floorMap = new Map([["node1", "F1"]]);
    expect(getNodeFloor("unknown", floorMap)).toBeNull();
  });

  it("returns null for an empty floorMap", () => {
    expect(getNodeFloor("any", new Map())).toBeNull();
  });
});

describe("isStairsNode", () => {
  const nodesMap = new Map([
    ["stairs_001", { id: "stairs_001", type: "stairs", x: 0, y: 0 }],
    ["elevator_001", { id: "elevator_001", type: "elevator", x: 10, y: 10 }],
    ["hall_001", { id: "hall_001", type: "hallway", x: 20, y: 20 }],
  ]);

  it("returns true for a stairs node", () => {
    expect(isStairsNode("stairs_001", nodesMap)).toBe(true);
  });

  it("returns false for an elevator node", () => {
    expect(isStairsNode("elevator_001", nodesMap)).toBe(false);
  });

  it("returns false for a hallway node", () => {
    expect(isStairsNode("hall_001", nodesMap)).toBe(false);
  });

  it("returns false for a non-existent node", () => {
    expect(isStairsNode("missing", nodesMap)).toBe(false);
  });
});

describe("isElevatorNode", () => {
  const nodesMap = new Map([
    ["stairs_001", { id: "stairs_001", type: "stairs", x: 0, y: 0 }],
    ["elevator_001", { id: "elevator_001", type: "elevator", x: 10, y: 10 }],
    ["hall_001", { id: "hall_001", type: "hallway", x: 20, y: 20 }],
  ]);

  it("returns true for an elevator node", () => {
    expect(isElevatorNode("elevator_001", nodesMap)).toBe(true);
  });

  it("returns false for a stairs node", () => {
    expect(isElevatorNode("stairs_001", nodesMap)).toBe(false);
  });

  it("returns false for a hallway node", () => {
    expect(isElevatorNode("hall_001", nodesMap)).toBe(false);
  });

  it("returns false for a non-existent node", () => {
    expect(isElevatorNode("missing", nodesMap)).toBe(false);
  });
});

describe("buildGraph edge accessibility tagging", () => {
  it("marks edges touching stairs as non-accessible", () => {
    const data = {
      nodes: [
        { id: "hall_001", type: "hallway", x: 0, y: 0 },
        { id: "stairs_001", type: "stairs", x: 10, y: 0 },
      ],
      rooms: [],
      pois: [],
      edges: [{ from: "hall_001", to: "stairs_001", weight: 10 }],
    };
    const { graph } = buildGraph(data);
    const edge = graph.get("hall_001").find((e) => e.to === "stairs_001");
    expect(edge.accessible).toBe(false);
  });

  it("marks edges between non-stairs nodes as accessible", () => {
    const data = {
      nodes: [
        { id: "hall_001", type: "hallway", x: 0, y: 0 },
        { id: "hall_002", type: "hallway", x: 10, y: 0 },
      ],
      rooms: [],
      pois: [],
      edges: [{ from: "hall_001", to: "hall_002", weight: 10 }],
    };
    const { graph } = buildGraph(data);
    const edge = graph.get("hall_001").find((e) => e.to === "hall_002");
    expect(edge.accessible).toBe(true);
  });

  it("marks edges touching elevator nodes as accessible", () => {
    const data = {
      nodes: [
        { id: "hall_001", type: "hallway", x: 0, y: 0 },
      ],
      rooms: [],
      pois: [
        { id: "elevator_001", type: "elevator", x: 10, y: 0 },
      ],
      edges: [{ from: "hall_001", to: "elevator_001", weight: 10 }],
    };
    const { graph } = buildGraph(data);
    const edge = graph.get("hall_001").find((e) => e.to === "elevator_001");
    expect(edge.accessible).toBe(true);
  });
});
