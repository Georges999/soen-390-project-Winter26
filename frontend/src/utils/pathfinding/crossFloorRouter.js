/**
 * Cross-Floor & Cross-Building Route Resolution
 *
 * Resolves indoor navigation into ordered route segments when the
 * start and destination are on different floors or in different buildings.
 *
 * Segment types:
 *   "indoor"   – walk within a single floor (same-floor pathfinding)
 *   "vertical" – transition between floors (stairs / elevator)
 *   "outdoor"  – walk between buildings (delegates to existing outdoor nav)
 *
 * The resolver never performs pathfinding itself; it only determines
 * *what* segments are needed so the UI layer can orchestrate them.
 */

import {
  FLOOR_META,
  BUILDING_META,
  getAllNodesForFloor,
} from "../../data/indoorFloorData";

// Explicit building entry floors used for cross-building handoff.
// This avoids treating basements as the default arrival floor.
const ENTRY_FLOOR_BY_BUILDING = {
  hall: "Hall-1",
  mb: "MB-1",
  cc: "CC-1",
  vl: "VL-1",
  ve: "VE-2",
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Look up which building a room belongs to, based on its floor.
 * Returns { buildingId, campus } or null.
 */
export function getBuildingForFloor(floorId) {
  const meta = FLOOR_META[floorId];
  if (!meta) return null;
  return { buildingId: meta.buildingId, campus: meta.campus };
}

/**
 * Find vertical-transition POIs (stairs / elevator) on a given floor.
 * Returns { stairs: [...], elevators: [...] } with node objects.
 */
export function getVerticalTransitionNodes(floorId) {
  const allNodes = getAllNodesForFloor(floorId);
  return {
    stairs: allNodes.filter((n) => n.type === "stairs"),
    elevators: allNodes.filter((n) => n.type === "elevator"),
  };
}

function getTransitionNodesByType(floorId, transitionType) {
  const { stairs, elevators } = getVerticalTransitionNodes(floorId);
  return transitionType === "elevator" ? elevators : stairs;
}

function distanceBetweenPoints(pointA, pointB) {
  if (!pointA || !pointB) return 0;
  return Math.hypot((pointA.x || 0) - (pointB.x || 0), (pointA.y || 0) - (pointB.y || 0));
}

function getPairCost(startNode, endNode, startAnchor, destAnchor) {
  const startCost = distanceBetweenPoints(startAnchor, startNode);
  const destinationCost = distanceBetweenPoints(destAnchor, endNode);
  const alignmentCost = distanceBetweenPoints(startNode, endNode);

  return startCost + destinationCost + alignmentCost * 1.5;
}

/**
 * Choose a consistent transition pair between two floors.
 *
 * Prioritizes the requested transition type and selects the pair that best
 * lines up across floors while staying close to the start and destination.
 */
export function pickTransitionPair(
  startFloorId,
  destFloorId,
  preference = "stairs",
  startAnchor = null,
  destAnchor = null
) {
  const preferredTypes = preference === "elevator"
    ? ["elevator", "stairs"]
    : ["stairs", "elevator"];

  for (const transitionType of preferredTypes) {
    const startNodes = getTransitionNodesByType(startFloorId, transitionType);
    const destNodes = getTransitionNodesByType(destFloorId, transitionType);

    if (!startNodes.length || !destNodes.length) {
      continue;
    }

    let bestPair = null;
    let bestCost = Infinity;

    startNodes.forEach((startNode) => {
      destNodes.forEach((endNode) => {
        const pairCost = getPairCost(startNode, endNode, startAnchor, destAnchor);
        if (pairCost < bestCost) {
          bestCost = pairCost;
          bestPair = {
            transitionType,
            startNode,
            endNode,
          };
        }
      });
    });

    if (bestPair) {
      return bestPair;
    }
  }

  const fallbackStartNode = pickTransitionNode(startFloorId, preference);
  const fallbackEndNode = pickTransitionNode(destFloorId, preference);

  if (!fallbackStartNode && !fallbackEndNode) {
    return null;
  }

  return {
    transitionType:
      fallbackStartNode?.type ||
      fallbackEndNode?.type ||
      preference,
    startNode: fallbackStartNode,
    endNode: fallbackEndNode,
  };
}

/**
 * Pick the best vertical-transition node on `floorId` for the given
 * preference ("stairs" | "elevator").
 *
 * Strategy: choose the first available node of the preferred type.
 * If that type is absent, fall back to the other type.
 * Returns null only when *no* transition node exists.
 */
export function pickTransitionNode(floorId, preference = "stairs") {
  const { stairs, elevators } = getVerticalTransitionNodes(floorId);

  if (preference === "elevator") {
    return elevators[0] || stairs[0] || null;
  }
  return stairs[0] || elevators[0] || null;
}

/**
 * Get the entry floor for a building used by cross-building routing.
 * Prefers explicit entry-floor mapping, then falls back to lowest floorNumber.
 */
export function getGroundFloor(buildingId) {
  const meta = BUILDING_META[buildingId];
  if (!meta) return null;

  const mappedEntryFloor = ENTRY_FLOOR_BY_BUILDING[buildingId];
  if (mappedEntryFloor && meta.floors.includes(mappedEntryFloor)) {
    return mappedEntryFloor;
  }

  let groundFloorId = null;
  let lowestNumber = Infinity;

  for (const fId of meta.floors) {
    const fMeta = FLOOR_META[fId];
    if (fMeta && fMeta.floorNumber < lowestNumber) {
      lowestNumber = fMeta.floorNumber;
      groundFloorId = fId;
    }
  }
  return groundFloorId;
}

/**
 * Get the geographic center of a building from campuses.json data.
 * Returns { latitude, longitude } or null.
 */
export function getBuildingCoords(buildingId) {
  // Map indoor buildingId to campuses.json building id
  const INDOOR_TO_OUTDOOR_ID = {
    hall: "sgw-h",
    mb: "sgw-mb",
    cc: "loyola-cc",
    vl: "loyola-vl",
    ve: "loyola-ve",
  };

  const outdoorId = INDOOR_TO_OUTDOOR_ID[buildingId];
  if (!outdoorId) return null;

  // Import campuses data (static JSON)
  const campuses = require("../../data/campuses.json");
  const allBuildings = [
    ...(campuses.sgw?.buildings || []),
    ...(campuses.loyola?.buildings || []),
  ];

  const building = allBuildings.find((b) => b.id === outdoorId);
  if (!building?.coordinates?.length) return null;

  const coords = building.coordinates;
  const latitude =
    coords.reduce((sum, c) => sum + c.latitude, 0) / coords.length;
  const longitude =
    coords.reduce((sum, c) => sum + c.longitude, 0) / coords.length;

  return { latitude, longitude };
}

// ──────────────────────────────────────────────
// Route classification
// ──────────────────────────────────────────────

/**
 * Classify the navigation scenario.
 *
 * @param {object} startRoom  – room object with .floor and .buildingId
 * @param {object} destRoom   – room object with .floor and .buildingId
 * @returns {"same-room" | "same-floor" | "cross-floor" | "cross-building"}
 */
export function classifyRoute(startRoom, destRoom) {
  if (!startRoom || !destRoom) return null;

  if (startRoom.id === destRoom.id) return "same-room";

  const startBuilding = getBuildingForFloor(startRoom.floor);
  const destBuilding = getBuildingForFloor(destRoom.floor);

  if (
    startBuilding?.buildingId &&
    destBuilding?.buildingId &&
    startBuilding.buildingId !== destBuilding.buildingId
  ) {
    return "cross-building";
  }

  if (startRoom.floor === destRoom.floor) return "same-floor";

  return "cross-floor";
}

// ──────────────────────────────────────────────
// Route segment builders
// ──────────────────────────────────────────────

/**
 * Build an ordered list of route segments for navigation.
 *
 * @param {object}  startRoom         – { id, floor, buildingId, ... }
 * @param {object}  destRoom          – { id, floor, buildingId, ... }
 * @param {string}  transitionPref    – "stairs" | "elevator"
 * @returns {Array<object>} segments
 *
 * Each segment has:
 *   { type, floorId?, buildingId?, fromNodeId?, toNodeId?,
 *     fromFloor?, toFloor?, transitionType?, coords? }
 */
export function buildRouteSegments(startRoom, destRoom, transitionPref = "stairs") {
  const routeType = classifyRoute(startRoom, destRoom);

  if (!routeType || routeType === "same-room") {
    return []; // Nothing to navigate
  }

  // ── Same floor ──────────────────────────────
  if (routeType === "same-floor") {
    return [
      {
        type: "indoor",
        floorId: startRoom.floor,
        buildingId: startRoom.buildingId || getBuildingForFloor(startRoom.floor)?.buildingId,
        fromNodeId: startRoom.id,
        toNodeId: destRoom.id,
      },
    ];
  }

  // ── Cross floor (same building) ─────────────
  if (routeType === "cross-floor") {
    return buildCrossFloorSegments(startRoom, destRoom, transitionPref);
  }

  // ── Cross building ──────────────────────────
  return buildCrossBuildingSegments(startRoom, destRoom, transitionPref);
}

/**
 * Segments for navigating between floors in the same building.
 *
 * 1. Walk from startRoom to the transition node on the start floor
 * 2. Vertical transition (stairs/elevator) to the destination floor
 * 3. Walk from transition node on dest floor to destRoom
 */
function buildCrossFloorSegments(startRoom, destRoom, transitionPref) {
  const buildingId =
    startRoom.buildingId || getBuildingForFloor(startRoom.floor)?.buildingId;

  const transitionPair = pickTransitionPair(
    startRoom.floor,
    destRoom.floor,
    transitionPref,
    startRoom,
    destRoom
  );
  const transitionNode = transitionPair?.startNode || null;
  const destTransitionNode = transitionPair?.endNode || null;

  const segments = [];

  // Step 1: walk to transition node on start floor
  if (transitionNode) {
    segments.push({
      type: "indoor",
      floorId: startRoom.floor,
      buildingId,
      fromNodeId: startRoom.id,
      toNodeId: transitionNode.id,
    });
  }

  // Step 2: vertical transition
  segments.push({
    type: "vertical",
    buildingId,
    fromFloor: startRoom.floor,
    toFloor: destRoom.floor,
    transitionType: transitionPair?.transitionType || "stairs",
    transitionNodeStart: transitionNode?.id || null,
    transitionNodeEnd: destTransitionNode?.id || null,
  });

  // Step 3: walk from transition node on dest floor to destRoom
  if (destTransitionNode) {
    segments.push({
      type: "indoor",
      floorId: destRoom.floor,
      buildingId,
      fromNodeId: destTransitionNode.id,
      toNodeId: destRoom.id,
    });
  }

  return segments;
}

/**
 * Segments for navigating between different buildings.
 *
 * 1. If not on ground floor, navigate to ground floor (cross-floor in start building)
 * 2. Outdoor walk between buildings
 * 3. If destination not on ground floor, navigate up (cross-floor in dest building)
 * 4. Walk to destination room on target floor
 */
function buildCrossBuildingSegments(startRoom, destRoom, transitionPref) {
  const startBuildingId =
    startRoom.buildingId || getBuildingForFloor(startRoom.floor)?.buildingId;
  const destBuildingId =
    destRoom.buildingId || getBuildingForFloor(destRoom.floor)?.buildingId;

  const startGroundFloor = getGroundFloor(startBuildingId);
  const destGroundFloor = getGroundFloor(destBuildingId);

  const segments = [];

  // ── Phase 1: Get to ground floor of start building ──
  if (startRoom.floor !== startGroundFloor && startGroundFloor) {
    const transitionPair = pickTransitionPair(
      startRoom.floor,
      startGroundFloor,
      transitionPref,
      startRoom
    );
    const transNode = transitionPair?.startNode || null;
    const groundTransNode = transitionPair?.endNode || null;

    if (transNode) {
      segments.push({
        type: "indoor",
        floorId: startRoom.floor,
        buildingId: startBuildingId,
        fromNodeId: startRoom.id,
        toNodeId: transNode.id,
      });
    }

    segments.push({
      type: "vertical",
      buildingId: startBuildingId,
      fromFloor: startRoom.floor,
      toFloor: startGroundFloor,
      transitionType: transitionPair?.transitionType || "stairs",
      transitionNodeStart: transNode?.id || null,
      transitionNodeEnd: groundTransNode?.id || null,
    });
  }

  // ── Phase 2: Outdoor navigation between buildings ──
  const startCoords = getBuildingCoords(startBuildingId);
  const destCoords = getBuildingCoords(destBuildingId);

  segments.push({
    type: "outdoor",
    fromBuildingId: startBuildingId,
    toBuildingId: destBuildingId,
    fromCoords: startCoords,
    toCoords: destCoords,
  });

  // ── Phase 3: Navigate to destination floor in target building ──
  if (destRoom.floor !== destGroundFloor && destGroundFloor) {
    const transitionPair = pickTransitionPair(
      destGroundFloor,
      destRoom.floor,
      transitionPref,
      null,
      destRoom
    );
    const groundTransNode = transitionPair?.startNode || null;
    const destTransNode = transitionPair?.endNode || null;

    segments.push({
      type: "vertical",
      buildingId: destBuildingId,
      fromFloor: destGroundFloor,
      toFloor: destRoom.floor,
      transitionType: transitionPair?.transitionType || "stairs",
      transitionNodeStart: groundTransNode?.id || null,
      transitionNodeEnd: destTransNode?.id || null,
    });

    // Walk from transition point to destination room
    if (destTransNode) {
      segments.push({
        type: "indoor",
        floorId: destRoom.floor,
        buildingId: destBuildingId,
        fromNodeId: destTransNode.id,
        toNodeId: destRoom.id,
      });
    }
  } else {
    // Destination is on the ground floor — walk directly
    // Use the first available transition node as building entry point
    const entryNode = pickTransitionNode(destRoom.floor, transitionPref);
    if (entryNode) {
      segments.push({
        type: "indoor",
        floorId: destRoom.floor,
        buildingId: destBuildingId,
        fromNodeId: entryNode.id,
        toNodeId: destRoom.id,
      });
    }
  }

  return segments;
}
