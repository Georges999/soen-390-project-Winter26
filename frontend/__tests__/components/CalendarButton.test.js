import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CalendarButton from '../../src/components/CalendarButton';
import * as googleCalendarAuth from '../../src/services/googleCalendarAuth';

jest.mock('../../src/services/googleCalendarAuth');
jest.spyOn(Alert, 'alert');

describe('CalendarButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    googleCalendarAuth.isAuthenticated.mockResolvedValue(false);
  });

  it('should render "Connect Calendar" when not connected', async () => {
    const { getByText } = render(<CalendarButton onConnectionChange={jest.fn()} />);
    await waitFor(() => {
      expect(getByText('Connect Calendar')).toBeTruthy();
    });
  });

  it('should render "Calendar Connected" when authenticated', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    const { getByText } = render(<CalendarButton onConnectionChange={jest.fn()} />);
    await waitFor(() => {
      expect(getByText('Calendar Connected')).toBeTruthy();
    });
  });

  it('should call authenticateWithGoogle on connect press', async () => {
    googleCalendarAuth.authenticateWithGoogle.mockResolvedValue({ success: true });
    const onConnectionChange = jest.fn();
    const { getByText } = render(<CalendarButton onConnectionChange={onConnectionChange} />);
    await waitFor(() => expect(getByText('Connect Calendar')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Connect Calendar'));
    });

    await waitFor(() => {
      expect(googleCalendarAuth.authenticateWithGoogle).toHaveBeenCalled();
    });
  });

  it('should show success alert on successful connection', async () => {
    googleCalendarAuth.authenticateWithGoogle.mockResolvedValue({ success: true });
    const { getByText } = render(<CalendarButton onConnectionChange={jest.fn()} />);
    await waitFor(() => expect(getByText('Connect Calendar')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Connect Calendar'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Calendar connected successfully');
    });
  });

  it('should handle auth cancel error', async () => {
    googleCalendarAuth.authenticateWithGoogle.mockResolvedValue({
      success: false,
      error: 'User cancelled authentication',
    });
    const { getByText } = render(<CalendarButton onConnectionChange={jest.fn()} />);
    await waitFor(() => expect(getByText('Connect Calendar')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Connect Calendar'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Connection Failed',
        'Authentication was cancelled',
        expect.any(Array),
      );
    });
  });

  it('should handle auth network error', async () => {
    googleCalendarAuth.authenticateWithGoogle.mockResolvedValue({
      success: false,
      error: 'network error',
    });
    const { getByText } = render(<CalendarButton onConnectionChange={jest.fn()} />);
    await waitFor(() => expect(getByText('Connect Calendar')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Connect Calendar'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Connection Failed',
        'Network error. Please check your connection',
        expect.any(Array),
      );
    });
  });

  it('should handle auth permission denied', async () => {
    googleCalendarAuth.authenticateWithGoogle.mockResolvedValue({
      success: false,
      error: 'permission denied',
    });
    const { getByText } = render(<CalendarButton onConnectionChange={jest.fn()} />);
    await waitFor(() => expect(getByText('Connect Calendar')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Connect Calendar'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Connection Failed',
        'Calendar permission was denied',
        expect.any(Array),
      );
    });
  });

  it('should handle generic auth error', async () => {
    googleCalendarAuth.authenticateWithGoogle.mockResolvedValue({
      success: false,
      error: 'unknown',
    });
    const { getByText } = render(<CalendarButton onConnectionChange={jest.fn()} />);
    await waitFor(() => expect(getByText('Connect Calendar')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Connect Calendar'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Connection Failed',
        'Failed to connect calendar',
        expect.any(Array),
      );
    });
  });

  it('should handle auth exception', async () => {
    googleCalendarAuth.authenticateWithGoogle.mockRejectedValue(new Error('Unexpected'));
    const { getByText } = render(<CalendarButton onConnectionChange={jest.fn()} />);
    await waitFor(() => expect(getByText('Connect Calendar')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Connect Calendar'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('should show disconnect confirmation when connected', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    const { getByText } = render(<CalendarButton onConnectionChange={jest.fn()} />);
    await waitFor(() => expect(getByText('Calendar Connected')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Calendar Connected'));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Disconnect Calendar',
      'Are you sure you want to disconnect your calendar?',
      expect.any(Array),
    );
  });

  it('should disconnect when confirm is pressed', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    googleCalendarAuth.disconnectCalendar.mockResolvedValue();
    const onConnectionChange = jest.fn();
    const { getByText } = render(<CalendarButton onConnectionChange={onConnectionChange} />);
    await waitFor(() => expect(getByText('Calendar Connected')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Calendar Connected'));
    });

    // Extract the Disconnect button callback from Alert.alert
    const alertArgs = Alert.alert.mock.calls[0];
    const disconnectBtn = alertArgs[2].find((b) => b.text === 'Disconnect');

    await act(async () => {
      await disconnectBtn.onPress();
    });

    await waitFor(() => {
      expect(googleCalendarAuth.disconnectCalendar).toHaveBeenCalled();
    });
  });

  it('should handle disconnect error', async () => {
    googleCalendarAuth.isAuthenticated.mockResolvedValue(true);
    googleCalendarAuth.disconnectCalendar.mockRejectedValue(new Error('fail'));
    const { getByText } = render(<CalendarButton onConnectionChange={jest.fn()} />);
    await waitFor(() => expect(getByText('Calendar Connected')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Calendar Connected'));
    });

    const alertArgs = Alert.alert.mock.calls[0];
    const disconnectBtn = alertArgs[2].find((b) => b.text === 'Disconnect');

    await act(async () => {
      await disconnectBtn.onPress();
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to disconnect calendar');
    });
  });

  it('should render without onConnectionChange prop', async () => {
    const { getByText } = render(<CalendarButton />);
    await waitFor(() => {
      expect(getByText('Connect Calendar')).toBeTruthy();
    });
  });
});
