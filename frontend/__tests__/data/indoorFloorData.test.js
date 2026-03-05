// Mock floor-map assets before importing data module.
jest.mock('../../assets/floor-maps/Hall-8-F.png', () => 'hall8img', { virtual: true });
jest.mock('../../assets/floor-maps/Hall-9-F.png', () => 'hall9img', { virtual: true });
jest.mock('../../assets/floor-maps/MB-1.png', () => 'mb1img', { virtual: true });
jest.mock('../../assets/floor-maps/MB-S2.png', () => 'mbs2img', { virtual: true });
jest.mock('../../assets/floor-maps/VE-2-F.png', () => 've2img', { virtual: true });
jest.mock('../../assets/floor-maps/VL-1-F.png', () => 'vl1img', { virtual: true });
jest.mock('../../assets/floor-maps/VL-2-F.png', () => 'vl2img', { virtual: true });

import {
  buildings,
  floorImages,
  POI_ICONS,
  getFloorGraphData,
  getRoomsForFloor,
  getAllNodesForFloor,
} from '../../src/data/indoorFloorData';

describe('indoorFloorData', () => {
  it('exports buildings grouped by campus', () => {
    expect(Array.isArray(buildings.sgw)).toBe(true);
    expect(Array.isArray(buildings.loyola)).toBe(true);
    expect(buildings.sgw.find((b) => b.id === 'hall')).toBeDefined();
    expect(buildings.sgw.find((b) => b.id === 'mb')).toBeDefined();
    expect(buildings.loyola.find((b) => b.id === 'vl')).toBeDefined();
    expect(buildings.loyola.find((b) => b.id === 've')).toBeDefined();
  });

  it('exports floor images for all known floor ids', () => {
    expect(Object.keys(floorImages)).toEqual(
      expect.arrayContaining(['Hall-8', 'Hall-9', 'MB-S2', 'MB-1', 'VL-1', 'VL-2', 'VE-2'])
    );
  });

  it('exports expected POI icon metadata', () => {
    expect(POI_ICONS).toEqual(
      expect.objectContaining({
        washroom: { icon: 'wc', label: 'Washroom' },
        water: { icon: 'water-drop', label: 'Water' },
        stairs: { icon: 'stairs', label: 'Stairs' },
        elevator: { icon: 'elevator', label: 'Elevator' },
        escalator: { icon: 'escalator', label: 'Escalator' },
        metro: { icon: 'subway', label: 'Metro' },
      })
    );
  });

  it('returns graph data for valid building/floor ids', () => {
    const data = getFloorGraphData('hall', 'Hall-8');
    expect(Array.isArray(data.nodes)).toBe(true);
    expect(Array.isArray(data.rooms)).toBe(true);
    expect(Array.isArray(data.pois)).toBe(true);
    expect(Array.isArray(data.edges)).toBe(true);
    expect(data.width).toBeGreaterThan(0);
    expect(data.height).toBeGreaterThan(0);
    expect(data.rooms.some((room) => room.label === 'H-837')).toBe(true);
  });

  it('returns empty/default floor data for invalid building/floor ids', () => {
    const data = getFloorGraphData('unknown-building', 'unknown-floor');
    expect(data).toEqual({
      nodes: [],
      rooms: [],
      pois: [],
      edges: [],
      width: 1000,
      height: 1000,
    });
  });

  it('returns empty/default floor data when arguments are missing', () => {
    expect(getFloorGraphData()).toEqual({
      nodes: [],
      rooms: [],
      pois: [],
      edges: [],
      width: 1000,
      height: 1000,
    });
    expect(getFloorGraphData('hall')).toEqual({
      nodes: [],
      rooms: [],
      pois: [],
      edges: [],
      width: 1000,
      height: 1000,
    });
  });

  it('returns rooms for a valid floor and annotates with building metadata', () => {
    const rooms = getRoomsForFloor('Hall-8');
    expect(rooms.length).toBeGreaterThan(0);
    rooms.forEach((room) => {
      expect(room.floor).toBe('Hall-8');
      expect(room.buildingId).toBe('hall');
      expect(room.buildingName).toBe('Hall Building');
    });
  });

  it('returns empty rooms for invalid or missing floor ids', () => {
    expect(getRoomsForFloor('NOPE')).toEqual([]);
    expect(getRoomsForFloor()).toEqual([]);
  });

  it('returns all floor nodes (hallways + rooms + pois) for a valid floor', () => {
    const nodes = getAllNodesForFloor('Hall-8');
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.some((node) => node.type === 'hallway')).toBe(true);
    expect(nodes.some((node) => node.type === 'classroom')).toBe(true);
    expect(nodes.some((node) => node.type === 'elevator' || node.type === 'washroom')).toBe(true);
  });

  it('returns empty list for getAllNodesForFloor with invalid or missing floor ids', () => {
    expect(getAllNodesForFloor('NOPE')).toEqual([]);
    expect(getAllNodesForFloor()).toEqual([]);
  });

  it('exports buildings as default export', () => {
    const defaultExport = require('../../src/data/indoorFloorData').default;
    expect(defaultExport).toEqual(buildings);
  });
});
