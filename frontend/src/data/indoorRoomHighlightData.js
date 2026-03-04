const roomHighlightCoordinates = {
  "Hall-8": {
    H837: { x: 369.29, y: 154.82 },
    H835: { x: 277.92, y: 156.09 },
    H833: { x: 185.28, y: 157.36 },
    H831: { x: 111.68, y: 149.75 },
    H829: { x: 135.79, y: 258.88 },
    H827: { x: 131.98, y: 407.36 },
    H820: { x: 220.81, y: 553.3 },
    H861: { x: 868.72, y: 689.76 },
  },
  "Hall-9": {
    H937: { x: 388.15, y: 256.74 },
    H935: { x: 314.93, y: 184.34 },
    H933: { x: 260.34, y: 150.03 },
    H931: { x: 172.24, y: 186.02 },
    H929: { x: 185.89, y: 147.55 },
    H927: { x: 164.79, y: 277.84 },
    H961: { x: 864.37, y: 715.96 },
    H920: { x: 255.38, y: 537.18 },
  },
  "MB-1": {
    MB1210: { x: 633.78, y: 409.2 },
  },
  "MB-S2": {
    MBS2210: { x: 580.51, y: 398.31 },
    MBS2330: { x: 747.58, y: 395.88 },
  },
  "VL-1": {
    VL101: { x: 586.82, y: 662.28 },
  },
  "VL-2": {
    VL201: { x: 766.74, y: 529.43 },
  },
};

function normalizeRoomLabel(label = "") {
  return label.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function getRoomHighlightPoint(floorId, roomLabel) {
  if (!floorId || !roomLabel) return null;

  const floorCoordinates = roomHighlightCoordinates[floorId];
  if (!floorCoordinates) return null;

  return floorCoordinates[normalizeRoomLabel(roomLabel)] ?? null;
}

export { roomHighlightCoordinates, normalizeRoomLabel };
