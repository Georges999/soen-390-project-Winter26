import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import CalendarScreen from '../../src/screens/CalendarScreen';
import * as googleCalendarAuth from '../../src/services/googleCalendarAuth';
import * as googleCalendarService from '../../src/services/googleCalendarService';

jest.mock('../../src/services/googleCalendarAuth');
jest.mock('../../src/services/googleCalendarService');

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  addListener: jest.fn(),
};

const mockRoute = {
  params: undefined,
};

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigation.addListener.mockReturnValue(jest.fn());
    googleCalendarAuth.isAuthenticated.mockResolvedValue(false);
    googleCalendarService.fetchCalendarEvents.mockResolvedValue({
      success: true,
      events: [],
    });
  });

  it('should render Calendar title', () => {
    const { getByText } = render(
      <CalendarScreen navigation={mockNavigation} route={{ params: { calendars: [] } }} />
    );
    expect(getByText('Calendar')).toBeTruthy();
  });

  it('should display current date number', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-23T12:00:00Z'));
    const today = new Date();
    const { getAllByText } = render(
      <CalendarScreen navigation={mockNavigation} route={{ params: { calendars: [] } }} />
    );
    expect(getAllByText(String(today.getDate())).length).toBeGreaterThan(0);
    jest.useRealTimers();
  });

  it('should show empty auth state when not connected', async () => {
    const { getByText } = render(
      <CalendarScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('Connect Google Calendar from Profile to see your schedule.')).toBeTruthy();
    });
  });

  it('should show an error when live event loading fails', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    googleCalendarService.fetchCalendarEvents.mockResolvedValue({
      success: false,
      error: 'Calendar API failed',
    });

    const { getByText } = render(
      <CalendarScreen
        navigation={mockNavigation}
        route={{ params: { selectedCalendarIds: ['team'] } }}
      />
    );

    await waitFor(() => {
      expect(getByText('Calendar API failed')).toBeTruthy();
    });
    expect(googleCalendarService.fetchCalendarEvents).toHaveBeenCalledWith(
      ['team'],
      expect.any(Date),
      expect.any(Date)
    );
  });

  it('should render live events from Google Calendar services', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    googleCalendarService.fetchCalendarEvents.mockResolvedValue({
      success: true,
      events: [
        {
          id: '1',
          title: 'COMP 346',
          summary: 'COMP 346',
          location: 'EV 3.309',
          startTime: new Date().toISOString(),
        },
      ],
    });

    const { getByText } = render(
      <CalendarScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('COMP 346')).toBeTruthy();
      expect(getByText('EV 3.309')).toBeTruthy();
    });
  });

  it('should navigate to Map from live event directions button', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    googleCalendarService.fetchCalendarEvents.mockResolvedValue({
      success: true,
      events: [
        {
          id: '1',
          title: 'SOEN 390',
          summary: 'SOEN 390',
          location: 'H 961',
          startTime: new Date().toISOString(),
        },
      ],
    });

    const { getByText } = render(
      <CalendarScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => expect(getByText('Get Directions')).toBeTruthy());
    fireEvent.press(getByText('Get Directions'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Map', {
      nextClassLocation: 'H 961',
      nextClassSummary: 'SOEN 390',
    });
  });

  it('should reload events when the screen regains focus', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);

    render(<CalendarScreen navigation={mockNavigation} route={mockRoute} />);

    await waitFor(() => {
      expect(googleCalendarService.fetchCalendarEvents).toHaveBeenCalledTimes(1);
    });

    const focusHandler = mockNavigation.addListener.mock.calls[0][1];
    await act(async () => {
      await focusHandler();
    });

    expect(googleCalendarService.fetchCalendarEvents).toHaveBeenCalledTimes(2);
  });

  it('should still support legacy calendar route params', () => {
    const routeCalendars = [
      {
        id: 'test',
        name: 'Test Calendar',
        selected: true,
        events: [
          {
            summary: 'COMP 346',
            location: 'EV 3.309',
            start: { dateTime: '2026-02-22T14:00:00' },
            end: { dateTime: '2026-02-22T15:30:00' },
            recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU'],
          },
        ],
      },
    ];

    const { getByText } = render(
      <CalendarScreen
        navigation={mockNavigation}
        route={{ params: { calendars: routeCalendars } }}
      />
    );

    expect(getByText('COMP 346')).toBeTruthy();
  });

  it('should show empty state for legacy calendars with no matching recurrence', () => {
    const routeCalendars = [
      {
        id: 'test',
        name: 'Test Calendar',
        selected: true,
        events: [
          {
            summary: 'COMP 346',
            location: 'EV 3.309',
            start: { dateTime: '2026-02-22T14:00:00' },
            end: { dateTime: '2026-02-22T15:30:00' },
            recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=ZZ'],
          },
        ],
      },
    ];

    const { getByText } = render(
      <CalendarScreen
        navigation={mockNavigation}
        route={{ params: { calendars: routeCalendars } }}
      />
    );

    expect(getByText('No classes scheduled for this day')).toBeTruthy();
  });
});
