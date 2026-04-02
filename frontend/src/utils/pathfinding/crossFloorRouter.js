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

/**
 * Find building entry/exit POIs on a given floor.
 * Returns an array of nodes with type "building_entry_exit".
 */
export function getEntryExitNodes(floorId) {
  const allNodes = getAllNodesForFloor(floorId);
  return allNodes.filter((n) => n.type === "building_entry_exit");
}

/**
 * Pick the best building entry/exit node on a floor.
 * Falls back to the first vertical-transition node if no entry node exists.
 */
export function pickEntryNode(floorId, preference = "stairs") {
  const entryNodes = getEntryExitNodes(floorId);
  if (entryNodes.length > 0) return entryNodes[0];
  // Fallback: use a vertical-transition node as proxy entry
  return pickTransitionNode(floorId, preference);
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
 * Get the ground / entry floor for a building (lowest floorNumber).
 * Used when the user must exit a building for an outdoor segment.
 */
export function getGroundFloor(buildingId) {
  const meta = BUILDING_META[buildingId];
  if (!meta) return null;

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
 * Get the entry floor for a building.
 * Prefers floors that have building_entry_exit nodes.
 * Falls back to the floor closest to level 1.
 */
export function getEntryFloor(buildingId, _getEntryExitNodes = getEntryExitNodes) {
  const meta = BUILDING_META[buildingId];
  if (!meta) return null;

  // Prefer floors with building_entry_exit nodes
  for (const fId of meta.floors) {
    const entryNodes = _getEntryExitNodes(fId);
    if (entryNodes.length > 0) return fId;
  }

  // Fallback: floor closest to level 1
  let bestFloorId = null;
  let bestDist = Infinity;
  for (const fId of meta.floors) {
    const fMeta = FLOOR_META[fId];
    if (!fMeta) continue;
    const dist = Math.abs(fMeta.floorNumber - 1);
    if (dist < bestDist) {
      bestDist = dist;
      bestFloorId = fId;
    }
  }
  return bestFloorId;
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

/** Phase 1: Walk from start room to building exit. */
function buildExitSegments(startRoom, startBuildingId, startEntryFloor, transitionPref) {
  const segments = [];

  if (startRoom.floor === startEntryFloor || !startEntryFloor) {
    // Already on entry floor — walk from room to exit
    const exitNode = pickEntryNode(startRoom.floor, transitionPref);
    if (exitNode) {
      segments.push({
        type: "indoor",
        floorId: startRoom.floor,
        buildingId: startBuildingId,
        fromNodeId: startRoom.id,
        toNodeId: exitNode.id,
      });
    }
    return segments;
  }

  // Need to descend to entry floor first
  const transitionPair = pickTransitionPair(
    startRoom.floor, startEntryFloor, transitionPref, startRoom
  );
  const transNode = transitionPair?.startNode || null;
  const entryFloorTransNode = transitionPair?.endNode || null;

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
    toFloor: startEntryFloor,
    transitionType: transitionPair?.transitionType || "stairs",
    transitionNodeStart: transNode?.id || null,
    transitionNodeEnd: entryFloorTransNode?.id || null,
  });

  // Walk from transition node to building exit
  const exitNode = pickEntryNode(startEntryFloor, transitionPref);
  if (entryFloorTransNode && exitNode && entryFloorTransNode.id !== exitNode.id) {
    segments.push({
      type: "indoor",
      floorId: startEntryFloor,
      buildingId: startBuildingId,
      fromNodeId: entryFloorTransNode.id,
      toNodeId: exitNode.id,
    });
  }

  return segments;
}

/** Phase 3: Enter destination building and navigate to room. */
function buildEntranceSegments(destRoom, destBuildingId, destEntryFloor, transitionPref) {
  const segments = [];
  const destEntryNode = pickEntryNode(destEntryFloor || destRoom.floor, transitionPref);

  if (destRoom.floor === destEntryFloor || !destEntryFloor) {
    // Destination is on the entry floor — walk from entrance to room
    if (destEntryNode) {
      segments.push({
        type: "indoor",
        floorId: destRoom.floor,
        buildingId: destBuildingId,
        fromNodeId: destEntryNode.id,
        toNodeId: destRoom.id,
      });
    }
    return segments;
  }

  // Need to ascend from entry floor to dest floor
  const transitionPair = pickTransitionPair(
    destEntryFloor, destRoom.floor, transitionPref, null, destRoom
  );
  const entryFloorTransNode = transitionPair?.startNode || null;
  const destTransNode = transitionPair?.endNode || null;

  // Walk from building entrance to transition node on entry floor
  if (destEntryNode && entryFloorTransNode && destEntryNode.id !== entryFloorTransNode.id) {
    segments.push({
      type: "indoor",
      floorId: destEntryFloor,
      buildingId: destBuildingId,
      fromNodeId: destEntryNode.id,
      toNodeId: entryFloorTransNode.id,
    });
  }

  segments.push({
    type: "vertical",
    buildingId: destBuildingId,
    fromFloor: destEntryFloor,
    toFloor: destRoom.floor,
    transitionType: transitionPair?.transitionType || "stairs",
    transitionNodeStart: entryFloorTransNode?.id || null,
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

  return segments;
}

/**
 * Segments for navigating between different buildings.
 *
 * 1. Walk to building exit on entry floor (may include vertical transition)
 * 2. Outdoor walk between buildings
 * 3. Enter destination building and navigate to destination room
 */
function buildCrossBuildingSegments(startRoom, destRoom, transitionPref) {
  const startBuildingId =
    startRoom.buildingId || getBuildingForFloor(startRoom.floor)?.buildingId;
  const destBuildingId =
    destRoom.buildingId || getBuildingForFloor(destRoom.floor)?.buildingId;

  const startEntryFloor = getEntryFloor(startBuildingId) || getGroundFloor(startBuildingId);
  const destEntryFloor = getEntryFloor(destBuildingId) || getGroundFloor(destBuildingId);

  const segments = [
    ...buildExitSegments(startRoom, startBuildingId, startEntryFloor, transitionPref),
  ];

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

  segments.push(
    ...buildEntranceSegments(destRoom, destBuildingId, destEntryFloor, transitionPref),
  );

  return segments;
}
