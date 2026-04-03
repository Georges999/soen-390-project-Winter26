const hallMappings = require("../../../Floor_Mapping/indoor/Json_Files/Hall9thMapping.json");
const hall1stMappings = require("../../../Floor_Mapping/indoor/Json_Files/Hall1stMapping.json");
const hall2ndMappings = require("../../../Floor_Mapping/indoor/Json_Files/Hall2ndMapping.json");
const mbFloor1Mapping = require("../../../Floor_Mapping/indoor/Json_Files/floorplan-MP1.json");
const mbBasementMapping = require("../../../Floor_Mapping/indoor/Json_Files/floorplan-MBS2.json");
const loyolaMappings = require("../../../Floor_Mapping/indoor/Json_Files/VLF2-Floor-Plan.json");
const cc1Mapping = require("../../../Floor_Mapping/indoor/Json_Files/CC1-FloorPlan.json");

const FLOOR_ID_ALIASES = {
  "Hall-1-Red": "Hall-1",
  "Hall-2-Red": "Hall-2",
  "Hall-8": "Hall-8",
  "Hall-9": "Hall-9",
  "MB-1-annotated": "MB-1",
  "MB-S2-copy": "MB-S2",
  "CC1-red": "CC-1",
  "VL-1-annotated": "VL-1",
  "VL-2-annotated": "VL-2",
  "VE-2-annotated": "VE-2",
};

const MAPPING_SOURCES = [
  hallMappings,
  hall1stMappings,
  hall2ndMappings,
  mbFloor1Mapping,
  mbBasementMapping,
  loyolaMappings,
  cc1Mapping,
];

function normalizeRoomLabel(label = "") {
  return label.toUpperCase().replaceAll(/[^A-Z0-9]/g, "");
}

function extractNumericLabel(rawLabel = "") {
  const parts = String(rawLabel).match(/\d+/g) || [];
  if (!parts.length) return "";
  return parts.join("-");
}

function formatRoomLabel(floorId, label = "") {
  const raw = String(label).trim();

  if (floorId.startsWith("Hall-")) {
    return raw.replaceAll("-", "");
  }

  if (floorId === "MB-1") {
    return raw.replaceAll(/\s+/g, "");
  }

  if (floorId === "MB-S2") {
    return raw.startsWith("S2") ? `MB${raw}` : raw.replaceAll(/\s+/g, "");
  }

  if (floorId.startsWith("VL-")) {
    const withoutPrefix = raw.replace(/^VLF\d-?/i, "");
    const numeric = extractNumericLabel(withoutPrefix);
    return numeric || raw;
  }

  if (floorId.startsWith("VE-")) {
    const withoutPrefix = raw.replace(/^VE-?/i, "");
    const numeric = extractNumericLabel(withoutPrefix);
    return numeric || raw;
  }

  if (floorId.startsWith("CC-")) {
    const withoutPrefix = raw.replace(/^CC1-?red-?/i, "").replace(/^CC-?/i, "");
    const numeric = extractNumericLabel(withoutPrefix);
    return numeric || raw;
  }

  return raw;
}

function getRoomAliases(floorId, label) {
  const normalized = normalizeRoomLabel(label);
  const formatted = formatRoomLabel(floorId, label);
  const aliases = [normalized, normalizeRoomLabel(formatted)];

  if (floorId.startsWith("Hall-")) {
    const hallMatch = /^H?(\d{3,})$/.exec(normalizeRoomLabel(formatted));
    if (hallMatch) {
      aliases.push(`HALL${hallMatch[1]}`);
    }
  }

  if (floorId.startsWith("MB-") && !normalized.startsWith("MB")) {
    aliases.push(`MB${normalized}`);
  }

  if (floorId.startsWith("VL-")) {
    const vlMatch = /^VLF\d\D*(\d{3,})/.exec(String(label).toUpperCase());
    if (vlMatch) {
      aliases.push(`VL${vlMatch[1]}`, vlMatch[1]);
    }
  }

  if (floorId.startsWith("VE-")) {
    const veMatch = /^VE\D*(\d{3,})/.exec(String(label).toUpperCase());
    if (veMatch) {
      aliases.push(`VE${veMatch[1]}`, veMatch[1]);
    }
  }

  if (floorId.startsWith("CC-")) {
    const ccMatch = /\d{3,}/.exec(String(label));
    if (ccMatch) {
      aliases.push(`CC${ccMatch[0]}`, ccMatch[0]);
    }
  }

  return [...new Set(aliases.filter(Boolean))];
}

