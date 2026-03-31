import { formatRoomLabel } from '../../src/data/indoorRoomHighlightData';

describe('indoorRoomHighlightData format fallback CC', () => {
  it('keeps raw CC label when no numeric segment exists', () => {
    expect(formatRoomLabel('CC-1', 'CC1-red-ABC')).toBe('CC1-red-ABC');
  });
});
