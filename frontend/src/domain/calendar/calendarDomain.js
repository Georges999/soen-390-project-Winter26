const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export function getByDayCodes(recurrenceString = "") {
  const match = /BYDAY=([A-Z,]+)/.exec(String(recurrenceString));
  if (!match) return [];
  return match[1].split(",");
}

export function getStartOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function getEndOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

export function getWeekDays(referenceDate) {
  const day = referenceDate.getDay();
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - (day === 0 ? 6 : day - 1));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

export function getWeekRange(referenceDate) {
  const weekDays = getWeekDays(referenceDate);
  return {
    timeMin: getStartOfDay(weekDays[0]),
    timeMax: getEndOfDay(weekDays.at(-1)),
  };
}

export function getEventStartValue(event) {
  return (
    event?.startTime || event?.start?.dateTime || event?.start?.date || null
  );
}

export function getEventSummary(event) {
  return event?.summary || event?.title || "";
}

export function getEventLocation(event) {
  return event?.location || "";
}

export function getEventStartTimeMs(event) {
  const value = getEventStartValue(event);
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

export function sortEventsByStartTime(events = []) {
  return [...events].sort(
    (a, b) => getEventStartTimeMs(a) - getEventStartTimeMs(b),
  );
}

export function getLegacyClassesForDate(calendars, selectedDate) {
  const safeCalendars = calendars || [];
  const selectedCalendars = safeCalendars.filter(
    (calendar) => calendar?.selected,
  );
  const events = selectedCalendars.flatMap(
    (calendar) => calendar?.events || [],
  );
  const selectedDayCode = DAY_CODES[selectedDate.getDay()];

  const matchingEvents = events.filter((event) => {
    const recurrence = event?.recurrence?.[0] || "";
    return getByDayCodes(recurrence).includes(selectedDayCode);
  });

  return sortEventsByStartTime(matchingEvents);
}

export function getLiveClassesForDate(events, selectedDate) {
  const safeEvents = events || [];
  const selectedDayMs = getStartOfDay(selectedDate).getTime();

  const matchingEvents = safeEvents.filter((event) => {
    const startValue = getEventStartValue(event);
    if (!startValue) return false;
    return getStartOfDay(new Date(startValue)).getTime() === selectedDayMs;
  });

  return sortEventsByStartTime(matchingEvents);
}

export function getMinutesUntilEvent(event, nowMs = Date.now()) {
  const startMs = getEventStartTimeMs(event);
  if (Number.isNaN(startMs)) return 0;
  return Math.max(0, Math.floor((startMs - nowMs) / 1000 / 60));
}
