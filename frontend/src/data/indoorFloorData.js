/**
 * Indoor floor data built from exported JSON mapping files.
 * This module is the source for indoor routing graph, floor rooms, and POIs.
 */

import { formatRoomLabel, normalizeRoomLabel, getRoomAliases } from "./indoorRoomHighlightData";

const hallMappings = require("../../../Floor_Mapping/indoor/Json_Files/Hall9thMapping.json");
const mbFloor1Mapping = require("../../../Floor_Mapping/indoor/Json_Files/floorplan-MP1.json");
const mbBasementMapping = require("../../../Floor_Mapping/indoor/Json_Files/floorplan-MBS2.json");
const loyolaMappings = require("../../../Floor_Mapping/indoor/Json_Files/VLF2-Floor-Plan.json");

const DEFAULT_DIMENSION = 1000;
const CAMPUSES = ["sgw", "loyola"];

const floorImages = {
  "Hall-8": require("../../assets/floor-maps/Hall-8-F.png"),
  "Hall-9": require("../../assets/floor-maps/Hall-9-F.png"),
  "MB-1": require("../../assets/floor-maps/MB-1.png"),
  "MB-S2": require("../../assets/floor-maps/MB-S2.png"),
  "VE-2": require("../../assets/floor-maps/VE-2-F.png"),
  "VL-1": require("../../assets/floor-maps/VL-1-F.png"),
  "VL-2": require("../../assets/floor-maps/VL-2-F.png"),
};

const FLOOR_ID_ALIASES = {
  "Hall-8": "Hall-8",
  "Hall-9": "Hall-9",
  "MB-1-annotated": "MB-1",
  "MB-S2-copy": "MB-S2",
  "VL-1-annotated": "VL-1",
  "VL-2-annotated": "VL-2",
  "VE-2-annotated": "VE-2",
};

const FLOOR_META = {
  "Hall-8": { campus: "sgw", buildingId: "hall", floorLabel: "8", floorNumber: 8 },
  "Hall-9": { campus: "sgw", buildingId: "hall", floorLabel: "9", floorNumber: 9 },
  "MB-S2": { campus: "sgw", buildingId: "mb", floorLabel: "S2", floorNumber: -2 },
  "MB-1": { campus: "sgw", buildingId: "mb", floorLabel: "1", floorNumber: 1 },
  "VL-1": { campus: "loyola", buildingId: "vl", floorLabel: "1", floorNumber: 1 },
  "VL-2": { campus: "loyola", buildingId: "vl", floorLabel: "2", floorNumber: 2 },
  "VE-2": { campus: "loyola", buildingId: "ve", floorLabel: "2", floorNumber: 2 },
};

const BUILDING_META = {
  hall: { id: "hall", label: "H", name: "Hall Building", campus: "sgw", floors: ["Hall-8", "Hall-9"] },
  mb: { id: "mb", label: "MB", name: "John Molson Building", campus: "sgw", floors: ["MB-S2", "MB-1"] },
  vl: { id: "vl", label: "VL", name: "Vanier Library", campus: "loyola", floors: ["VL-1", "VL-2"] },
  ve: { id: "ve", label: "VE", name: "Vanier Extension", campus: "loyola", floors: ["VE-2"] },
};

const MAPPING_SOURCES = [hallMappings, mbFloor1Mapping, mbBasementMapping, loyolaMappings];

function toNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildRoomSearchKeys(floorId, roomId, rawLabel, displayLabel) {
  return [
    normalizeRoomLabel(rawLabel),
    normalizeRoomLabel(displayLabel),
    normalizeRoomLabel(formatRoomLabel(floorId, rawLabel)),
    normalizeRoomLabel(roomId),
    ...getRoomAliases(floorId, rawLabel),
  ].filter(Boolean);
}

function normalizeNode(node, floorId, fallbackType) {
  const x = toNumber(node?.x);
  const y = toNumber(node?.y);
  if (!node?.id || x === null || y === null) return null;

  return {
    id: String(node.id),
    x,
    y,
    type: node.type || fallbackType,
    label: node.label || "",
    floor: floorId,
  };
}

function normalizeRoom(room, floorId) {
  const normalizedRoom = normalizeNode(room, floorId, "classroom");
  if (!normalizedRoom) return null;

  const rawLabel = String(room.label || "").trim();
  const displayLabel = formatRoomLabel(floorId, rawLabel);

  return {
    ...normalizedRoom,
    label: displayLabel,
    rawLabel,
    searchKeys: buildRoomSearchKeys(floorId, normalizedRoom.id, rawLabel, displayLabel),
  };
}

function normalizeEdge(edge) {
  if (!edge?.from || !edge?.to) return null;
  const weight = typeof edge.weight === "number" && Number.isFinite(edge.weight) ? edge.weight : 1;

  return {
    from: String(edge.from),
    to: String(edge.to),
    weight,
  };
}

function initializeFloorRecord(floorId, floorData) {
  return {
    id: floorId,
    label: FLOOR_META[floorId]?.floorLabel || String(floorData?.label || floorId),
    width: toNumber(floorData?.width) || DEFAULT_DIMENSION,
    height: toNumber(floorData?.height) || DEFAULT_DIMENSION,
    nodes: [],
    rooms: [],
    pois: [],
    edges: [],
  };
}

