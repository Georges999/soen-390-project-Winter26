import { FLOOR_META, getBuildingById } from "../../data/indoorFloorData";

function getFloorLabel(floorId) {
  return FLOOR_META[floorId]?.floorLabel || floorId || "?";
}

function getBuildingName(buildingId) {
  return getBuildingById(buildingId)?.name || buildingId?.toUpperCase() || "building";
}

function getTransitionLabel(transitionType) {
  return transitionType === "elevator" ? "elevator" : "stairs";
}

function buildIndoorStageDescription(segment, startRoom, destRoom) {
  const floorLabel = getFloorLabel(segment.floorId);

  if (segment.fromNodeId === startRoom?.id && segment.toNodeId === destRoom?.id) {
    return `Walk directly to ${destRoom?.label || "your destination"} on Floor ${floorLabel}.`;
  }

  if (segment.fromNodeId === startRoom?.id) {
    return `Leave ${startRoom?.label || "your start point"} and follow the path to the floor connector.`;
  }

  if (segment.toNodeId === destRoom?.id) {
    return `Continue on Floor ${floorLabel} and finish at ${destRoom?.label || "your destination"}.`;
  }

  return `Follow the indoor path across Floor ${floorLabel}.`;
}

function buildVerticalStageDescription(segment) {
  const transitionLabel = getTransitionLabel(segment.transitionType);
  return `Use the ${transitionLabel} in ${getBuildingName(segment.buildingId)} to go from Floor ${getFloorLabel(segment.fromFloor)} to Floor ${getFloorLabel(segment.toFloor)}.`;
}

function buildOutdoorStageDescription(segment) {
  return `Exit ${getBuildingName(segment.fromBuildingId)} and continue outside to ${getBuildingName(segment.toBuildingId)}.`;
}

export function buildIndoorStage(segment, index, startRoom, destRoom) {
  return {
    id: `journey-stage-${index}`,
    segmentIndex: index,
    type: "indoor",
    icon: "directions-walk",
    shortLabel: `Floor ${getFloorLabel(segment.floorId)}`,
    title: `Walk on Floor ${getFloorLabel(segment.floorId)}`,
    description: buildIndoorStageDescription(segment, startRoom, destRoom),
    mapBuildingId: segment.buildingId,
    mapFloorId: segment.floorId,
  };
}

export function buildVerticalStage(segment, index) {
  return {
    id: `journey-stage-${index}`,
    segmentIndex: index,
    type: "vertical",
    icon: segment.transitionType === "elevator" ? "elevator" : "stairs",
    shortLabel: `${getFloorLabel(segment.fromFloor)} -> ${getFloorLabel(segment.toFloor)}`,
    title: `Take the ${getTransitionLabel(segment.transitionType)}`,
    description: buildVerticalStageDescription(segment),
    mapBuildingId: segment.buildingId,
    mapFloorId: segment.fromFloor,
    destinationFloorId: segment.toFloor,
  };
}

export function buildOutdoorStage(segment, index) {
  return {
    id: `journey-stage-${index}`,
    segmentIndex: index,
    type: "outdoor",
    icon: "directions-walk",
    shortLabel: "Outside",
    title: "Outdoor transfer",
    description: buildOutdoorStageDescription(segment),
    mapBuildingId: null,
    mapFloorId: null,
    destinationBuildingId: segment.toBuildingId,
  };
}

export function buildJourneyStages(routeSegments, startRoom, destRoom) {
  const segments = routeSegments ?? [];

  return segments.map((segment, index) => {
    if (segment.type === "indoor") {
      return buildIndoorStage(segment, index, startRoom, destRoom);
    }

    if (segment.type === "vertical") {
      return buildVerticalStage(segment, index);
    }

    return buildOutdoorStage(segment, index);
  });
}

export function getDefaultJourneyStage(stages = []) {
  return stages.find((stage) => stage.type === "indoor") || stages[0] || null;
}

export function getJourneyMapStage(stages = [], activeStageId = null) {
  if (!stages.length) return null;

  const activeIndex = stages.findIndex((stage) => stage.id === activeStageId);
  const normalizedIndex = Math.max(activeIndex, 0);
  const activeStage = stages[normalizedIndex];

  if (activeStage?.mapBuildingId && activeStage?.mapFloorId) {
    return activeStage;
  }

  for (let offset = 1; offset < stages.length; offset += 1) {
    const previousStage = stages[normalizedIndex - offset];
    if (previousStage?.mapBuildingId && previousStage?.mapFloorId) {
      return previousStage;
    }

    const nextStage = stages[normalizedIndex + offset];
    if (nextStage?.mapBuildingId && nextStage?.mapFloorId) {
      return nextStage;
    }
  }

  return null;
}

export function buildJourneyStats(
  routeSegmentsOrTransitionPref = [],
  transitionPrefOrAccessibleRoute = null,
  accessibleRouteOrRouteSegments = false
) {
  const routeSegments = Array.isArray(routeSegmentsOrTransitionPref)
    ? routeSegmentsOrTransitionPref
    : Array.isArray(accessibleRouteOrRouteSegments)
      ? accessibleRouteOrRouteSegments
      : [];
  const transitionPref = Array.isArray(routeSegmentsOrTransitionPref)
    ? transitionPrefOrAccessibleRoute
    : routeSegmentsOrTransitionPref;
  const accessibleRoute = Array.isArray(routeSegmentsOrTransitionPref)
    ? accessibleRouteOrRouteSegments
    : transitionPrefOrAccessibleRoute;

  const floorTransfers = routeSegments.filter((segment) => segment.type === "vertical").length;
  const outdoorTransfers = routeSegments.filter((segment) => segment.type === "outdoor").length;
  const activeTransition = getTransitionLabel(
    transitionPref || (accessibleRoute ? "elevator" : "stairs")
  );

  const stats = [];

  if (floorTransfers > 0) {
    stats.push(
      `${floorTransfers} floor transfer${floorTransfers === 1 ? "" : "s"}`,
      `Using ${activeTransition}`
    );
  }

  if (outdoorTransfers > 0) {
    stats.push(`${outdoorTransfers} outdoor segment${outdoorTransfers === 1 ? "" : "s"}`);
  }

  return stats;
}

export { getBuildingName, getFloorLabel, getTransitionLabel };
