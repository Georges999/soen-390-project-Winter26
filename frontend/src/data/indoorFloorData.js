/**
 * Indoor floor data for buildings with available floor maps.
 * Each building maps to its campus, available floors, and floor plan images.
 *
 * Floor map images are stored in /assets/floor-maps/
 */

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

const FLOOR_GRAPH_DATA = {
  "Hall-8": {
    width: 1000,
    height: 800,
    nodes: [
      { id: "Hall8_hall_1", type: "hallway", x: 130, y: 210, label: "" },
      { id: "Hall8_hall_2", type: "hallway", x: 340, y: 210, label: "" },
      { id: "Hall8_hall_3", type: "hallway", x: 560, y: 210, label: "" },
    ],
    rooms: [
      { id: "Hall8_classroom_002", type: "classroom", x: 120, y: 150, label: "H-837" },
      { id: "Hall8_classroom_005", type: "classroom", x: 560, y: 150, label: "H-861" },
    ],
    pois: [
      { id: "Hall8_elevator_1", type: "elevator", x: 340, y: 250, label: "Elevator" },
      { id: "Hall8_washroom_1", type: "washroom", x: 520, y: 250, label: "Washroom" },
    ],
    edges: [
      { from: "Hall8_classroom_002", to: "Hall8_hall_1", weight: 70 },
      { from: "Hall8_hall_1", to: "Hall8_hall_2", weight: 210 },
      { from: "Hall8_hall_2", to: "Hall8_hall_3", weight: 220 },
      { from: "Hall8_hall_3", to: "Hall8_classroom_005", weight: 70 },
      { from: "Hall8_elevator_1", to: "Hall8_hall_2", weight: 50 },
      { from: "Hall8_washroom_1", to: "Hall8_hall_3", weight: 40 },
    ],
  },
  "Hall-9": {
    width: 1000,
    height: 800,
    nodes: [
      { id: "Hall9_hall_1", type: "hallway", x: 140, y: 210, label: "" },
      { id: "Hall9_hall_2", type: "hallway", x: 430, y: 210, label: "" },
    ],
    rooms: [
      { id: "Hall9_classroom_001", type: "classroom", x: 120, y: 145, label: "H-937" },
      { id: "Hall9_classroom_002", type: "classroom", x: 430, y: 145, label: "H-920" },
    ],
    pois: [{ id: "Hall9_stairs_1", type: "stairs", x: 320, y: 250, label: "Stairs" }],
    edges: [
      { from: "Hall9_classroom_001", to: "Hall9_hall_1", weight: 70 },
      { from: "Hall9_hall_1", to: "Hall9_hall_2", weight: 290 },
      { from: "Hall9_hall_2", to: "Hall9_classroom_002", weight: 65 },
      { from: "Hall9_stairs_1", to: "Hall9_hall_2", weight: 40 },
    ],
  },
  "MB-S2": {
    width: 900,
    height: 800,
    nodes: [{ id: "MBS2_hall_1", type: "hallway", x: 260, y: 220, label: "" }],
    rooms: [{ id: "MBS2_room_210", type: "classroom", x: 260, y: 140, label: "MB S2.210" }],
    pois: [{ id: "MBS2_elevator_1", type: "elevator", x: 320, y: 250, label: "Elevator" }],
    edges: [
      { from: "MBS2_room_210", to: "MBS2_hall_1", weight: 80 },
      { from: "MBS2_elevator_1", to: "MBS2_hall_1", weight: 60 },
    ],
  },
  "MB-1": {
    width: 900,
    height: 800,
    nodes: [{ id: "MB1_hall_1", type: "hallway", x: 260, y: 220, label: "" }],
    rooms: [{ id: "MB1_room_210", type: "classroom", x: 260, y: 140, label: "MB 1.210" }],
    pois: [{ id: "MB1_water_1", type: "water", x: 320, y: 250, label: "Water" }],
    edges: [
      { from: "MB1_room_210", to: "MB1_hall_1", weight: 80 },
      { from: "MB1_water_1", to: "MB1_hall_1", weight: 60 },
    ],
  },
  "VL-1": {
    width: 900,
    height: 700,
    nodes: [{ id: "VL1_hall_1", type: "hallway", x: 250, y: 200, label: "" }],
    rooms: [{ id: "VL1_room_101", type: "classroom", x: 250, y: 130, label: "VL-101" }],
    pois: [],
    edges: [{ from: "VL1_room_101", to: "VL1_hall_1", weight: 70 }],
  },
  "VL-2": {
    width: 900,
    height: 700,
    nodes: [{ id: "VL2_hall_1", type: "hallway", x: 250, y: 200, label: "" }],
    rooms: [{ id: "VL2_room_201", type: "classroom", x: 250, y: 130, label: "VL-201" }],
    pois: [{ id: "VL2_escalator_1", type: "escalator", x: 310, y: 240, label: "Escalator" }],
    edges: [
      { from: "VL2_room_201", to: "VL2_hall_1", weight: 70 },
      { from: "VL2_escalator_1", to: "VL2_hall_1", weight: 45 },
    ],
  },
  "VE-2": {
    width: 800,
    height: 700,
    nodes: [{ id: "VE2_hall_1", type: "hallway", x: 220, y: 180, label: "" }],
    rooms: [{ id: "VE2_room_201", type: "classroom", x: 220, y: 120, label: "VE-201" }],
    pois: [{ id: "VE2_metro_1", type: "metro", x: 290, y: 220, label: "Metro" }],
    edges: [
      { from: "VE2_room_201", to: "VE2_hall_1", weight: 60 },
      { from: "VE2_metro_1", to: "VE2_hall_1", weight: 50 },
    ],
  },
};