function getSearchKeys(floorId, rawLabel, displayLabel) {
  const keys = [
    normalizeRoomLabel(rawLabel),
    normalizeRoomLabel(displayLabel),
    ...getRoomAliases(floorId, rawLabel),
  ];

  return [...new Set(keys)];
}

function addRoomCoordinate(target, floorId, room) {
  if (!room?.label || typeof room.x !== "number" || typeof room.y !== "number") {
    return;
  }

  if (!target[floorId]) {
    target[floorId] = {};
  }

  getRoomAliases(floorId, room.label).forEach((alias) => {
    if (!target[floorId][alias]) {
      target[floorId][alias] = { x: room.x, y: room.y };
    }
  });

  const normalizedRoomId = normalizeRoomLabel(room.id);
  if (normalizedRoomId && !target[floorId][normalizedRoomId]) {
    target[floorId][normalizedRoomId] = { x: room.x, y: room.y };
  }
}

function addFloorRoom(target, floorId, room) {
  if (!room?.label || !room?.id) {
    return;
  }

  if (!target[floorId]) {
    target[floorId] = [];
  }

  if (target[floorId].some((candidate) => candidate.id === room.id)) {
    return;
  }

  const label = formatRoomLabel(floorId, room.label);

  target[floorId].push({
    id: room.id,
    label,
    floor: floorId,
    rawLabel: room.label,
    searchKeys: getSearchKeys(floorId, room.label, label),
  });
}

const roomHighlightCoordinates = MAPPING_SOURCES.reduce((accumulator, source) => {
  const floors = source?.floors ?? {};

  Object.entries(floors).forEach(([rawFloorId, floorData]) => {
    const floorId = FLOOR_ID_ALIASES[rawFloorId];
    if (!floorId) return;

    (floorData?.rooms ?? []).forEach((room) =>
      addRoomCoordinate(accumulator, floorId, room)
    );
  });

  return accumulator;
}, {});

const roomsByFloor = MAPPING_SOURCES.reduce((accumulator, source) => {
  const floors = source?.floors ?? {};

  Object.entries(floors).forEach(([rawFloorId, floorData]) => {
    const floorId = FLOOR_ID_ALIASES[rawFloorId];
    if (!floorId) return;

    (floorData?.rooms ?? []).forEach((room) =>
      addFloorRoom(accumulator, floorId, room)
    );
  });

  return accumulator;
}, {});

export function getRoomHighlightPoint(floorId, roomReference) {
  if (!floorId || !roomReference) return null;

  const floorCoordinates = roomHighlightCoordinates[floorId];
  if (!floorCoordinates) return null;

  const roomIdKey =
    typeof roomReference === "object" ? normalizeRoomLabel(roomReference.id) : "";
  if (roomIdKey && floorCoordinates[roomIdKey]) {
    return floorCoordinates[roomIdKey];
  }

  const roomLabel =
    typeof roomReference === "object" ? roomReference.label : roomReference;

  return floorCoordinates[normalizeRoomLabel(roomLabel)] ?? null;
}

export function getRoomsForFloor(floorId) {
  return roomsByFloor[floorId] ?? [];
}

export {
  roomHighlightCoordinates,
  roomsByFloor,
  normalizeRoomLabel,
  formatRoomLabel,
  getRoomAliases,
};
