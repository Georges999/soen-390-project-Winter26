import { getValidAccessToken } from './googleCalendarAuth';

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export async function fetchCalendarEvents(timeMin = new Date(), timeMax = null) {
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
