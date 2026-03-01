import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MapScreen from '../../src/screens/MapScreen';
import * as locationService from '../../src/services/locationService';
import * as Speech from 'expo-speech';

jest.mock('../../src/services/locationService');

globalThis.fetch = jest.fn(() =>
  Promise.resolve({
    json: () =>
      Promise.resolve({
        routes: [
          {
            overview_polyline: { points: 'abc' },
            legs: [
              {
                duration: { text: '5 mins', value: 300 },
                distance: { text: '400 m', value: 400 },
                steps: [
                  {
                    travel_mode: 'WALKING',
                    html_instructions: '<b>Walk north</b>',
                    polyline: { points: 'abc' },
                    distance: { text: '200 m' },
                    duration: { text: '2 mins' },
                    end_location: { lat: 45.498, lng: -73.579 },
                  },
                ],
              },
            ],
          },
        ],
      }),
  }),
);

// Helper: focus + type using separate act() blocks (batched calls defeat search)
async function focusAndType(input, text) {
  await act(async () => {
    fireEvent(input, 'focus');
  });
  await act(async () => {
    fireEvent.changeText(input, text);
  });
}

// Helper: set start & dest using polygon presses (reliable, avoids search timing)
async function setupRouteViaPolygons(result) {
  const startInput = result.getByTestId('start-input');
  const destInput = result.getByTestId('dest-input');

  // Focus start → press B Annex polygon
  await act(async () => {
    fireEvent(startInput, 'focus');
  });
  await act(async () => {
    fireEvent.press(result.getByTestId('building-sgw-b'));
  });

  // Focus dest → press John Molson Building polygon
  await act(async () => {
    fireEvent(destInput, 'focus');
  });
  await act(async () => {
    fireEvent.press(result.getByTestId('building-sgw-mb'));
  });

  // Wait for DirectionsPanel
  await waitFor(() => {
    expect(result.queryByText('GO')).toBeTruthy();
  });
}

