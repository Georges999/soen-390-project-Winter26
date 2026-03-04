/**
 * Indoor floor data for buildings with available floor maps.
 * Each building maps to its campus, available floors, and the floor plan images.
 *
 * Floor map images are stored in /assets/floor-maps/
 */

import { getRoomsForFloor } from "./indoorRoomHighlightData";

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

/**
 * Building definitions with campus association and available floors.
 * `rooms` will be populated later with coordinate data from the JSON mapping files.
 */
const buildings = {
  sgw: [
    {
      id: "hall",
      label: "H",
      name: "Hall Building",
      floors: [
        { id: "Hall-8", label: "8", floorNumber: 8, image: floorImages["Hall-8"] },
        { id: "Hall-9", label: "9", floorNumber: 9, image: floorImages["Hall-9"] },
      ],
      rooms: [...getRoomsForFloor("Hall-8"), ...getRoomsForFloor("Hall-9")],
    },
    {
      id: "mb",
      label: "MB",
      name: "John Molson Building",
      floors: [
        { id: "MB-S2", label: "S2", floorNumber: -2, image: floorImages["MB-S2"] },
        { id: "MB-1", label: "1", floorNumber: 1, image: floorImages["MB-1"] },
      ],
      rooms: [...getRoomsForFloor("MB-S2"), ...getRoomsForFloor("MB-1")],
    },
  ],
  loyola: [
    {
      id: "vl",
      label: "VL",
      name: "Vanier Library",
      floors: [
        { id: "VL-1", label: "1", floorNumber: 1, image: floorImages["VL-1"] },
        { id: "VL-2", label: "2", floorNumber: 2, image: floorImages["VL-2"] },
      ],
      rooms: [...getRoomsForFloor("VL-1"), ...getRoomsForFloor("VL-2")],
    },
    {
      id: "ve",
      label: "VE",
      name: "Vanier Extension",
      floors: [
        { id: "VE-2", label: "2", floorNumber: 2, image: floorImages["VE-2"] },
      ],
      rooms: getRoomsForFloor("VE-2"),
    },
  ],
};

/** POI types and their vector icons for floor plan legend */
const POI_ICONS = {
  washroom: { icon: "wc", label: "Washroom" },
  water: { icon: "water-drop", label: "Water" },
  stairs: { icon: "stairs", label: "Stairs" },
  elevator: { icon: "elevator", label: "Elevator" },
};

export { buildings, floorImages, POI_ICONS };
export default buildings;
