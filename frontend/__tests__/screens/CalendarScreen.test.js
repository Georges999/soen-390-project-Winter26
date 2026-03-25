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

function renderCalendarScreen(route = mockRoute) {
  return render(<CalendarScreen navigation={mockNavigation} route={route} />);
}

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
    const { getByText } = renderCalendarScreen({ params: { calendars: [] } });
    expect(getByText('Calendar')).toBeTruthy();
  });

  it('should display current date number', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-23T12:00:00Z'));
    const today = new Date();
    const { getAllByText } = renderCalendarScreen({ params: { calendars: [] } });
    expect(getAllByText(String(today.getDate())).length).toBeGreaterThan(0);
    jest.useRealTimers();
  });

  it('should show seven weekday chips including Sunday in the week strip', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-23T12:00:00Z'));
    const { getByText } = renderCalendarScreen({ params: { calendars: [] } });
    // Week of Mon Feb 23, 2026 includes Sun Mar 1 — strip uses Mon..Sun labels.
    expect(getByText('Sun')).toBeTruthy();
    expect(getByText('Sat')).toBeTruthy();
    jest.useRealTimers();
  });

  it('should show empty auth state when not connected', async () => {
    const { getByText } = renderCalendarScreen();

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

    const { getByText } = renderCalendarScreen({
      params: { selectedCalendarIds: ['team'] },
    });

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

    const { getByText } = renderCalendarScreen();

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

    const { getByText } = renderCalendarScreen();

    await waitFor(() => expect(getByText('Get Directions')).toBeTruthy());
    fireEvent.press(getByText('Get Directions'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Map', {
      nextClassLocation: 'H 961',
      nextClassSummary: 'SOEN 390',
    });
  });

  it('should reload events when the screen regains focus', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);

    renderCalendarScreen();

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
          {
            summary: 'SOEN 390',
            location: 'H 961',
            start: { dateTime: '2026-02-22T09:00:00' },
            end: { dateTime: '2026-02-22T10:30:00' },
            recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU'],
          },
        ],
      },
    ];

    const { getByText } = renderCalendarScreen({
      params: { calendars: routeCalendars },
    });

    expect(getByText('SOEN 390')).toBeTruthy();
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

    const { getByText } = renderCalendarScreen({
      params: { calendars: routeCalendars },
    });

    expect(getByText('No classes scheduled for this day')).toBeTruthy();
  });

  it('should sort live events by their start time', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    googleCalendarService.fetchCalendarEvents.mockResolvedValue({
      success: true,
      events: [
        {
          id: 'late',
          title: 'COMP 346',
          summary: 'COMP 346',
          location: 'EV 3.309',
          startTime: '2026-02-23T16:00:00.000Z',
        },
        {
          id: 'early',
          title: 'SOEN 390',
          summary: 'SOEN 390',
          location: 'H 961',
          startTime: '2026-02-23T09:00:00.000Z',
        },
      ],
    });

    jest.useFakeTimers().setSystemTime(new Date('2026-02-23T12:00:00Z'));
    const { getAllByText } = renderCalendarScreen();

    await waitFor(() => {
      const names = getAllByText(/SOEN 390|COMP 346/).map((node) => node.props.children);
      expect(names).toEqual(['SOEN 390', 'COMP 346']);
    });
    jest.useRealTimers();
  });

  it('should navigate back when pressing back button', () => {
    const { getByText } = render(
      <CalendarScreen navigation={mockNavigation} route={mockRoute} />,
    );
    // MaterialIcons renders as Text with icon name in test env
    fireEvent.press(getByText('chevron-left'));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('should call handleGetDirections when pressing Get Directions on a class', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-24T09:00:00Z'));
    const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const todayCode = dayMap[new Date().getDay()];

    const mockCalendars = [
      {
        id: 'test',
        name: 'Test',
        selected: true,
        events: [
          {
            summary: 'ENGR 301',
            location: 'H 110',
            start: { dateTime: '2026-02-24T10:00:00' },
            end: { dateTime: '2026-02-24T11:30:00' },
            recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${todayCode}`],
          },
        ],
      },
    ];
    const { getByText } = render(
      <CalendarScreen
        navigation={mockNavigation}
        route={{ params: { calendars: mockCalendars } }}
      />,
    );
    fireEvent.press(getByText('Get Directions'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Map', {
      nextClassLocation: 'H 110',
      nextClassSummary: 'ENGR 301',
    });
    jest.useRealTimers();
  });
});
