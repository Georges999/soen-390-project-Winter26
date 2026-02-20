import { getValidAccessToken } from './googleCalendarAuth';

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// DEV MODE: Mock calendar data
const USE_MOCK_DATA = __DEV__ && true;

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

export async function fetchCalendarEvents(timeMin = new Date(), timeMax = null) {
  // DEV MODE: Return mock data
  if (USE_MOCK_DATA) {
    console.log('[Calendar] Using mock calendar data (DEV MODE)');
    const events = MOCK_EVENTS.map((event) => ({
      id: event.id,
      title: event.summary,
      location: event.location,
      startTime: event.start.dateTime,
      endTime: event.end.dateTime,
      description: event.description,
    }));
    
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

    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '50',
    });

    if (timeMax) {
      params.append('timeMax', timeMax.toISOString());
    }

    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events?${params}`,
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

    const events = data.items.map((event) => ({
      id: event.id,
      title: event.summary || 'Untitled Event',
      location: event.location || null,
      startTime: event.start?.dateTime || event.start?.date,
      endTime: event.end?.dateTime || event.end?.date,
      description: event.description || null,
    }));

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

export async function getUpcomingEvents(hoursAhead = 24) {
  const now = new Date();
  const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
  
  return fetchCalendarEvents(now, future);
}

export async function getNextClassEvent() {
  try {
    const result = await getUpcomingEvents(12);
    
    if (!result.success || !result.events) {
      return null;
    }

    const now = new Date();
    const classKeywords = ['SOEN', 'ENGR', 'COMP', 'ELEC', 'MECH', 'CIVI', 'INDU'];
    
    const nextClass = result.events.find((event) => {
      const eventTime = new Date(event.startTime);
      if (eventTime <= now) return false;
      
      const titleUpper = event.title.toUpperCase();
      return classKeywords.some((keyword) => titleUpper.includes(keyword));
    });

    return nextClass || null;
  } catch (error) {
    console.error('Failed to get next class:', error);
    return null;
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
