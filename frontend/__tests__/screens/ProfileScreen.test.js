import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ProfileScreen from '../../src/screens/ProfileScreen';
import * as googleCalendarAuth from '../../src/services/googleCalendarAuth';

jest.mock('../../src/services/googleCalendarAuth');

const mockNavigation = {
  navigate: jest.fn(),
};

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    googleCalendarAuth.isAuthenticated.mockResolvedValue(false);
    googleCalendarAuth.authenticateWithGoogle.mockResolvedValue({ success: true });
    googleCalendarAuth.disconnectCalendar.mockResolvedValue();
  });

  it('should render Profile title', async () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('Profile')).toBeTruthy();
    });
  });

  it('should render My Schedule section', async () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('My Schedule')).toBeTruthy();
    });
  });

  it('should show Connect button when not authenticated', async () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('Connect')).toBeTruthy();
    });
  });

  it('should show Connect Google Calendar text when not connected', async () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('Connect Google Calendar')).toBeTruthy();
    });
  });

  it('should call authenticateWithGoogle when Connect pressed', async () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Connect')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Connect'));
    });

    expect(googleCalendarAuth.authenticateWithGoogle).toHaveBeenCalled();
  });

  it('should show Disconnect after successful connect', async () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Connect')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Connect'));
    });

    await waitFor(() => {
      expect(getByText('Disconnect')).toBeTruthy();
    });
  });

  it('should show Disconnect when initially authenticated', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Disconnect')).toBeTruthy();
    });
  });

  it('should show Google Calendar Connected when authenticated', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Google Calendar Connected')).toBeTruthy();
    });
  });

  it('should show Connected Calendars section after connect', async () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Connect')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Connect'));
    });

    await waitFor(() => {
      expect(getByText('Connected Calendars')).toBeTruthy();
    });
  });

  it('should show View Calendar button when connected', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('View Calendar')).toBeTruthy();
    });
  });

  it('should navigate to Calendar when View Calendar pressed', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => expect(getByText('View Calendar')).toBeTruthy());
    fireEvent.press(getByText('View Calendar'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Calendar', expect.any(Object));
  });

  it('should disconnect when Disconnect pressed', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => expect(getByText('Disconnect')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Disconnect'));
    });

    await waitFor(() => {
      expect(googleCalendarAuth.disconnectCalendar).toHaveBeenCalled();
    });
  });

  it('should show Connect after disconnect', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => expect(getByText('Disconnect')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Disconnect'));
    });

    await waitFor(() => {
      expect(getByText('Connect')).toBeTruthy();
    });
  });

  it('should toggle calendar selection', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => expect(getByText('Connected Calendars')).toBeTruthy());

    // Find a calendar item and toggle it
    const calendarItem = getByText('Winter 2026 - Courses');
    fireEvent.press(calendarItem);
    // Should not crash - toggle just flips selected state
  });

  it('should show Syncing Your Class when connected', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Syncing Your Class')).toBeTruthy();
    });
  });

  it('should show Sync Your Class when not connected', async () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Sync Your Class')).toBeTruthy();
    });
  });
});
