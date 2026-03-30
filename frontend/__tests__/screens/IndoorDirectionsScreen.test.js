import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import IndoorDirectionsScreen, {
  buildAllRooms,
  getSelectionForLocation,
  getInitialSelection,
} from '../../src/screens/IndoorDirectionsScreen';
import { buildings } from '../../src/data/indoorFloorData';

// Mock the floor plan images
jest.mock('../../assets/floor-maps/Hall-1-F.png', () => 'hall1img', { virtual: true });
jest.mock('../../assets/floor-maps/Hall-2-F.png', () => 'hall2img', { virtual: true });
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

// Mock crossFloorRouter with controllable fns
const mockClassifyRoute = jest.fn().mockReturnValue(null);
const mockBuildRouteSegments = jest.fn().mockReturnValue([]);

jest.mock('../../src/utils/pathfinding/crossFloorRouter', () => ({
  classifyRoute: (...args) => mockClassifyRoute(...args),
  buildRouteSegments: (...args) => mockBuildRouteSegments(...args),
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

const mockRouteBrowseHall8 = {
  params: {
    building: {
      id: 'hall',
      label: 'H',
      name: 'Hall Building',
      floors: [
        { id: 'Hall-1', label: '1', floorNumber: 1, image: 'hall1img', nodes: [], pois: [], edges: [], width: 1952, height: 1979 },
        { id: 'Hall-2', label: '2', floorNumber: 2, image: 'hall2img', nodes: [], pois: [], edges: [], width: 1000, height: 1000 },
        { id: 'Hall-8', label: '8', floorNumber: 8, image: 'hall8img', nodes: [], pois: [], edges: [], width: 1000, height: 1000 },
        { id: 'Hall-9', label: '9', floorNumber: 9, image: 'hall9img', nodes: [], pois: [], edges: [], width: 1000, height: 1000 },
      ],
      rooms: [],
    },
    floor: { id: 'Hall-8', label: '8', floorNumber: 8, image: 'hall8img', nodes: [], pois: [], edges: [], width: 1000, height: 1000 },
  },
};

const originalSgwBuildings = buildings.sgw;
const originalLoyolaBuildings = buildings.loyola;

describe('IndoorDirectionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete buildings.emptyCampus;
    delete buildings.emptyArrayCampus;
    buildings.sgw = originalSgwBuildings;
    buildings.loyola = originalLoyolaBuildings;
  });

  it('buildAllRooms should tolerate campuses without room arrays', () => {
    buildings.emptyCampus = undefined;
    buildings.emptyArrayCampus = [{ id: 'ghost', name: 'Ghost Building' }];

    const rooms = buildAllRooms();

    expect(Array.isArray(rooms)).toBe(true);
  });

  it('getSelectionForLocation should fall back to the provided campus when a building is unknown', () => {
    buildings.emptyCampus = undefined;

    const selection = getSelectionForLocation('missing-building', 'missing-floor', 'emptyCampus');

    expect(selection).toEqual({
      campusId: 'emptyCampus',
      buildingIdx: 0,
      floorIdx: 0,
    });
  });

  it('getSelectionForLocation should reset to the first floor when the floor id is unknown', () => {
    const selection = getSelectionForLocation('hall', 'missing-floor');

    expect(selection.campusId).toBe('sgw');
    expect(selection.buildingIdx).toBe(0);
    expect(selection.floorIdx).toBe(0);
  });

  it('getInitialSelection should use startRoom when destinationRoom is missing', () => {
    const selection = getInitialSelection({
      startRoom: { buildingId: 'mb', floor: 'MB-1' },
    });

    expect(selection.campusId).toBe('sgw');
    expect(selection.buildingIdx).toBe(1);
    expect(selection.floorIdx).toBe(1);
  });

  it('should render safely when the selected campus data is unavailable', () => {
    buildings.sgw = undefined;

    const { getByText } = render(
      <IndoorDirectionsScreen
        route={{
          params: {
            startRoom: { id: 'start-room', label: 'Start', floor: 'Unknown-Floor' },
            destinationRoom: { id: 'dest-room', label: 'Dest', floor: 'Unknown-Floor' },
          },
        }}
        navigation={mockNavigation}
      />
    );

    expect(getByText('Indoor Directions')).toBeTruthy();
  });

  it('should fall back to the currently selected floor when a same-floor route uses an unknown floor id', () => {
    mockClassifyRoute.mockReturnValue('same-floor');

    const { getByTestId } = render(
      <IndoorDirectionsScreen
        route={{
          params: {
            startRoom: { id: 'start-room', label: 'Start', floor: 'Unknown-Floor' },
            destinationRoom: { id: 'dest-room', label: 'Dest', floor: 'Unknown-Floor' },
          },
        }}
        navigation={mockNavigation}
      />
    );

    expect(getByTestId('indoor-route-overlay')).toBeTruthy();
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

  it('should render campus, building, and floor browsing controls', () => {
    const { getByText, getAllByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    expect(getByText('SGW')).toBeTruthy();
    expect(getByText('Loyola')).toBeTruthy();
    expect(getAllByText('Hall Building')[0]).toBeTruthy();
    expect(getAllByText('John Molson Building')[0]).toBeTruthy();
    expect(getAllByText('1')[0]).toBeTruthy();
    expect(getAllByText('8')[0]).toBeTruthy();
  });

  it('should switch campus and update building chips on the same page', () => {
    const { getByText, getAllByText, queryByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    fireEvent.press(getByText('Loyola'));
    expect(getByText('Vanier Library')).toBeTruthy();
    expect(getAllByText('Central Building')[0]).toBeTruthy();
    expect(queryByText('Hall Building')).toBeNull();
  });

  it('should switch back to SGW after browsing Loyola', () => {
    const { getByText, queryByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    fireEvent.press(getByText('Loyola'));
    fireEvent.press(getByText('SGW'));
    expect(getByText('Hall Building')).toBeTruthy();
    expect(queryByText('Vanier Library')).toBeNull();
  });

  it('should switch buildings from the top selector', () => {
    const { getByText, queryByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    fireEvent.press(getByText('John Molson Building'));
    expect(getByText('S2')).toBeTruthy();
    expect(queryByText('8')).toBeNull();
  });

  it('should switch floors from the selector under the map', () => {
    const { getAllByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    fireEvent.press(getAllByText('9')[0]);
    expect(getAllByText('9').length).toBeGreaterThan(0);
  });

  it('should render the amenities bar under the map', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    expect(getByText('Washroom')).toBeTruthy();
    expect(getByText('Water')).toBeTruthy();
    expect(getByText('Stairs')).toBeTruthy();
    expect(getByText('Elevator')).toBeTruthy();
  });

  it('should render vector amenity markers on the map that match the amenities bar icons', () => {
    const { getAllByText, getByTestId } = render(
      <IndoorDirectionsScreen route={mockRouteBrowseHall8} navigation={mockNavigation} />
    );

    expect(getByTestId('directions-poi-marker-Hall8_stairs_001')).toBeTruthy();
    expect(getByTestId('directions-poi-marker-icon-Hall8_stairs_001')).toBeTruthy();
    expect(getByTestId('directions-poi-marker-icon-Hall8_elevator_001')).toBeTruthy();
    expect(getAllByText('stairs').length).toBeGreaterThan(1);
    expect(getAllByText('elevator').length).toBeGreaterThan(1);
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

  it('should keep showing the routed floor for same-floor routes', () => {
    mockClassifyRoute.mockReturnValue('same-floor');
    const { getByTestId } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByTestId('indoor-route-overlay')).toBeTruthy();
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
    const { getAllByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getAllByText('1').length).toBeGreaterThan(0);
    expect(getAllByText('2').length).toBeGreaterThan(0);
    expect(getAllByText('3').length).toBeGreaterThan(0);
  });

  // --- Accessibility Toggle ---

  it('should render the accessibility toggle row', () => {
    const { getByTestId, getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByTestId('accessibility-toggle-row')).toBeTruthy();
    expect(getByTestId('accessibility-switch')).toBeTruthy();
    expect(getByText('Accessible Route')).toBeTruthy();
    expect(getByText('Uses stairs if shorter')).toBeTruthy();
  });

  it('should show "Avoiding stairs" hint when accessibility is toggled on', () => {
    const { getByTestId, getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    const toggle = getByTestId('accessibility-switch');
    fireEvent(toggle, 'valueChange', true);
    expect(getByText('Avoiding stairs')).toBeTruthy();
  });

  it('should toggle accessibility route when switch is toggled', () => {
    const { getByTestId } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    const toggle = getByTestId('accessibility-switch');
    fireEvent(toggle, 'valueChange', true);
    // Should not crash, toggle is internal state
    expect(getByTestId('accessibility-switch')).toBeTruthy();
  });

  it('should pass accessible=true to findShortestPath when accessibility is toggled on', () => {
    const { getByTestId } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );

    // Initially called without accessible=true
    const initialCall = mockFindShortestPath.mock.calls.find(
      (call) => call[0]?.startNodeId === 'Hall8_classroom_002'
    );
    expect(initialCall).toBeTruthy();
    expect(initialCall[0].accessible).toBeFalsy();

    // Toggle accessibility on via the switch
    fireEvent(getByTestId('accessibility-switch'), 'valueChange', true);

    // Should now be called with accessible=true
    const accessibleCall = mockFindShortestPath.mock.calls.find(
      (call) => call[0]?.accessible === true
    );
    expect(accessibleCall).toBeTruthy();
    expect(accessibleCall[0].accessible).toBe(true);
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

  it('should prioritize current-building rooms for broad numeric searches', () => {
    const { getByPlaceholderText, getAllByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );

    const startInput = getByPlaceholderText('Tap map or search start');
    fireEvent(startInput, 'focus');
    fireEvent.changeText(startInput, '1');

    const firstResult = getAllByText(/, Floor .* · /)[0];
    expect(firstResult.props.children.join('')).toContain('Hall Building');
  });

  it('should hide search results when start input blurs', () => {
    const { getByPlaceholderText, getAllByText, queryAllByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    const startInput = getByPlaceholderText('Tap map or search start');

    fireEvent(startInput, 'focus');
    fireEvent.changeText(startInput, 'H837');
    expect(getAllByText(/H837.*Hall Building/).length).toBeGreaterThan(0);

    fireEvent(startInput, 'blur');
    expect(queryAllByText(/H837.*Hall Building/).length).toBe(0);
  });

  it('should hide search results when destination input blurs', () => {
    const { getByPlaceholderText, getAllByText, queryAllByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    const destInput = getByPlaceholderText('Tap map or search destination');

    fireEvent(destInput, 'focus');
    fireEvent.changeText(destInput, 'H837');
    expect(getAllByText(/H837.*Hall Building/).length).toBeGreaterThan(0);

    fireEvent(destInput, 'blur');
    expect(queryAllByText(/H837.*Hall Building/).length).toBe(0);
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

  it('should let the user change a filled search field without leaving the screen', () => {
    const { getByPlaceholderText, getAllByText, queryByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );

    const startInput = getByPlaceholderText('Tap map or search start');
    fireEvent(startInput, 'focus');
    fireEvent.changeText(startInput, 'MB1.210');

    expect(getAllByText(/MB1\.210.*John Molson Building/).length).toBeGreaterThan(0);
    expect(queryByText('STEP-BY-STEP DIRECTIONS')).toBeNull();
  });

  it('should let the user change a filled destination field without leaving the screen', () => {
    const { getByPlaceholderText, getAllByText, queryByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );

    const destInput = getByPlaceholderText('Tap map or search destination');
    fireEvent(destInput, 'focus');
    fireEvent.changeText(destInput, 'MB1.210');

    expect(getAllByText(/MB1\.210.*John Molson Building/).length).toBeGreaterThan(0);
    expect(queryByText('STEP-BY-STEP DIRECTIONS')).toBeNull();
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
    fireEvent.changeText(startInput, 'Library');
    expect(getAllByText(/Vanier Library/).length).toBeGreaterThan(0);
  });

  // --- Invalid search / "not found" feedback ---

  it('should show "not found" message when searching for a non-existent building', () => {
    const { getByPlaceholderText, getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    const startInput = getByPlaceholderText('Tap map or search start');
    fireEvent(startInput, 'focus');
    fireEvent.changeText(startInput, 'XYZABC Hall');
    expect(getByText(/No rooms or buildings found/)).toBeTruthy();
  });

  it('should not show "not found" message when search is empty', () => {
    const { getByPlaceholderText, queryByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    const startInput = getByPlaceholderText('Tap map or search start');
    fireEvent(startInput, 'focus');
    fireEvent.changeText(startInput, '');
    expect(queryByText(/No rooms or buildings found/)).toBeNull();
  });

  it('should not show "not found" for whitespace-only search input', () => {
    const { getByPlaceholderText, queryByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    const startInput = getByPlaceholderText('Tap map or search start');
    fireEvent(startInput, 'focus');
    fireEvent.changeText(startInput, '   ');
    expect(queryByText(/No rooms or buildings found/)).toBeNull();
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

  it('should select a start room from a map tap', () => {
    const { getAllByText, getByTestId, getByDisplayValue } = render(
      <IndoorDirectionsScreen route={mockRouteBrowseHall8} navigation={mockNavigation} />
    );
    const { width } = Dimensions.get('window');
    const mapWidth = width - 32;
    const mapHeight = width - 60;

    fireEvent.press(getAllByText('my-location')[0]);
    fireEvent(getByTestId('indoor-floor-plan-container'), 'responderRelease', {
      nativeEvent: {
        locationX: 369.29 * (mapWidth / 1000),
        locationY: 154.82 * (mapHeight / 1000),
      },
    });

    expect(getByDisplayValue('H837, Floor 8')).toBeTruthy();
  });

  it('should select a destination room from a map tap', () => {
    const { getAllByText, getByTestId, getByDisplayValue } = render(
      <IndoorDirectionsScreen route={mockRouteBrowseHall8} navigation={mockNavigation} />
    );
    const { width } = Dimensions.get('window');
    const mapWidth = width - 32;
    const mapHeight = width - 60;
    const placeIcons = getAllByText('place');

    fireEvent.press(placeIcons[placeIcons.length - 1]);
    fireEvent(getByTestId('indoor-floor-plan-container'), 'responderRelease', {
      nativeEvent: {
        locationX: 868.72 * (mapWidth / 1000),
        locationY: 689.76 * (mapHeight / 1000),
      },
    });

    expect(getByDisplayValue('H861, Floor 8')).toBeTruthy();
  });

  // ===================================================================
  // Cross-floor / cross-building tests
  // ===================================================================

  describe('cross-floor navigation', () => {
    const crossFloorRoute = {
      params: {
        startRoom: { id: 'Hall8_classroom_002', label: 'H837', floor: 'Hall-8', x: 100, y: 200, type: 'classroom', buildingId: 'hall', buildingName: 'Hall Building' },
        destinationRoom: { id: 'Hall9_classroom_001', label: 'H961', floor: 'Hall-9', x: 150, y: 250, type: 'classroom', buildingId: 'hall', buildingName: 'Hall Building' },
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

    const indoorSegFloor8 = {
      type: 'indoor',
      floorId: 'Hall-8',
      buildingId: 'hall',
      fromNodeId: 'Hall8_classroom_002',
      toNodeId: 'Hall8_stairs_001',
    };

    const verticalSeg = {
      type: 'vertical',
      buildingId: 'hall',
      fromFloor: 'Hall-8',
      toFloor: 'Hall-9',
      transitionType: 'stairs',
      transitionNodeStart: 'Hall8_stairs_001',
      transitionNodeEnd: 'Hall9_stairs_001',
    };

    const indoorSegFloor9 = {
      type: 'indoor',
      floorId: 'Hall-9',
      buildingId: 'hall',
      fromNodeId: 'Hall9_stairs_001',
      toNodeId: 'Hall9_classroom_001',
    };

    const outdoorSeg = {
      type: 'outdoor',
      fromBuildingId: 'hall',
      toBuildingId: 'mb',
      fromCoords: { lat: 45.497, lng: -73.579 },
      toCoords: { lat: 45.495, lng: -73.578 },
    };

    const elevatorVerticalSeg = {
      type: 'vertical',
      buildingId: 'hall',
      fromFloor: 'Hall-8',
      toFloor: 'Hall-9',
      transitionType: 'elevator',
      transitionNodeStart: 'Hall8_elevator_001',
      transitionNodeEnd: 'Hall9_elevator_001',
    };

  it('should show inline transfer controls when routeType is cross-floor', () => {
      mockClassifyRoute.mockReturnValue('cross-floor');
      mockBuildRouteSegments.mockReturnValue([]);
      const { getByText, getByTestId } = render(
        <IndoorDirectionsScreen route={crossFloorRoute} navigation={mockNavigation} />
      );
      expect(getByText('Between-floor route')).toBeTruthy();
      expect(getByTestId('transition-pref-stairs')).toBeTruthy();
      expect(getByTestId('transition-pref-elevator')).toBeTruthy();
    });

    it('should switch to elevator routing from the inline transfer controls', () => {
      mockClassifyRoute.mockReturnValue('cross-floor');
      mockBuildRouteSegments.mockReturnValue([]);
      const { getByTestId } = render(
        <IndoorDirectionsScreen route={crossFloorRoute} navigation={mockNavigation} />
      );
      fireEvent.press(getByTestId('transition-pref-elevator'));
      expect(mockBuildRouteSegments).toHaveBeenLastCalledWith(
        crossFloorRoute.params.startRoom,
        crossFloorRoute.params.destinationRoom,
        'elevator'
      );
    });

    it('should switch back to stairs routing from the inline transfer controls', () => {
      mockClassifyRoute.mockReturnValue('cross-floor');
      mockBuildRouteSegments.mockReturnValue([]);
      const { getByTestId } = render(
        <IndoorDirectionsScreen route={crossFloorRoute} navigation={mockNavigation} />
      );
      fireEvent.press(getByTestId('transition-pref-elevator'));
      fireEvent.press(getByTestId('transition-pref-stairs'));
      expect(mockBuildRouteSegments).toHaveBeenLastCalledWith(
        crossFloorRoute.params.startRoom,
        crossFloorRoute.params.destinationRoom,
        'stairs'
      );
    });

    it('should render floor-transfer stats in the inline control card', () => {
      mockClassifyRoute.mockReturnValue('cross-floor');
      mockBuildRouteSegments.mockReturnValue([indoorSegFloor8, verticalSeg, indoorSegFloor9]);
      const { getByText } = render(
        <IndoorDirectionsScreen route={crossFloorRoute} navigation={mockNavigation} />
      );
      expect(getByText('1 floor transfer')).toBeTruthy();
      expect(getByText('Using stairs')).toBeTruthy();
    });

    it('should render a route overview for multi-segment cross-floor route', () => {
      mockClassifyRoute.mockReturnValue('cross-floor');
      mockBuildRouteSegments.mockReturnValue([indoorSegFloor8, verticalSeg, indoorSegFloor9]);
      mockFindShortestPath.mockReturnValue({
        ok: true,
        pathCoords: [
          { x: 100, y: 200, type: 'classroom' },
          { x: 150, y: 250, type: 'hallway' },
          { x: 200, y: 300, type: 'stairs' },
        ],
        totalWeight: 300,
        reason: null,
      });
      const { getAllByText } = render(
        <IndoorDirectionsScreen route={crossFloorRoute} navigation={mockNavigation} />
      );
      expect(getAllByText('Route Overview').length).toBeGreaterThan(0);
      expect(getAllByText(/Change floors via stairs to Floor 9/).length).toBeGreaterThan(0);
    });

    it('should hide campus and building browsing controls once a route is active', () => {
      mockClassifyRoute.mockReturnValue('cross-floor');
      mockBuildRouteSegments.mockReturnValue([indoorSegFloor8, verticalSeg, indoorSegFloor9]);
      mockFindShortestPath.mockReturnValue({
        ok: true,
        pathCoords: [
          { x: 100, y: 200, type: 'classroom' },
          { x: 200, y: 300, type: 'classroom' },
        ],
        totalWeight: 200,
        reason: null,
      });
      const { queryByText, getByText } = render(
        <IndoorDirectionsScreen route={crossFloorRoute} navigation={mockNavigation} />
      );
      expect(queryByText('SGW')).toBeNull();
      expect(queryByText('Hall Building')).toBeNull();
      expect(getByText('Indoor Directions')).toBeTruthy();
    });

    it('should render vertical segment card when vertical tab is active', () => {
      mockClassifyRoute.mockReturnValue('cross-floor');
      mockBuildRouteSegments.mockReturnValue([verticalSeg]);
      mockFindShortestPath.mockReturnValue({ ok: false, reason: 'no indoor path' });
      const { getAllByText } = render(
        <IndoorDirectionsScreen route={crossFloorRoute} navigation={mockNavigation} />
      );
      expect(getAllByText(/Take the stairs/).length).toBeGreaterThanOrEqual(1);
    });

    it('should render elevator vertical segment card', () => {
      mockClassifyRoute.mockReturnValue('cross-floor');
      mockBuildRouteSegments.mockReturnValue([elevatorVerticalSeg]);
      mockFindShortestPath.mockReturnValue({ ok: false, reason: 'no indoor path' });
      const { getAllByText } = render(
        <IndoorDirectionsScreen route={crossFloorRoute} navigation={mockNavigation} />
      );
      expect(getAllByText(/Take the elevator/).length).toBeGreaterThanOrEqual(1);
    });

    it('should show cross-floor direction steps with floor labels', () => {
      mockClassifyRoute.mockReturnValue('cross-floor');
      mockBuildRouteSegments.mockReturnValue([indoorSegFloor8, verticalSeg, indoorSegFloor9]);
      mockFindShortestPath.mockReturnValue({
        ok: true,
        pathCoords: [
          { x: 100, y: 200, type: 'classroom' },
          { x: 150, y: 250, type: 'hallway' },
          { x: 200, y: 300, type: 'classroom' },
        ],
        totalWeight: 300,
        reason: null,
      });
      const { getByText } = render(
        <IndoorDirectionsScreen route={crossFloorRoute} navigation={mockNavigation} />
      );
      expect(getByText(/Start at H837/)).toBeTruthy();
      expect(getByText(/Arrive at H961/)).toBeTruthy();
    });

    it('should jump map focus when a later journey stage is selected', () => {
      mockClassifyRoute.mockReturnValue('cross-floor');
      mockBuildRouteSegments.mockReturnValue([indoorSegFloor8, verticalSeg, indoorSegFloor9]);
      mockFindShortestPath.mockReturnValue({
        ok: true,
        pathCoords: [
          { x: 100, y: 200, type: 'classroom' },
          { x: 150, y: 250, type: 'hallway' },
          { x: 200, y: 300, type: 'classroom' },
        ],
        totalWeight: 300,
        reason: null,
      });
      const { getByTestId, getByText } = render(
        <IndoorDirectionsScreen route={crossFloorRoute} navigation={mockNavigation} />
      );
      fireEvent.press(getByTestId('journey-stage-2'));
      expect(getByText(/Hall Building · Floor 9/)).toBeTruthy();
    });

    it('should set transitionPref to elevator when accessibility is toggled on', () => {
      mockClassifyRoute.mockReturnValue('cross-floor');
      mockBuildRouteSegments.mockReturnValue([]);
      const { getByTestId, queryByText } = render(
        <IndoorDirectionsScreen route={crossFloorRoute} navigation={mockNavigation} />
      );
      // Toggle accessibility on
      fireEvent(getByTestId('accessibility-switch'), 'valueChange', true);
      // transitionPref should now be elevator → prompt should disappear
      expect(queryByText(/requires changing floors/)).toBeNull();
    });

    it('should show transition prompt for cross-building route', () => {
      mockClassifyRoute.mockReturnValue('cross-building');
      mockBuildRouteSegments.mockReturnValue([]);
      const { getByText } = render(
        <IndoorDirectionsScreen route={crossFloorRoute} navigation={mockNavigation} />
      );
      expect(getByText('Between-floor route')).toBeTruthy();
    });
  });

  describe('outdoor segment', () => {
    const outdoorSeg = {
      type: 'outdoor',
      fromBuildingId: 'hall',
      toBuildingId: 'mb',
      fromCoords: { lat: 45.497, lng: -73.579 },
      toCoords: { lat: 45.495, lng: -73.578 },
    };

    const crossBuildingRoute = {
      params: {
        startRoom: { id: 'Hall8_classroom_002', label: 'H837', floor: 'Hall-8', x: 100, y: 200, type: 'classroom', buildingId: 'hall' },
        destinationRoom: { id: 'MB1_classroom_001', label: 'MB101', floor: 'MB-1', x: 100, y: 200, type: 'classroom', buildingId: 'mb' },
        building: {
          id: 'hall',
          label: 'H',
          name: 'Hall Building',
          floors: [
            { id: 'Hall-8', label: '8', floorNumber: 8, image: 'hall8img', nodes: [], pois: [], edges: [], width: 1000, height: 800 },
          ],
          rooms: [],
        },
        floor: { id: 'Hall-8', label: '8', floorNumber: 8, image: 'hall8img', nodes: [], pois: [], edges: [], width: 1000, height: 800 },
      },
    };

    it('should render outdoor journey details when active segment is outdoor', () => {
      mockClassifyRoute.mockReturnValue('cross-building');
      mockBuildRouteSegments.mockReturnValue([outdoorSeg]);
      mockFindShortestPath.mockReturnValue({ ok: false, reason: 'no path' });
      const { getAllByText, getByText } = render(
        <IndoorDirectionsScreen route={crossBuildingRoute} navigation={mockNavigation} />
      );
      expect(getAllByText('Outdoor transfer').length).toBeGreaterThan(0);
      expect(getByText(/Exit Hall Building and continue outside to John Molson Building/)).toBeTruthy();
    });

    it('should navigate to Map screen when outdoor directions button pressed', () => {
      mockClassifyRoute.mockReturnValue('cross-building');
      mockBuildRouteSegments.mockReturnValue([outdoorSeg]);
      mockFindShortestPath.mockReturnValue({ ok: false, reason: 'no path' });
      const { getByText } = render(
        <IndoorDirectionsScreen route={crossBuildingRoute} navigation={mockNavigation} />
      );
      fireEvent.press(getByText('Open Outdoor Directions'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Map', expect.objectContaining({
        outdoorRoute: expect.objectContaining({
          startCoords: outdoorSeg.fromCoords,
          destCoords: outdoorSeg.toCoords,
        }),
      }));
    });

    it('should show outdoor step in cross-building direction steps', () => {
      mockClassifyRoute.mockReturnValue('cross-building');
      mockBuildRouteSegments.mockReturnValue([outdoorSeg]);
      mockFindShortestPath.mockReturnValue({ ok: false, reason: 'no path' });
      const { getByText } = render(
        <IndoorDirectionsScreen route={crossBuildingRoute} navigation={mockNavigation} />
      );
      expect(getByText(/Walk outside to the MB building/)).toBeTruthy();
    });

    it('should include outdoor travel in the route overview for cross-building routes', () => {
      const indoorSeg = {
        type: 'indoor',
        floorId: 'Hall-8',
        buildingId: 'hall',
        fromNodeId: 'Hall8_classroom_002',
        toNodeId: 'Hall8_hallway_001',
      };
      const destinationIndoorSeg = {
        type: 'indoor',
        floorId: 'MB-1',
        buildingId: 'mb',
        fromNodeId: 'MB1_hallway_001',
        toNodeId: 'MB1_classroom_001',
      };

      mockClassifyRoute.mockReturnValue('cross-building');
      mockBuildRouteSegments.mockReturnValue([indoorSeg, outdoorSeg, destinationIndoorSeg]);
      mockFindShortestPath.mockReturnValue({
        ok: true,
        pathCoords: [
          { x: 100, y: 200, type: 'classroom' },
          { x: 200, y: 300, type: 'hallway' },
        ],
        totalWeight: 200,
        reason: null,
      });
      const { getByText } = render(
        <IndoorDirectionsScreen route={crossBuildingRoute} navigation={mockNavigation} />
      );
      expect(getByText(/Walk outside from Hall Building to John Molson Building/)).toBeTruthy();
    });
  });

  describe('cross-floor pathResult fallback', () => {
    const crossRoute = {
      params: {
        startRoom: { id: 'Hall8_classroom_002', label: 'H837', floor: 'Hall-8', x: 100, y: 200, type: 'classroom' },
        destinationRoom: { id: 'Hall9_classroom_001', label: 'H961', floor: 'Hall-9', x: 200, y: 300, type: 'classroom' },
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

    it('should show fallback error when all segment results fail', () => {
      const vertSeg = { type: 'vertical', fromFloor: 'Hall-8', toFloor: 'Hall-9', transitionType: 'stairs' };
      mockClassifyRoute.mockReturnValue('cross-floor');
      mockBuildRouteSegments.mockReturnValue([vertSeg]);
      mockFindShortestPath.mockReturnValue({ ok: false, reason: 'no path' });
      const { getAllByText } = render(
        <IndoorDirectionsScreen route={crossRoute} navigation={mockNavigation} />
      );
      // Should show -- stats
      expect(getAllByText('--').length).toBeGreaterThanOrEqual(2);
    });

    it('should use first ok indoor segment result when activeSegment has no indoor path', () => {
      const indoor1 = { type: 'indoor', floorId: 'Hall-8', buildingId: 'hall', fromNodeId: 'a', toNodeId: 'b' };
      const vertSeg = { type: 'vertical', fromFloor: 'Hall-8', toFloor: 'Hall-9', transitionType: 'stairs' };
      const indoor2 = { type: 'indoor', floorId: 'Hall-9', buildingId: 'hall', fromNodeId: 'c', toNodeId: 'd' };
      mockClassifyRoute.mockReturnValue('cross-floor');
      mockBuildRouteSegments.mockReturnValue([indoor1, vertSeg, indoor2]);
      mockFindShortestPath.mockReturnValue({
        ok: true,
        pathCoords: [
          { x: 100, y: 200, type: 'classroom' },
          { x: 200, y: 300, type: 'classroom' },
        ],
        totalWeight: 200,
        reason: null,
      });
      const { getByText } = render(
        <IndoorDirectionsScreen route={crossRoute} navigation={mockNavigation} />
      );
      // Should show route stats (not --)
      expect(getByText(/min/)).toBeTruthy();
    });
  });
});
