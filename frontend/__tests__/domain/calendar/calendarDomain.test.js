import {
  getByDayCodes,
  getEndOfDay,
  getEventLocation,
  getEventStartTimeMs,
  getEventStartValue,
  getEventSummary,
  getLegacyClassesForDate,
  getLiveClassesForDate,
  getMinutesUntilEvent,
  getStartOfDay,
  getWeekDays,
  getWeekRange,
  sortEventsByStartTime,
} from '../../../src/domain/calendar/calendarDomain';

describe('calendarDomain', () => {
  it('parses BYDAY recurrence tokens', () => {
    expect(getByDayCodes()).toEqual([]);
    expect(getByDayCodes('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR')).toEqual(['MO', 'WE', 'FR']);
    expect(getByDayCodes('RRULE:FREQ=WEEKLY')).toEqual([]);
  });

  it('builds Monday-to-Sunday week days and range', () => {
    const wednesday = new Date('2026-02-25T12:00:00Z');
    const weekDays = getWeekDays(wednesday);
    expect(weekDays).toHaveLength(7);
    expect(weekDays[0].getDay()).toBe(1);
    expect(weekDays[6].getDay()).toBe(0);

    const { timeMin, timeMax } = getWeekRange(wednesday);
    expect(timeMin.getTime()).toBe(getStartOfDay(weekDays[0]).getTime());
    expect(timeMax.getTime()).toBe(getEndOfDay(weekDays[6]).getTime());
  });

  it('builds week from previous monday when reference date is sunday', () => {
    const sunday = new Date('2026-03-01T12:00:00Z');
    const weekDays = getWeekDays(sunday);
    expect(weekDays[0].toISOString().slice(0, 10)).toBe('2026-02-23');
    expect(weekDays[6].toISOString().slice(0, 10)).toBe('2026-03-01');
  });

  it('extracts normalized event fields', () => {
    const event = {
      title: 'COMP 346',
      location: 'EV 3.309',
      start: { dateTime: '2026-02-25T15:00:00.000Z' },
    };

    expect(getEventSummary(event)).toBe('COMP 346');
    expect(getEventLocation(event)).toBe('EV 3.309');
    expect(getEventStartValue(event)).toBe('2026-02-25T15:00:00.000Z');
  });

  it('uses fallback event fields when summary and datetime are missing', () => {
    const dateOnlyEvent = { start: { date: '2026-02-25' } };
    expect(getEventStartValue(dateOnlyEvent)).toBe('2026-02-25');
    expect(getEventStartValue({})).toBeNull();

    expect(getEventSummary({ summary: 'COMP 346', title: 'fallback' })).toBe('COMP 346');
    expect(getEventSummary({})).toBe('');
    expect(getEventLocation({})).toBe('');
  });

  it('sorts events and filters live classes by selected day', () => {
    const events = [
      { id: 'late', startTime: '2026-02-25T16:00:00.000Z' },
      { id: 'early', startTime: '2026-02-25T09:00:00.000Z' },
      { id: 'other-day', startTime: '2026-02-26T09:00:00.000Z' },
    ];

    const sorted = sortEventsByStartTime(events);
    expect(sorted.map((event) => event.id)).toEqual(['early', 'late', 'other-day']);

    const selectedDate = new Date('2026-02-25T10:00:00.000Z');
    const live = getLiveClassesForDate(events, selectedDate);
    expect(live.map((event) => event.id)).toEqual(['early', 'late']);
  });

  it('returns NaN start time for events without start fields', () => {
    expect(Number.isNaN(getEventStartTimeMs({}))).toBe(true);
  });

  it('ignores live events without a start value', () => {
    const selectedDate = new Date('2026-02-25T10:00:00.000Z');
    const live = getLiveClassesForDate(
      [{ id: 'missing-start' }, { id: 'ok', startTime: '2026-02-25T09:00:00.000Z' }],
      selectedDate
    );
    expect(live.map((event) => event.id)).toEqual(['ok']);
  });

  it('filters legacy classes by selected day recurrence and sorts', () => {
    const selectedDate = new Date('2026-02-25T12:00:00.000Z'); // Wednesday (WE)
    const calendars = [
      {
        id: 'selected',
        selected: true,
        events: [
          {
            id: 'late-we',
            start: { dateTime: '2026-02-25T16:00:00.000Z' },
            recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=WE'],
          },
          {
            id: 'early-we',
            start: { dateTime: '2026-02-25T09:00:00.000Z' },
            recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=WE'],
          },
          {
            id: 'th',
            start: { dateTime: '2026-02-26T09:00:00.000Z' },
            recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=TH'],
          },
        ],
      },
      {
        id: 'not-selected',
        selected: false,
        events: [
          {
            id: 'ignored',
            start: { dateTime: '2026-02-25T08:00:00.000Z' },
            recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=WE'],
          },
        ],
      },
    ];

    const classes = getLegacyClassesForDate(calendars, selectedDate);
    expect(classes.map((event) => event.id)).toEqual(['early-we', 'late-we']);
  });

  it('handles legacy classes with missing recurrence and missing events arrays', () => {
    const selectedDate = new Date('2026-02-25T12:00:00.000Z'); // Wednesday (WE)
    const classes = getLegacyClassesForDate(
      [
        { id: 'selected-empty', selected: true },
        { id: 'selected-missing-recurrence', selected: true, events: [{ id: 'x' }] },
      ],
      selectedDate
    );

    expect(classes).toEqual([]);
  });

  it('computes minutes until event with floor at zero', () => {
    const nowMs = new Date('2026-02-25T10:00:00.000Z').getTime();
    const event = { startTime: '2026-02-25T10:45:00.000Z' };
    expect(getMinutesUntilEvent(event, nowMs)).toBe(45);
    expect(getMinutesUntilEvent({ startTime: '2026-02-25T09:45:00.000Z' }, nowMs)).toBe(0);
    expect(getMinutesUntilEvent({}, nowMs)).toBe(0);
  });
});
