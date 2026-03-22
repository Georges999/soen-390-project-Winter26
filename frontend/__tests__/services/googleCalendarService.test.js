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
  getUpcomingEvents,
  getNextClassEvent,
  parseBuildingFromLocation,
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
});
