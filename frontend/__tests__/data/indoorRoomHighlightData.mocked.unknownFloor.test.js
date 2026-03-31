const MAPPING_JSON_PATHS = [
  '../../../Floor_Mapping/indoor/Json_Files/Hall9thMapping.json',
  '../../../Floor_Mapping/indoor/Json_Files/Hall1stMapping.json',
  '../../../Floor_Mapping/indoor/Json_Files/Hall2ndMapping.json',
  '../../../Floor_Mapping/indoor/Json_Files/floorplan-MP1.json',
  '../../../Floor_Mapping/indoor/Json_Files/floorplan-MBS2.json',
  '../../../Floor_Mapping/indoor/Json_Files/VLF2-Floor-Plan.json',
  '../../../Floor_Mapping/indoor/Json_Files/CC1-FloorPlan.json',
];

function loadWithPrimaryMockSource(primarySource) {
  jest.resetModules();
  MAPPING_JSON_PATHS.forEach((modulePath, index) => {
    jest.doMock(modulePath, () => (index === 0 ? primarySource : { floors: {} }), {
      virtual: true,
    });
  });
  return require('../../src/data/indoorRoomHighlightData');
}

describe('indoorRoomHighlightData mocked unknown floor', () => {
  it('ignores floor ids that are not in FLOOR_ID_ALIASES', () => {
    const source = {
      floors: {
        'Unknown-Floor': { rooms: [{ id: 'u1', label: 'U100', x: 10, y: 20 }] },
      },
    };

    const { getRoomsForFloor } = loadWithPrimaryMockSource(source);
    expect(getRoomsForFloor('Unknown-Floor')).toEqual([]);
  });
});
