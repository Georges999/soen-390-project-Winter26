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
  buildJourneyStages,
  buildJourneyStats,
  getBuildingName,
  getDefaultJourneyStage,
  getFloorLabel,
  getJourneyMapStage,
  getTransitionLabel,
} from '../../src/utils/pathfinding/navigationJourney';

describe('navigationJourney', () => {
  const startRoom = { id: 'Hall8_classroom_002', label: 'H837', floor: 'Hall-8', buildingId: 'hall' };
  const destRoom = { id: 'Hall9_classroom_001', label: 'H961', floor: 'Hall-9', buildingId: 'hall' };

  it('builds indoor, vertical, and outdoor stages with descriptive labels', () => {
    const stages = buildJourneyStages([
      {
        type: 'indoor',
        floorId: 'Hall-8',
        buildingId: 'hall',
        fromNodeId: startRoom.id,
        toNodeId: 'Hall8_stairs_001',
      },
      {
        type: 'vertical',
        buildingId: 'hall',
        fromFloor: 'Hall-8',
        toFloor: 'Hall-9',
        transitionType: 'stairs',
      },
      {
        type: 'outdoor',
        fromBuildingId: 'hall',
        toBuildingId: 'mb',
      },
    ], startRoom, destRoom);

    expect(stages[0]).toEqual(expect.objectContaining({
      shortLabel: 'Floor 8',
      title: 'Walk on Floor 8',
      description: 'Leave H837 and follow the path to the floor connector.',
      mapBuildingId: 'hall',
      mapFloorId: 'Hall-8',
    }));
    expect(stages[1]).toEqual(expect.objectContaining({
      shortLabel: '8 -> 9',
      title: 'Take the stairs',
      description: 'Use the stairs in Hall Building to go from Floor 8 to Floor 9.',
      destinationFloorId: 'Hall-9',
    }));
    expect(stages[2]).toEqual(expect.objectContaining({
      shortLabel: 'Outside',
      title: 'Outdoor transfer',
      description: 'Exit Hall Building and continue outside to John Molson Building.',
      destinationBuildingId: 'mb',
    }));
  });

  it('covers the direct, finishing, and generic indoor descriptions', () => {
    const sameFloorDestination = {
      id: 'Hall8_classroom_010',
      label: 'H810',
      floor: 'Hall-8',
      buildingId: 'hall',
    };

    const directStage = buildJourneyStages([
      {
        type: 'indoor',
        floorId: 'Hall-8',
        buildingId: 'hall',
        fromNodeId: startRoom.id,
        toNodeId: sameFloorDestination.id,
      },
    ], startRoom, sameFloorDestination);

    const finishingAndGenericStages = buildJourneyStages([
      {
        type: 'indoor',
        floorId: 'Hall-9',
        buildingId: 'hall',
        fromNodeId: 'Hall9_stairs_001',
        toNodeId: destRoom.id,
      },
      {
        type: 'indoor',
        floorId: 'Hall-9',
        buildingId: 'hall',
        fromNodeId: 'Hall9_hallway_001',
        toNodeId: 'Hall9_hallway_002',
      },
    ], startRoom, destRoom);

    expect(directStage[0].description).toBe('Walk directly to H810 on Floor 8.');
    expect(finishingAndGenericStages[0].description).toBe('Continue on Floor 9 and finish at H961.');
    expect(finishingAndGenericStages[1].description).toBe('Follow the indoor path across Floor 9.');
  });

  it('returns the first indoor stage as the default journey stage', () => {
    const stages = [
      { id: 'journey-stage-0', type: 'outdoor' },
      { id: 'journey-stage-1', type: 'indoor' },
    ];

    expect(getDefaultJourneyStage(stages)).toBe(stages[1]);
    expect(getDefaultJourneyStage([{ id: 'journey-stage-0', type: 'outdoor' }])).toEqual({ id: 'journey-stage-0', type: 'outdoor' });
    expect(getDefaultJourneyStage([])).toBeNull();
  });

  it('finds the best mappable journey stage around the active selection', () => {
    const stages = [
      { id: 'journey-stage-0', type: 'outdoor', mapBuildingId: null, mapFloorId: null },
      { id: 'journey-stage-1', type: 'vertical', mapBuildingId: 'hall', mapFloorId: 'Hall-8' },
      { id: 'journey-stage-2', type: 'outdoor', mapBuildingId: null, mapFloorId: null },
      { id: 'journey-stage-3', type: 'indoor', mapBuildingId: 'hall', mapFloorId: 'Hall-9' },
    ];

    expect(getJourneyMapStage(stages, 'journey-stage-1')).toBe(stages[1]);
    expect(getJourneyMapStage(stages, 'journey-stage-2')).toBe(stages[1]);
    expect(getJourneyMapStage(stages, 'missing-stage')).toBe(stages[1]);
    expect(getJourneyMapStage([
      { id: 'journey-stage-0', type: 'outdoor', mapBuildingId: null, mapFloorId: null },
      { id: 'journey-stage-1', type: 'outdoor', mapBuildingId: null, mapFloorId: null },
      { id: 'journey-stage-2', type: 'indoor', mapBuildingId: 'hall', mapFloorId: 'Hall-9' },
    ], 'journey-stage-1')).toEqual({
      id: 'journey-stage-2',
      type: 'indoor',
      mapBuildingId: 'hall',
      mapFloorId: 'Hall-9',
    });
    expect(getJourneyMapStage([{ id: 'journey-stage-0', type: 'outdoor', mapBuildingId: null, mapFloorId: null }], 'journey-stage-0')).toBeNull();
    expect(getJourneyMapStage([], null)).toBeNull();
  });

  it('builds journey stats with floor transfers, outdoor segments, and accessible defaults', () => {
    const stats = buildJourneyStats([
      { type: 'vertical' },
      { type: 'vertical' },
      { type: 'outdoor' },
    ], null, true);

    expect(stats).toEqual([
      '2 floor transfers',
      'Using elevator',
      '1 outdoor segment',
    ]);
    expect(buildJourneyStats([
      { type: 'outdoor' },
      { type: 'outdoor' },
    ], 'stairs', false)).toEqual([
      '2 outdoor segments',
    ]);
    expect(buildJourneyStats([], null, false)).toEqual([]);
  });

  it('exports readable fallback labels', () => {
    expect(getFloorLabel('Hall-8')).toBe('8');
    expect(getFloorLabel('Unknown-Floor')).toBe('Unknown-Floor');
    expect(getFloorLabel()).toBe('?');
    expect(getBuildingName('hall')).toBe('Hall Building');
    expect(getBuildingName('missing-building')).toBe('MISSING-BUILDING');
    expect(getBuildingName()).toBe('building');
    expect(getTransitionLabel('elevator')).toBe('elevator');
    expect(getTransitionLabel('stairs')).toBe('stairs');
    expect(getTransitionLabel('escalator')).toBe('stairs');
  });
});
