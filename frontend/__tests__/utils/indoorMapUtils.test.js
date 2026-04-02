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
  buildAllRooms,
  getFilteredRooms,
  getRoomSelectionIndexes,
  getSelectedRoomContext,
} from '../../src/utils/indoorMapUtils';
import { buildings } from '../../src/data/indoorFloorData';

describe('indoorMapUtils', () => {
  const sampleCampusBuildings = [
    {
      id: 'hall',
      name: 'Hall Building',
      rooms: [
        { id: 'H837', label: 'H837', floor: 'Hall-8', campusId: 'sgw', buildingId: 'hall', searchKeys: ['H837', '837'] },
      ],
      floors: [{ id: 'Hall-8', label: '8' }],
    },
    {
      id: 'mb',
      name: 'John Molson Building',
      rooms: [
        { id: 'MB101', label: 'MB101', floor: 'MB-1', campusId: 'sgw', buildingId: 'mb', searchKeys: ['MB101', '101'] },
      ],
      floors: [{ id: 'MB-1', label: '1' }],
    },
  ];

  it('buildAllRooms supports array sources and preserves room campus ids', () => {
    const rooms = buildAllRooms(sampleCampusBuildings);

    expect(rooms).toEqual([
      expect.objectContaining({
        id: 'H837',
        campusId: 'sgw',
        buildingName: 'Hall Building',
        buildingId: 'hall',
      }),
      expect.objectContaining({
        id: 'MB101',
        campusId: 'sgw',
        buildingName: 'John Molson Building',
        buildingId: 'mb',
      }),
    ]);
  });

  it('getFilteredRooms falls back to partial search key matches and building-name matches', () => {
    const rooms = [
      { id: 'A', label: 'Alpha', floor: 'Hall-8', buildingName: 'Hall Building', buildingId: 'hall', campusId: 'sgw', searchKeys: ['ALPHA900'] },
      { id: 'B', label: 'Beta', floor: 'MB-1', buildingName: 'John Molson Building', buildingId: 'mb', campusId: 'sgw', searchKeys: ['BETA'] },
    ];

    expect(getFilteredRooms(rooms, '900')[0].id).toBe('A');
    expect(getFilteredRooms(rooms, 'molson')[0].id).toBe('B');
  });

  it('getFilteredRooms prefers location first for numeric-only queries', () => {
    const rooms = [
      { id: 'MB101', label: '101', floor: 'MB-1', buildingName: 'John Molson Building', buildingId: 'mb', campusId: 'sgw', searchKeys: ['101'] },
      { id: 'H101', label: '101', floor: 'Hall-1', buildingName: 'Hall Building', buildingId: 'hall', campusId: 'sgw', searchKeys: ['101'] },
    ];

    const results = getFilteredRooms(rooms, '101', { preferredBuildingId: 'hall', preferredCampusId: 'sgw' });
    expect(results[0].id).toBe('H101');
  });

  it('getFilteredRooms matches hall rooms when the query includes the building name', () => {
    const rooms = [
      { id: 'H937', label: 'H937', floor: 'Hall-9', buildingName: 'Hall Building', buildingId: 'hall', campusId: 'sgw', searchKeys: ['H937', 'HALL937'] },
    ];

    const results = getFilteredRooms(rooms, 'Hall 937');
    expect(results[0].id).toBe('H937');
  });

  it('getSelectedRoomContext returns floor undefined when the building exists but the floor does not', () => {
    const context = getSelectedRoomContext(sampleCampusBuildings, {
      id: 'H837',
      floor: 'Hall-9',
    });

    expect(context).toEqual({
      building: sampleCampusBuildings[0],
      floor: undefined,
    });
    expect(getSelectedRoomContext(sampleCampusBuildings, { id: 'missing-room', floor: 'Hall-8' })).toBeNull();
  });

  it('getRoomSelectionIndexes returns building index and -1 for missing floors', () => {
    expect(getRoomSelectionIndexes(sampleCampusBuildings, {
      buildingId: 'hall',
      floor: 'Hall-9',
    })).toEqual({
      buildingIdx: 0,
      floorIdx: -1,
    });

    expect(getRoomSelectionIndexes(sampleCampusBuildings, {
      buildingId: 'missing-building',
      floor: 'Hall-8',
    })).toBeNull();
  });

  it('uses the real building dataset for a sanity check search', () => {
    const allRooms = buildAllRooms(buildings);
    const results = getFilteredRooms(allRooms, 'library');

    expect(results.some((room) => room.buildingName === 'Vanier Library')).toBe(true);
  });
});
