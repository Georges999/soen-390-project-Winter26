import { getValidAccessToken } from './googleCalendarAuth';
import * as SecureStore from 'expo-secure-store';

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const CALENDAR_SELECTION_KEY = 'google_calendar_selected_ids';

// Allow CI/release builds to force mock calendar data for deterministic E2E.
const USE_MOCK_DATA = process.env.EXPO_PUBLIC_USE_MOCK_CALENDAR === 'true';

const MOCK_EVENTS = [
  {
    id: 'mock1',
    summary: 'SOEN 390 - Software Engineering',
    location: 'H Building Room 501',
    start: { dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() }, // 2 hours from now
    end: { dateTime: new Date(Date.now() + 3.5 * 60 * 60 * 1000).toISOString() },
    description: 'Lecture on mobile development',
  },
  {
    id: 'mock2',
    summary: 'COMP 346 - Operating Systems',
    location: 'EV Building Room 3.309',
    start: { dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString() }, // Tomorrow
    end: { dateTime: new Date(Date.now() + 26.5 * 60 * 60 * 1000).toISOString() },
    description: 'Lab session',
  },
  {
    id: 'mock3',
    summary: 'ENGR 301 - Engineering Management',
    location: 'Hall Building',
    start: { dateTime: new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString() },
    end: { dateTime: new Date(Date.now() + 51.5 * 60 * 60 * 1000).toISOString() },
    description: 'Project presentation',
  },
];

function sortEventsByStartTime(events) {
  return [...events].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}

function normalizeGoogleEvent(event, calendarId = 'primary') {
  const title = event.summary || 'Untitled Event';
  const start = event.start || {};
  const end = event.end || {};

  return {
    id: event.id,
    googleEventId: event.id,
    calendarId,
    title,
    summary: title,
    location: event.location || null,
    start,
    end,
    startTime: start.dateTime || start.date,
    endTime: end.dateTime || end.date,
    description: event.description || null,
    recurrence: event.recurrence || [],
  };
}

function getDefaultSelectedCalendarIds(calendars = [], storedIds = []) {
  const availableIds = new Set(calendars.map((calendar) => calendar.id));
  const validStoredIds = storedIds.filter((id) => availableIds.has(id));

  if (validStoredIds.length > 0) {
    return validStoredIds;
  }

  const primaryCalendar = calendars.find((calendar) => calendar.primary);
  if (primaryCalendar) {
    return [primaryCalendar.id];
  }

  return calendars[0] ? [calendars[0].id] : [];
}

function getCalendarRequestParams(timeMin = new Date(), timeMax = null) {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });

  if (timeMax) {
    params.append('timeMax', timeMax.toISOString());
  }

  return params;
}

async function fetchEventsForCalendar(calendarId, accessToken, timeMin, timeMax) {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${getCalendarRequestParams(
      timeMin,
      timeMax
    )}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.items || []).map((event) => normalizeGoogleEvent(event, calendarId));
}

async function resolveCalendarIds(calendarIds) {
  if (Array.isArray(calendarIds) && calendarIds.length > 0) {
    return calendarIds;
  }

  const storedIds = await getSelectedCalendarIds();
  return storedIds.length > 0 ? storedIds : ['primary'];
}

export async function getSelectedCalendarIds() {
  try {
    const storedValue = await SecureStore.getItemAsync(CALENDAR_SELECTION_KEY);
    const parsed = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read selected calendar IDs:', error);
    return [];
  }
}

export async function saveSelectedCalendarIds(calendarIds = []) {
  try {
    await SecureStore.setItemAsync(
      CALENDAR_SELECTION_KEY,
      JSON.stringify(Array.isArray(calendarIds) ? calendarIds : [])
    );
  } catch (error) {
    console.error('Failed to save selected calendar IDs:', error);
  }
}

export async function fetchGoogleCalendars() {
  if (USE_MOCK_DATA) {
    return {
      success: true,
      calendars: [
        {
          id: 'primary',
          name: 'Mock Google Calendar',
          primary: true,
          selected: true,
        },
      ],
    };
  }

  try {
    const accessToken = await getValidAccessToken();

    if (!accessToken) {
      return {
        success: false,
        error: 'Not authenticated. Please connect your calendar.',
      };
    }

    const response = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const calendars = (data.items || [])
      .filter((calendar) => calendar.accessRole && calendar.accessRole !== 'none')
      .map((calendar) => ({
        id: calendar.id,
        name: calendar.summaryOverride || calendar.summary || calendar.id,
        primary: Boolean(calendar.primary),
      }))
      .sort((a, b) => {
        if (a.primary && !b.primary) return -1;
        if (!a.primary && b.primary) return 1;
        return a.name.localeCompare(b.name);
      });

    const storedIds = await getSelectedCalendarIds();
    const selectedIds = getDefaultSelectedCalendarIds(calendars, storedIds);
    await saveSelectedCalendarIds(selectedIds);

    return {
      success: true,
      calendars: calendars.map((calendar) => ({
        ...calendar,
        selected: selectedIds.includes(calendar.id),
      })),
    };
  } catch (error) {
    console.error('Failed to fetch calendars:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch calendars',
    };
  }
}

