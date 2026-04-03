import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as Speech from "expo-speech";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  Dimensions,
  Switch,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import {
  buildings,
  getFloorGraphData,
  getRoomsForFloor,
  getAllNodesForFloor,
  getBuildingById,
  FLOOR_META,
} from "../data/indoorFloorData";
import IndoorPoiLegend from "../components/IndoorPoiLegend";
import IndoorPoiMarkers from "../components/IndoorPoiMarkers";
import {
  IndoorBuildingSelector,
  IndoorCampusToggle,
  IndoorFloorSelector,
} from "../components/IndoorSelectors";
import { findShortestPath } from "../utils/pathfinding/pathfinding";
import {
  classifyRoute,
  buildRouteSegments,
  getEntryFloor,
  getGroundFloor,
  pickEntryNode,
} from "../utils/pathfinding/crossFloorRouter";
import {
  buildJourneyStages,
  getBuildingName,
  getDefaultJourneyStage,
  getJourneyMapStage,
} from "../utils/pathfinding/navigationJourney";
import {
  buildAllRooms,
  getFilteredRooms,
  getInitialSelection,
  getSelectionForLocation,
} from "../utils/indoorMapUtils";
import {
  indoorPoiLegendStyles,
  indoorPoiMarkerStyle,
} from "../styles/indoorSharedStyles";
import { smoothPath } from "../utils/pathfinding/pathSmoothing";
export {
  buildAllRooms,
  getInitialSelection,
  getSelectionForLocation,
} from "../utils/indoorMapUtils";

const MAROON = "#912338";
const BLUE = "#4A90D9";
const GREEN = "#28a745";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_INSPECT_SCALE = 1.75; //cz vanier extension is way too small to be viewed from afar
const INDOOR_METERS_PER_MAP_UNIT = 0.1;
const INDOOR_WALKING_SPEED_METERS_PER_SECOND = 1.2;

// ── Step-text helpers (extracted to reduce cognitive complexity) ──

const NODE_TYPE_TEXT = {
  elevator: "Pass the elevator",
  stairs: "Pass the stairs",
  washroom: "Pass the washroom on your right",
  escalator: "Pass the escalator",
  hallway: "Continue through the hallway",
};

function nodeStepText(node) {
  return NODE_TYPE_TEXT[node.type] || "Continue along the corridor";
}

function buildSegmentIcon(method) {
  return method === "elevator" ? "elevator" : "stairs";
}

function findJourneyStageById(journeyStages, stageId) {
  return journeyStages.find((stage) => stage.id === stageId) || null;
}

function getSegmentSpeechSteps(stage, segmentResults) {
  if (!stage) return [];

  const selectedSegmentResult = segmentResults[stage.segmentIndex];
  const segment = selectedSegmentResult?.segment;

  if (!segment) return [];

  if (segment.type === "indoor") {
    const coords = selectedSegmentResult?.pathResult?.pathCoords || [];
    const steps = [];

    for (let i = 1; i < coords.length - 1; i += 1) {
      steps.push(nodeStepText(coords[i]));
    }

    if (!steps.length) {
      const floorLabel = FLOOR_META[segment.floorId]?.floorLabel || segment.floorId;
      return [`Walk on Floor ${floorLabel}`];
    }

    return steps;
  }

  if (segment.type === "vertical") {
    const fromLabel = FLOOR_META[segment.fromFloor]?.floorLabel || segment.fromFloor;
    const toLabel = FLOOR_META[segment.toFloor]?.floorLabel || segment.toFloor;
    const method =
      segment.transitionType === "elevator" ? "elevator" : "stairs";
    return [`Take the ${method} from Floor ${fromLabel} to Floor ${toLabel}`];
  }

  if (segment.type === "outdoor") {
    return [
      `Walk outside to the ${segment.toBuildingId?.toUpperCase() || "destination"} building`,
    ];
  }

  return [];
}

function speakSegmentSteps(steps) {
  if (!steps.length) return;
  Speech.stop();
  Speech.speak(steps.join(". "));
}

function normalizeSpokenInstructionText(text = "") {
  return String(text).replaceAll(/\s+/g, " ").trim();
}

function isGenericHallwayInstruction(text = "") {
  return (
    text === "Continue through the hallway" ||
    text === "Continue along the corridor"
  );
}

export function prepareSegmentSpokenInstructions(steps = []) {
  const normalizedSteps = steps
    .map((step) => normalizeSpokenInstructionText(step))
    .filter(Boolean);

  return normalizedSteps.reduce((compacted, step) => {
    const previousStep = compacted.at(-1);
    if (!previousStep) {
      compacted.push(step);
      return compacted;
    }

    const previousLower = previousStep.toLowerCase();
    const currentLower = step.toLowerCase();

    // Remove direct consecutive duplicates in the spoken queue.
    if (previousLower === currentLower) {
      return compacted;
    }

    // Collapse back-to-back generic hallway instructions to one spoken step.
    if (
      isGenericHallwayInstruction(previousStep) &&
      isGenericHallwayInstruction(step)
    ) {
      return compacted;
    }

    compacted.push(step);
    return compacted;
  }, []);
}

function buildSegmentSpokenInstructions({
  stage,
  journeyStages,
  segmentResults,
  startRoom,
  destRoom,
}) {
  const segmentSteps = getSegmentSpeechSteps(stage, segmentResults);
  const spokenSteps = prepareSegmentSpokenInstructions(segmentSteps);

  if (!spokenSteps.length) return [];

  const stageIndex = journeyStages.findIndex((journeyStage) => journeyStage.id === stage.id);
  const contextualSteps = [...spokenSteps];

  if (stageIndex === 0) {
    contextualSteps.unshift(`Start at ${startRoom?.label || "starting point"}`);
  }

  if (stageIndex === journeyStages.length - 1) {
    contextualSteps.push(`You have arrived at ${destRoom?.label || "destination"}`);
  }

  return contextualSteps;
}

function getMapStageBuildingLabel(buildingId) {
  const name = getBuildingName(buildingId);
  if (name === "John Molson Building") return "JMSB";
  if (name === "Vanier Library") return "VL";
  if (name === "Vanier Extension") return "VE";
  if (name === "Central Building") return "CC";
  return name;
}

function isRedundantContinueStep(text = "") {
  return (
    text.startsWith("Continue through") || text.startsWith("Continue along")
  );
}

function finalizeDirectionSteps(rawSteps) {
  const compactedSteps = [];

  rawSteps.forEach((step) => {
    const previousStep = compactedSteps.at(-1);

    if (
      previousStep &&
      isRedundantContinueStep(previousStep.text) &&
      isRedundantContinueStep(step.text)
    ) {
      return;
    }

    compactedSteps.push(step);
  });

  return compactedSteps.map((step, index) => ({
    ...step,
    step: index + 1,
  }));
}

