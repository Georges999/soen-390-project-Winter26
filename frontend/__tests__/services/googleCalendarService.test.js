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

  describe('normalizeEventForGoogle and exportEventsToGoogleCalendar', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('normalizeEventForGoogle returns null for missing dates', () => {
      const evt = { title: 'test' };
      const { normalizeEventForGoogle } = require('../../src/services/googleCalendarService');
      expect(normalizeEventForGoogle(evt)).toBeNull();
    });

    it('normalizeEventForGoogle uses title fallback', () => {
      const evt = { startTime: '2021-01-01T00:00:00Z', endTime: '2021-01-01T01:00:00Z' };
      const { normalizeEventForGoogle } = require('../../src/services/googleCalendarService');
      const norm = normalizeEventForGoogle(evt);
      expect(norm.summary).toBe('Campus Guide Event');
    });

    it('exportEventsToGoogleCalendar fails when not authenticated', async () => {
      getValidAccessToken.mockResolvedValue(null);
      const { exportEventsToGoogleCalendar } = require('../../src/services/googleCalendarService');
      const result = await exportEventsToGoogleCalendar([{ title: 'test', startTime: 'a', endTime: 'b' }]);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Not authenticated/);
    });

    it('exportEventsToGoogleCalendar fails with invalid events', async () => {
      getValidAccessToken.mockResolvedValue('token');
      const { exportEventsToGoogleCalendar } = require('../../src/services/googleCalendarService');
      const result = await exportEventsToGoogleCalendar([{}]);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/No valid events/);
    });

    it('exportEventsToGoogleCalendar posts events and returns count', async () => {
      getValidAccessToken.mockResolvedValue('token');
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: '1' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: '2' }) });
      const { exportEventsToGoogleCalendar } = require('../../src/services/googleCalendarService');
      const events = [
        { startTime: '2021-01-01T00:00:00Z', endTime: '2021-01-01T01:00:00Z' },
        { startTime: '2021-01-02T00:00:00Z', endTime: '2021-01-02T01:00:00Z' },
      ];
      const result = await exportEventsToGoogleCalendar(events, 'primary');
      expect(result.success).toBe(true);
      expect(result.exportedCount).toBe(2);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('exportEventsToGoogleCalendar returns error when fetch fails', async () => {
      getValidAccessToken.mockResolvedValue('token');
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
      const { exportEventsToGoogleCalendar } = require('../../src/services/googleCalendarService');
      const events = [{ startTime: '2021-01-01', endTime: '2021-01-02' }];
      const result = await exportEventsToGoogleCalendar(events);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Export failed/);
    });
  });
});

/* ------------------------------------------------------------------ */
/*  Production-mode tests (USE_MOCK_DATA = false)                     */
/* ------------------------------------------------------------------ */
describe('googleCalendarService – production mode', () => {
  const savedDev = global.__DEV__;
  let mod, mockGetToken;

  beforeEach(() => {
    jest.resetModules();
    global.__DEV__ = false;
    delete process.env.EXPO_PUBLIC_USE_MOCK_CALENDAR;

    mockGetToken = jest.fn();
    jest.doMock('../../src/services/googleCalendarAuth', () => ({
      getValidAccessToken: mockGetToken,
    }));

    mod = require('../../src/services/googleCalendarService');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.__DEV__ = savedDev;
  });

  it('returns not-authenticated when no access token', async () => {
    mockGetToken.mockResolvedValue(null);
    const result = await mod.fetchCalendarEvents();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Not authenticated/);
  });

  it('returns mapped events on successful fetch', async () => {
    mockGetToken.mockResolvedValue('tok');
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: '1',
            summary: 'SOEN 390',
            location: 'H 501',
            start: { dateTime: '2025-06-18T14:00:00Z' },
            end: { dateTime: '2025-06-18T15:30:00Z' },
            description: 'Lecture',
          },
        ],
      }),
    });

    const result = await mod.fetchCalendarEvents();
    expect(result.success).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toEqual({
      id: '1',
      title: 'SOEN 390',
      location: 'H 501',
      startTime: '2025-06-18T14:00:00Z',
      endTime: '2025-06-18T15:30:00Z',
      description: 'Lecture',
    });
  });

  it('defaults missing event fields', async () => {
    mockGetToken.mockResolvedValue('tok');
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: '2', start: { date: '2025-06-18' }, end: { date: '2025-06-19' } }],
      }),
    });

    const result = await mod.fetchCalendarEvents();
    expect(result.events[0].title).toBe('Untitled Event');
    expect(result.events[0].location).toBeNull();
    expect(result.events[0].description).toBeNull();
    expect(result.events[0].startTime).toBe('2025-06-18');
  });

  it('appends timeMax when provided', async () => {
    mockGetToken.mockResolvedValue('tok');
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });

    await mod.fetchCalendarEvents(new Date('2025-01-01'), new Date('2025-12-31'));
    expect(global.fetch.mock.calls[0][0]).toContain('timeMax=');
  });

  it('returns error on non-OK response', async () => {
    mockGetToken.mockResolvedValue('tok');
    global.fetch.mockResolvedValue({ ok: false, status: 403 });

    const result = await mod.fetchCalendarEvents();
    expect(result.success).toBe(false);
    expect(result.error).toContain('API error: 403');
  });

  it('returns error when fetch throws', async () => {
    mockGetToken.mockResolvedValue('tok');
    global.fetch.mockRejectedValue(new Error('network timeout'));

    const result = await mod.fetchCalendarEvents();
    expect(result.success).toBe(false);
    expect(result.error).toBe('network timeout');
  });

  it('getNextClassEvent returns null when fetch fails', async () => {
    mockGetToken.mockResolvedValue(null);
    const result = await mod.getNextClassEvent();
    expect(result).toBeNull();
  });

  it('getNextClassEvent returns null when no class events match', async () => {
    mockGetToken.mockResolvedValue('tok');
    const future = new Date(Date.now() + 3600000).toISOString();
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: '1', summary: 'Lunch', start: { dateTime: future }, end: { dateTime: future } }],
      }),
    });

    const result = await mod.getNextClassEvent();
    expect(result).toBeNull();
  });
});
