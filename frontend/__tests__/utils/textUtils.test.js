import { normalizeText, stripHtml } from '../../src/utils/textUtils';

describe('textUtils', () => {
  describe('normalizeText', () => {
    it('converts to lowercase and removes non-alphanumeric', () => {
      expect(normalizeText('AbC 123!@#')).toBe('abc123');
    });

    it('handles empty string and undefined', () => {
      expect(normalizeText('')).toBe('');
      expect(normalizeText()).toBe('');
    });
  });

  describe('stripHtml', () => {
    it('removes HTML tags', () => {
      const html = '<p>Hello <strong>world</strong>!</p>';
      expect(stripHtml(html)).toBe('Hello world!');
    });

    it('returns empty string when passed nothing', () => {
      expect(stripHtml()).toBe('');
    });
  });
});