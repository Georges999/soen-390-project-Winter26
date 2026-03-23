import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    MaterialIcons: ({ name }) => <Text>{name}</Text>,
  };
});

import DirectionsPanel from '../../src/components/DirectionsPanel';

const mockStyles = StyleSheet.create({
  directionsWrap: {}, directionsPanel: {}, modeRow: {}, modeBtn: {},
  modeBtnActive: {}, modeBtnLabel: {}, modeBtnTextActive: {},
  shuttlePanel: {}, transitSubRow: {}, transitSubBtn: {},
  transitSubBtnActive: {}, transitSubText: {}, transitSubTextActive: {},
  transitHeaderRow: {}, shuttleNote: {}, collapseBtn: {},
  transitList: {}, transitEmpty: {}, transitRow: {}, transitRowActive: {},
  transitSummaryRow: {}, transitSummaryLeft: {}, transitBadge: {},
  transitBadgeText: {}, transitMeta: {}, transitStops: {},
  transitSteps: {}, transitStepRow: {}, transitStepText: {},
  transitStopName: {}, transitStopCount: {}, transitLineActive: {},
  routeInfoRow: {}, routeInfoTitle: {}, routeInfoSub: {},
  routeInfoActions: {}, muteBtn: {}, muteBtnActive: {},
  simBtn: {}, simBtnActive: {}, simBtnText: {}, simBtnTextActive: {},
  goBtn: {}, goBtnText: {},
});

const baseProps = {
  styles: mockStyles,
  maroon: '#95223D',
  travelMode: 'walking',
  setTravelMode: jest.fn(),
  isCrossCampusTrip: false,
  transitSubMode: 'shuttle',
  setTransitSubMode: jest.fn(),
  setIsShuttleModalOpen: jest.fn(),
  isTransitCollapsed: false,
  setIsTransitCollapsed: jest.fn(),
  routeOptions: [],
  transitRouteIndex: 0,
  setTransitRouteIndex: jest.fn(),
  routeInfo: { durationText: '10 mins', distanceText: '1 km', steps: [] },
  stripHtml: (html) => html.replace(/<[^>]+>/g, ''),
  speechEnabled: true,
  onToggleSpeech: jest.fn(),
  isSimulating: false,
  onSimulate: jest.fn(),
  onGo: jest.fn(),
};

