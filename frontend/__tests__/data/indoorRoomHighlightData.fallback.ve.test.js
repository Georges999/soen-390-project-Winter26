import { formatRoomLabel } from '../../src/data/indoorRoomHighlightData';

describe('indoorRoomHighlightData format fallback VE', () => {
  it('keeps raw VE label when no numeric segment exists', () => {
    expect(formatRoomLabel('VE-2', 'VE-ABC')).toBe('VE-ABC');
  });
});
