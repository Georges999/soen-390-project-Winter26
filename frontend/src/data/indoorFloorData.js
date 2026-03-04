/**
 * Indoor floor data for buildings with available floor maps.
 * Each building maps to its campus, available floors, and the floor plan images.
 * Includes node/edge data for pathfinding from JSON mapping files.
 *
 * Floor map images are stored in /assets/floor-maps/
 */

// Static requires for floor map images (React Native requires static requires)
const floorImages = {
  "Hall-8": require("../../assets/floor-maps/Hall-8-F.png"),
  "Hall-9": require("../../assets/floor-maps/Hall-9-F.png"),
  "MB-1": require("../../assets/floor-maps/MB-1.png"),
  "MB-S2": require("../../assets/floor-maps/MB-S2.png"),
  "VE-2": require("../../assets/floor-maps/VE-2-F.png"),
  "VL-1": require("../../assets/floor-maps/VL-1-F.png"),
  "VL-2": require("../../assets/floor-maps/VL-2-F.png"),
};

// Import floor mapping JSON data from assets folder
const MBS2FloorData = require("../../assets/floor-data/floorplan-MBS2.json");
const MB1FloorData = require("../../assets/floor-data/floorplan-MP1.json");
const Hall8FloorData = require("../../assets/floor-data/Hall8thMapping.json");
const Hall9FloorData = require("../../assets/floor-data/Hall9thMapping.json");
const VL1FloorData = require("../../assets/floor-data/VLF1-Floor-Plan.json");
const VL2FloorData = require("../../assets/floor-data/VLF2-Floor-Plan.json");
const VE2FloorData = require("../../assets/floor-data/VE2-Floor-Plan.json");

/**
 * Extract floor data from JSON mapping files
 * @param {Object} jsonData - The imported JSON floor data
 * @param {string} floorKey - The key to look for in the floors object
 * @returns {Object} Extracted floor data with nodes, rooms, pois, edges
 */
const extractFloorData = (jsonData, floorKey) => {
  if (!jsonData?.floors) return { nodes: [], rooms: [], pois: [], edges: [], width: 1000, height: 1000 };
  
  // Find the floor data - try exact key first, then search for partial match
  let floorData = jsonData.floors[floorKey];
  if (!floorData) {
    // Search for a key that contains the floorKey or vice versa
    const keys = Object.keys(jsonData.floors);
    const matchingKey = keys.find(k => k.includes(floorKey) || floorKey.includes(k) || k.toLowerCase().includes(floorKey.toLowerCase()));
    if (matchingKey) {
      floorData = jsonData.floors[matchingKey];
    }
  }
  
  if (!floorData) {
    // Just get the first floor if nothing matches
    const keys = Object.keys(jsonData.floors);
    if (keys.length > 0) {
      floorData = jsonData.floors[keys[0]];
    }
  }
  
  if (!floorData) return { nodes: [], rooms: [], pois: [], edges: [], width: 1000, height: 1000 };
  
  return {
    nodes: floorData.nodes || [],
    rooms: floorData.rooms || [],
    pois: floorData.pois || [],
    edges: floorData.edges || [],
    width: floorData.width || 1000,
    height: floorData.height || 1000
  };
};

// Extract floor data from JSON files
const mbS2Data = extractFloorData(MBS2FloorData, 'MB-S2');
const mb1Data = extractFloorData(MB1FloorData, 'MB-1');
const hall8Data = extractFloorData(Hall8FloorData, 'Hall-8');
const hall9Data = extractFloorData(Hall9FloorData, 'Hall-9');
const vl1Data = extractFloorData(VL1FloorData, 'VL-1');
const vl2Data = extractFloorData(VL2FloorData, 'VL-2');
const ve2Data = extractFloorData(VE2FloorData, 'VE-2');

/**
 * Building definitions with campus association and available floors.
 * Now includes coordinate data from the JSON mapping files for pathfinding.
 */
