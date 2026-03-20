import React from 'react';
import { render } from '@testing-library/react-native';
import ShuttleModal from '../../src/components/ShuttleModal';

it('covers estimatedTravelMin fallback branch', () => {
  const schedule = { id: 's1', campus: 'SGW', stop: 'GM', address: 'A', weekday: { start: '09:00', end: '10:00', intervalMin: 30 }, friday: { start: '09:00', end: '10:00', intervalMin: 30 } };
  const props = { styles: {}, isOpen: true, onClose: jest.fn(), filteredShuttleSchedules: [schedule], getShuttleDepartures: () => ({ active: true, times: ['10:00'] }) };
  const { getByText } = render(<ShuttleModal {...props} />);
  expect(getByText('ETA 10:00')).toBeTruthy();
});