/** Build direction steps for cross-floor / cross-building routes. */
function buildMultiSegmentSteps(segmentResults, startRoom, destRoom) {
  const steps = [];

  steps.push({
    text: `Start at ${startRoom?.label || "starting point"}`,
    icon: "trip-origin",
  });

  for (let si = 0; si < segmentResults.length; si++) {
    const { segment, pathResult: segPath } = segmentResults[si];

    if (segment.type === "indoor" && segPath?.ok) {
      const coords = segPath.pathCoords || [];
      const floorMeta = FLOOR_META[segment.floorId];
      const floorLabel = floorMeta?.floorLabel || segment.floorId;

      if (si > 0) {
        steps.push({ text: `Continue on Floor ${floorLabel}`, icon: "layers" });
      }

      for (let i = 1; i < coords.length - 1; i++) {
        steps.push({ text: nodeStepText(coords[i]) });
      }
    } else if (segment.type === "vertical") {
      const fromLabel =
        FLOOR_META[segment.fromFloor]?.floorLabel || segment.fromFloor;
      const toLabel =
        FLOOR_META[segment.toFloor]?.floorLabel || segment.toFloor;
      const method =
        segment.transitionType === "elevator" ? "elevator" : "stairs";
      steps.push({
        text: `Take the ${method} from Floor ${fromLabel} to Floor ${toLabel}`,
        icon: buildSegmentIcon(method),
      });
    } else if (segment.type === "outdoor") {
      steps.push({
        text: `Walk outside to the ${segment.toBuildingId?.toUpperCase() || "destination"} building`,
        icon: "directions-walk",
      });
    }
  }

  steps.push({
    text: `Arrive at ${destRoom?.label || "destination"}`,
    icon: "place",
  });
  return finalizeDirectionSteps(steps);
}

/** Build direction steps for same-floor routes. */
function buildSameFloorSteps(coords, startRoom, destRoom) {
  if (coords.length < 2) return [];

  const steps = [
    {
      text: `Start at ${startRoom?.label || "starting point"}`,
      distance: null,
    },
  ];

  for (let i = 1; i < coords.length - 1; i++) {
    steps.push({
      text: nodeStepText(coords[i]),
      distance: null,
    });
  }

  steps.push({
    text: `Arrive at ${destRoom?.label || "destination"}`,
    distance: null,
  });

  return finalizeDirectionSteps(steps);
}

// Map image dimensions
const MAP_IMAGE_WIDTH = SCREEN_WIDTH - 32;
const MAP_IMAGE_HEIGHT = SCREEN_WIDTH - 60;

/** Resolve a single route segment into { segment, pathResult }. */
function resolveSegmentPath(seg, accessible) {
  if (seg.type !== "indoor") return { segment: seg, pathResult: null };

  const buildingObj = getBuildingById(seg.buildingId);
  if (!buildingObj)
    return {
      segment: seg,
      pathResult: { ok: false, reason: "Building not found" },
    };

  const floorsData = { floors: {} };
  buildingObj.floors.forEach((floor) => {
    const fd = getFloorGraphData(buildingObj.id, floor.id);
    floorsData.floors[floor.id] = {
      label: floor.label,
      nodes: fd.nodes,
      rooms: fd.rooms,
      pois: fd.pois,
      edges: fd.edges,
    };
  });

  const result = findShortestPath({
    floorsData,
    startNodeId: seg.fromNodeId,
    endNodeId: seg.toNodeId,
    accessible,
  });
  return { segment: seg, pathResult: result };
}

