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

describe('indoorRoomHighlightData mocked duplicate room ids', () => {
  it('keeps one room entry when duplicate ids appear on the same floor', () => {
    const source = {
      floors: {
        'Hall-9': {
          rooms: [
            { id: 'dup-id', label: 'H-902', x: 300, y: 400 },
            { id: 'dup-id', label: 'H-903', x: 500, y: 600 },
          ],
        },
      },
    };

    const { getRoomsForFloor } = loadWithPrimaryMockSource(source);
    const hallRooms = getRoomsForFloor('Hall-9');
    const duplicateIds = hallRooms.filter((room) => room.id === 'dup-id');
    expect(duplicateIds).toHaveLength(1);
  });
});
