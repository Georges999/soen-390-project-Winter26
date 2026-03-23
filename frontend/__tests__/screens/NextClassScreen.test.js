import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import NextClassScreen from '../../src/screens/NextClassScreen';
import * as googleCalendarAuth from '../../src/services/googleCalendarAuth';
import { useNextClass } from '../../src/hooks/useNextClass';

jest.mock('../../src/services/googleCalendarAuth');
jest.mock('../../src/hooks/useNextClass');

const mockNavigation = {
  navigate: jest.fn(),
  addListener: jest.fn(),
};

describe('NextClassScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigation.addListener.mockReturnValue(jest.fn());
    googleCalendarAuth.isAuthenticated.mockResolvedValue(false);
    useNextClass.mockReturnValue({
      nextClass: null,
      isLoading: false,
      refresh: jest.fn(),
    });
  });

  it('should render the map view', () => {
    const { toJSON } = render(<NextClassScreen navigation={mockNavigation} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should show connect guidance when not connected', async () => {
    const { getByText } = render(<NextClassScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Connect Google Calendar from Profile to see your next class')).toBeTruthy();
    });
  });

  it('should refresh connection state when the screen regains focus', async () => {
    const refresh = jest.fn();
    useNextClass.mockReturnValue({
      nextClass: null,
      isLoading: false,
      refresh,
    });

    render(<NextClassScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(googleCalendarAuth.isAuthenticated).toHaveBeenCalledTimes(1);
    });

    const focusHandler = mockNavigation.addListener.mock.calls[0][1];
    await focusHandler();

    expect(googleCalendarAuth.isAuthenticated).toHaveBeenCalledTimes(2);
  });

  it('should show a loading subtitle while calendar data is loading', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    useNextClass.mockReturnValue({
      nextClass: null,
      isLoading: true,
      refresh: jest.fn(),
    });

    const { getByText } = render(<NextClassScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Loading your Google Calendar')).toBeTruthy();
    });
  });

  it('should show connected empty state when there is no next class', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);

    const { getByText } = render(<NextClassScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('No upcoming classes found in your selected Google calendars')).toBeTruthy();
    });
  });

  it('should show "Go to My Next Class" when a next class exists', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    useNextClass.mockReturnValue({
      nextClass: {
        summary: 'SOEN 390',
        location: 'H 961',
        startTime: new Date(Date.now() + 3600000).toISOString(),
      },
      isLoading: false,
      refresh: jest.fn(),
    });

    const { getByText } = render(<NextClassScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Go to My Next Class')).toBeTruthy();
    });
  });

  it('should show next class detected when pressed', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    useNextClass.mockReturnValue({
      nextClass: {
        summary: 'SOEN 390',
        location: 'H 961',
        startTime: new Date(Date.now() + 3600000).toISOString(),
      },
      isLoading: false,
      refresh: jest.fn(),
    });

    const { getByText } = render(<NextClassScreen navigation={mockNavigation} />);

    await waitFor(() => expect(getByText('Go to My Next Class')).toBeTruthy());
    fireEvent.press(getByText('Go to My Next Class'));
    expect(getByText('Next Class Detected')).toBeTruthy();
  });

  it('should navigate to Map when Get Directions is pressed', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    useNextClass.mockReturnValue({
      nextClass: {
        summary: 'SOEN 390',
        location: 'H 961',
        startTime: new Date(Date.now() + 3600000).toISOString(),
      },
      isLoading: false,
      refresh: jest.fn(),
    });

    const { getByText } = render(<NextClassScreen navigation={mockNavigation} />);

    await waitFor(() => expect(getByText('Go to My Next Class')).toBeTruthy());
    fireEvent.press(getByText('Go to My Next Class'));
    fireEvent.press(getByText('Get Directions'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Map', {
      nextClassLocation: 'H 961',
      nextClassSummary: 'SOEN 390',
    });
  });

  it('should fall back to title and start.dateTime when detecting a class', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    useNextClass.mockReturnValue({
      nextClass: {
        title: 'COMP 346',
        location: 'EV 3.309',
        start: {
          dateTime: new Date(Date.now() + 3600000).toISOString(),
        },
      },
      isLoading: false,
      refresh: jest.fn(),
    });

    const { getByText } = render(<NextClassScreen navigation={mockNavigation} />);

    await waitFor(() => expect(getByText('Go to My Next Class')).toBeTruthy());
    fireEvent.press(getByText('Go to My Next Class'));
    fireEvent.press(getByText('Get Directions'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Map', {
      nextClassLocation: 'EV 3.309',
      nextClassSummary: 'COMP 346',
    });
  });
});
