import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Fix system time to Wednesday June 18, 2025 at 10:00 AM for deterministic tests.
// This ensures the mock events below always match "today" (Wednesday) and are
// always in the future (14:00 > 10:00).
beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2025, 5, 18, 10, 0, 0));
});
afterAll(() => jest.useRealTimers());

// Deterministic mock calendars. One selected calendar with a Wednesday class at
// 14:00, events with no BYDAY and no recurrence to exercise getByDay guards,
// and one unselected calendar to verify filter logic.
jest.mock('../../src/data/mockCalendars.json', () => ({
  calendars: [
    {
      selected: true,
      events: [
        {
          summary: 'SOEN 390 - Software Engineering',
          location: 'H 501',
          recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=WE'],
          start: { dateTime: '2025-06-18T14:00:00' },
          end: { dateTime: '2025-06-18T15:30:00' },
        },
        {
          summary: 'Daily Standup',
          location: 'H 101',
          recurrence: ['RRULE:FREQ=DAILY'],
          start: { dateTime: '2025-06-18T15:00:00' },
          end: { dateTime: '2025-06-18T15:30:00' },
        },
        {
          summary: 'No Recurrence',
          location: 'H 201',
          start: { dateTime: '2025-06-18T16:00:00' },
          end: { dateTime: '2025-06-18T17:00:00' },
        },
      ],
    },
    {
      selected: false,
      events: [
        {
          summary: 'COMP 346',
          location: 'EV 3.309',
          recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=WE'],
          start: { dateTime: '2025-06-18T16:00:00' },
        },
      ],
    },
  ],
}));

import NextClassScreen from '../../src/screens/NextClassScreen';

const mockNavigation = { navigate: jest.fn() };

describe('NextClassScreen – upcoming class', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.setSystemTime(new Date(2025, 5, 18, 10, 0, 0)); // Wed 10 AM
  });

  it('renders the map view', () => {
    const { toJSON } = render(<NextClassScreen navigation={mockNavigation} />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows Go to My Next Class button', () => {
    const { getByText } = render(<NextClassScreen navigation={mockNavigation} />);
    expect(getByText('Go to My Next Class')).toBeTruthy();
  });

  it('displays subtitle', () => {
    const { getByText } = render(<NextClassScreen navigation={mockNavigation} />);
    expect(getByText('Based on your schedule')).toBeTruthy();
  });

  it('shows detected card after pressing button', () => {
    const { getByText } = render(<NextClassScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Go to My Next Class'));
    expect(getByText('Next Class Detected')).toBeTruthy();
    expect(getByText('SOEN 390 - Software Engineering')).toBeTruthy();
    expect(getByText('H 501')).toBeTruthy();
  });

  it('shows minutes until class after detection', () => {
    const { getByText, queryByText } = render(<NextClassScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Go to My Next Class'));
    expect(queryByText(/Starts in/)).toBeTruthy();
    // 10:00 → 14:00 = 240 min
    expect(queryByText(/240 min/)).toBeTruthy();
  });

  it('Get Directions navigates to Map with class info', () => {
    const { getByText } = render(<NextClassScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Go to My Next Class'));
    fireEvent.press(getByText('Get Directions'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Map', {
      nextClassLocation: 'H 501',
      nextClassSummary: 'SOEN 390 - Software Engineering',
    });
  });

  it('excludes events from unselected calendars', () => {
    const { getByText, queryByText } = render(<NextClassScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Go to My Next Class'));
    expect(queryByText('COMP 346')).toBeNull();
  });
});

describe('NextClassScreen – no upcoming class', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows no class on a non-matching day (Sunday)', () => {
    jest.setSystemTime(new Date(2025, 5, 22, 10, 0, 0)); // Sunday
    const { getByText } = render(<NextClassScreen navigation={mockNavigation} />);
    expect(getByText('No upcoming classes today')).toBeTruthy();
  });

  it('shows no class when all events have passed', () => {
    jest.setSystemTime(new Date(2025, 5, 18, 23, 0, 0)); // 11 PM Wed
    const { getByText } = render(<NextClassScreen navigation={mockNavigation} />);
    expect(getByText('No upcoming classes today')).toBeTruthy();
  });

  it('navigates to Profile on View Schedule', () => {
    jest.setSystemTime(new Date(2025, 5, 22, 10, 0, 0)); // Sunday - no class
    const { getByText } = render(<NextClassScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('View Schedule'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Profile');
  });
});
