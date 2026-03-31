import { buildings } from "../data/indoorFloorData";

function compareText(a = "", b = "") {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function getLocationPreferenceScore(room, preferredBuildingId, preferredCampusId) {
  if (preferredBuildingId && room.buildingId === preferredBuildingId) {
    return 0;
  }

  if (preferredCampusId && room.campusId === preferredCampusId) {
    return 1;
  }

  return 2;
}

function getRoomMatchScore(room, lowerQuery, normalizedQuery) {
  const label = (room.label || "").toLowerCase();
  const id = (room.id || "").toLowerCase();
  const buildingName = (room.buildingName || "").toLowerCase();
  const searchKeys = room.searchKeys || [];
  const hasNormalizedQuery = normalizedQuery.length > 0;

  const exactSearchKeyMatch =
    hasNormalizedQuery && searchKeys.includes(normalizedQuery);
  if (exactSearchKeyMatch || label === lowerQuery || id === lowerQuery) {
    return 0;
  }

  const prefixSearchKeyMatch =
    hasNormalizedQuery &&
    searchKeys.some((key) => key.startsWith(normalizedQuery));
  if (prefixSearchKeyMatch || label.startsWith(lowerQuery) || id.startsWith(lowerQuery)) {
    return 1;
  }

  if (label.includes(lowerQuery) || id.includes(lowerQuery)) {
    return 2;
  }

  if (lowerQuery.length >= 2 && buildingName.includes(lowerQuery)) {
    return 3;
  }

  return Number.POSITIVE_INFINITY;
}

export function buildAllRooms(source = buildings) {
  const campusEntries = Array.isArray(source)
    ? [["", source]]
    : Object.entries(source || {});

  return campusEntries.flatMap(([campusId, campusBuildings]) =>
    (campusBuildings || []).flatMap((building) =>
      (building.rooms || []).map((room) => ({
        ...room,
        campusId: campusId || room.campusId,
        buildingName: building.name,
        buildingId: building.id,
      }))
    )
  );
}

export function getFilteredRooms(allRooms, searchQuery, options = {}) {
  if (!searchQuery.trim()) return [];

  const { preferredBuildingId = null, preferredCampusId = null } = options;
  const lowerQuery = searchQuery.toLowerCase();
  const normalizedQuery = searchQuery.toUpperCase().replaceAll(/[^A-Z0-9]/g, "");
  const preferLocationFirst = /^\d+$/.test(normalizedQuery);

  const canUseSearchKeyContains = normalizedQuery.length >= 2;

  return allRooms
    .map((room) => ({
      room,
      score: getRoomMatchScore(room, lowerQuery, normalizedQuery),
      locationScore: getLocationPreferenceScore(
        room,
        preferredBuildingId,
        preferredCampusId
      ),
    }))
    .filter(({ room, score }) =>
      Number.isFinite(score) ||
      (canUseSearchKeyContains &&
        (room.searchKeys || []).some((key) => key.includes(normalizedQuery)))
    )
    .sort((left, right) => {
      if (preferLocationFirst && left.locationScore !== right.locationScore) {
        return left.locationScore - right.locationScore;
      }

      if (left.score !== right.score) {
        return left.score - right.score;
      }

      if (left.locationScore !== right.locationScore) {
        return left.locationScore - right.locationScore;
      }

      const buildingComparison = compareText(left.room.buildingName, right.room.buildingName);
      if (buildingComparison !== 0) {
        return buildingComparison;
      }

      const floorComparison = compareText(left.room.floor, right.room.floor);
      if (floorComparison !== 0) {
        return floorComparison;
      }

      return compareText(left.room.label, right.room.label);
    })
    .map(({ room }) => room);
}

export function getSelectedRoomContext(campusBuildings, selectedRoom) {
  if (!selectedRoom) return null;

  const building = campusBuildings.find((candidate) =>
    (candidate.rooms || []).some((room) => room.id === selectedRoom.id)
  );
  if (!building) return null;

  const floor = (building.floors || []).find(
    (candidate) => candidate.id === selectedRoom.floor
  );

  return { building, floor };
}

export function getRoomSelectionIndexes(campusBuildings, room) {
  const buildingIdx = campusBuildings.findIndex(
    (building) => building.id === room.buildingId
  );
  if (buildingIdx < 0) return null;

  const floorIdx = (campusBuildings[buildingIdx].floors || []).findIndex(
    (floor) => floor.id === room.floor
  );

  return { buildingIdx, floorIdx };
}

export function getSelectionForLocation(buildingId, floorId, fallbackCampus = "sgw") {
  const matchedCampus =
    Object.entries(buildings).find(([, campusBuildings]) =>
      (campusBuildings || []).some((building) => building.id === buildingId)
    )?.[0] || fallbackCampus;

  const campusBuildings = buildings[matchedCampus] || [];
  const buildingIdx = campusBuildings.findIndex((building) => building.id === buildingId);
  const resolvedBuildingIdx = Math.max(buildingIdx, 0);
  const resolvedBuilding = campusBuildings[resolvedBuildingIdx] || campusBuildings[0];
  const floorIdx = resolvedBuilding?.floors?.findIndex((floor) => floor.id === floorId) ?? 0;

  return {
    campusId: matchedCampus,
    buildingIdx: resolvedBuildingIdx,
    floorIdx: Math.max(floorIdx, 0),
  };
}

export function getInitialSelection(params) {
  const preferredRoom = params.destinationRoom || params.startRoom;
  const buildingId = preferredRoom?.buildingId || params.building?.id || buildings.sgw?.[0]?.id;
  const floorId = preferredRoom?.floor || params.floor?.id || buildings.sgw?.[0]?.floors?.[0]?.id;

  return getSelectionForLocation(buildingId, floorId);
}
