import { formatRoomLabel } from '../../src/data/indoorRoomHighlightData';

describe('indoorRoomHighlightData format fallback VL', () => {
  it('keeps raw VL label when no numeric segment exists', () => {
    expect(formatRoomLabel('VL-1', 'VLF1-ABC')).toBe('VLF1-ABC');
  });
});
