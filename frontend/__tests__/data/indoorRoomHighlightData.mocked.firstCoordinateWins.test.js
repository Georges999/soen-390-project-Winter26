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

describe('indoorRoomHighlightData mocked first coordinate wins', () => {
  it('keeps the first coordinate for identical aliases', () => {
    const source = {
      floors: {
        'Hall-9': {
          rooms: [
            { id: 'a-1', label: 'H-901', x: 100, y: 200 },
            { id: 'a-2', label: 'H-901', x: 999, y: 999 },
          ],
        },
      },
    };

    const { getRoomHighlightPoint } = loadWithPrimaryMockSource(source);
    expect(getRoomHighlightPoint('Hall-9', 'H901')).toEqual({ x: 100, y: 200 });
  });
});
