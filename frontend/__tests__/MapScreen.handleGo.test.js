import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MapScreen from '../src/screens/MapScreen';
import * as locationService from '../src/services/locationService';
import { fetchNearbyPOIs } from '../src/services/poiService';

jest.mock('../src/services/locationService');
jest.mock('../src/services/poiService', () => {
	const actual = jest.requireActual('../src/services/poiService');
	return {
		...actual,
		fetchNearbyPOIs: jest.fn(),
	};
});

jest.mock('expo-speech', () => ({
	speak: jest.fn(),
	stop: jest.fn(),
}));

global.fetch = jest.fn();

import './handleGo.test';

describe('MapScreen branches', () => {
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
		fetchNearbyPOIs.mockResolvedValue([
			{
				id: 'poi-1',
				name: 'Coffee',
				distance: 250,
				coords: { latitude: 45.5, longitude: -73.5 },
				address: '123 Main St',
			},
		]);
		fetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				status: 'OK',
				results: [],
			}),
		});
	});

	// Branch: POI Get Directions prefills My location when startText is empty.
	it('prefills My location from the POI Get Directions button', async () => {
		const { getByTestId, getByText } = render(<MapScreen />);

		await waitFor(() => expect(getByTestId('poi-button')).toBeTruthy());
		fireEvent.press(getByTestId('poi-button'));

		await waitFor(() => expect(getByTestId('poi-panel')).toBeTruthy());
		fireEvent.press(getByText('Show on map'));

		await waitFor(() => expect(getByText('Coffee')).toBeTruthy());
		fireEvent.press(getByText('Coffee'));

		await waitFor(() => expect(getByTestId('poi-get-directions-btn')).toBeTruthy());
		fireEvent.press(getByTestId('poi-get-directions-btn'));

		await waitFor(() => {
			expect(getByTestId('start-input').props.value).toBe('My location');
		});
	});

	// Branch: recenter button uses userCoord when no routeCoords exist.
	it('presses the recenter button when location is available', async () => {
		const { getByTestId } = render(<MapScreen />);

		await waitFor(() => expect(getByTestId('recenter-button')).toBeTruthy());

		await act(async () => {
			fireEvent.press(getByTestId('recenter-button'));
		});
	});
});
