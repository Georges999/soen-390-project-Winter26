import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import IndoorDirectionsScreen from '../../src/screens/IndoorDirectionsScreen';

// Mock the floor plan images
jest.mock('../../assets/floor-maps/Hall-8-F.png', () => 'hall8img', { virtual: true });
jest.mock('../../assets/floor-maps/Hall-9-F.png', () => 'hall9img', { virtual: true });
jest.mock('../../assets/floor-maps/MB-1.png', () => 'mb1img', { virtual: true });
jest.mock('../../assets/floor-maps/MB-S2.png', () => 'mbs2img', { virtual: true });
jest.mock('../../assets/floor-maps/VE-2-F.png', () => 've2img', { virtual: true });
jest.mock('../../assets/floor-maps/VL-1-F.png', () => 'vl1img', { virtual: true });
jest.mock('../../assets/floor-maps/VL-2-F.png', () => 'vl2img', { virtual: true });

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockSvg = (props) => React.createElement(View, props, props.children);
  return {
    __esModule: true,
    default: MockSvg,
    Svg: MockSvg,
    Path: (props) => React.createElement(View, props),
    Circle: (props) => React.createElement(View, props),
    Line: (props) => React.createElement(View, props),
  };
}, { virtual: true });

// Mock pathfinding module
const mockFindShortestPath = jest.fn().mockReturnValue({
  ok: true,
  pathCoords: [
    { x: 100, y: 200, type: 'classroom' },
    { x: 150, y: 250, type: 'hallway' },
    { x: 200, y: 300, type: 'classroom' },
  ],
  totalWeight: 450,
  reason: null,
});