const floorGraphDataById = MAPPING_SOURCES.reduce((accumulator, source) => {
  const floors = source?.floors ?? {};

  Object.entries(floors).forEach(([rawFloorId, floorData]) => {
    const floorId = FLOOR_ID_ALIASES[rawFloorId];
    if (!floorId || !FLOOR_META[floorId]) return;

    if (!accumulator[floorId]) {
      accumulator[floorId] = initializeFloorRecord(floorId, floorData);
    }

    const record = accumulator[floorId];
    const seenNodes = new Set(record.nodes.map((node) => node.id));
    const seenRooms = new Set(record.rooms.map((room) => room.id));
    const seenPois = new Set(record.pois.map((poi) => poi.id));
    const seenEdges = new Set(record.edges.map((edge) => `${edge.from}::${edge.to}::${edge.weight}`));

    (floorData?.nodes ?? []).forEach((node) => {
      const normalizedNode = normalizeNode(node, floorId, "hallway");
      if (normalizedNode && !seenNodes.has(normalizedNode.id)) {
        record.nodes.push(normalizedNode);
        seenNodes.add(normalizedNode.id);
      }
    });

    (floorData?.rooms ?? []).forEach((room) => {
      const normalizedRoom = normalizeRoom(room, floorId);
      if (normalizedRoom && !seenRooms.has(normalizedRoom.id)) {
        record.rooms.push(normalizedRoom);
        seenRooms.add(normalizedRoom.id);
      }
    });

    (floorData?.pois ?? []).forEach((poi) => {
      const normalizedPoi = normalizeNode(poi, floorId, "poi");
      if (normalizedPoi && !seenPois.has(normalizedPoi.id)) {
        record.pois.push(normalizedPoi);
        seenPois.add(normalizedPoi.id);
      }
    });

    (floorData?.edges ?? []).forEach((edge) => {
      const normalizedEdge = normalizeEdge(edge);
      if (!normalizedEdge) return;
      const edgeKey = `${normalizedEdge.from}::${normalizedEdge.to}::${normalizedEdge.weight}`;
      if (!seenEdges.has(edgeKey)) {
        record.edges.push(normalizedEdge);
        seenEdges.add(edgeKey);
      }
    });
  });

  return accumulator;
}, {});

function createFloor(floorId) {
  const floorData = floorGraphDataById[floorId] || initializeFloorRecord(floorId, {});
  const meta = FLOOR_META[floorId];

  return {
    id: floorId,
    label: meta?.floorLabel || floorData.label,
    floorNumber: meta?.floorNumber ?? 0,
    image: floorImages[floorId],
    nodes: floorData.nodes,
    pois: floorData.pois,
    edges: floorData.edges,
    width: floorData.width,
    height: floorData.height,
  };
}

function createBuildingRooms(floorIds) {
  return floorIds.flatMap((floorId) =>
    (floorGraphDataById[floorId]?.rooms || []).map((room) => ({ ...room, floor: floorId }))
  );
}

function createBuilding(building) {
  return {
    id: building.id,
    label: building.label,
    name: building.name,
    floors: building.floors.map((floorId) => createFloor(floorId)),
    rooms: createBuildingRooms(building.floors),
  };
}

const buildings = {
  sgw: [createBuilding(BUILDING_META.hall), createBuilding(BUILDING_META.mb)],
  loyola: [createBuilding(BUILDING_META.vl), createBuilding(BUILDING_META.ve)],
};

function getBuildingById(buildingId) {
  for (const campus of CAMPUSES) {
    const building = (buildings[campus] || []).find((candidate) => candidate.id === buildingId);
    if (building) return building;
  }
  return null;
}

function getDefaultFloorData() {
  return {
    nodes: [],
    rooms: [],
    pois: [],
    edges: [],
    width: DEFAULT_DIMENSION,
    height: DEFAULT_DIMENSION,
  };
}

const getFloorGraphData = (buildingId, floorId) => {
  if (!buildingId || !floorId) return getDefaultFloorData();

  const building = getBuildingById(buildingId);
  const floor = building?.floors?.find((candidate) => candidate.id === floorId);
  const floorData = floorGraphDataById[floorId];

  if (!building || !floor || !floorData) return getDefaultFloorData();

  return {
    nodes: floorData.nodes,
    rooms: floorData.rooms,
    pois: floorData.pois,
    edges: floorData.edges,
    width: floorData.width,
    height: floorData.height,
  };
};

const getRoomsForFloor = (floorId) => {
  if (!floorId) return [];

  for (const campus of CAMPUSES) {
    for (const building of buildings[campus] || []) {
      const rooms = (building.rooms || []).filter((room) => room.floor === floorId);
      if (rooms.length > 0) {
        return rooms.map((room) => ({
          ...room,
          buildingId: building.id,
          buildingName: building.name,
        }));
      }
    }
  }

  return [];
};

const getAllNodesForFloor = (floorId) => {
  if (!floorId) return [];

  const floorData = floorGraphDataById[floorId];
  if (!floorData) return [];

  return [...floorData.nodes, ...floorData.rooms, ...floorData.pois];
};

const POI_ICONS = {
  washroom: { icon: "wc", label: "Washroom" },
  water: { icon: "water-drop", label: "Water" },
  stairs: { icon: "stairs", label: "Stairs" },
  elevator: { icon: "elevator", label: "Elevator" },
  escalator: { icon: "escalator", label: "Escalator" },
  metro: { icon: "subway", label: "Metro" },
};

export {
  buildings,
  floorImages,
  POI_ICONS,
  getFloorGraphData,
  getRoomsForFloor,
  getAllNodesForFloor,
};
export default buildings;
