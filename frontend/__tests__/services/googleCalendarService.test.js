jest.mock('../../src/services/googleCalendarAuth', () => ({
  getValidAccessToken: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}), { virtual: true });

const { getValidAccessToken } = require('../../src/services/googleCalendarAuth');
const SecureStore = require('expo-secure-store');
const {
  fetchGoogleCalendars,
  fetchCalendarEvents,
  getSelectedCalendarIds,
  getUpcomingEvents,
  getNextClassEvent,
  parseBuildingFromLocation,
  saveSelectedCalendarIds,
} = require('../../src/services/googleCalendarService');

describe('googleCalendarService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    SecureStore.getItemAsync.mockResolvedValue(null);
    SecureStore.setItemAsync.mockResolvedValue();
  });

  describe('fetchGoogleCalendars', () => {
    it('returns auth error when not connected', async () => {
      getValidAccessToken.mockResolvedValue(null);

      const result = await fetchGoogleCalendars();
      expect(result).toEqual({
        success: false,
        error: 'Not authenticated. Please connect your calendar.',
      });
    });

    it('loads calendars and persists default selection', async () => {
      getValidAccessToken.mockResolvedValue('token');
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            { id: 'secondary', summary: 'Team', accessRole: 'owner', primary: false },
            { id: 'primary', summary: 'Primary', accessRole: 'owner', primary: true },
          ],
        }),
      });

      const result = await fetchGoogleCalendars();

      expect(result.success).toBe(true);
      expect(result.calendars[0]).toEqual({
        id: 'primary',
        name: 'Primary',
        primary: true,
        selected: true,
      });
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'google_calendar_selected_ids',
        JSON.stringify(['primary'])
      );
    });

    it('keeps a stored valid calendar selection and uses summaryOverride', async () => {
      getValidAccessToken.mockResolvedValue('token');
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(['team']));
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            { id: 'blocked', summary: 'Blocked', accessRole: 'none' },
            {
              id: 'team',
              summary: 'Team',
              summaryOverride: 'Study Group',
              accessRole: 'reader',
              primary: false,
            },
          ],
        }),
      });

      const result = await fetchGoogleCalendars();

      expect(result).toEqual({
        success: true,
        calendars: [
          {
            id: 'team',
            name: 'Study Group',
            primary: false,
            selected: true,
          },
        ],
      });
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'google_calendar_selected_ids',
        JSON.stringify(['team'])
      );
    });

    it('returns an API failure when calendar list fetch is not ok', async () => {
      getValidAccessToken.mockResolvedValue('token');
      global.fetch.mockResolvedValue({ ok: false, status: 403 });

      const result = await fetchGoogleCalendars();

      expect(result).toEqual({
        success: false,
        error: 'API error: 403',
      });
    });

    it('falls back to the first calendar when there is no stored or primary calendar', async () => {
      getValidAccessToken.mockResolvedValue('token');
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            { id: 'team', summary: 'Team', accessRole: 'reader', primary: false },
            { id: 'personal', summary: 'Personal', accessRole: 'reader', primary: false },
          ],
        }),
      });

      const result = await fetchGoogleCalendars();

      expect(result.calendars[0]).toEqual({
        id: 'personal',
        name: 'Personal',
        primary: false,
        selected: true,
      });
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'google_calendar_selected_ids',
        JSON.stringify(['personal'])
      );
    });
  });

  describe('fetchCalendarEvents', () => {
    it('returns auth error when no token is available', async () => {
      getValidAccessToken.mockResolvedValue(null);

      const result = await fetchCalendarEvents();
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Not authenticated/);
    });

    it('loads and normalizes events from multiple calendars', async () => {
      getValidAccessToken.mockResolvedValue('token');
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              {
                id: '2',
                summary: 'COMP 346',
                location: 'EV 3.309',
                start: { dateTime: '2026-03-13T15:00:00.000Z' },
                end: { dateTime: '2026-03-13T16:00:00.000Z' },
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              {
                id: '1',
                summary: 'SOEN 390',
                location: 'H 961',
                start: { dateTime: '2026-03-13T13:00:00.000Z' },
                end: { dateTime: '2026-03-13T14:00:00.000Z' },
              },
            ],
          }),
        });

      const result = await fetchCalendarEvents(['team', 'primary'], new Date('2026-03-13T00:00:00Z'));

      expect(result.success).toBe(true);
      expect(result.events.map((event) => event.summary)).toEqual(['SOEN 390', 'COMP 346']);
      expect(result.events[0].calendarId).toBe('primary');
      expect(result.events[1].calendarId).toBe('team');
    });

    it('uses stored calendar ids and normalizes untitled all-day events', async () => {
      getValidAccessToken.mockResolvedValue('token');
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(['team']));
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'untitled',
              start: { date: '2026-03-13' },
              end: { date: '2026-03-14' },
            },
          ],
        }),
      });

      const result = await fetchCalendarEvents(new Date('2026-03-13T00:00:00Z'));

      expect(result.success).toBe(true);
      expect(global.fetch.mock.calls[0][0]).toContain('/calendars/team/events?');
      expect(result.events[0]).toEqual(
        expect.objectContaining({
          calendarId: 'team',
          title: 'Untitled Event',
          summary: 'Untitled Event',
          startTime: '2026-03-13',
          endTime: '2026-03-14',
          location: null,
        })
      );
    });

    it('returns a failure when an event fetch request is not ok', async () => {
      getValidAccessToken.mockResolvedValue('token');
      global.fetch.mockResolvedValue({ ok: false, status: 500 });

      const result = await fetchCalendarEvents(['primary'], new Date('2026-03-13T00:00:00Z'));

      expect(result).toEqual({
        success: false,
        error: 'API error: 500',
      });
    });
  });

  describe('calendar selection storage helpers', () => {
    it('returns an empty array when reading selected ids fails', async () => {
      SecureStore.getItemAsync.mockRejectedValue(new Error('read error'));

      const result = await getSelectedCalendarIds();

      expect(result).toEqual([]);
    });

    it('does not throw when saving selected ids fails', async () => {
      SecureStore.setItemAsync.mockRejectedValue(new Error('write error'));

      await expect(saveSelectedCalendarIds(['primary'])).resolves.toBeUndefined();
    });
  });

  describe('getUpcomingEvents', () => {
    it('delegates to fetchCalendarEvents for selected calendars', async () => {
      getValidAccessToken.mockResolvedValue('token');
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] }),
      });

      const result = await getUpcomingEvents(24, ['primary']);
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getNextClassEvent', () => {
    it('returns the nearest matching class event', async () => {
      getValidAccessToken.mockResolvedValue('token');
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: '1',
              summary: 'Lunch',
              start: { dateTime: new Date(Date.now() + 1800000).toISOString() },
              end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
            },
            {
              id: '2',
              summary: 'SOEN 390',
              location: 'H 961',
              start: { dateTime: new Date(Date.now() + 5400000).toISOString() },
              end: { dateTime: new Date(Date.now() + 7200000).toISOString() },
            },
          ],
        }),
      });

      const result = await getNextClassEvent(['primary']);
      expect(result.summary).toBe('SOEN 390');
    });

    it('returns null when there is no upcoming class event', async () => {
      getValidAccessToken.mockResolvedValue('token');
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: '1',
              summary: 'Lunch',
              start: { dateTime: new Date(Date.now() + 1800000).toISOString() },
              end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
            },
          ],
        }),
      });

      const result = await getNextClassEvent(['primary']);
      expect(result).toBeNull();
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

    it('should return null for unrecognized location', () => {
      expect(parseBuildingFromLocation('Starbucks')).toBeNull();
    });
  });

  describe('mock calendar mode', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
      jest.resetModules();
    });

    it('returns mock events when mock calendar mode is enabled', async () => {
      process.env = {
        ...originalEnv,
        EXPO_PUBLIC_USE_MOCK_CALENDAR: 'true',
      };
      jest.resetModules();

      jest.doMock('../../src/services/googleCalendarAuth', () => ({
        getValidAccessToken: jest.fn(),
      }));
      jest.doMock('expo-secure-store', () => ({
        setItemAsync: jest.fn(),
        getItemAsync: jest.fn(),
        deleteItemAsync: jest.fn(),
      }), { virtual: true });

      const mockModule = require('../../src/services/googleCalendarService');
      const result = await mockModule.fetchCalendarEvents();

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(3);
      expect(result.events[0]).toEqual(
        expect.objectContaining({
          calendarId: 'primary',
        })
      );
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
      googleEventId: '1',
      calendarId: 'primary',
      title: 'SOEN 390',
      summary: 'SOEN 390',
      location: 'H 501',
      start: { dateTime: '2025-06-18T14:00:00Z' },
      end: { dateTime: '2025-06-18T15:30:00Z' },
      startTime: '2025-06-18T14:00:00Z',
      endTime: '2025-06-18T15:30:00Z',
      description: 'Lecture',
      recurrence: [],
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
