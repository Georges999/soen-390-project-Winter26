// Mock the floor plan images before importing data
jest.mock('../../assets/floor-maps/Hall-8-F.png', () => 'hall8img', { virtual: true });
jest.mock('../../assets/floor-maps/Hall-9-F.png', () => 'hall9img', { virtual: true });
jest.mock('../../assets/floor-maps/MB-1.png', () => 'mb1img', { virtual: true });
jest.mock('../../assets/floor-maps/MB-S2.png', () => 'mbs2img', { virtual: true });
jest.mock('../../assets/floor-maps/VE-2-F.png', () => 've2img', { virtual: true });
jest.mock('../../assets/floor-maps/VL-1-F.png', () => 'vl1img', { virtual: true });
jest.mock('../../assets/floor-maps/VL-2-F.png', () => 'vl2img', { virtual: true });

import { buildings, floorImages, POI_ICONS, getFloorGraphData, getRoomsForFloor, getAllNodesForFloor } from '../../src/data/indoorFloorData';

describe('indoorFloorData', () => {
  // --- Exports ---

  it('should export buildings object', () => {
    expect(buildings).toBeDefined();
    expect(typeof buildings).toBe('object');
  });

  it('should export floorImages object', () => {
    expect(floorImages).toBeDefined();
    expect(typeof floorImages).toBe('object');
  });

  it('should export POI_ICONS object', () => {
    expect(POI_ICONS).toBeDefined();
    expect(typeof POI_ICONS).toBe('object');
  });

  // --- Campus structure ---

  it('should have sgw and loyola campuses', () => {
    expect(buildings.sgw).toBeDefined();
    expect(buildings.loyola).toBeDefined();
    expect(Array.isArray(buildings.sgw)).toBe(true);
    expect(Array.isArray(buildings.loyola)).toBe(true);
  });

  // --- SGW Buildings ---

  it('should have Hall Building in SGW', () => {
    const hall = buildings.sgw.find((b) => b.id === 'hall');
    expect(hall).toBeDefined();
    expect(hall.name).toBe('Hall Building');
    expect(hall.label).toBe('H');
  });

  it('should have John Molson Building in SGW', () => {
    const mb = buildings.sgw.find((b) => b.id === 'mb');
    expect(mb).toBeDefined();
    expect(mb.name).toBe('John Molson Building');
    expect(mb.label).toBe('MB');
  });

  // --- Loyola Buildings ---

  it('should have Vanier Library in Loyola', () => {
    const vl = buildings.loyola.find((b) => b.id === 'vl');
    expect(vl).toBeDefined();
    expect(vl.name).toBe('Vanier Library');
    expect(vl.label).toBe('VL');
  });

  it('should have Vanier Extension in Loyola', () => {
    const ve = buildings.loyola.find((b) => b.id === 've');
    expect(ve).toBeDefined();
    expect(ve.name).toBe('Vanier Extension');
    expect(ve.label).toBe('VE');
  });

  // --- Floors ---

  it('should have 2 floors for Hall Building', () => {
    const hall = buildings.sgw.find((b) => b.id === 'hall');
    expect(hall.floors).toHaveLength(2);
    expect(hall.floors[0].id).toBe('Hall-8');
    expect(hall.floors[1].id).toBe('Hall-9');
  });

  it('should have 2 floors for John Molson Building', () => {
    const mb = buildings.sgw.find((b) => b.id === 'mb');
    expect(mb.floors).toHaveLength(2);
    expect(mb.floors[0].id).toBe('MB-S2');
    expect(mb.floors[1].id).toBe('MB-1');
  });

  it('should have 2 floors for Vanier Library', () => {
    const vl = buildings.loyola.find((b) => b.id === 'vl');
    expect(vl.floors).toHaveLength(2);
    expect(vl.floors[0].id).toBe('VL-1');
    expect(vl.floors[1].id).toBe('VL-2');
  });

  it('should have 1 floor for Vanier Extension', () => {
    const ve = buildings.loyola.find((b) => b.id === 've');
    expect(ve.floors).toHaveLength(1);
    expect(ve.floors[0].id).toBe('VE-2');
  });

  it('should have floor labels for each floor', () => {
    const hall = buildings.sgw.find((b) => b.id === 'hall');
    expect(hall.floors[0].label).toBe('8');
    expect(hall.floors[1].label).toBe('9');
  });

  it('should have floor numbers for each floor', () => {
    const hall = buildings.sgw.find((b) => b.id === 'hall');
    expect(hall.floors[0].floorNumber).toBe(8);
    expect(hall.floors[1].floorNumber).toBe(9);
  });

  it('should have image references for each floor', () => {
    const hall = buildings.sgw.find((b) => b.id === 'hall');
    expect(hall.floors[0].image).toBeDefined();
    expect(hall.floors[1].image).toBeDefined();
  });

  // --- Rooms ---

  it('should have rooms for Hall Building', () => {
    const hall = buildings.sgw.find((b) => b.id === 'hall');
    expect(hall.rooms.length).toBeGreaterThan(0);
  });

  it('should have rooms assigned to correct floors', () => {
    const hall = buildings.sgw.find((b) => b.id === 'hall');
    const floor8Rooms = hall.rooms.filter((r) => r.floor === 'Hall-8');
    const floor9Rooms = hall.rooms.filter((r) => r.floor === 'Hall-9');
    expect(floor8Rooms.length).toBeGreaterThan(0);
    expect(floor9Rooms.length).toBeGreaterThan(0);
  });

  it('should have id, label, and floor for each room', () => {
    const hall = buildings.sgw.find((b) => b.id === 'hall');
    hall.rooms.forEach((room) => {
      expect(room.id).toBeDefined();
      expect(room.label).toBeDefined();
      expect(room.floor).toBeDefined();
    });
  });

  it('should have rooms for MB Building', () => {
    const mb = buildings.sgw.find((b) => b.id === 'mb');
    expect(mb.rooms.length).toBeGreaterThan(0);
  });

  it('should have rooms for Vanier Library', () => {
    const vl = buildings.loyola.find((b) => b.id === 'vl');
    expect(vl.rooms.length).toBeGreaterThan(0);
  });

  it('should have rooms for Vanier Extension', () => {
    const ve = buildings.loyola.find((b) => b.id === 've');
    expect(ve.rooms.length).toBeGreaterThan(0);
  });

  // --- Floor Images ---

  it('should have all 7 floor images', () => {
    expect(Object.keys(floorImages)).toHaveLength(7);
  });

  it('should have specific floor image keys', () => {
    expect(floorImages['Hall-8']).toBeDefined();
    expect(floorImages['Hall-9']).toBeDefined();
    expect(floorImages['MB-1']).toBeDefined();
    expect(floorImages['MB-S2']).toBeDefined();
    expect(floorImages['VE-2']).toBeDefined();
    expect(floorImages['VL-1']).toBeDefined();
    expect(floorImages['VL-2']).toBeDefined();
  });

  // --- POI Icons ---

  it('should have 6 POI types', () => {
    expect(Object.keys(POI_ICONS)).toHaveLength(6);
  });

  it('should have washroom POI', () => {
    expect(POI_ICONS.washroom).toEqual({ icon: 'wc', label: 'Washroom' });
  });

  it('should have water POI', () => {
    expect(POI_ICONS.water).toEqual({ icon: 'water-drop', label: 'Water' });
  });

  it('should have stairs POI', () => {
    expect(POI_ICONS.stairs).toEqual({ icon: 'stairs', label: 'Stairs' });
  });

  it('should have elevator POI', () => {
    expect(POI_ICONS.elevator).toEqual({ icon: 'elevator', label: 'Elevator' });
  });

  it('should have escalator POI', () => {
    expect(POI_ICONS.escalator).toEqual({ icon: 'escalator', label: 'Escalator' });
  });

  it('should have metro POI', () => {
    expect(POI_ICONS.metro).toEqual({ icon: 'subway', label: 'Metro' });
  });

  it('should have icon and label for every POI type', () => {
    Object.values(POI_ICONS).forEach((poi) => {
      expect(poi.icon).toBeDefined();
      expect(typeof poi.icon).toBe('string');
      expect(poi.label).toBeDefined();
      expect(typeof poi.label).toBe('string');
    });
  });

  // --- Default export ---

  it('should have default export equal to buildings', () => {
    const defaultExport = require('../../src/data/indoorFloorData').default;
    expect(defaultExport).toEqual(buildings);
  });

  // --- New exports ---

  it('should export getFloorGraphData function', () => {
    expect(typeof getFloorGraphData).toBe('function');
  });

  it('should export getRoomsForFloor function', () => {
    expect(typeof getRoomsForFloor).toBe('function');
  });

  it('should export getAllNodesForFloor function', () => {
    expect(typeof getAllNodesForFloor).toBe('function');
  });

  it('should return floor graph data for a valid building and floor', () => {
    const data = getFloorGraphData('hall', 'Hall-8');
    expect(data).toBeDefined();
    expect(Array.isArray(data.nodes)).toBe(true);
    expect(Array.isArray(data.rooms)).toBe(true);
    expect(Array.isArray(data.pois)).toBe(true);
    expect(Array.isArray(data.edges)).toBe(true);
  });

  it('should return empty data for invalid building', () => {
    const data = getFloorGraphData('nonexistent', 'Hall-8');
    expect(data.nodes).toEqual([]);
    expect(data.rooms).toEqual([]);
  });

  it('should return rooms for a valid floor', () => {
    const rooms = getRoomsForFloor('Hall-8');
    expect(rooms.length).toBeGreaterThan(0);
    rooms.forEach((room) => {
      expect(room.buildingId).toBeDefined();
      expect(room.buildingName).toBeDefined();
    });
  });

  it('should return empty array for invalid floor', () => {
    const rooms = getRoomsForFloor('Nonexistent-1');
    expect(rooms).toEqual([]);
  });

  it('should return all nodes for a valid floor', () => {
    const nodes = getAllNodesForFloor('Hall-8');
    expect(nodes.length).toBeGreaterThan(0);
  });

  it('should return empty array for invalid floor in getAllNodesForFloor', () => {
    const nodes = getAllNodesForFloor('Nonexistent-1');
    expect(nodes).toEqual([]);
  });

  // --- Floor graph data structure ---

  it('should include width and height in floor data', () => {
    const hall = buildings.sgw.find((b) => b.id === 'hall');
    expect(hall.floors[0].width).toBeDefined();
    expect(hall.floors[0].height).toBeDefined();
  });

  it('should include nodes in floor data', () => {
    const hall = buildings.sgw.find((b) => b.id === 'hall');
    expect(Array.isArray(hall.floors[0].nodes)).toBe(true);
  });

  it('should include edges in floor data', () => {
    const hall = buildings.sgw.find((b) => b.id === 'hall');
    expect(Array.isArray(hall.floors[0].edges)).toBe(true);
  });

  it('should include pois in floor data', () => {
    const hall = buildings.sgw.find((b) => b.id === 'hall');
    expect(Array.isArray(hall.floors[0].pois)).toBe(true);
  });
});
