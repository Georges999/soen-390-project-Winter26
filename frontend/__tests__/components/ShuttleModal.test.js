import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import ShuttleModal from '../../src/components/ShuttleModal';

const mockStyles = StyleSheet.create({
  modalBackdrop: {}, modalCard: {}, modalHeader: {}, modalTitle: {},
  modalClose: {}, modalCloseText: {}, modalSection: {},
  modalSubtitle: {}, modalAddress: {}, modalSchedule: {},
  modalScheduleTitle: {}, modalScheduleText: {}, modalDepartures: {},
  modalEmpty: {}, departureRow: {}, departureIcon: {},
  departureTime: {}, departureEta: {},
});

const mockSchedule = {
  id: 'sgw-to-loyola',
  campus: 'SGW',
  stop: 'GM Building',
  address: '1550 De Maisonneuve W',
  weekday: { start: '09:15', end: '17:15', intervalMin: 30 },
  friday: { start: '09:15', end: '17:15', intervalMin: 30 },
  estimatedTravelMin: 25,
};

describe('ShuttleModal', () => {
  const baseProps = {
    styles: mockStyles,
    isOpen: true,
    onClose: jest.fn(),
    filteredShuttleSchedules: [mockSchedule],
    getShuttleDepartures: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('should render modal title when open', () => {
    baseProps.getShuttleDepartures.mockReturnValue({ active: true, times: ['10:00', '10:30'] });
    const { getByText } = render(<ShuttleModal {...baseProps} />);
    expect(getByText('Concordia Shuttle')).toBeTruthy();
  });

  it('should show schedule information', () => {
    baseProps.getShuttleDepartures.mockReturnValue({ active: true, times: ['10:00'] });
    const { getByText } = render(<ShuttleModal {...baseProps} />);
    expect(getByText('SGW - GM Building')).toBeTruthy();
    expect(getByText('1550 De Maisonneuve W')).toBeTruthy();
  });

  it('should show departure times when active', () => {
    baseProps.getShuttleDepartures.mockReturnValue({ active: true, times: ['10:00', '10:30'] });
    const { getByText } = render(<ShuttleModal {...baseProps} />);
    expect(getByText('10:00')).toBeTruthy();
    expect(getByText('10:30')).toBeTruthy();
  });

  it('should show no departures message when inactive', () => {
    baseProps.getShuttleDepartures.mockReturnValue({ active: false, times: [] });
    const { getByText } = render(<ShuttleModal {...baseProps} />);
    expect(getByText('No more departures today.')).toBeTruthy();
  });

  it('should show no departures when active but times empty', () => {
    baseProps.getShuttleDepartures.mockReturnValue({ active: true, times: [] });
    const { getByText } = render(<ShuttleModal {...baseProps} />);
    expect(getByText('No more departures today.')).toBeTruthy();
  });

  it('should call onClose when X pressed', () => {
    baseProps.getShuttleDepartures.mockReturnValue({ active: false, times: [] });
    const { getByText } = render(<ShuttleModal {...baseProps} />);
    fireEvent.press(getByText('X'));
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('should show weekday schedule text', () => {
    baseProps.getShuttleDepartures.mockReturnValue({ active: true, times: ['10:00'] });
    const { getByText } = render(<ShuttleModal {...baseProps} />);
    expect(getByText(/Monday to Thursday/)).toBeTruthy();
    expect(getByText(/Friday/)).toBeTruthy();
  });

  it('should show Schedule section title', () => {
    baseProps.getShuttleDepartures.mockReturnValue({ active: true, times: ['10:00'] });
    const { getByText } = render(<ShuttleModal {...baseProps} />);
    expect(getByText('Schedule')).toBeTruthy();
    expect(getByText('Next departures')).toBeTruthy();
  });

  it('should render multiple schedules', () => {
    const secondSchedule = {
      ...mockSchedule,
      id: 'loyola-to-sgw',
      campus: 'Loyola',
      stop: 'CC Building',
    };
    baseProps.getShuttleDepartures.mockReturnValue({ active: true, times: ['11:00'] });
    const { getByText } = render(
      <ShuttleModal {...baseProps} filteredShuttleSchedules={[mockSchedule, secondSchedule]} />,
    );
    expect(getByText('SGW - GM Building')).toBeTruthy();
    expect(getByText('Loyola - CC Building')).toBeTruthy();
  });
});