const buildings = {
  sgw: [
    {
      id: "hall",
      label: "H",
      name: "Hall Building",
      floors: [
        { 
          id: "Hall-8", 
          label: "8", 
          floorNumber: 8, 
          image: floorImages["Hall-8"],
          nodes: hall8Data.nodes,
          pois: hall8Data.pois,
          edges: hall8Data.edges,
          width: hall8Data.width,
          height: hall8Data.height
        },
        { 
          id: "Hall-9", 
          label: "9", 
          floorNumber: 9, 
          image: floorImages["Hall-9"],
          nodes: hall9Data.nodes,
          pois: hall9Data.pois,
          edges: hall9Data.edges,
          width: hall9Data.width,
          height: hall9Data.height
        },
      ],
      // Rooms with coordinates from JSON data
      rooms: [
        ...hall8Data.rooms.map(room => ({ ...room, floor: "Hall-8" })),
        ...hall9Data.rooms.map(room => ({ ...room, floor: "Hall-9" })),
      ],
    },
    {
      id: "mb",
      label: "MB",
      name: "John Molson Building",
      floors: [
        { 
          id: "MB-S2", 
          label: "S2", 
          floorNumber: -2, 
          image: floorImages["MB-S2"],
          nodes: mbS2Data.nodes,
          pois: mbS2Data.pois,
          edges: mbS2Data.edges,
          width: mbS2Data.width,
          height: mbS2Data.height
        },
        { 
          id: "MB-1", 
          label: "1", 
          floorNumber: 1, 
          image: floorImages["MB-1"],
          nodes: mb1Data.nodes,
          pois: mb1Data.pois,
          edges: mb1Data.edges,
          width: mb1Data.width,
          height: mb1Data.height
        },
      ],
      // Rooms with coordinates from JSON data
      rooms: [
        ...mbS2Data.rooms.map(room => ({ ...room, floor: "MB-S2" })),
        ...mb1Data.rooms.map(room => ({ ...room, floor: "MB-1" })),
      ],
    },
  ],
  loyola: [
    {
      id: "vl",
      label: "VL",
      name: "Vanier Library",
      floors: [
        { 
          id: "VL-1", 
          label: "1", 
          floorNumber: 1, 
          image: floorImages["VL-1"],
          nodes: vl1Data.nodes,
          pois: vl1Data.pois,
          edges: vl1Data.edges,
          width: vl1Data.width,
          height: vl1Data.height
        },
        { 
          id: "VL-2", 
          label: "2", 
          floorNumber: 2, 
          image: floorImages["VL-2"],
          nodes: vl2Data.nodes,
          pois: vl2Data.pois,
          edges: vl2Data.edges,
          width: vl2Data.width,
          height: vl2Data.height
        },
      ],
      rooms: [
        ...vl1Data.rooms.map(room => ({ ...room, floor: "VL-1" })),
        ...vl2Data.rooms.map(room => ({ ...room, floor: "VL-2" })),
      ],
    },
    {
      id: "ve",
      label: "VE",
      name: "Vanier Extension",
      floors: [
        { 
          id: "VE-2", 
          label: "2", 
          floorNumber: 2, 
          image: floorImages["VE-2"],
          nodes: ve2Data.nodes,
          pois: ve2Data.pois,
          edges: ve2Data.edges,
          width: ve2Data.width,
          height: ve2Data.height
        },
      ],
      rooms: [
        ...ve2Data.rooms.map(room => ({ ...room, floor: "VE-2" })),
      ],
    },
  ],
};

/**
 * Get floor data for pathfinding
 * @param {string} buildingId - Building identifier
 * @param {string} floorId - Floor identifier
 * @returns {Object} Floor data with nodes, rooms, pois, edges
 */
const getFloorGraphData = (buildingId, floorId) => {
  // Search all campuses for the building
  for (const campus of ['sgw', 'loyola']) {
    const building = buildings[campus]?.find(b => b.id === buildingId);
    if (building) {
      const floor = building.floors.find(f => f.id === floorId);
      if (floor) {
        return {
          nodes: floor.nodes || [],
          rooms: building.rooms.filter(r => r.floor === floorId),
          pois: floor.pois || [],
          edges: floor.edges || [],
          width: floor.width || 1000,
          height: floor.height || 1000
        };
      }
    }
  }
  return { nodes: [], rooms: [], pois: [], edges: [], width: 1000, height: 1000 };
};

/**
 * Get all rooms for a specific floor
 * @param {string} floorId - Floor identifier
 * @returns {Array} Array of rooms with coordinates
 */
const getRoomsForFloor = (floorId) => {
  for (const campus of ['sgw', 'loyola']) {
    for (const building of buildings[campus] || []) {
      const rooms = building.rooms.filter(r => r.floor === floorId);
      if (rooms.length > 0) {
        return rooms.map(room => ({
          ...room,
          buildingId: building.id,
          buildingName: building.name
        }));
      }
    }
  }
  return [];
};

/**
 * Get all nodes (hallways + rooms + pois) for a floor - used for pathfinding
 * @param {string} floorId - Floor identifier
 * @returns {Array} Array of all nodes
 */
const getAllNodesForFloor = (floorId) => {
  for (const campus of ['sgw', 'loyola']) {
    for (const building of buildings[campus] || []) {
      const floor = building.floors.find(f => f.id === floorId);
      if (floor) {
        const nodes = floor.nodes || [];
        const rooms = building.rooms.filter(r => r.floor === floorId);
        const pois = floor.pois || [];
        return [...nodes, ...rooms, ...pois];
      }
    }
  }
  return [];
};

/** POI types and their vector icons for floor plan legend */
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
  getAllNodesForFloor 
};
export default buildings;
