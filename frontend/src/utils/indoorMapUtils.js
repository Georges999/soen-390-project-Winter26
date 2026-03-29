import { buildings } from "../data/indoorFloorData";

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

export function getFilteredRooms(allRooms, searchQuery) {
  if (!searchQuery.trim()) return [];

  const lowerQuery = searchQuery.toLowerCase();
  const normalizedQuery = searchQuery.toUpperCase().replaceAll(/[^A-Z0-9]/g, "");

  return allRooms.filter(
    (room) =>
      (room.label || "").toLowerCase().includes(lowerQuery) ||
      (room.id || "").toLowerCase().includes(lowerQuery) ||
      (room.buildingName || "").toLowerCase().includes(lowerQuery) ||
      (room.searchKeys || []).some((key) => key.includes(normalizedQuery))
  );
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