export async function fetchCalendarEvents(
  calendarIdsOrTimeMin = new Date(),
  timeMinOrTimeMax = null,
  maybeTimeMax = null
) {
  const calendarIds = Array.isArray(calendarIdsOrTimeMin) ? calendarIdsOrTimeMin : null;
  const timeMin = Array.isArray(calendarIdsOrTimeMin)
    ? timeMinOrTimeMax || new Date()
    : calendarIdsOrTimeMin || new Date();
  const timeMax = Array.isArray(calendarIdsOrTimeMin) ? maybeTimeMax : timeMinOrTimeMax;

  // DEV MODE: Return mock data
  if (USE_MOCK_DATA) {
    console.log('[Calendar] Using mock calendar data (DEV MODE)');
    const events = sortEventsByStartTime(
      MOCK_EVENTS.map((event) => normalizeGoogleEvent(event))
    );
    
    return {
      success: true,
      events,
    };
  }

  try {
    const accessToken = await getValidAccessToken();
    
    if (!accessToken) {
      return {
        success: false,
        error: 'Not authenticated. Please connect your calendar.',
      };
    }

    const resolvedCalendarIds = await resolveCalendarIds(calendarIds);
    const calendarEvents = await Promise.all(
      resolvedCalendarIds.map((calendarId) =>
        fetchEventsForCalendar(calendarId, accessToken, timeMin, timeMax)
      )
    );
    const events = sortEventsByStartTime(calendarEvents.flat());

    return {
      success: true,
      events,
    };
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch calendar events',
    };
  }
}

export async function getUpcomingEvents(hoursAhead = 24, calendarIds = null) {
  const now = new Date();
  const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
  
  return fetchCalendarEvents(calendarIds, now, future);
}

export async function getNextClassEvent(calendarIds = null) {
  try {
    const result = await getUpcomingEvents(12, calendarIds);
    
    if (!result.success || !result.events) {
      return null;
    }

    const now = new Date();
    const classKeywords = ['SOEN', 'ENGR', 'COMP', 'ELEC', 'MECH', 'CIVI', 'INDU'];
    
    const nextClass = result.events.find((event) => {
      const eventTime = new Date(event.startTime);
      if (eventTime <= now) return false;
      
      const titleUpper = (event.title || event.summary || '').toUpperCase();
      return classKeywords.some((keyword) => titleUpper.includes(keyword));
    });

    return nextClass || null;
  } catch (error) {
    console.error('Failed to get next class:', error);
    return null;
  }
}

export function normalizeEventForGoogle(event) {
  const startDateTime = event?.start?.dateTime || event?.startTime;
  const endDateTime = event?.end?.dateTime || event?.endTime;
  const startTimeZone = event?.start?.timeZone;
  const endTimeZone = event?.end?.timeZone;

  if (!startDateTime || !endDateTime) {
    return null;
  }

  return {
    summary: event.summary || event.title || 'Campus Guide Event',
    location: event.location || undefined,
    description: event.description || undefined,
    recurrence: event.recurrence || undefined,
    start: {
      dateTime: startDateTime,
      ...(startTimeZone ? { timeZone: startTimeZone } : {}),
    },
    end: {
      dateTime: endDateTime,
      ...(endTimeZone ? { timeZone: endTimeZone } : {}),
    },
  };
}

export async function exportEventsToGoogleCalendar(events = [], calendarId = 'primary') {
  try {
    const accessToken = await getValidAccessToken();

    if (!accessToken) {
      return {
        success: false,
        error: 'Not authenticated. Please connect your calendar.',
      };
    }

    const validEvents = events
      .map(normalizeEventForGoogle)
      .filter(Boolean);

    if (validEvents.length === 0) {
      return {
        success: false,
        error: 'No valid events to export.',
      };
    }

    const createdEvents = [];

    for (const event of validEvents) {
      const response = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`);
      }

      const createdEvent = await response.json();
      createdEvents.push(createdEvent);
    }

    return {
      success: true,
      exportedCount: createdEvents.length,
      events: createdEvents,
    };
  } catch (error) {
    console.error('Failed to export events:', error);
    return {
      success: false,
      error: error.message || 'Failed to export events',
    };
  }
}

export function parseBuildingFromLocation(location) {
  if (!location) return null;

  const buildingPatterns = [
    /\b(H|EV|MB|LB|VA|FB|GM|CC|AD|CJ|HA|PC|PS|PT|RF|SC|SP|TA|VE|GE)\b/i,
    /Hall Building/i,
    /Engineering Building/i,
    /Visual Arts/i,
    /Library Building/i,
  ];

  for (const pattern of buildingPatterns) {
    const match = location.match(pattern);
    if (match) {
      return match[0].toUpperCase();
    }
  }

  return null;
}