describe('DirectionsPanel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should render travel mode buttons', () => {
    const { getByText } = render(<DirectionsPanel {...baseProps} />);
    expect(getByText('Car')).toBeTruthy();
    expect(getByText('Walk')).toBeTruthy();
    expect(getByText('Bike')).toBeTruthy();
  });

  it('should call setTravelMode when car pressed', () => {
    const { getByText } = render(<DirectionsPanel {...baseProps} />);
    fireEvent.press(getByText('Car'));
    expect(baseProps.setTravelMode).toHaveBeenCalledWith('driving');
  });

  it('should call setTravelMode when walk pressed', () => {
    const { getByText } = render(<DirectionsPanel {...baseProps} />);
    fireEvent.press(getByText('Walk'));
    expect(baseProps.setTravelMode).toHaveBeenCalledWith('walking');
  });

  it('should call setTravelMode when bike pressed', () => {
    const { getByText } = render(<DirectionsPanel {...baseProps} />);
    fireEvent.press(getByText('Bike'));
    expect(baseProps.setTravelMode).toHaveBeenCalledWith('bicycling');
  });

  it('should show transit button for cross campus', () => {
    const { getByText } = render(
      <DirectionsPanel {...baseProps} isCrossCampusTrip={true} />,
    );
    expect(getByText('Transit')).toBeTruthy();
  });

  it('should NOT show transit button when not cross campus', () => {
    const { queryByText } = render(<DirectionsPanel {...baseProps} />);
    expect(queryByText('Transit')).toBeNull();
  });

  it('should show shuttle/public in transit mode with cross campus', () => {
    const { getByText } = render(
      <DirectionsPanel {...baseProps} travelMode="transit" isCrossCampusTrip={true} />,
    );
    expect(getByText('Shuttle')).toBeTruthy();
    expect(getByText('Public')).toBeTruthy();
  });

  it('should call setTransitSubMode when shuttle pressed', () => {
    const { getByText } = render(
      <DirectionsPanel {...baseProps} travelMode="transit" isCrossCampusTrip={true} />,
    );
    fireEvent.press(getByText('Shuttle'));
    expect(baseProps.setTransitSubMode).toHaveBeenCalledWith('shuttle');
    expect(baseProps.setIsShuttleModalOpen).toHaveBeenCalledWith(true);
  });

  it('should call setTransitSubMode when public pressed', () => {
    const { getByText } = render(
      <DirectionsPanel {...baseProps} travelMode="transit" isCrossCampusTrip={true} />,
    );
    fireEvent.press(getByText('Public'));
    expect(baseProps.setTransitSubMode).toHaveBeenCalledWith('public');
  });

  it('should show public transit note when public sub-mode', () => {
    const { getByText } = render(
      <DirectionsPanel
        {...baseProps}
        travelMode="transit"
        isCrossCampusTrip={true}
        transitSubMode="public"
      />,
    );
    expect(getByText('Showing 3 shortest public transit routes.')).toBeTruthy();
  });

  it('should show no routes message when route options empty', () => {
    const { getByText } = render(
      <DirectionsPanel
        {...baseProps}
        travelMode="transit"
        isCrossCampusTrip={true}
        transitSubMode="public"
        routeOptions={[]}
      />,
    );
    expect(getByText('No public transit routes found.')).toBeTruthy();
  });

  it('should render route options when available', () => {
    const routeOptions = [
      {
        durationText: '25 mins',
        durationValue: 1500,
        transitLines: ['Green'],
        transitVehicles: ['SUBWAY'],
      },
    ];
    const { getByText } = render(
      <DirectionsPanel
        {...baseProps}
        travelMode="transit"
        isCrossCampusTrip={true}
        transitSubMode="public"
        routeOptions={routeOptions}
        transitRouteIndex={0}
        routeInfo={{ durationText: '25 mins', distanceText: '5 km', steps: [{ travelMode: 'TRANSIT', instruction: 'Take bus', transitDetails: { lineShortName: '24', arrivalStop: 'Stop B', numStops: 3, vehicleType: 'BUS' }, coords: [] }] }}
      />,
    );
    expect(getByText('Tap to view details')).toBeTruthy();
  });

  it('should display route info duration and distance', () => {
    const { getByText } = render(<DirectionsPanel {...baseProps} />);
    expect(getByText('10 mins')).toBeTruthy();
    expect(getByText('1 km')).toBeTruthy();
  });

  it('should show -- when routeInfo is null', () => {
    const { getByText } = render(
      <DirectionsPanel {...baseProps} routeInfo={null} />,
    );
    expect(getByText('--')).toBeTruthy();
  });

  it('should show Simulate button', () => {
    const { getByText } = render(<DirectionsPanel {...baseProps} />);
    expect(getByText('Simulate')).toBeTruthy();
  });

  it('should show Stop when simulating', () => {
    const { getByText } = render(
      <DirectionsPanel {...baseProps} isSimulating={true} />,
    );
    expect(getByText('Stop')).toBeTruthy();
  });

  it('should call onGo when GO pressed', () => {
    const { getByText } = render(<DirectionsPanel {...baseProps} />);
    fireEvent.press(getByText('GO'));
    expect(baseProps.onGo).toHaveBeenCalled();
  });

  it('should call onSimulate when Simulate pressed', () => {
    const { getByText } = render(<DirectionsPanel {...baseProps} />);
    fireEvent.press(getByText('Simulate'));
    expect(baseProps.onSimulate).toHaveBeenCalled();
  });

  it('should handle collapse toggle in transit mode', () => {
    const { getByText } = render(
      <DirectionsPanel
        {...baseProps}
        travelMode="transit"
        isCrossCampusTrip={true}
        transitSubMode="public"
        isTransitCollapsed={true}
      />,
    );
    // When collapsed, the route list should not show
    expect(getByText('Showing 3 shortest public transit routes.')).toBeTruthy();
  });

  it('should not render ETA suffix when durationValue is missing', () => {
    const routeOptions = [
      {
        durationText: '25 mins',
        transitLines: ['Green'],
        transitVehicles: ['SUBWAY'],
      },
    ];

    const { getByText, getAllByText, queryByText } = render(
      <DirectionsPanel
        {...baseProps}
        travelMode="transit"
        isCrossCampusTrip={true}
        transitSubMode="public"
        routeOptions={routeOptions}
      />,
    );

    expect(getByText('25 mins')).toBeTruthy();
    expect(queryByText(/\(ETA/)).toBeNull();
  });

  it('should not render ETA suffix when durationValue is not finite', () => {
    const routeOptions = [
      {
        durationText: '30 mins',
        durationValue: Infinity,
        transitLines: ['Orange'],
        transitVehicles: ['BUS'],
      },
    ];

    const { getByText, getAllByText, queryByText } = render(
      <DirectionsPanel
        {...baseProps}
        travelMode="transit"
        isCrossCampusTrip={true}
        transitSubMode="public"
        routeOptions={routeOptions}
      />,
    );

    expect(getByText('30 mins')).toBeTruthy();
    expect(queryByText(/\(ETA/)).toBeNull();
  });

  it('should safely render a non-transit selected step with missing instruction data', () => {
    const routeOptions = [
      {
        durationText: '8 mins',
        durationValue: 480,
        transitLines: [],
        transitVehicles: [],
      },
    ];

    const { getByText, getAllByText, queryByText } = render(
      <DirectionsPanel
        {...baseProps}
        travelMode="transit"
        isCrossCampusTrip={true}
        transitSubMode="public"
        routeOptions={routeOptions}
        transitRouteIndex={0}
        routeInfo={{ durationText: '8 mins', distanceText: '0.5 km', steps: [{ travelMode: 'WALKING' }] }}
      />,
    );

    expect(getByText('Tap to view details')).toBeTruthy();
    expect(getAllByText('directions-walk').length).toBeGreaterThan(0);
    expect(queryByText(/stops/i)).toBeNull();
  });

  it('should render arrival stop and number of stops for selected transit step details', () => {
    const routeOptions = [
      {
        durationText: '20 mins',
        durationValue: 1200,
        transitLines: ['24'],
        transitVehicles: ['BUS'],
      },
    ];

    const { getByText } = render(
      <DirectionsPanel
        {...baseProps}
        travelMode="transit"
        isCrossCampusTrip={true}
        transitSubMode="public"
        routeOptions={routeOptions}
        transitRouteIndex={0}
        routeInfo={{
          durationText: '20 mins',
          distanceText: '4 km',
          steps: [
            {
              travelMode: 'TRANSIT',
              transitDetails: {
                lineShortName: '24',
                arrivalStop: 'Stop B',
                numStops: 3,
                vehicleType: 'BUS',
              },
            },
          ],
        }}
      />,
    );

    expect(getByText(/Stop B/)).toBeTruthy();
    expect(getByText(/3 stops/)).toBeTruthy();
  });
});
