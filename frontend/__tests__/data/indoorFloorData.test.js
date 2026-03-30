// Mock floor-map assets before importing data module.
jest.mock('../../assets/floor-maps/Hall-8-F.png', () => 'hall8img', { virtual: true });
jest.mock('../../assets/floor-maps/Hall-9-F.png', () => 'hall9img', { virtual: true });
jest.mock('../../assets/floor-maps/Hall-1-F.png', () => 'hall1img', { virtual: true });
jest.mock('../../assets/floor-maps/Hall-2-F.png', () => 'hall2img', { virtual: true });
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
  FLOOR_META,
  BUILDING_META,
  getBuildingById,
} from '../../src/data/indoorFloorData';
import { findShortestPath } from '../../src/utils/pathfinding/pathfinding';

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
    expect(data.rooms.some((room) => room.label === 'H837')).toBe(true);
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

  it('keeps the Hall lower-floor elevators connected to the routing graph', () => {
    const hall1 = getFloorGraphData('hall', 'Hall-1');
    const hall2 = getFloorGraphData('hall', 'Hall-2');

    const hall1Path = findShortestPath({
      floorsData: {
        floors: {
          'Hall-1': hall1,
        },
      },
      startNodeId: 'Hall1Red_elevator_001',
      endNodeId: 'Hall1Red_hallway_007',
      accessible: true,
    });

    const hall2Path = findShortestPath({
      floorsData: {
        floors: {
          'Hall-2': hall2,
        },
      },
      startNodeId: 'Hall2Red_elevator_001',
      endNodeId: 'Hall2Red_hallway_086',
      accessible: true,
    });

    expect(hall1Path).toEqual(expect.objectContaining({ ok: true }));
    expect(hall2Path).toEqual(expect.objectContaining({ ok: true }));
  });

  it('returns empty list for getAllNodesForFloor with invalid or missing floor ids', () => {
    expect(getAllNodesForFloor('NOPE')).toEqual([]);
    expect(getAllNodesForFloor()).toEqual([]);
  });

  it('exports buildings as default export', () => {
    const defaultExport = require('../../src/data/indoorFloorData').default;
    expect(defaultExport).toEqual(buildings);
  });

  it('includes new floors (Hall-1, Hall-2, CC-1) in buildings', () => {
    const hall = buildings.sgw.find((b) => b.id === 'hall');
    expect(hall.floors.some((f) => f.id === 'Hall-1')).toBe(true);
    expect(hall.floors.some((f) => f.id === 'Hall-2')).toBe(true);
    const cc = buildings.loyola.find((b) => b.id === 'cc');
    expect(cc).toBeDefined();
    expect(cc.floors.some((f) => f.id === 'CC-1')).toBe(true);
  });

  it('includes new floors in floorImages', () => {
    expect(floorImages['Hall-1']).toBeDefined();
    expect(floorImages['Hall-2']).toBeDefined();
    expect('CC-1' in floorImages).toBe(true); // CC-1 may be null
  });

  it('exports FLOOR_META with entries for new floors', () => {
    expect(FLOOR_META['Hall-1']).toBeDefined();
    expect(FLOOR_META['Hall-1'].buildingId).toBe('hall');
    expect(FLOOR_META['Hall-2']).toBeDefined();
    expect(FLOOR_META['CC-1']).toBeDefined();
    expect(FLOOR_META['CC-1'].campus).toBe('loyola');
  });

  it('exports BUILDING_META with floor lists', () => {
    expect(BUILDING_META.hall.floors).toContain('Hall-1');
    expect(BUILDING_META.hall.floors).toContain('Hall-8');
    expect(BUILDING_META.cc.floors).toContain('CC-1');
  });

  it('getBuildingById returns building object', () => {
    const hall = getBuildingById('hall');
    expect(hall).toBeDefined();
    expect(hall.id).toBe('hall');
    expect(hall.floors.length).toBeGreaterThan(0);
  });

  it('getBuildingById returns null for unknown id', () => {
    expect(getBuildingById('nope')).toBeNull();
  });
});