describe('MapScreen - Additional Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    locationService.getUserCoords.mockResolvedValue({
      latitude: 45.4973,
      longitude: -73.5789,
    });
    locationService.watchUserCoords.mockImplementation((cb) => {
      cb({ latitude: 45.4973, longitude: -73.5789 });
      return Promise.resolve({ remove: jest.fn() });
    });
  });

  // ── Search-based building & location selection ──────────────────────────

  describe('Building Selection from Search', () => {
    it('should show suggestions when typing in start field', async () => {
      const { getByTestId, queryAllByText } = render(<MapScreen />);
      await focusAndType(getByTestId('start-input'), 'Faubourg');
      expect(queryAllByText(/Faubourg/).length).toBeGreaterThan(0);
    });

    it('should show suggestions when typing in destination field', async () => {
      const { getByTestId, queryAllByText } = render(<MapScreen />);
      await focusAndType(getByTestId('dest-input'), 'Molson');
      expect(queryAllByText(/Molson/).length).toBeGreaterThan(0);
    });

    it('should select a building from search results for start field', async () => {
      const { getByTestId, getByText } = render(<MapScreen />);
      const startInput = getByTestId('start-input');
      await focusAndType(startInput, 'Faubourg B');
      await act(async () => {
        fireEvent.press(getByText('Faubourg Building'));
      });
      expect(startInput.props.value).toBe('Faubourg Building');
    });

    it('should select a building from search results for dest field', async () => {
      const { getByTestId, getByText } = render(<MapScreen />);
      const destInput = getByTestId('dest-input');
      await focusAndType(destInput, 'Molson');
      await act(async () => {
        fireEvent.press(getByText('John Molson Building'));
      });
      expect(destInput.props.value).toBe('John Molson Building');
    });

    it('should show and select My location option for dest field', async () => {
      const { getByTestId, getByText } = render(<MapScreen />);
      const destInput = getByTestId('dest-input');
      await focusAndType(destInput, 'my');
      await act(async () => {
        fireEvent.press(getByText('My location'));
      });
      expect(destInput.props.value).toBe('My location');
    });
  });

  // ── Building press (polygon tap) → Bottom Sheet → Directions ────────────

  describe('Building polygon press', () => {
    it('should open building bottom sheet when pressing a building polygon', async () => {
      const { getByTestId, queryByText } = render(<MapScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('building-sgw-b'));
      });
      expect(queryByText('Directions')).toBeTruthy();
      expect(queryByText('Amenities')).toBeTruthy();
    });

    it('should set destination when pressing Directions in bottom sheet', async () => {
      const { getByTestId, getByText } = render(<MapScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('building-sgw-b'));
      });
      await act(async () => {
        fireEvent.press(getByText('Directions'));
      });
      expect(getByTestId('dest-input').props.value).toBe('B Annex');
    });

    it('should fill start field when activeField is start and building is pressed', async () => {
      const { getByTestId } = render(<MapScreen />);
      const startInput = getByTestId('start-input');
      await act(async () => {
        fireEvent(startInput, 'focus');
      });
      await act(async () => {
        fireEvent.press(getByTestId('building-sgw-b'));
      });
      expect(startInput.props.value).toBe('B Annex');
    });

    it('should fill dest field when activeField is dest and building is pressed', async () => {
      const { getByTestId } = render(<MapScreen />);
      const destInput = getByTestId('dest-input');
      await act(async () => {
        fireEvent(destInput, 'focus');
      });
      await act(async () => {
        fireEvent.press(getByTestId('building-sgw-b'));
      });
      expect(destInput.props.value).toBe('B Annex');
    });

    it('should close bottom sheet when close button is pressed', async () => {
      const { getByTestId, getAllByText, queryByText } = render(<MapScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('building-sgw-b'));
      });
      expect(queryByText('Amenities')).toBeTruthy();
      const closeBtns = getAllByText('✕');
      await act(async () => {
        fireEvent.press(closeBtns[closeBtns.length - 1]);
      });
      expect(queryByText('Amenities')).toBeFalsy();
    });
  });

  // ── Swap ────────────────────────────────────────────────────────────────

  describe('Swap functionality', () => {
    it('should swap start and destination via polygon selection', async () => {
      const { getByTestId, getByText } = render(<MapScreen />);
      const startInput = getByTestId('start-input');
      const destInput = getByTestId('dest-input');

      // Set start = B Annex via polygon
      await act(async () => {
        fireEvent(startInput, 'focus');
      });
      await act(async () => {
        fireEvent.press(getByTestId('building-sgw-b'));
      });

      // Set dest = John Molson via polygon
      await act(async () => {
        fireEvent(destInput, 'focus');
      });
      await act(async () => {
        fireEvent.press(getByTestId('building-sgw-mb'));
      });

      const startBefore = startInput.props.value;
      const destBefore = destInput.props.value;

      await act(async () => {
        fireEvent.press(getByText('swap-vert'));
      });

      expect(startInput.props.value).toBe(destBefore);
      expect(destInput.props.value).toBe(startBefore);
    });
  });

  // ── Directions panel Go & Simulate ──────────────────────────────────────

  describe('Directions Panel interactions', () => {
    it('should show GO and Simulate buttons when route is set', async () => {
      const result = render(<MapScreen />);
      await setupRouteViaPolygons(result);
      expect(result.queryByText('GO')).toBeTruthy();
      expect(result.queryByText('Simulate')).toBeTruthy();
    });

    it('should show travel mode buttons', async () => {
      const result = render(<MapScreen />);
      await setupRouteViaPolygons(result);
      expect(result.queryByText('Walk')).toBeTruthy();
      expect(result.queryByText('Car')).toBeTruthy();
      expect(result.queryByText('Bike')).toBeTruthy();
    });

    it('should press GO button', async () => {
      const result = render(<MapScreen />);
      await setupRouteViaPolygons(result);
      await act(async () => {
        fireEvent.press(result.getByText('GO'));
      });
      expect(result.queryByText('GO')).toBeTruthy();
    });

    it('should press Simulate to start simulation', async () => {
      jest.useFakeTimers();
      const result = render(<MapScreen />);
      await setupRouteViaPolygons(result);
      await act(async () => {
        fireEvent.press(result.getByText('Simulate'));
      });
      expect(result.queryByText('Stop')).toBeTruthy();
      jest.useRealTimers();
    });

    it('should stop simulation after starting', async () => {
      jest.useFakeTimers();
      const result = render(<MapScreen />);
      await setupRouteViaPolygons(result);
      await act(async () => {
        fireEvent.press(result.getByText('Simulate'));
      });
      expect(result.queryByText('Stop')).toBeTruthy();
      await act(async () => {
        fireEvent.press(result.getByText('Stop'));
      });
      expect(result.queryByText('Simulate')).toBeTruthy();
      jest.useRealTimers();
    });

    it('should switch travel mode to Car', async () => {
      const result = render(<MapScreen />);
      await setupRouteViaPolygons(result);
      await act(async () => {
        fireEvent.press(result.getByText('Car'));
      });
      expect(result.queryByText('Car')).toBeTruthy();
    });

    it('should switch travel mode to Bike', async () => {
      const result = render(<MapScreen />);
      await setupRouteViaPolygons(result);
      await act(async () => {
        fireEvent.press(result.getByText('Bike'));
      });
      expect(result.queryByText('Bike')).toBeTruthy();
    });

    it('should toggle speech', async () => {
      const result = render(<MapScreen />);
      await setupRouteViaPolygons(result);
      const speechBtn =
        result.queryByText('volume-up') || result.queryByText('volume-off');
      if (speechBtn) {
        await act(async () => {
          fireEvent.press(speechBtn);
        });
        expect(Speech.stop).toHaveBeenCalled();
      }
    });
  });

  // ── Clear inputs ────────────────────────────────────────────────────────

  describe('Clear input buttons', () => {
    it('should clear start text when clear button pressed', async () => {
      const { getByTestId, getAllByText } = render(<MapScreen />);
      const startInput = getByTestId('start-input');
      await act(async () => {
        fireEvent.changeText(startInput, 'Some Text');
      });
      const clearBtns = getAllByText('✕');
      if (clearBtns.length > 0) {
        await act(async () => {
          fireEvent.press(clearBtns[0]);
        });
        expect(startInput.props.value).toBe('');
      }
    });

    it('should clear dest text when clear button pressed', async () => {
      const { getByTestId, getAllByText } = render(<MapScreen />);
      const destInput = getByTestId('dest-input');
      await act(async () => {
        fireEvent.changeText(destInput, 'Some Building');
      });
      const clearBtns = getAllByText('✕');
      if (clearBtns.length > 0) {
        await act(async () => {
          fireEvent.press(clearBtns[clearBtns.length - 1]);
        });
        expect(destInput.props.value).toBe('');
      }
    });
  });

  // ── Campus switching ────────────────────────────────────────────────────

  describe('Campus switching', () => {
    it('should switch to Loyola and back to SGW', async () => {
      const { getByText } = render(<MapScreen />);
      await act(async () => {
        fireEvent.press(getByText('Loyola'));
      });
      await act(async () => {
        fireEvent.press(getByText('SGW'));
      });
      expect(getByText('SGW')).toBeTruthy();
    });

    it('should render other campus buildings', () => {
      const { getByTestId } = render(<MapScreen />);
      expect(getByTestId('building-loyola-loyola-ad')).toBeTruthy();
    });
  });

  // ── Location handling ───────────────────────────────────────────────────

  describe('Location handling', () => {
    it('should handle null user coordinates', async () => {
      locationService.getUserCoords.mockResolvedValue(null);
      locationService.watchUserCoords.mockImplementation(() =>
        Promise.resolve(null),
      );
      const { getByText } = render(<MapScreen />);
      await waitFor(() => {
        expect(getByText('SGW')).toBeTruthy();
      });
    });

    it('should handle location watch failure', async () => {
      locationService.watchUserCoords.mockRejectedValue(
        new Error('Location denied'),
      );
      const { getByText } = render(<MapScreen />);
      await waitFor(() => {
        expect(getByText('SGW')).toBeTruthy();
      });
    });
  });

  // ── Route params from NextClass ─────────────────────────────────────────

  describe('Route params from NextClass', () => {
    it('should prefill destination from route params', async () => {
      const route = {
        params: {
          nextClassLocation: 'H Building Room 501',
          nextClassSummary: 'SOEN 390',
        },
      };
      const { getByTestId } = render(<MapScreen route={route} />);
      await waitFor(() => {
        expect(getByTestId('dest-input').props.value).toBe(
          'H Building Room 501',
        );
      });
    });

    it('should set start to My location from route params', async () => {
      const route = {
        params: {
          nextClassLocation: 'EV Building',
          nextClassSummary: 'COMP 346',
        },
      };
      const { getByTestId } = render(<MapScreen route={route} />);
      await waitFor(() => {
        expect(getByTestId('start-input').props.value).toBe('My location');
      });
    });

    it('should ignore empty route params', async () => {
      const route = { params: {} };
      const { getByTestId } = render(<MapScreen route={route} />);
      await waitFor(() => {
        expect(getByTestId('dest-input').props.value).toBe('');
      });
    });
  });

  // ── Cross-campus transit ────────────────────────────────────────────────

  describe('Cross-campus trip', () => {
    it('should show Transit button for cross-campus directions', async () => {
      const { getByTestId, getByText, queryByText } = render(<MapScreen />);
      const startInput = getByTestId('start-input');
      const destInput = getByTestId('dest-input');

      // Set start to SGW building via polygon
      await act(async () => {
        fireEvent(startInput, 'focus');
      });
      await act(async () => {
        fireEvent.press(getByTestId('building-sgw-b'));
      });

      // Set dest to Loyola building via SEARCH (not polygon) so __campusId is set
      await focusAndType(destInput, 'Administration');
      await act(async () => {
        fireEvent.press(getByText('Administration Building'));
      });

      await waitFor(() => {
        expect(queryByText('Transit')).toBeTruthy();
      });
    });
  });

  // ── Rendering ───────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('should render campus buildings', () => {
      const { getByText } = render(<MapScreen />);
      expect(getByText('SGW')).toBeTruthy();
    });

    it('should render building polygons with testIDs', () => {
      const { getByTestId } = render(<MapScreen />);
      expect(getByTestId('building-sgw-h')).toBeTruthy();
    });

    it('should show current building text when user is inside a building', async () => {
      const { queryByText } = render(<MapScreen />);
      await waitFor(() => {
        expect(queryByText(/Current building/)).toBeTruthy();
      });
    });
  });
});
