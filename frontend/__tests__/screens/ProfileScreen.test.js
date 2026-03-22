import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ProfileScreen from '../../src/screens/ProfileScreen';
import * as googleCalendarAuth from '../../src/services/googleCalendarAuth';
import * as googleCalendarService from '../../src/services/googleCalendarService';

jest.mock('../../src/services/googleCalendarAuth');
jest.mock('../../src/services/googleCalendarService');

const mockNavigation = {
  navigate: jest.fn(),
};

const mockCalendars = [
  { id: 'primary', name: 'Primary Calendar', selected: true },
  { id: 'team', name: 'Team Calendar', selected: false },
];

describe('ProfileScreen', () => {
  beforeAll(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterAll(() => {
    Alert.alert.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    googleCalendarAuth.isAuthenticated.mockResolvedValue(false);
    googleCalendarAuth.authenticateWithGoogle.mockResolvedValue({ success: true });
    googleCalendarAuth.disconnectCalendar.mockResolvedValue();
    googleCalendarService.fetchGoogleCalendars.mockResolvedValue({
      success: true,
      calendars: mockCalendars,
    });
    googleCalendarService.saveSelectedCalendarIds.mockResolvedValue();
  });

  it('should render Profile title', async () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('Profile')).toBeTruthy();
    });
  });

  it('should show Connect button when not authenticated', async () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('Connect')).toBeTruthy();
    });
  });

  it('should call authenticateWithGoogle when Connect pressed', async () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => expect(getByText('Connect')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Connect'));
    });

    expect(googleCalendarAuth.authenticateWithGoogle).toHaveBeenCalled();
    expect(googleCalendarService.fetchGoogleCalendars).toHaveBeenCalled();
  });

  it('should show an error alert when connect fails', async () => {
    googleCalendarAuth.authenticateWithGoogle.mockResolvedValue({
      success: false,
      error: 'oauth failed',
    });

    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => expect(getByText('Connect')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Connect'));
    });

    expect(Alert.alert).toHaveBeenCalledWith('Connection Failed', 'oauth failed');
  });

  it('should show connected calendars after a successful connect', async () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => expect(getByText('Connect')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Connect'));
    });

    await waitFor(() => {
      expect(getByText('Connected Calendars')).toBeTruthy();
      expect(getByText('Primary Calendar')).toBeTruthy();
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Calendar Connected',
      'Google Calendar connected successfully'
    );
  });

  it('should show an empty-calendar alert when connect succeeds without calendars', async () => {
    googleCalendarService.fetchGoogleCalendars.mockResolvedValue({
      success: true,
      calendars: [],
    });

    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => expect(getByText('Connect')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Connect'));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Calendar Connected',
      'Google Calendar connected, but no calendars were returned for this account.'
    );
  });

  it('should load calendars when initially authenticated', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);

    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Disconnect')).toBeTruthy();
      expect(getByText('Primary Calendar')).toBeTruthy();
    });
  });

  it('should show an empty calendars state when calendar loading fails', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    googleCalendarService.fetchGoogleCalendars.mockResolvedValue({
      success: false,
      error: 'fetch failed',
    });

    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('No Google calendars found.')).toBeTruthy();
    });
  });

  it('should navigate to Calendar with selected calendar ids', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);

    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => expect(getByText('View Calendar')).toBeTruthy());
    fireEvent.press(getByText('View Calendar'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Calendar', {
      selectedCalendarIds: ['primary'],
    });
  });

  it('should persist calendar selection changes', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);

    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => expect(getByText('Team Calendar')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Team Calendar'));
    });

    expect(googleCalendarService.saveSelectedCalendarIds).toHaveBeenCalledWith([
      'primary',
      'team',
    ]);
  });

  it('should disconnect when Disconnect pressed', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);

    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => expect(getByText('Disconnect')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Disconnect'));
    });

    expect(googleCalendarAuth.disconnectCalendar).toHaveBeenCalled();
    await waitFor(() => {
      expect(getByText('Connect')).toBeTruthy();
    });
  });
});
