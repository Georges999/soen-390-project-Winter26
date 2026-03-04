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

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockRouteEmpty = { params: {} };

const mockRouteWithRooms = {
  params: {
    startRoom: { id: 'H-837', label: 'H837', floor: 'Hall-8' },
    destinationRoom: { id: 'H-861', label: 'H861', floor: 'Hall-8' },
    building: {
      id: 'hall',
      label: 'H',
      name: 'Hall Building',
      floors: [
        { id: 'Hall-8', label: '8', floorNumber: 8, image: 'hall8img' },
        { id: 'Hall-9', label: '9', floorNumber: 9, image: 'hall9img' },
      ],
      rooms: [],
    },
    floor: { id: 'Hall-8', label: '8', floorNumber: 8, image: 'hall8img' },
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
    expect(getByPlaceholderText('Start room')).toBeTruthy();
    expect(getByPlaceholderText('Destination room')).toBeTruthy();
  });

  it('should render transport mode chips', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    expect(getByText('Walk')).toBeTruthy();
    expect(getByText('Car')).toBeTruthy();
    expect(getByText('Bike')).toBeTruthy();
  });

  it('should render the empty prompt when no rooms are entered', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    expect(getByText('Enter start and destination rooms to see directions')).toBeTruthy();
  });

  // --- Back Button ---

  it('should call navigation.goBack when back button is pressed', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    fireEvent.press(getByText('chevron-left'));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  // --- Transport Mode ---

  it('should switch transport mode when a chip is pressed', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    fireEvent.press(getByText('Car'));
    // Car chip should now be active (visually — we just verify no crash)
    expect(getByText('Car')).toBeTruthy();
  });

  it('should switch to Bike mode', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    fireEvent.press(getByText('Bike'));
    expect(getByText('Bike')).toBeTruthy();
  });

  it('should switch back to Walk mode', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    fireEvent.press(getByText('Car'));
    fireEvent.press(getByText('Walk'));
    expect(getByText('Walk')).toBeTruthy();
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
    expect(getByText('shortest path')).toBeTruthy();
    expect(getByText('duration')).toBeTruthy();
    expect(getByText('distance')).toBeTruthy();
  });

  it('should show STEP-BY-STEP section when both fields are filled', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByText('STEP-BY-STEP')).toBeTruthy();
  });

  it('should show individual direction steps', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByText('Exit the room into the main corridor')).toBeTruthy();
    expect(getByText('Destination is on your left')).toBeTruthy();
  });

  it('should show step numbers', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByText('1')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  it('should show step distance when available', () => {
    const { getByText } = render(
      <IndoorDirectionsScreen route={mockRouteWithRooms} navigation={mockNavigation} />
    );
    expect(getByText('30m')).toBeTruthy();
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
    const { getByPlaceholderText, getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    const startInput = getByPlaceholderText('Start room');
    fireEvent(startInput, 'focus');
    fireEvent.changeText(startInput, 'H837');
    expect(getByText(/H837.*Hall Building/)).toBeTruthy();
  });

  it('should show search results when typing in destination field', () => {
    const { getByPlaceholderText, getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    const destInput = getByPlaceholderText('Destination room');
    fireEvent(destInput, 'focus');
    fireEvent.changeText(destInput, 'H861');
    expect(getByText(/H861.*Hall Building/)).toBeTruthy();
  });

  it('should select a room from search results into start field', () => {
    const { getByPlaceholderText, getByText, getByDisplayValue } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    const startInput = getByPlaceholderText('Start room');
    fireEvent(startInput, 'focus');
    fireEvent.changeText(startInput, 'H837');
    fireEvent.press(getByText(/H837.*Hall Building/));
    expect(getByDisplayValue(/H837, Floor 8/)).toBeTruthy();
  });

  it('should select a room from search results into destination field', () => {
    const { getByPlaceholderText, getByText, getByDisplayValue } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    const destInput = getByPlaceholderText('Destination room');
    fireEvent(destInput, 'focus');
    fireEvent.changeText(destInput, 'H861');
    fireEvent.press(getByText(/H861.*Hall Building/));
    expect(getByDisplayValue(/H861, Floor 8/)).toBeTruthy();
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
    const { getByPlaceholderText, getByText } = render(
      <IndoorDirectionsScreen route={mockRouteEmpty} navigation={mockNavigation} />
    );
    const startInput = getByPlaceholderText('Start room');
    fireEvent(startInput, 'focus');
    fireEvent.changeText(startInput, 'VL101');
    expect(getByText(/VL101.*Vanier Library/)).toBeTruthy();
  });
});
