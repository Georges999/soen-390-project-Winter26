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

describe('indoorRoomHighlightData mocked invalid coordinates', () => {
  it('skips rooms with non-numeric x or y from highlight coordinate map', () => {
    const source = {
      floors: {
        'Hall-9': {
          rooms: [
            { id: 'valid', label: 'H901', x: 11, y: 12 },
            { id: 'invalid-x', label: 'H902', x: 'bad', y: 12 },
            { id: 'invalid-y', label: 'H903', x: 13, y: null },
          ],
        },
      },
    };

    const { getRoomHighlightPoint } = loadWithPrimaryMockSource(source);
    expect(getRoomHighlightPoint('Hall-9', 'H901')).toEqual({ x: 11, y: 12 });
    expect(getRoomHighlightPoint('Hall-9', 'H902')).toBeNull();
    expect(getRoomHighlightPoint('Hall-9', 'H903')).toBeNull();
  });
});