function getFloorDataset(floorId) {
  return FLOOR_GRAPH_DATA[floorId] || {
    nodes: [],
    rooms: [],
    pois: [],
    edges: [],
    width: DEFAULT_DIMENSION,
    height: DEFAULT_DIMENSION,
  };
}

function createFloor(floorId, label, floorNumber) {
  const floorData = getFloorDataset(floorId);
  return {
    id: floorId,
    label,
    floorNumber,
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
    getFloorDataset(floorId).rooms.map((room) => ({ ...room, floor: floorId }))
  );
}

const buildings = {
  sgw: [
    {
      id: "hall",
      label: "H",
      name: "Hall Building",
      floors: [createFloor("Hall-8", "8", 8), createFloor("Hall-9", "9", 9)],
      rooms: createBuildingRooms(["Hall-8", "Hall-9"]),
    },
    {
      id: "mb",
      label: "MB",
      name: "John Molson Building",
      floors: [createFloor("MB-S2", "S2", -2), createFloor("MB-1", "1", 1)],
      rooms: createBuildingRooms(["MB-S2", "MB-1"]),
    },
  ],
  loyola: [
    {
      id: "vl",
      label: "VL",
      name: "Vanier Library",
      floors: [createFloor("VL-1", "1", 1), createFloor("VL-2", "2", 2)],
      rooms: createBuildingRooms(["VL-1", "VL-2"]),
    },
    {
      id: "ve",
      label: "VE",
      name: "Vanier Extension",
      floors: [createFloor("VE-2", "2", 2)],
      rooms: createBuildingRooms(["VE-2"]),
    },
  ],
};

function getBuildingById(buildingId) {
  for (const campus of CAMPUSES) {
    const building = (buildings[campus] || []).find((candidate) => candidate.id === buildingId);
    if (building) return building;
  }
  return null;
}

const getFloorGraphData = (buildingId, floorId) => {
  if (!buildingId || !floorId) {
    return { nodes: [], rooms: [], pois: [], edges: [], width: DEFAULT_DIMENSION, height: DEFAULT_DIMENSION };
  }

  const building = getBuildingById(buildingId);
  const floor = building?.floors?.find((candidate) => candidate.id === floorId);

  if (!building || !floor) {
    return { nodes: [], rooms: [], pois: [], edges: [], width: DEFAULT_DIMENSION, height: DEFAULT_DIMENSION };
  }

  return {
    nodes: floor.nodes || [],
    rooms: (building.rooms || []).filter((room) => room.floor === floorId),
    pois: floor.pois || [],
    edges: floor.edges || [],
    width: floor.width || DEFAULT_DIMENSION,
    height: floor.height || DEFAULT_DIMENSION,
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

  for (const campus of CAMPUSES) {
    for (const building of buildings[campus] || []) {
      const floor = (building.floors || []).find((candidate) => candidate.id === floorId);
      if (floor) {
        const rooms = (building.rooms || []).filter((room) => room.floor === floorId);
        return [...(floor.nodes || []), ...rooms, ...(floor.pois || [])];
      }
    }
  }
  return [];
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
