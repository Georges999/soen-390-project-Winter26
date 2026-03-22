// Mock floor-map assets
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
  classifyRoute,
  buildRouteSegments,
  getBuildingForFloor,
  getVerticalTransitionNodes,
  pickTransitionNode,
  getGroundFloor,
  getBuildingCoords,
} from '../../src/utils/pathfinding/crossFloorRouter';

describe('crossFloorRouter', () => {
  describe('classifyRoute', () => {
    it('returns null for missing rooms', () => {
      expect(classifyRoute(null, null)).toBeNull();
      expect(classifyRoute({ id: 'a', floor: 'Hall-8' }, null)).toBeNull();
    });

    it('returns same-room when ids match', () => {
      const room = { id: 'H837', floor: 'Hall-8' };
      expect(classifyRoute(room, room)).toBe('same-room');
    });

    it('returns same-floor for rooms on same floor', () => {
      expect(classifyRoute(
        { id: 'H837', floor: 'Hall-8' },
        { id: 'H838', floor: 'Hall-8' }
      )).toBe('same-floor');
    });

    it('returns cross-floor for rooms in same building, different floor', () => {
      expect(classifyRoute(
        { id: 'H837', floor: 'Hall-8' },
        { id: 'H961', floor: 'Hall-9' }
      )).toBe('cross-floor');
    });

    it('returns cross-building for rooms in different buildings', () => {
      expect(classifyRoute(
        { id: 'H837', floor: 'Hall-8' },
        { id: 'MB1.210', floor: 'MB-1' }
      )).toBe('cross-building');
    });
  });

  describe('getBuildingForFloor', () => {
    it('returns building info for a known floor', () => {
      const result = getBuildingForFloor('Hall-8');
      expect(result).toEqual({ buildingId: 'hall', campus: 'sgw' });
    });

    it('returns null for unknown floor', () => {
      expect(getBuildingForFloor('NOPE')).toBeNull();
    });
  });

  describe('getVerticalTransitionNodes', () => {
    it('finds stairs and elevators on Hall-8', () => {
      const { stairs, elevators } = getVerticalTransitionNodes('Hall-8');
      expect(stairs.length).toBeGreaterThan(0);
      expect(elevators.length).toBeGreaterThan(0);
    });

    it('returns empty arrays for unknown floor', () => {
      const { stairs, elevators } = getVerticalTransitionNodes('NOPE');
      expect(stairs).toEqual([]);
      expect(elevators).toEqual([]);
    });
  });

  describe('pickTransitionNode', () => {
    it('picks stairs by default', () => {
      const node = pickTransitionNode('Hall-8', 'stairs');
      expect(node).toBeDefined();
      expect(node.type).toBe('stairs');
    });

    it('picks elevator when requested', () => {
      const node = pickTransitionNode('Hall-8', 'elevator');
      expect(node).toBeDefined();
      expect(node.type).toBe('elevator');
    });

    it('returns null for unknown floor', () => {
      expect(pickTransitionNode('NOPE')).toBeNull();
    });
  });

  describe('getGroundFloor', () => {
    it('returns lowest floor for hall building', () => {
      const ground = getGroundFloor('hall');
      expect(ground).toBe('Hall-1');
    });

    it('returns null for unknown building', () => {
      expect(getGroundFloor('unknown')).toBeNull();
    });
  });

  describe('getBuildingCoords', () => {
    it('returns coordinates for hall building', () => {
      const coords = getBuildingCoords('hall');
      expect(coords).toBeDefined();
      expect(coords.latitude).toBeGreaterThan(0);
      expect(coords.longitude).toBeLessThan(0);
    });

    it('returns null for unknown building', () => {
      expect(getBuildingCoords('unknown')).toBeNull();
    });
  });

  describe('buildRouteSegments', () => {
    it('returns empty for same-room', () => {
      const room = { id: 'H837', floor: 'Hall-8' };
      expect(buildRouteSegments(room, room)).toEqual([]);
    });

    it('returns single indoor segment for same-floor', () => {
      const segments = buildRouteSegments(
        { id: 'H837', floor: 'Hall-8' },
        { id: 'H838', floor: 'Hall-8' }
      );
      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe('indoor');
      expect(segments[0].floorId).toBe('Hall-8');
    });

    it('returns indoor + vertical + indoor for cross-floor', () => {
      const segments = buildRouteSegments(
        { id: 'H837', floor: 'Hall-8' },
        { id: 'H961', floor: 'Hall-9' },
        'stairs'
      );
      expect(segments.length).toBeGreaterThanOrEqual(2);

      const types = segments.map((s) => s.type);
      expect(types).toContain('vertical');
      expect(types).toContain('indoor');
    });

    it('includes outdoor segment for cross-building', () => {
      const segments = buildRouteSegments(
        { id: 'H837', floor: 'Hall-8' },
        { id: 'MB1.210', floor: 'MB-1' },
        'stairs'
      );
      const types = segments.map((s) => s.type);
      expect(types).toContain('outdoor');
    });
  });
});