export default function IndoorDirectionsScreen({ route, navigation }) {
  const params = route?.params || {};
  const initialSelection = getInitialSelection(params);

  // Start and destination rooms
  const [startRoom, setStartRoom] = useState(params.startRoom || null);
  const [destRoom, setDestRoom] = useState(params.destinationRoom || null);

  // Input text for search
  const [startText, setStartText] = useState(params.startRoom?.label || "");
  const [destText, setDestText] = useState(params.destinationRoom?.label || "");
  const [activeField, setActiveField] = useState(null); // "start" or "dest"
  const [searchQuery, setSearchQuery] = useState("");

  // Selection mode for map clicks
  const [selectionMode, setSelectionMode] = useState(null); // "start" or "dest"
  const [inspectMode, setInspectMode] = useState(false);

  // Accessibility route toggle
  const [accessibleRoute, setAccessibleRoute] = useState(false);

  // Transition preference for cross-floor routes
  const [transitionPref, setTransitionPref] = useState(null); // "stairs" | "elevator"
  const [activeJourneyStageId, setActiveJourneyStageId] = useState(null);
  const lastSpokenJourneyStageIdRef = useRef(null);
  const resolvedTransitionPref =
    transitionPref || (accessibleRoute ? "elevator" : "stairs");

  const [selectedCampus, setSelectedCampus] = useState(
    initialSelection.campusId,
  );
  const [selectedBuildingIdx, setSelectedBuildingIdx] = useState(
    initialSelection.buildingIdx,
  );
  const [selectedFloorIdx, setSelectedFloorIdx] = useState(
    initialSelection.floorIdx,
  );

  const effectiveStartRoom = useMemo(() => {
    if (startRoom || !destRoom || activeField === "start") {
      return startRoom;
    }

    const buildingId = destRoom.buildingId || params.building?.id;
    if (!buildingId) return null;

    const entryFloorId =
      getEntryFloor(buildingId) || getGroundFloor(buildingId) || destRoom.floor;
    const entryNode = pickEntryNode(entryFloorId, resolvedTransitionPref);
    if (!entryNode) return null;

    const building = getBuildingById(buildingId);

    return {
      ...entryNode,
      floor: entryFloorId,
      buildingId,
      buildingName: building?.name,
      label: "Entrance",
    };
  }, [
    startRoom,
    destRoom,
    activeField,
    params.building?.id,
    resolvedTransitionPref,
  ]);

  const effectiveDestRoom = useMemo(() => {
    if (destRoom || !startRoom || activeField === "dest") {
      return destRoom;
    }

    const buildingId = startRoom.buildingId || params.building?.id;
    if (!buildingId) return null;

    const entryFloorId =
      getEntryFloor(buildingId) || getGroundFloor(buildingId) || startRoom.floor;
    const entryNode = pickEntryNode(entryFloorId, resolvedTransitionPref);
    if (!entryNode) return null;

    const building = getBuildingById(buildingId);

    return {
      ...entryNode,
      floor: entryFloorId,
      buildingId,
      buildingName: building?.name,
      label: "Exit",
    };
  }, [
    destRoom,
    startRoom,
    activeField,
    params.building?.id,
    resolvedTransitionPref,
  ]);

  const campusBuildings = useMemo(
    () => buildings[selectedCampus] || [],
    [selectedCampus],
  );

  // Current building and floor being displayed while browsing
  const selectedBuilding =
    campusBuildings[selectedBuildingIdx] || campusBuildings[0];
  const selectedFloor =
    selectedBuilding?.floors?.[selectedFloorIdx] ||
    selectedBuilding?.floors?.[0] ||
    null;

  // Get current floor dimensions from the floor data
  const floorDimensions = useMemo(() => {
    return {
      width: selectedFloor?.width || 1000,
      height: selectedFloor?.height || 1000,
    };
  }, [selectedFloor]);

  // All rooms for search (with coordinates from JSON data)
  const allRooms = useMemo(() => buildAllRooms(), []);

  // Current floor rooms and nodes for map interaction
  const currentFloorData = useMemo(() => {
    if (!selectedFloor) return { rooms: [], nodes: [], pois: [] };

    const floorId = selectedFloor.id;
    const rooms = getRoomsForFloor(floorId);
    const allNodes = getAllNodesForFloor(floorId);

    return {
      rooms,
      nodes: allNodes.filter((n) => n.type === "hallway"),
      pois: allNodes.filter(
        (n) =>
          n.type !== "hallway" && n.type !== "classroom" && n.type !== "room",
      ),
    };
  }, [selectedFloor]);

  // Route type classification
  const routeType = useMemo(() => {
    if (!effectiveStartRoom || !effectiveDestRoom) return null;
    return classifyRoute(effectiveStartRoom, effectiveDestRoom);
  }, [effectiveStartRoom, effectiveDestRoom]);

  // Route segments for cross-floor / cross-building
  const routeSegments = useMemo(() => {
    if (!routeType) return [];
    if (routeType === "same-floor" || routeType === "same-room") return [];
    return buildRouteSegments(
      effectiveStartRoom,
      effectiveDestRoom,
      resolvedTransitionPref,
    );
  }, [effectiveStartRoom, effectiveDestRoom, routeType, resolvedTransitionPref]);

  // Multi-segment path results (cross-floor)
  const segmentResults = useMemo(() => {
    if (!routeSegments.length) return [];
    return routeSegments.map((seg) => resolveSegmentPath(seg, accessibleRoute));
  }, [routeSegments, accessibleRoute]);

  const journeyStages = useMemo(
    () => buildJourneyStages(routeSegments, effectiveStartRoom, effectiveDestRoom),
    [routeSegments, effectiveStartRoom, effectiveDestRoom],
  );

  const defaultJourneyStage = useMemo(
    () => getDefaultJourneyStage(journeyStages),
    [journeyStages],
  );

  const activeJourneyStage = useMemo(
    () =>
      journeyStages.find((stage) => stage.id === activeJourneyStageId) ||
      defaultJourneyStage,
    [journeyStages, activeJourneyStageId, defaultJourneyStage],
  );

  const mapJourneyStage = useMemo(
    () => getJourneyMapStage(journeyStages, activeJourneyStage?.id),
    [journeyStages, activeJourneyStage],
  );

  const activeJourneyStepNumber = useMemo(() => {
    if (!activeJourneyStage) return null;

    const stageIndex = journeyStages.findIndex(
      (stage) => stage.id === activeJourneyStage.id,
    );
    return stageIndex >= 0 ? stageIndex + 1 : null;
  }, [journeyStages, activeJourneyStage]);

  // Filtered search results
  const searchResults = useMemo(
    () =>
      getFilteredRooms(allRooms, searchQuery, {
        preferredBuildingId: selectedBuilding?.id,
        preferredCampusId: selectedCampus,
      }),
    [searchQuery, allRooms, selectedBuilding?.id, selectedCampus],
  );

  const displayedSegmentResult = useMemo(() => {
    if (!segmentResults.length) return null;

    if (activeJourneyStage?.type === "indoor") {
      return segmentResults[activeJourneyStage.segmentIndex] || null;
    }

    if (mapJourneyStage?.type === "indoor") {
      return segmentResults[mapJourneyStage.segmentIndex] || null;
    }

    const selectedFloorSegment = segmentResults.find(
      ({ segment }) =>
        segment.type === "indoor" &&
        segment.floorId === selectedFloor?.id &&
        segment.buildingId === selectedBuilding?.id,
    );
    if (selectedFloorSegment) {
      return selectedFloorSegment;
    }

    return (
      segmentResults.find(({ segment }) => segment.type === "indoor") || null
    );
  }, [
    segmentResults,
    activeJourneyStage,
    mapJourneyStage,
    selectedFloor?.id,
    selectedBuilding?.id,
  ]);

  const browsingLocked = Boolean(effectiveStartRoom && effectiveDestRoom);

  useEffect(() => {
    const nextStartRoom = params.startRoom || null;
    const nextDestRoom = params.destinationRoom || null;
    const nextSelection = getInitialSelection(params);

    setStartRoom(nextStartRoom);
    setDestRoom(nextDestRoom);
    setStartText(nextStartRoom?.label || "");
    setDestText(nextDestRoom?.label || "");
    setSearchQuery("");
    setActiveField(null);
    setSelectionMode(null);
    setInspectMode(false);
    setTransitionPref(null);
    setActiveJourneyStageId(null);
    setSelectedCampus(nextSelection.campusId);
    setSelectedBuildingIdx(nextSelection.buildingIdx);
    setSelectedFloorIdx(nextSelection.floorIdx);
  }, [
    params.startRoom,
    params.destinationRoom,
    params.building?.id,
    params.floor?.id,
  ]);

  useEffect(() => {
    if (!journeyStages.length) {
      if (activeJourneyStageId !== null) {
        setActiveJourneyStageId(null);
      }
      return;
    }

    const currentStageStillExists = journeyStages.some(
      (stage) => stage.id === activeJourneyStageId,
    );
    if (!currentStageStillExists && defaultJourneyStage) {
      setActiveJourneyStageId(defaultJourneyStage.id);
    }
  }, [journeyStages, activeJourneyStageId, defaultJourneyStage]);

  useEffect(() => {
    if (
      !browsingLocked ||
      !mapJourneyStage?.mapBuildingId ||
      !mapJourneyStage?.mapFloorId
    ) {
      return;
    }

    const nextSelection = getSelectionForLocation(
      mapJourneyStage.mapBuildingId,
      mapJourneyStage.mapFloorId,
    );

    if (
      nextSelection.campusId !== selectedCampus ||
      nextSelection.buildingIdx !== selectedBuildingIdx ||
      nextSelection.floorIdx !== selectedFloorIdx
    ) {
      setSelectedCampus(nextSelection.campusId);
      setSelectedBuildingIdx(nextSelection.buildingIdx);
      setSelectedFloorIdx(nextSelection.floorIdx);
    }
  }, [
    browsingLocked,
    mapJourneyStage,
    selectedCampus,
    selectedBuildingIdx,
    selectedFloorIdx,
  ]);

  // Calculate path - single floor (same-floor) or first indoor segment (cross-floor)
  const pathResult = useMemo(() => {
    if (!effectiveStartRoom || !effectiveDestRoom) return null;

    if (routeSegments.length > 0 && segmentResults.length > 0) {
      if (displayedSegmentResult?.pathResult) {
        return displayedSegmentResult.pathResult;
      }

      for (const sr of segmentResults) {
        if (sr.segment.type === "indoor" && sr.pathResult?.ok) {
          return sr.pathResult;
        }
      }

      return { ok: false, reason: "No indoor path available for this segment" };
    }

    // Same-floor: build floors data from the selected building
    const routeBuilding =
      getBuildingById(
        effectiveStartRoom.buildingId ||
          effectiveDestRoom.buildingId ||
          params.building?.id,
      ) || selectedBuilding;
    const floorsData = {
      floors: {},
    };

    if (routeBuilding?.floors) {
      routeBuilding.floors.forEach((floor) => {
        const floorGraphData = getFloorGraphData(routeBuilding.id, floor.id);
        floorsData.floors[floor.id] = {
          label: floor.label,
          nodes: floorGraphData.nodes,
          rooms: floorGraphData.rooms,
          pois: floorGraphData.pois,
          edges: floorGraphData.edges,
        };
      });
    }

    const result = findShortestPath({
      floorsData,
      startNodeId: effectiveStartRoom.id,
      endNodeId: effectiveDestRoom.id,
      accessible: accessibleRoute,
    });

    return result;
  }, [
    effectiveStartRoom,
    effectiveDestRoom,
    params.building?.id,
    selectedBuilding,
    accessibleRoute,
    routeSegments,
    segmentResults,
    displayedSegmentResult,
  ]);

  // Generate step-by-step directions from path (supports multi-segment)
  const directionSteps = useMemo(() => {
    // Cross-floor / cross-building: combine all segments into unified steps
    if (segmentResults.length > 0) {
      return buildMultiSegmentSteps(
        segmentResults,
        effectiveStartRoom,
        effectiveDestRoom,
      );
    }

    // Same-floor: original logic
    if (!pathResult?.ok || !pathResult.pathCoords) {
      return [];
    }

    return buildSameFloorSteps(
      pathResult.pathCoords,
      effectiveStartRoom,
      effectiveDestRoom,
    );
  }, [pathResult, effectiveStartRoom, effectiveDestRoom, segmentResults]);

  // Route stats - calculate actual distance
  const routeStats = useMemo(() => {
    const getPathGeometryWeight = (coords = []) => {
      if (!Array.isArray(coords) || coords.length < 2) return 0;

      let total = 0;
      for (let i = 1; i < coords.length; i += 1) {
        const dx = (coords[i]?.x || 0) - (coords[i - 1]?.x || 0);
        const dy = (coords[i]?.y || 0) - (coords[i - 1]?.y || 0);
        total += Math.hypot(dx, dy);
      }
      return total;
    };

    const getSafeIndoorWeight = (weighted = 0, coords = []) => {
      const geometricWeight = getPathGeometryWeight(coords);
      if (!geometricWeight) return weighted || 0;
      if (!weighted) return geometricWeight;

      // Large ratios indicate synthetic graph penalties (e.g., room-transit penalties).
      return weighted / geometricWeight > 10 ? geometricWeight : weighted;
    };

    let routedWeight = 0;
    if (segmentResults.length > 0) {
      routedWeight = segmentResults.reduce(
        (total, segmentResult) =>
          segmentResult.segment.type === "indoor" &&
          segmentResult.pathResult?.ok
            ? total +
              getSafeIndoorWeight(
                segmentResult.pathResult.totalWeight,
                segmentResult.pathResult.pathCoords,
              )
            : total,
        0,
      );
    } else if (pathResult?.ok) {
      routedWeight = getSafeIndoorWeight(pathResult.totalWeight, pathResult.pathCoords);
    }

    if (!routedWeight) {
      return { duration: "--", distance: "--", type: "walking" };
    }

    const distanceMeters = Math.max(
      1,
      Math.round(routedWeight * INDOOR_METERS_PER_MAP_UNIT),
    );
    const durationSeconds =
      distanceMeters / INDOOR_WALKING_SPEED_METERS_PER_SECOND;
    const durationMinutes = Math.max(1, Math.ceil(durationSeconds / 60));

    return {
      duration: `${durationMinutes} min`,
      distance: `${distanceMeters}m`,
      type: "walking",
    };
  }, [pathResult, segmentResults]);

  // Determine the floor image to display for active segment
  const displayedFloor = useMemo(() => {
    if (
      displayedSegmentResult?.segment?.type === "indoor" &&
      displayedSegmentResult.segment.floorId
    ) {
      const building = getBuildingById(
        displayedSegmentResult.segment.buildingId,
      );
      const floor = building?.floors?.find(
        (f) => f.id === displayedSegmentResult.segment.floorId,
      );
      if (floor) return floor;
    }

    if (mapJourneyStage?.mapBuildingId && mapJourneyStage?.mapFloorId) {
      const journeyBuilding = getBuildingById(mapJourneyStage.mapBuildingId);
      const journeyFloor = journeyBuilding?.floors?.find(
        (floor) => floor.id === mapJourneyStage.mapFloorId,
      );
      if (journeyFloor) return journeyFloor;
    }

    if (
      (routeType === "same-floor" || routeType === "same-room") &&
      effectiveStartRoom?.floor &&
      effectiveStartRoom.floor === effectiveDestRoom?.floor
    ) {
      const routeBuilding =
        getBuildingById(
          effectiveStartRoom.buildingId ||
            effectiveDestRoom?.buildingId ||
            params.building?.id,
        ) || selectedBuilding;
      const routeFloor = routeBuilding?.floors?.find(
        (floor) => floor.id === effectiveStartRoom.floor,
      );
      if (routeFloor) return routeFloor;
    }

    return selectedFloor;
  }, [
    displayedSegmentResult,
    routeType,
    mapJourneyStage,
    effectiveStartRoom,
    effectiveDestRoom,
    params.building?.id,
    selectedBuilding,
    selectedFloor,
  ]);

  const displayedFloorPois = useMemo(() => {
    if (!displayedFloor?.id) return [];

    return getAllNodesForFloor(displayedFloor.id).filter(
      (node) =>
        node.type !== "hallway" &&
        node.type !== "classroom" &&
        node.type !== "room",
    );
  }, [displayedFloor]);

  const displayedMapWidth = inspectMode
    ? MAP_IMAGE_WIDTH * MAP_INSPECT_SCALE
    : MAP_IMAGE_WIDTH;
  const displayedMapHeight = inspectMode
    ? MAP_IMAGE_HEIGHT * MAP_INSPECT_SCALE
    : MAP_IMAGE_HEIGHT;

  // Generate SVG path from coordinates
  const svgPath = useMemo(() => {
    if (
      !pathResult?.ok ||
      !pathResult.pathCoords ||
      pathResult.pathCoords.length < 2
    ) {
      return null;
    }

    const coords = pathResult.pathCoords;
    const displayWidth = displayedFloor?.width || floorDimensions.width;
    const displayHeight = displayedFloor?.height || floorDimensions.height;
    const scaleX = displayedMapWidth / displayWidth;
    const scaleY = displayedMapHeight / displayHeight;

    // Scale raw coordinates to display dimensions
    const scaledPoints = coords.map((c) => ({
      x: c.x * scaleX,
      y: c.y * scaleY,
      type: c.type,
    }));

    // Apply smoothing pipeline: axis-snap → simplify → Catmull-Rom curves
    const pathD = smoothPath(scaledPoints);

    return {
      path: pathD,
      start: scaledPoints[0],
      end: scaledPoints[scaledPoints.length - 1],
      points: scaledPoints,
    };
  }, [
    pathResult,
    displayedFloor,
    floorDimensions,
    displayedMapWidth,
    displayedMapHeight,
  ]);

  const handleFieldChange = (text, field) => {
    if (field === "start" && startRoom) {
      setStartRoom(null);
      setTransitionPref(null);
    }

    if (field === "dest" && destRoom) {
      setDestRoom(null);
      setTransitionPref(null);
    }

    setActiveField(field);
    setSearchQuery(text);
    if (field === "start") {
      setStartText(text);
    } else {
      setDestText(text);
    }
  };

  const syncSelectionToLocation = useCallback(
    (buildingId, floorId, campusId) => {
      const nextSelection = getSelectionForLocation(
        buildingId,
        floorId,
        campusId,
      );
      setSelectedCampus(nextSelection.campusId);
      setSelectedBuildingIdx(nextSelection.buildingIdx);
      setSelectedFloorIdx(nextSelection.floorIdx);
    },
    [],
  );

  const handleCampusChange = (campusId) => {
    setSelectedCampus(campusId);
    setSelectedBuildingIdx(0);
    setSelectedFloorIdx(0);
    setSelectionMode(null);
  };

  const handleBuildingChange = (index) => {
    setSelectedBuildingIdx(index);
    setSelectedFloorIdx(0);
    setSelectionMode(null);
  };

  const handleFloorChange = (index) => {
    setSelectedFloorIdx(index);
    setSelectionMode(null);

    const nextFloor = selectedBuilding?.floors?.[index];
    if (!nextFloor || !browsingLocked) return;

    const matchingStage = journeyStages.find(
      (stage) =>
        stage.mapBuildingId === selectedBuilding?.id &&
        stage.mapFloorId === nextFloor.id,
    );

    if (matchingStage) {
      setActiveJourneyStageId(matchingStage.id);
    }
  };

  const handleJourneyStageSelect = useCallback(
    (stageId) => {
      if (stageId === activeJourneyStage?.id) {
        return;
      }

      const selectedStage = findJourneyStageById(journeyStages, stageId);
      setActiveJourneyStageId(stageId);

      if (!selectedStage) return;

      const spokenSteps = buildSegmentSpokenInstructions({
        stage: selectedStage,
        journeyStages,
        segmentResults,
        startRoom,
        destRoom,
      });
      if (!spokenSteps.length) return;

      if (lastSpokenJourneyStageIdRef.current === stageId) return;

      speakSegmentSteps(spokenSteps);
      lastSpokenJourneyStageIdRef.current = stageId;
    },
    [activeJourneyStage, journeyStages, segmentResults, startRoom, destRoom],
  );

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.("blur", () => {
      Speech.stop();
      lastSpokenJourneyStageIdRef.current = null;
    });

    return () => {
      unsubscribe?.();
      Speech.stop();
      lastSpokenJourneyStageIdRef.current = null;
    };
  }, [navigation]);

  const handleSelectRoom = (room) => {
    const floorLabel = room.floor?.split("-")[1] || room.floor;
    if (activeField === "start") {
      setStartRoom(room);
      setStartText(room.label + ", Floor " + floorLabel);
    } else {
      setDestRoom(room);
      setDestText(room.label + ", Floor " + floorLabel);
    }
    syncSelectionToLocation(room.buildingId, room.floor, room.campusId);
    setSearchQuery("");
    setActiveField(null);
    setSelectionMode(null);
  };

  const handleSwap = () => {
    const tempRoom = startRoom;
    const tempText = startText;
    setStartRoom(destRoom);
    setStartText(destText);
    setDestRoom(tempRoom);
    setDestText(tempText);
  };

  // Handle map tap to select start/end point
  const handleMapPress = useCallback(
    (event) => {
      if (!selectionMode) return;

      const { locationX, locationY } = event.nativeEvent;

      // Scale tap coordinates back to original floor plan coordinates
      const scaleX = floorDimensions.width / displayedMapWidth;
      const scaleY = floorDimensions.height / displayedMapHeight;
      const tapX = locationX * scaleX;
      const tapY = locationY * scaleY;

      // Find nearest room from the current floor's rooms
      let nearestRoom = null;
      let nearestDistance = Infinity;

      currentFloorData.rooms.forEach((room) => {
        if (room.x !== undefined && room.y !== undefined) {
          const distance = Math.sqrt(
            Math.pow(room.x - tapX, 2) + Math.pow(room.y - tapY, 2),
          );
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestRoom = room;
          }
        }
      });

      // Use a larger threshold for selection (150 units)
      if (nearestRoom && nearestDistance < 150) {
        const floorLabel =
          selectedFloor?.label || nearestRoom.floor?.split("-")[1];
        if (selectionMode === "start") {
          setStartRoom({
            ...nearestRoom,
            buildingName: selectedBuilding.name,
            buildingId: selectedBuilding.id,
          });
          setStartText(nearestRoom.label + ", Floor " + floorLabel);
        } else {
          setDestRoom({
            ...nearestRoom,
            buildingName: selectedBuilding.name,
            buildingId: selectedBuilding.id,
          });
          setDestText(nearestRoom.label + ", Floor " + floorLabel);
        }
        setSearchQuery("");
        setActiveField(null);
        setSelectionMode(null);
      }
    },
    [
      selectionMode,
      selectedBuilding,
      selectedFloor,
      currentFloorData,
      floorDimensions,
      displayedMapWidth,
      displayedMapHeight,
    ],
  );

  // Toggle selection mode
  const toggleSelectionMode = (mode) => {
    setInspectMode(false);
    setSelectionMode(selectionMode === mode ? null : mode);
  };

  const toggleInspectMode = () => {
    setSelectionMode(null);
    setInspectMode((prev) => !prev);
  };

  // Scale room coordinates for display
  const scaleCoord = useCallback(
    (x, y) => {
      const scaleX = displayedMapWidth / floorDimensions.width;
      const scaleY = displayedMapHeight / floorDimensions.height;
      return { x: x * scaleX, y: y * scaleY };
    },
    [floorDimensions, displayedMapWidth, displayedMapHeight],
  );

  const scaleDisplayedPoiCoord = useCallback(
    (x, y) => {
      const displayWidth = displayedFloor?.width || floorDimensions.width;
      const displayHeight = displayedFloor?.height || floorDimensions.height;

      return {
        x: x * (displayedMapWidth / displayWidth),
        y: y * (displayedMapHeight / displayHeight),
      };
    },
    [displayedFloor, floorDimensions, displayedMapWidth, displayedMapHeight],
  );

  const renderFloorPlanMap = () => (
    <View
      style={styles.mapWrapper}
      {...(selectionMode
        ? {
            onStartShouldSetResponder: () => true,
            onResponderRelease: handleMapPress,
          }
        : {})}
    >
      <Image
        source={displayedFloor.image}
        style={[
          styles.floorPlanImage,
          inspectMode && styles.floorPlanImageInspect,
        ]}
        resizeMode="contain"
      />
      <IndoorPoiMarkers
        pois={displayedFloorPois}
        markerStyle={styles.poiMarker}
        positionForPoi={(poi) => {
          const scaledPoi = scaleDisplayedPoiCoord(poi.x, poi.y);
          return {
            left: scaledPoi.x,
            top: scaledPoi.y,
          };
        }}
        testIdPrefix="directions-poi-marker"
        iconColor={MAROON}
      />
      <Svg
        testID="indoor-route-overlay"
        style={styles.svgOverlay}
        width={displayedMapWidth}
        height={displayedMapHeight}
      >
        {selectionMode &&
          currentFloorData.rooms.map((room) => {
            if (room.x === undefined || room.y === undefined) return null;
            const scaled = scaleCoord(room.x, room.y);
            return (
              <Circle
                key={room.id}
                cx={scaled.x}
                cy={scaled.y}
                r={8}
                fill="rgba(145, 35, 56, 0.3)"
                stroke={MAROON}
                strokeWidth={2}
              />
            );
          })}

        {svgPath && (
          <>
            <Path
              testID="indoor-route-overlay-path"
              d={svgPath.path}
              stroke={BLUE}
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8,4"
            />
            <Circle
              testID={
                startRoom?.floor === displayedFloor?.id
                  ? "selected-room-highlight"
                  : undefined
              }
              cx={svgPath.start.x}
              cy={svgPath.start.y}
              r={12}
              fill={GREEN}
              stroke="#fff"
              strokeWidth={3}
            />
            <Circle
              testID={
                destRoom?.floor === displayedFloor?.id
                  ? "selected-room-highlight"
                  : undefined
              }
              cx={svgPath.end.x}
              cy={svgPath.end.y}
              r={12}
              fill={MAROON}
              stroke="#fff"
              strokeWidth={3}
            />
          </>
        )}

        {!svgPath && effectiveStartRoom?.x && effectiveStartRoom?.y && (
          <Circle
            testID={
              effectiveStartRoom?.floor === displayedFloor?.id
                ? "selected-room-highlight"
                : undefined
            }
            cx={scaleCoord(effectiveStartRoom.x, effectiveStartRoom.y).x}
            cy={scaleCoord(effectiveStartRoom.x, effectiveStartRoom.y).y}
            r={12}
            fill={GREEN}
            stroke="#fff"
            strokeWidth={3}
            opacity={effectiveStartRoom?.floor === displayedFloor?.id ? 1 : 0}
          />
        )}
        {!svgPath && effectiveDestRoom?.x && effectiveDestRoom?.y && (
          <Circle
            testID={
              effectiveDestRoom?.floor === displayedFloor?.id
                ? "selected-room-highlight"
                : undefined
            }
            cx={scaleCoord(effectiveDestRoom.x, effectiveDestRoom.y).x}
            cy={scaleCoord(effectiveDestRoom.x, effectiveDestRoom.y).y}
            r={12}
            fill={MAROON}
            stroke="#fff"
            strokeWidth={3}
            opacity={effectiveDestRoom?.floor === displayedFloor?.id ? 1 : 0}
          />
        )}
      </Svg>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialIcons name="chevron-left" size={28} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Indoor Directions</Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!browsingLocked && (
            <View style={styles.explorerPanel}>
              <IndoorCampusToggle
                selectedCampus={selectedCampus}
                onSelectCampus={handleCampusChange}
                styles={styles}
              />

              <IndoorBuildingSelector
                buildings={campusBuildings}
                selectedBuildingIdx={selectedBuildingIdx}
                onSelectBuilding={handleBuildingChange}
                styles={styles}
              />
            </View>
          )}

          <View style={styles.searchColumnWrapper}>
            {/* Search Inputs with Map Selection Buttons */}
            <View style={styles.searchSection}>
              <View style={styles.searchInputsBlock}>
                {/* Start Input */}
                <View
                  style={[
                    styles.inputRowContainer,
                    styles.inputRowContainerStart,
                  ]}
                >
                  <View
                    style={[
                      styles.inputRow,
                      selectionMode === "start" && styles.inputRowActive,
                    ]}
                  >
                    <MaterialIcons name="trip-origin" size={18} color={GREEN} />
                    <TextInput
                      style={styles.input}
                      placeholder="Search start or use map pin button"
                      placeholderTextColor="#999"
                      value={activeField === "start" ? searchQuery : startText}
                      onChangeText={(text) => handleFieldChange(text, "start")}
                      onFocus={() => {
                        setActiveField("start");
                        setSearchQuery(startRoom?.label || startText);
                      }}
                      onBlur={() => {
                        setActiveField(null);
                      }}
                    />
                    {startText.length > 0 && (
                      <Pressable
                        onPress={() => {
                          setStartRoom(null);
                          setStartText("");
                          if (activeField === "start") setSearchQuery("");
                        }}
                        hitSlop={10}
                      >
                        <MaterialIcons name="close" size={16} color="#999" />
                      </Pressable>
                    )}
                  </View>
                  <Pressable
                    style={[
                      styles.mapSelectButton,
                      selectionMode === "start" && styles.mapSelectButtonActive,
                    ]}
                    onPress={() => toggleSelectionMode("start")}
                  >
                    <MaterialIcons
                      name="my-location"
                      size={20}
                      color={selectionMode === "start" ? "#fff" : MAROON}
                    />
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.inputRowContainer,
                    styles.inputRowContainerDest,
                  ]}
                >
                  <View
                    style={[
                      styles.inputRow,
                      selectionMode === "dest" && styles.inputRowActive,
                    ]}
                  >
                    <MaterialIcons name="place" size={18} color={MAROON} />
                    <TextInput
                      style={styles.input}
                      placeholder="Search destination or use map pin button"
                      placeholderTextColor="#999"
                      value={activeField === "dest" ? searchQuery : destText}
                      onChangeText={(text) => handleFieldChange(text, "dest")}
                      onFocus={() => {
                        setActiveField("dest");
                        setSearchQuery(destRoom?.label || destText);
                      }}
                      onBlur={() => {
                        setActiveField(null);
                      }}
                    />
                    {destText.length > 0 && (
                      <Pressable
                        onPress={() => {
                          setDestRoom(null);
                          setDestText("");
                          if (activeField === "dest") setSearchQuery("");
                        }}
                        hitSlop={10}
                      >
                        <MaterialIcons name="close" size={16} color="#999" />
                      </Pressable>
                    )}
                  </View>
                  <Pressable
                    style={[
                      styles.mapSelectButton,
                      selectionMode === "dest" && styles.mapSelectButtonActive,
                    ]}
                    onPress={() => toggleSelectionMode("dest")}
                  >
                    <MaterialIcons
                      name="place"
                      size={20}
                      color={selectionMode === "dest" ? "#fff" : MAROON}
                    />
                  </Pressable>
                </View>

                <Pressable
                  testID="swap-direction-toggle"
                  style={styles.swapButton}
                  onPress={handleSwap}
                >
                  <MaterialIcons name="swap-vert" size={20} color={MAROON} />
                </Pressable>
              </View>
            </View>

            {/* Selection Mode Indicator */}
            {selectionMode && (
              <View style={styles.selectionModeIndicator}>
                <MaterialIcons name="touch-app" size={18} color={MAROON} />
                <Text style={styles.selectionModeText}>
                  Tap on the map to select{" "}
                  {selectionMode === "start" ? "start point" : "destination"}
                </Text>
              </View>
            )}

            {/* Search Results Dropdown */}
            {searchQuery.trim().length > 0 && activeField && (
              <View style={styles.searchResultsContainer}>
                {searchResults.length > 0 ? (
                  <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    style={styles.searchResultsScroll}
                    showsVerticalScrollIndicator
                  >
                    {searchResults.slice(0, 6).map((item) => (
                      <Pressable
                        key={item.id}
                        style={styles.searchResultItem}
                        onPress={() => handleSelectRoom(item)}
                      >
                        <Text
                          style={styles.searchResultText}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {item.label}, Floor{" "}
                          {item.floor?.split("-")[1] || item.floor} ·{" "}
                          {item.buildingName}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.noResultsContainer}>
                    <MaterialIcons name="search-off" size={24} color="#999" />
                    <Text style={styles.noResultsText}>
                      No rooms or buildings found. Please try again.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Accessibility Toggle */}
          <View
            style={styles.accessibilityRow}
            testID="accessibility-toggle-row"
          >
            <View style={styles.accessibilityLabelContainer}>
              <MaterialIcons
                name="accessible"
                size={22}
                color={accessibleRoute ? BLUE : "#666"}
              />
              <Text
                style={[
                  styles.accessibilityLabel,
                  accessibleRoute && styles.accessibilityLabelActive,
                ]}
              >
                Accessible Route
              </Text>
            </View>
            <Text style={styles.accessibilityHint}>
              {accessibleRoute ? "Avoiding stairs" : "Uses stairs if shorter"}
            </Text>
            <Switch
              testID="accessibility-switch"
              value={accessibleRoute}
              onValueChange={(val) => {
                setAccessibleRoute(val);
                if (val) setTransitionPref("elevator");
              }}
              trackColor={{ false: "#ddd", true: BLUE }}
              thumbColor={accessibleRoute ? "#fff" : "#f4f3f4"}
            />
          </View>

          {(routeType === "cross-floor" || routeType === "cross-building") &&
            effectiveStartRoom &&
            effectiveDestRoom && (
              <View style={styles.transferModeControls}>
                <View style={styles.transferModeOptionsStandalone}>
                  <Pressable
                    testID="transition-pref-stairs"
                    style={[
                      styles.transferModeOption,
                      resolvedTransitionPref === "stairs" &&
                        styles.transferModeOptionActive,
                      accessibleRoute && styles.selectorDisabled,
                    ]}
                    disabled={accessibleRoute}
                    onPress={() => setTransitionPref("stairs")}
                  >
                    <MaterialIcons
                      name="stairs"
                      size={18}
                      color={
                        resolvedTransitionPref === "stairs" ? "#fff" : MAROON
                      }
                    />
                    <Text
                      style={[
                        styles.transferModeOptionText,
                        resolvedTransitionPref === "stairs" &&
                          styles.transferModeOptionTextActive,
                      ]}
                    >
                      Stairs
                    </Text>
                  </Pressable>
                  <Pressable
                    testID="transition-pref-elevator"
                    style={[
                      styles.transferModeOption,
                      resolvedTransitionPref === "elevator" &&
                        styles.transferModeOptionActiveBlue,
                    ]}
                    onPress={() => setTransitionPref("elevator")}
                  >
                    <MaterialIcons
                      name="elevator"
                      size={18}
                      color={
                        resolvedTransitionPref === "elevator" ? "#fff" : BLUE
                      }
                    />
                    <Text
                      style={[
                        styles.transferModeOptionText,
                        styles.transferModeOptionTextBlue,
                        resolvedTransitionPref === "elevator" &&
                          styles.transferModeOptionTextActive,
                      ]}
                    >
                      Elevator
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

          {journeyStages.length > 0 && (
            <View style={styles.journeyPlannerCard}>
              <Text style={styles.journeyPlannerTitle}>
                Floor-by-floor journey
              </Text>
              <Text style={styles.journeyPlannerSubtitle}>
                Tap a stage to preview that part of the trip.
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.journeyStageRow}
              >
                {journeyStages.map((stage, index) => {
                  const isActive = activeJourneyStage?.id === stage.id;
                  return (
                    <Pressable
                      key={stage.id}
                      testID={stage.id}
                      style={[
                        styles.journeyStageCard,
                        isActive && styles.journeyStageCardActive,
                      ]}
                      onPress={() => handleJourneyStageSelect(stage.id)}
                    >
                      <View style={styles.journeyStageHeaderRow}>
                        <MaterialIcons
                          name={stage.icon}
                          size={20}
                          color={isActive ? "#fff" : MAROON}
                        />
                        <View
                          style={[
                            styles.journeyStageNumberBadge,
                            isActive && styles.journeyStageNumberBadgeActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.journeyStageNumberText,
                              isActive && styles.journeyStageNumberTextActive,
                            ]}
                          >
                            {index + 1}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.journeyStageTitle,
                          isActive && styles.journeyStageTitleActive,
                        ]}
                        numberOfLines={2}
                      >
                        {stage.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Outdoor navigation bridge — shown when outdoor stage is active */}
          {activeJourneyStage?.type === "outdoor" && (
            <View style={styles.outdoorBridgeCard}>
              <MaterialIcons name="directions-walk" size={28} color={MAROON} />
              <Text style={styles.outdoorBridgeTitle}>
                Walk outside to{" "}
                {getBuildingName(activeJourneyStage.destinationBuildingId)}
              </Text>
              <Text style={styles.outdoorBridgeSubtitle}>
                {activeJourneyStage.description}
              </Text>
              <Pressable
                testID="outdoor-navigate-btn"
                style={styles.outdoorBridgeButton}
                onPress={() => {
                  const fromCoords = activeJourneyStage.fromCoords;
                  const toCoords = activeJourneyStage.toCoords;
                  if (fromCoords && toCoords) {
                    // Navigate to the Map tab (parent tab navigator)
                    // using the correct screen name "Map"
                    const parent = navigation.getParent();
                    (parent || navigation).navigate("Map", {
                      outdoorRoute: {
                        startName:
                          getBuildingName(activeJourneyStage.fromBuildingId) +
                          " Building",
                        destName:
                          getBuildingName(
                            activeJourneyStage.destinationBuildingId,
                          ) + " Building",
                        startCoords: fromCoords,
                        destCoords: toCoords,
                      },
                    });
                  }
                }}
              >
                <MaterialIcons name="map" size={18} color="#fff" />
                <Text style={styles.outdoorBridgeButtonText}>
                  View outdoor route
                </Text>
              </Pressable>
            </View>
          )}

          {/* Floor Plan with Route */}
          <View
            testID="indoor-floor-plan-container"
            style={styles.floorPlanContainer}
            {...(selectionMode
              ? {
                  onStartShouldSetResponder: () => true,
                  onResponderRelease: handleMapPress,
                }
              : {})}
          >
            {displayedFloor && (
              <View style={styles.mapStageHeader}>
                <View>
                  <Text style={styles.mapStageTitle}>
                    {getMapStageBuildingLabel(
                      mapJourneyStage?.mapBuildingId ||
                        displayedSegmentResult?.segment?.buildingId ||
                        selectedBuilding?.id,
                    )}{" "}
                    · Floor {displayedFloor.label}
                  </Text>
                </View>
                <View style={styles.mapStageActions}>
                  <Pressable
                    style={[
                      styles.inspectToggle,
                      inspectMode && styles.inspectToggleActive,
                    ]}
                    onPress={toggleInspectMode}
                  >
                    <MaterialIcons
                      name={inspectMode ? "zoom-out-map" : "zoom-in"}
                      size={14}
                      color={inspectMode ? "#fff" : MAROON}
                    />
                    <Text
                      style={[
                        styles.inspectToggleText,
                        inspectMode && styles.inspectToggleTextActive,
                      ]}
                    >
                      {inspectMode ? "Inspecting map" : "Inspect map"}
                    </Text>
                  </Pressable>
                  {activeJourneyStage && (
                    <View style={styles.mapStageBadge}>
                      <Text style={styles.mapStageBadgeText}>
                        Step {activeJourneyStepNumber}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
            {displayedFloor?.image ? (
              inspectMode ? (
                <ScrollView
                  horizontal
                  contentContainerStyle={styles.floorPlanScrollContent}
                  showsHorizontalScrollIndicator={false}
                >
                  <ScrollView
                    contentContainerStyle={styles.floorPlanScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {renderFloorPlanMap()}
                  </ScrollView>
                </ScrollView>
              ) : (
                <View style={styles.floorPlanScrollContent}>
                  {renderFloorPlanMap()}
                </View>
              )
            ) : (
              <View style={styles.noFloorPlan}>
                <MaterialIcons name="map" size={48} color="#ccc" />
                <Text style={styles.noFloorPlanText}>
                  Select start and destination
                </Text>
              </View>
            )}
          </View>

          <IndoorPoiLegend styles={styles} iconColor={MAROON} />

          {(journeyStages.length > 0 || !browsingLocked) && (
            <IndoorFloorSelector
              floors={selectedBuilding?.floors}
              selectedFloorIdx={selectedFloorIdx}
              onSelectFloor={handleFloorChange}
              styles={styles}
            />
          )}

          {/* Route Stats Bar */}
          {effectiveStartRoom && effectiveDestRoom ? (
            <>
              <View style={styles.statsBar}>
                <View style={styles.statItem}>
                  <View style={styles.statValueRow}>
                    <MaterialIcons
                      name="directions-walk"
                      size={18}
                      color={MAROON}
                    />
                    <Text style={styles.statValue}>{routeStats.duration}</Text>
                  </View>
                  <Text style={styles.statLabel}>walking</Text>
                </View>
                <View style={styles.statItem}>
                  <View style={styles.statValueRow}>
                    <Text style={styles.statValue}>{routeStats.distance}</Text>
                  </View>
                  <Text style={styles.statLabel}>distance</Text>
                </View>
                <View style={styles.statItemRight}>
                  <View style={styles.statValueRow}>
                    <Text style={styles.statValue}>{routeStats.type}</Text>
                  </View>
                  <Text style={styles.statLabel}>route</Text>
                </View>
              </View>

              {/* Path Error Message */}
              {pathResult && !pathResult.ok && (
                <View style={styles.errorContainer}>
                  <MaterialIcons
                    name="error-outline"
                    size={20}
                    color="#dc3545"
                  />
                  <Text style={styles.errorText}>{pathResult.reason}</Text>
                </View>
              )}

              {/* Step-by-Step Directions */}
              {directionSteps.length > 0 && (
                <View style={styles.stepsContainer}>
                  <Text style={styles.stepsTitle}>STEP-BY-STEP DIRECTIONS</Text>
                  {directionSteps.map((step) => (
                    <View key={step.step} style={styles.stepRow}>
                      <View style={styles.stepNumberCircle}>
                        <Text style={styles.stepNumber}>{step.step}</Text>
                      </View>
                      <View style={styles.stepTextContainer}>
                        <Text style={styles.stepText}>{step.text}</Text>
                        {step.distance != null && (
                          <Text style={styles.stepDistance}>
                            {step.distance}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyPrompt}>
              <MaterialIcons name="directions" size={32} color="#ccc" />
              <Text style={styles.emptyPromptText}>
                Select start and destination points to see walking directions
              </Text>
              <Text style={styles.emptyPromptSubtext}>
                Use the search bars or tap on the map
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ...existing code...
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: MAROON,
  },
  backButton: {
    padding: 4,
    marginRight: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    fontStyle: "italic",
  },
  explorerPanel: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#f7f1f3",
    borderWidth: 1,
    borderColor: "#ead7dd",
  },
  campusToggleContainer: {
    flexDirection: "row",
    gap: 10,
  },
  campusButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dcc3cb",
    alignItems: "center",
  },
  campusButtonActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  campusButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: MAROON,
  },
  campusButtonTextActive: {
    color: "#fff",
  },
  buildingSelectorContainer: {
    marginTop: 14,
  },
  buildingSelectorContent: {
    gap: 8,
    paddingRight: 4,
  },
  buildingChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4d7db",
  },
  buildingChipActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  buildingChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#654c54",
  },
  buildingChipTextActive: {
    color: "#fff",
  },
  floorSelectorContainer: {
    marginHorizontal: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  floorSelectorContent: {
    gap: 10,
    paddingHorizontal: 16,
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  floorButton: {
    minWidth: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dccfd3",
    paddingHorizontal: 12,
  },
  floorButtonActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  floorButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#654c54",
  },
  floorButtonTextActive: {
    color: "#fff",
  },
  selectorDisabled: {
    opacity: 0.55,
  },
  // Keeps search + dropdown above the Walking chip (Android elevation draw order).
  searchColumnWrapper: {
    zIndex: 1000,
    elevation: 20,
    backgroundColor: "#fff",
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  /** Only the two field rows + swap; swap top % is relative to this so it stays centered in the gap */
  searchInputsBlock: {
    position: "relative",
    marginBottom: 8,
  },
  inputRowContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputRowContainerStart: {
    marginBottom: 14,
  },
  inputRowContainerDest: {
    marginBottom: 0,
  },
  inputRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  inputRowActive: {
    borderColor: MAROON,
    backgroundColor: "#fff5f5",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    marginLeft: 8,
  },
  mapSelectButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  mapSelectButtonActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  swapButton: {
    position: "absolute",
    right: 44,
    top: "50%",
    marginTop: -16,
    backgroundColor: "#fff",
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectionModeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#fff5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#f0d0d7",
  },
  selectionModeText: {
    marginLeft: 8,
    fontSize: 14,
    color: MAROON,
    fontWeight: "600",
  },
  searchResultsContainer: {
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    maxHeight: 180,
    overflow: "hidden",
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 100,
  },
  searchResultsScroll: {
    maxHeight: 180,
  },
  searchResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchResultText: {
    fontSize: 14,
    color: "#333",
  },
  floorPlanContainer: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f9f5ef",
    borderWidth: 1,
    borderColor: "#e0d8ce",
    minHeight: 250,
    justifyContent: "center",
    alignItems: "center",
  },
  floorPlanScrollContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  mapWrapper: {
    position: "relative",
  },
  floorPlanImage: {
    width: MAP_IMAGE_WIDTH,
    height: MAP_IMAGE_HEIGHT,
  },
  floorPlanImageInspect: {
    width: MAP_IMAGE_WIDTH * MAP_INSPECT_SCALE,
    height: MAP_IMAGE_HEIGHT * MAP_INSPECT_SCALE,
  },
  svgOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  poiMarker: indoorPoiMarkerStyle,
  noFloorPlan: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  noFloorPlanText: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  statItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  statItemRight: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  statValueRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: MAROON,
  },
  statLabel: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff5f5",
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffcccc",
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#dc3545",
  },
  stepsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    letterSpacing: 1,
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  stepNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: MAROON,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  stepNumber: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  stepTextContainer: {
    flex: 1,
  },
  stepText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  stepDistance: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  emptyPrompt: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyPromptText: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  emptyPromptSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: "#bbb",
    textAlign: "center",
  },
  noResultsContainer: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  noResultsText: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  ...indoorPoiLegendStyles,
  accessibilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  accessibilityLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  accessibilityLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginLeft: 8,
  },
  accessibilityLabelActive: {
    color: BLUE,
  },
  accessibilityHint: {
    fontSize: 12,
    color: "#999",
    flex: 1,
    textAlign: "right",
    marginRight: 10,
  },
  transferModeControls: {
    marginHorizontal: 12,
    marginTop: 8,
  },
  transferModeOptionsStandalone: {
    flexDirection: "row",
    gap: 10,
  },
  transferModeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e3c6cf",
    backgroundColor: "#fff",
  },
  transferModeOptionActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  transferModeOptionActiveBlue: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  transferModeOptionText: {
    fontSize: 13,
    fontWeight: "700",
    color: MAROON,
  },
  transferModeOptionTextBlue: {
    color: BLUE,
  },
  transferModeOptionTextActive: {
    color: "#fff",
  },
  journeyPlannerCard: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#faf6f7",
    borderWidth: 1,
    borderColor: "#eadbe0",
  },
  journeyPlannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4b3640",
  },
  journeyPlannerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#7e5160",
  },
  journeyStageRow: {
    gap: 10,
    paddingTop: 12,
    paddingBottom: 4,
    paddingRight: 10,
  },
  journeyStageCard: {
    width: 142,
    minHeight: 112,
    padding: 12,
    borderRadius: 15,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e7d8de",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  journeyStageCardActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  journeyStageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  journeyStageNumberBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    backgroundColor: "rgba(145, 35, 56, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  journeyStageNumberBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  journeyStageNumberText: {
    color: MAROON,
    fontSize: 12,
    fontWeight: "700",
  },
  journeyStageNumberTextActive: {
    color: "#fff",
  },
  journeyStageTitle: {
    fontSize: 13,
    lineHeight: 18,
    color: "#4b3640",
    fontWeight: "700",
    marginTop: 6,
  },
  journeyStageTitleActive: {
    color: "#fff",
  },
  outdoorBridgeCard: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f0f7ff",
    borderWidth: 1,
    borderColor: "#c4ddf5",
    alignItems: "center",
  },
  outdoorBridgeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2c3e50",
    marginTop: 8,
    textAlign: "center",
  },
  outdoorBridgeSubtitle: {
    fontSize: 13,
    color: "#5a7a97",
    marginTop: 4,
    textAlign: "center",
  },
  outdoorBridgeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: MAROON,
    gap: 6,
  },
  outdoorBridgeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  mapStageHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  mapStageActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mapStageTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5d4637",
  },
  inspectToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(145, 35, 56, 0.35)",
    backgroundColor: "#fff",
  },
  inspectToggleActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  inspectToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: MAROON,
  },
  inspectToggleTextActive: {
    color: "#fff",
  },
  mapStageBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#fffaf5",
    borderWidth: 1,
    borderColor: "#e2d5c8",
  },
  mapStageBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: MAROON,
  },
});

IndoorDirectionsScreen.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.object,
  }),
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
    addListener: PropTypes.func,
    getParent: PropTypes.func,
  }),
};