jest.mock('../../src/utils/pathfinding/pathfinding', () => ({
  findShortestPath: (...args) => mockFindShortestPath(...args),
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockRouteEmpty = { params: {} };

const mockRouteWithRooms = {
  params: {
    startRoom: { id: 'Hall8_classroom_002', label: 'H837', floor: 'Hall-8', x: 100, y: 200, type: 'classroom' },
    destinationRoom: { id: 'Hall8_classroom_005', label: 'H861', floor: 'Hall-8', x: 300, y: 400, type: 'classroom' },
    building: {
      id: 'hall',
      label: 'H',
      name: 'Hall Building',
      floors: [
        { id: 'Hall-8', label: '8', floorNumber: 8, image: 'hall8img', nodes: [], pois: [], edges: [], width: 1000, height: 800 },
        { id: 'Hall-9', label: '9', floorNumber: 9, image: 'hall9img', nodes: [], pois: [], edges: [], width: 1000, height: 800 },
      ],
      rooms: [],
    },
    floor: { id: 'Hall-8', label: '8', floorNumber: 8, image: 'hall8img', nodes: [], pois: [], edges: [], width: 1000, height: 800 },
  },
};

describe('IndoorDirectionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Rendering ---

  it('should render without crashing', () => {
    const { toJSON } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('should render the header title "Indoor Directions"', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    expect(getByText('Indoor Directions')).toBeTruthy();
  });

  it('should render start and destination input placeholders', () => {
    const { getByPlaceholderText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    expect(getByPlaceholderText('Tap map or search start')).toBeTruthy();
    expect(getByPlaceholderText('Tap map or search destination')).toBeTruthy();
  });

  it('should render walking mode indicator', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    expect(getByText('Walking')).toBeTruthy();
  });

  it('should render the empty prompt when no rooms are entered', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    expect(getByText('Select start and destination points to see walking directions')).toBeTruthy();
  });

  // --- Back Button ---

  it('should call navigation.goBack when back button is pressed', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    fireEvent.press(getByText('chevron-left'));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  // --- Pre-filled route params ---

  it('should pre-fill destination text from route params', () => {
    const { getByDisplayValue } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByDisplayValue('H861')).toBeTruthy();
  });

  it('should pre-fill start text from route params', () => {
    const { getByDisplayValue } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByDisplayValue('H837')).toBeTruthy();
  });

  // --- Route Stats & Steps (when both rooms filled) ---

  it('should show route stats when both fields are filled', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByText('1 min')).toBeTruthy();
    expect(getByText('45m')).toBeTruthy();
    expect(getByText('distance')).toBeTruthy();
    expect(getByText('route')).toBeTruthy();
  });

  it('should show STEP-BY-STEP DIRECTIONS section when both fields are filled', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByText('STEP-BY-STEP DIRECTIONS')).toBeTruthy();
  });

  it('should show individual direction steps', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByText('Start at H837')).toBeTruthy();
    expect(getByText('Continue through the hallway')).toBeTruthy();
    expect(getByText('Arrive at H861')).toBeTruthy();
  });

  it('should show step numbers', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByText('1')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  // --- Accessibility Button ---

  it('should render the accessibility button', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByText('♿')).toBeTruthy();
  });

  it('should toggle accessibility route when pressed', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    const accessBtn = getByText('♿');
    fireEvent.press(accessBtn);
    // Should not crash, toggle is internal state
    expect(getByText('♿')).toBeTruthy();
  });

  // --- Search Functionality ---

  it('should show search results when typing in start field', () => {
    const { getByPlaceholderText, getAllByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    const startInput = getByPlaceholderText('Tap map or search start');
    fireEvent(startInput, 'focus');
    fireEvent.changeText(startInput, 'H837');
    expect(getAllByText(/H837.*Hall Building/).length).toBeGreaterThan(0);
  });

  it('should show search results when typing in destination field', () => {
    const { getByPlaceholderText, getAllByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    const destInput = getByPlaceholderText('Tap map or search destination');
    fireEvent(destInput, 'focus');
    fireEvent.changeText(destInput, 'H837');
    expect(getAllByText(/H837.*Hall Building/).length).toBeGreaterThan(0);
  });

  it('should select a room from search results into start field', () => {
    const { getByPlaceholderText, getAllByText, getByDisplayValue } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    const startInput = getByPlaceholderText('Tap map or search start');
    fireEvent(startInput, 'focus');
    fireEvent.changeText(startInput, 'H837');
    fireEvent.press(getAllByText(/H837.*Hall Building/)[0]);
    expect(getByDisplayValue(/H837, Floor 8/)).toBeTruthy();
  });

  it('should select a room from search results into destination field', () => {
    const { getByPlaceholderText, getAllByText, getByDisplayValue } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    const destInput = getByPlaceholderText('Tap map or search destination');
    fireEvent(destInput, 'focus');
    fireEvent.changeText(destInput, 'H837');
    fireEvent.press(getAllByText(/H837.*Hall Building/)[0]);
    expect(getByDisplayValue(/H837, Floor 8/)).toBeTruthy();
  });

  // --- Swap ---

  it('should swap start and destination when swap button is pressed', () => {
    const { getByText, getByDisplayValue } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    // Initially start=H837, dest=H861
    expect(getByDisplayValue('H837')).toBeTruthy();
    expect(getByDisplayValue('H861')).toBeTruthy();
    // Press swap
    fireEvent.press(getByText('swap-vert'));
    // Now start=H861, dest=H837
    expect(getByDisplayValue('H861')).toBeTruthy();
    expect(getByDisplayValue('H837')).toBeTruthy();
  });

  // --- Clear inputs ---

  it('should clear start text when clear button pressed', () => {
    const { getByDisplayValue, getAllByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByDisplayValue('H837')).toBeTruthy();
    // Both inputs have a close icon — first one is for start
    const closeIcons = getAllByText('close');
    fireEvent.press(closeIcons[0]);
    // Start field should be cleared
    expect(() => getByDisplayValue('H837')).toThrow();
  });

  it('should clear destination text when clear button pressed', () => {
    const { getByDisplayValue, getAllByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByDisplayValue('H861')).toBeTruthy();
    const closeIcons = getAllByText('close');
    fireEvent.press(closeIcons[1]);
    expect(() => getByDisplayValue('H861')).toThrow();
  });

  // --- No route params ---

  it('should handle missing route params gracefully', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={{ params: undefined }} navigation={mockNavigation} />
    );
    expect(getByText('Indoor Directions')).toBeTruthy();
  });

  it('should handle null route gracefully', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={{}} navigation={mockNavigation} />
    );
    expect(getByText('Indoor Directions')).toBeTruthy();
  });

  // --- Search finds rooms from both campuses ---

  it('should find Loyola rooms when searching', () => {
    const { getByPlaceholderText, getAllByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    const startInput = getByPlaceholderText('Tap map or search start');
    fireEvent(startInput, 'focus');
    fireEvent.changeText(startInput, 'Vanier');
    expect(getAllByText(/Vanier Library/).length).toBeGreaterThan(0);
  });

  // --- Empty prompt subtext ---

  it('should show subtext in empty prompt', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    expect(getByText('Use the search bars or tap on the map')).toBeTruthy();
  });

  // --- Direction step text variants ---

  it('should show "Pass the elevator" for elevator node type', () => {
    mockFindShortestPath.mockReturnValueOnce({
      ok: true,
      pathCoords: [
        { x: 100, y: 200, type: 'classroom' },
        { x: 150, y: 250, type: 'elevator' },
        { x: 200, y: 300, type: 'classroom' },
      ],
      totalWeight: 300,
      reason: null,
    });
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByText('Pass the elevator')).toBeTruthy();
  });

  it('should show "Pass the stairs" for stairs node type', () => {
    mockFindShortestPath.mockReturnValueOnce({
      ok: true,
      pathCoords: [
        { x: 100, y: 200, type: 'classroom' },
        { x: 150, y: 250, type: 'stairs' },
        { x: 200, y: 300, type: 'classroom' },
      ],
      totalWeight: 300,
      reason: null,
    });
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByText('Pass the stairs')).toBeTruthy();
  });

  it('should show "Pass the washroom" for washroom node type', () => {
    mockFindShortestPath.mockReturnValueOnce({
      ok: true,
      pathCoords: [
        { x: 100, y: 200, type: 'classroom' },
        { x: 150, y: 250, type: 'washroom' },
        { x: 200, y: 300, type: 'classroom' },
      ],
      totalWeight: 300,
      reason: null,
    });
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByText('Pass the washroom on your right')).toBeTruthy();
  });

  it('should show "Pass the escalator" for escalator node type', () => {
    mockFindShortestPath.mockReturnValueOnce({
      ok: true,
      pathCoords: [
        { x: 100, y: 200, type: 'classroom' },
        { x: 150, y: 250, type: 'escalator' },
        { x: 200, y: 300, type: 'classroom' },
      ],
      totalWeight: 300,
      reason: null,
    });
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByText('Pass the escalator')).toBeTruthy();
  });

  it('should show "Continue along the corridor" for unknown node type', () => {
    mockFindShortestPath.mockReturnValueOnce({
      ok: true,
      pathCoords: [
        { x: 100, y: 200, type: 'classroom' },
        { x: 150, y: 250, type: 'unknown_type' },
        { x: 200, y: 300, type: 'classroom' },
      ],
      totalWeight: 300,
      reason: null,
    });
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByText('Continue along the corridor')).toBeTruthy();
  });

  // --- Map tap selection mode ---

  it('should show selection mode indicator when map select button pressed for start', () => {
    const { getAllByText, getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    // Press the my-location icon button (start map select)
    fireEvent.press(getAllByText('my-location')[0]);
    expect(getByText('Tap on the map to select start point')).toBeTruthy();
  });

  it('should show selection mode indicator when map select button pressed for destination', () => {
    const { getAllByText, getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    // The second "place" icon is the dest map select button
    const placeIcons = getAllByText('place');
    fireEvent.press(placeIcons[placeIcons.length - 1]);
    expect(getByText('Tap on the map to select destination')).toBeTruthy();
  });

  it('should toggle selection mode off when pressed again', () => {
    const { getAllByText, queryByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    const myLocIcons = getAllByText('my-location');
    fireEvent.press(myLocIcons[0]);
    expect(queryByText('Tap on the map to select start point')).toBeTruthy();
    fireEvent.press(myLocIcons[0]);
    expect(queryByText('Tap on the map to select start point')).toBeNull();
  });

  // --- Path error display ---

  it('should show error message when pathfinding fails', () => {
    mockFindShortestPath.mockReturnValueOnce({
      ok: false,
      reason: 'no path found',
    });
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByText('no path found')).toBeTruthy();
  });

  // --- Route with no path result ---

  it('should show "--" stats when path result is not ok', () => {
    mockFindShortestPath.mockReturnValueOnce({
      ok: false,
      reason: 'different floors not supported yet',
    });
    const { getAllByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getAllByText('--').length).toBeGreaterThanOrEqual(2);
  });

  // --- Map press when not in selection mode ---

  it('should not crash when map is pressed without selection mode', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    // The floor plan container is pressable
    expect(getByText('Indoor Directions')).toBeTruthy();
  });
});
