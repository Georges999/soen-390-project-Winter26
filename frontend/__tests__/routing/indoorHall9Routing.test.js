import { getFloorGraphData } from "../../src/data/indoorFloorData";
import { buildGraph } from "../../src/utils/pathfinding/graphBuilder";
import { findShortestPath } from "../../src/utils/pathfinding/pathfinding";

const HALL_BUILDING_ID = "hall";
const HALL_FLOOR_9_ID = "Hall-9";
const H937_LABEL = "H937";
const H921_LABEL = "H921";

function buildSingleFloorPayload(floorData) {
  return {
    floors: {
      [HALL_FLOOR_9_ID]: {
        label: "Hall Floor 9",
        nodes: floorData.nodes,
        rooms: floorData.rooms,
        pois: floorData.pois,
        edges: floorData.edges,
      },
    },
  };
}

describe("Indoor Hall-9 graph + routing core", () => {
  const hall9 = getFloorGraphData(HALL_BUILDING_ID, HALL_FLOOR_9_ID);
  const room937 = hall9.rooms.find((room) => room.label === H937_LABEL);
  const room921 = hall9.rooms.find((room) => room.label === H921_LABEL);

  it("defines clear node/edge types (rooms, hallway junctions, stairs, elevators)", () => {
    expect(hall9.rooms.length).toBeGreaterThan(0);
    expect(hall9.nodes.length).toBeGreaterThan(0);
    expect(hall9.edges.length).toBeGreaterThan(0);

    expect(hall9.rooms.every((room) => room.type === "classroom")).toBe(true);
    expect(hall9.nodes.every((node) => node.type === "hallway")).toBe(true);

    const poiTypes = new Set(hall9.pois.map((poi) => poi.type));
    expect(poiTypes.has("stairs")).toBe(true);
    expect(poiTypes.has("elevator")).toBe(true);
  });

  it("builds graph from dataset with no broken connections", () => {
    const allNodeIds = new Set([
      ...hall9.nodes.map((node) => node.id),
      ...hall9.rooms.map((room) => room.id),
      ...hall9.pois.map((poi) => poi.id),
    ]);

    const brokenEdges = hall9.edges.filter(
      (edge) => !allNodeIds.has(edge.from) || !allNodeIds.has(edge.to)
    );
    expect(brokenEdges).toEqual([]);

    const { graph, nodes } = buildGraph({
      label: "Hall Floor 9",
      nodes: hall9.nodes,
      rooms: hall9.rooms,
      pois: hall9.pois,
      edges: hall9.edges,
    });

    expect(nodes.size).toBe(allNodeIds.size);
    expect(graph.size).toBe(allNodeIds.size);
  });

  it("returns a valid shortest route when one exists (H937 -> H921)", () => {
    expect(room937).toBeDefined();
    expect(room921).toBeDefined();

    const result = findShortestPath({
      floorsData: buildSingleFloorPayload(hall9),
      startNodeId: room937.id,
      endNodeId: room921.id,
      algorithm: "astar",
    });

    expect(result.ok).toBe(true);
    expect(result.pathNodeIds[0]).toBe(room937.id);
    expect(result.pathNodeIds[result.pathNodeIds.length - 1]).toBe(room921.id);
    expect(result.totalWeight).toBeGreaterThan(0);
  });

  it("returns clear no-route result when route is impossible", () => {
    const disconnectedEdges = hall9.edges.filter(
      (edge) => edge.from !== room937.id && edge.to !== room937.id
    );

    const result = findShortestPath({
      floorsData: buildSingleFloorPayload({ ...hall9, edges: disconnectedEdges }),
      startNodeId: room937.id,
      endNodeId: room921.id,
      algorithm: "dijkstra",
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("no path found");
  });

  it("handles edge case when start and destination are the same", () => {
    const result = findShortestPath({
      floorsData: buildSingleFloorPayload(hall9),
      startNodeId: room937.id,
      endNodeId: room937.id,
    });

    expect(result.ok).toBe(true);
    expect(result.totalWeight).toBe(0);
    expect(result.pathNodeIds).toEqual([room937.id]);
  });
});
