jest.mock('../../src/services/googleCalendarAuth', () => ({
  getValidAccessToken: jest.fn(),
}));

const { getValidAccessToken } = require('../../src/services/googleCalendarAuth');
const {
  fetchCalendarEvents,
  getUpcomingEvents,
  getNextClassEvent,
  parseBuildingFromLocation,
} = require('../../src/services/googleCalendarService');

describe('googleCalendarService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('fetchCalendarEvents', () => {
    // In DEV mode with USE_MOCK_DATA = true, it returns mock data
    it('should return mock events in DEV mode', async () => {
      const result = await fetchCalendarEvents();
      expect(result.success).toBe(true);
      expect(result.events).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
      expect(result.events.length).toBe(3);
    });

    it('should return events with correct structure', async () => {
      const result = await fetchCalendarEvents();
      const event = result.events[0];
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('title');
      expect(event).toHaveProperty('location');
      expect(event).toHaveProperty('startTime');
      expect(event).toHaveProperty('endTime');
      expect(event).toHaveProperty('description');
    });

    it('mock events should have class-like titles', async () => {
      const result = await fetchCalendarEvents();
      const titles = result.events.map(e => e.title);
      expect(titles.some(t => t.includes('SOEN'))).toBe(true);
      expect(titles.some(t => t.includes('COMP'))).toBe(true);
      expect(titles.some(t => t.includes('ENGR'))).toBe(true);
    });
  });

  describe('getUpcomingEvents', () => {
    it('should call fetchCalendarEvents and return results', async () => {
      const result = await getUpcomingEvents(24);
      expect(result.success).toBe(true);
      expect(result.events).toBeDefined();
    });

    it('should use default 24 hours ahead', async () => {
      const result = await getUpcomingEvents();
      expect(result.success).toBe(true);
    });
  });

  describe('getNextClassEvent', () => {
    it('should return the next upcoming class event', async () => {
      const result = await getNextClassEvent();
      // In mock mode, should find SOEN 390 as closest future class
      if (result) {
        expect(result.title).toBeDefined();
      }
    });

    it('should only return future events with class keywords', async () => {
      const result = await getNextClassEvent();
      if (result) {
        const classKeywords = ['SOEN', 'ENGR', 'COMP', 'ELEC', 'MECH', 'CIVI', 'INDU'];
        const titleUpper = result.title.toUpperCase();
        const hasKeyword = classKeywords.some(k => titleUpper.includes(k));
        expect(hasKeyword).toBe(true);
        expect(new Date(result.startTime).getTime()).toBeGreaterThan(Date.now());
      }
    });
  });

  describe('parseBuildingFromLocation', () => {
    it('should return null for null/undefined location', () => {
      expect(parseBuildingFromLocation(null)).toBeNull();
      expect(parseBuildingFromLocation(undefined)).toBeNull();
      expect(parseBuildingFromLocation('')).toBeNull();
    });

    it('should parse H building code', () => {
      expect(parseBuildingFromLocation('H Building Room 501')).toBe('H');
    });

    it('should parse EV building code', () => {
      expect(parseBuildingFromLocation('EV Building Room 3.309')).toBe('EV');
    });

    it('should parse MB building code', () => {
      expect(parseBuildingFromLocation('MB 3.270')).toBe('MB');
    });

    it('should parse LB building code', () => {
      expect(parseBuildingFromLocation('LB 125')).toBe('LB');
    });

    it('should parse Hall Building', () => {
      const result = parseBuildingFromLocation('Hall Building');
      expect(result).toBe('HALL BUILDING');
    });

    it('should parse Engineering Building', () => {
      const result = parseBuildingFromLocation('Engineering Building Room 100');
      expect(result).toBe('ENGINEERING BUILDING');
    });

    it('should parse Visual Arts', () => {
      const result = parseBuildingFromLocation('Visual Arts wing');
      expect(result).toBe('VISUAL ARTS');
    });

    it('should parse Library Building', () => {
      const result = parseBuildingFromLocation('Library Building floor 2');
      expect(result).toBe('LIBRARY BUILDING');
    });

    it('should parse VA building code', () => {
      expect(parseBuildingFromLocation('VA 101')).toBe('VA');
    });

    it('should parse GM building code', () => {
      expect(parseBuildingFromLocation('GM 410')).toBe('GM');
    });

    it('should parse CC building code', () => {
      expect(parseBuildingFromLocation('CC 304')).toBe('CC');
    });

    it('should parse FB building code', () => {
      expect(parseBuildingFromLocation('FB 820')).toBe('FB');
    });

    it('should return null for unrecognized location', () => {
      expect(parseBuildingFromLocation('Starbucks')).toBeNull();
    });

    it('should be case insensitive for building codes', () => {
      expect(parseBuildingFromLocation('ev building')).toBe('EV');
    });
  });
});
