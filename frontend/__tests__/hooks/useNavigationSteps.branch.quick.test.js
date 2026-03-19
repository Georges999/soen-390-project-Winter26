import { renderHook, waitFor } from '@testing-library/react-native';
import * as Speech from 'expo-speech';
import { useNavigationSteps } from '../../src/hooks/useNavigationSteps';

jest.mock('expo-speech', () => ({ stop: jest.fn(), speak: jest.fn() }));

it('covers step advance + speech branch', async () => {
  const routeInfo = { steps: [{ endLocation: { latitude: 45.5, longitude: -73.5 }, instruction: 'A' }, { endLocation: { latitude: 45.50001, longitude: -73.50001 }, instruction: 'Next <b>turn</b>' }] };
  const { result } = renderHook(() => useNavigationSteps({ navActive: true, userCoord: { latitude: 45.5, longitude: -73.5 }, routeInfo, speechEnabled: true }));
  await waitFor(() => expect(result.current.currentStepIndex).toBe(1));
  expect(Speech.speak).toHaveBeenCalled();
});
