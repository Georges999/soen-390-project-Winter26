import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import IndoorMapScreen from '../../src/screens/IndoorMapScreen';
import { buildings } from '../../src/data/indoorFloorData';

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

describe('IndoorMapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Rendering ---

  it('should render without crashing', () => {
    const { toJSON } = render(<IndoorMapScreen navigation={mockNavigation} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render the header title "Indoor Map"', () => {
    const { getByText } = render(<IndoorMapScreen navigation={mockNavigation} />);
    expect(getByText('Indoor Map')).toBeTruthy();
  });

  it('should render SGW and Loyola toggle buttons', () => {
    const { getByText } = render(<IndoorMapScreen navigation={mockNavigation} />);
    expect(getByText('SGW')).toBeTruthy();
    expect(getByText('Loyola')).toBeTruthy();
  });

  it('should render the search input placeholder', () => {
    const { getByPlaceholderText } = render(<IndoorMapScreen navigation={mockNavigation} />);
    expect(getByPlaceholderText('Search room or click on map')).toBeTruthy();
  });

  it('should render POI legend items', () => {
    const { getByText } = render(<IndoorMapScreen navigation={mockNavigation} />);
    expect(getByText('Washroom')).toBeTruthy();
    expect(getByText('Water')).toBeTruthy();
    expect(getByText('Stairs')).toBeTruthy();
    expect(getByText('Elevator')).toBeTruthy();
  });

  it('should render POI vector icons', () => {
    const { getAllByText } = render(<IndoorMapScreen navigation={mockNavigation} />);
    // Vector icons render as text with the icon name in the mock
    expect(getAllByText('wc').length).toBeGreaterThan(0);
    expect(getAllByText('water-drop').length).toBeGreaterThan(0);
    expect(getAllByText('stairs').length).toBeGreaterThan(0);
    expect(getAllByText('elevator').length).toBeGreaterThan(0);
  });

  it('should render vector POI markers on the map itself', () => {
    const { getByTestId } = render(<IndoorMapScreen navigation={mockNavigation} />);
    expect(getByTestId('poi-marker-icon-Hall1Red_washroom_001')).toBeTruthy();
  });

  it('should render floor selector buttons', () => {
    const { getByText } = render(<IndoorMapScreen navigation={mockNavigation} />);
    // SGW default => Hall Building with floors 1, 2, 8, 9
    expect(getByText('1')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('8')).toBeTruthy();
    expect(getByText('9')).toBeTruthy();
  });

  it('should show the floor label badge for default floor', () => {
    const { getByText } = render(<IndoorMapScreen navigation={mockNavigation} />);
    expect(getByText('Floor 1')).toBeTruthy();
  });

  it('should render building selector chips for SGW', () => {
    const { getByText } = render(<IndoorMapScreen navigation={mockNavigation} />);
    expect(getByText('Hall Building')).toBeTruthy();
    expect(getByText('John Molson Building')).toBeTruthy();
  });

  // --- Back Button ---

  it('should call navigation.goBack when back button is pressed', () => {
    const { getByText } = render(<IndoorMapScreen navigation={mockNavigation} />);
    const backIcon = getByText('chevron-left');
    fireEvent.press(backIcon);
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  // --- Campus Toggle ---

  it('should switch to Loyola campus when Loyola button is pressed', () => {
    const { getByText, queryByText } = render(<IndoorMapScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Loyola'));
    // Loyola buildings should now be visible
    expect(getByText('Vanier Library')).toBeTruthy();
    expect(getByText('Vanier Extension')).toBeTruthy();
    // SGW buildings should not be visible
    expect(queryByText('Hall Building')).toBeNull();
    expect(queryByText('John Molson Building')).toBeNull();
  });

  it('should switch back to SGW campus', () => {
    const { getByText, queryByText } = render(<IndoorMapScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Loyola'));
    fireEvent.press(getByText('SGW'));
    expect(getByText('Hall Building')).toBeTruthy();
    expect(queryByText('Vanier Library')).toBeNull();
  });

  it('should reset floor index when switching campuses', () => {
    const { getByText } = render(<IndoorMapScreen navigation={mockNavigation} />);
    // Switch to floor 9 on SGW
    fireEvent.press(getByText('9'));
    expect(getByText('Floor 9')).toBeTruthy();
    // Switch to Loyola — should reset to first floor
    fireEvent.press(getByText('Loyola'));
    expect(getByText('Floor 1')).toBeTruthy();
  });

  // --- Building Selector ---

  it('should switch building when a building chip is pressed', () => {
    const { getByText } = render(<IndoorMapScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('John Molson Building'));
    // MB building first floor is S2
    expect(getByText('Floor S2')).toBeTruthy();
  });

  // --- Floor Selector ---

  it('should change floor when a floor button is pressed', () => {
    const { getByText } = render(<IndoorMapScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('9'));
    expect(getByText('Floor 9')).toBeTruthy();
  });

  it('should change floor back to first floor', () => {
    const { getByText } = render(<IndoorMapScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('9'));
    fireEvent.press(getByText('8'));
    expect(getByText('Floor 8')).toBeTruthy();
  });

  // --- Search ---

  it('should show search results when typing a matching room', () => {
    const { getByPlaceholderText, getByText } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );
    const searchInput = getByPlaceholderText('Search room or click on map');
    fireEvent.changeText(searchInput, 'H837');
    expect(getByText(/H837/)).toBeTruthy();
  });

  it('should show "not found" message for a non-matching query', () => {
    const { getByPlaceholderText, getByText } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );
    const searchInput = getByPlaceholderText('Search room or click on map');
    fireEvent.changeText(searchInput, 'XYZABC Hall');
    expect(getByText(/No rooms or buildings found/)).toBeTruthy();
  });

  it('should not show "not found" message when search is empty', () => {
    const { getByPlaceholderText, queryByText } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );
    const searchInput = getByPlaceholderText('Search room or click on map');
    fireEvent.changeText(searchInput, '');
    expect(queryByText(/No rooms or buildings found/)).toBeNull();
  });

  it('should hide "not found" message after clearing search', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );
    const searchInput = getByPlaceholderText('Search room or click on map');
    fireEvent.changeText(searchInput, 'XYZABC');
    expect(getByText(/No rooms or buildings found/)).toBeTruthy();
    // Clear search
    fireEvent.press(getByText('close'));
    expect(queryByText(/No rooms or buildings found/)).toBeNull();
  });

  it('should handle whitespace-only search input gracefully', () => {
    const { getByPlaceholderText, queryByText } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );
    const searchInput = getByPlaceholderText('Search room or click on map');
    fireEvent.changeText(searchInput, '   ');
    expect(queryByText(/No rooms or buildings found/)).toBeNull();
  });

  it('should clear search when the close icon is pressed', () => {
    const { getByPlaceholderText, getByText } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );
    const searchInput = getByPlaceholderText('Search room or click on map');
    fireEvent.changeText(searchInput, 'H837');
    // Press the close icon
    const closeIcon = getByText('close');
    fireEvent.press(closeIcon);
    // Search results should be gone
    expect(searchInput.props.value).toBe('');
  });

  it('should select a room from search results', () => {
    const { getByPlaceholderText, getByText } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );
    const searchInput = getByPlaceholderText('Search room or click on map');
    fireEvent.changeText(searchInput, 'H837');
    // Press the search result
    fireEvent.press(getByText(/H837/));
    // Room should be selected — "Room Selected" bar should appear
    expect(getByText('Room Selected')).toBeTruthy();
    expect(getByText(/H837/)).toBeTruthy();
  });

  // --- Room Selection & Get Directions ---

  it('should show Get Directions button when a room is selected', () => {
    const { getByPlaceholderText, getByText } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );
    fireEvent.changeText(getByPlaceholderText('Search room or click on map'), 'H837');
    fireEvent.press(getByText(/H837/));
    expect(getByText('Get Directions')).toBeTruthy();
  });

  it('should render a highlight marker when a mapped room is selected', () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );
    fireEvent.changeText(getByPlaceholderText('Search room or click on map'), 'H837');
    fireEvent.press(getByText(/H837/));
    expect(getByTestId('selected-room-highlight')).toBeTruthy();
  });

  it('should keep only one highlight when selecting a different room', () => {
    const { getByPlaceholderText, getByText, getAllByText, getAllByTestId } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Search room or click on map'), 'H837');
    fireEvent.press(getByText(/H837/));

    fireEvent.changeText(getByPlaceholderText('Search room or click on map'), 'H861');
    fireEvent.press(getAllByText(/H861/)[0]);

    expect(getAllByTestId('selected-room-highlight')).toHaveLength(1);
    expect(getAllByText(/H861/).length).toBeGreaterThan(0);
  });

  it('should show the checkmark when a room is selected', () => {
    const { getByPlaceholderText, getByText } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );
    fireEvent.changeText(getByPlaceholderText('Search room or click on map'), 'H837');
    fireEvent.press(getByText(/H837/));
    expect(getByText('✓')).toBeTruthy();
  });

  it('should navigate to IndoorDirections when Get Directions is pressed', () => {
    const { getByPlaceholderText, getByText } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );
    fireEvent.changeText(getByPlaceholderText('Search room or click on map'), 'H837');
    fireEvent.press(getByText(/H837/));
    fireEvent.press(getByText('Get Directions'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'IndoorDirections',
      expect.objectContaining({
        destinationRoom: expect.objectContaining({
          label: 'H837',
          floor: 'Hall-8',
        }),
      })
    );
  });

  it('should not show Get Directions button when no room is selected', () => {
    const { queryByText } = render(<IndoorMapScreen navigation={mockNavigation} />);
    expect(queryByText('Get Directions')).toBeNull();
  });

  // --- Room selection switches building and floor ---

  it('should switch to the correct building when selecting a room from another building', () => {
    const { getByPlaceholderText, getByText } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );
    fireEvent.changeText(getByPlaceholderText('Search room or click on map'), 'MB1.210');
    fireEvent.press(getByText(/MB1\.210/));
    expect(getByText('Floor 1')).toBeTruthy();
  });

  it('should preserve selection when switching floors and restore the highlight on return', () => {
    const {
      getByPlaceholderText,
      getByText,
      getByTestId,
      queryByTestId,
    } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );
    fireEvent.changeText(getByPlaceholderText('Search room or click on map'), 'H837');
    fireEvent.press(getByText(/H837/));
    expect(getByTestId('selected-room-highlight')).toBeTruthy();

    fireEvent.press(getByText('9'));
    expect(getByText('Room Selected')).toBeTruthy();
    expect(queryByTestId('selected-room-highlight')).toBeNull();

    fireEvent.press(getByText('8'));
    expect(getByTestId('selected-room-highlight')).toBeTruthy();
  });

  it('should not reuse a same-labeled Hall room highlight when switching to floor 2', () => {
    const {
      getByPlaceholderText,
      getAllByText,
      getByText,
      queryByTestId,
    } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Search room or click on map'), 'H110');
    fireEvent.press(getAllByText(/H110/)[0]);
    expect(getByText('Floor 1')).toBeTruthy();

    fireEvent.press(getByText('2'));
    expect(getByText('Room Selected')).toBeTruthy();
    expect(queryByTestId('selected-room-highlight')).toBeNull();
  });

  it('should clear selection when switching buildings', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );
    fireEvent.changeText(getByPlaceholderText('Search room or click on map'), 'H837');
    fireEvent.press(getByText(/H837/));
    expect(getByText('Room Selected')).toBeTruthy();
    // Switch building
    fireEvent.press(getByText('John Molson Building'));
    expect(queryByText('Room Selected')).toBeNull();
  });

  it('should clear selection when switching campuses', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );
    fireEvent.changeText(getByPlaceholderText('Search room or click on map'), 'H837');
    fireEvent.press(getByText(/H837/));
    expect(getByText('Room Selected')).toBeTruthy();
    // Switch campus
    fireEvent.press(getByText('Loyola'));
    expect(queryByText('Room Selected')).toBeNull();
  });

  // --- Search by building name ---

  it('should search rooms by building name', () => {
    const { getByPlaceholderText, getAllByText } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );
    fireEvent.changeText(getByPlaceholderText('Search room or click on map'), 'Hall');
    // Should show Hall Building rooms (any room starting with H)
    expect(getAllByText(/^H\d/)[0]).toBeTruthy();
  });

  // --- Search by room ID ---

  it('should find a room by its ID prefix', () => {
    const { getByPlaceholderText, getByText } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );
    fireEvent.changeText(getByPlaceholderText('Search room or click on map'), 'H837');
    expect(getByText(/H837/)).toBeTruthy();
  });

  it('should prioritize current-building rooms for broad numeric searches', () => {
    const { getByPlaceholderText, getAllByText } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Search room or click on map'), '1');

    const firstResult = getAllByText(/ · /)[0];
    expect(firstResult.props.children.join('')).toContain('Hall Building');
  });

  // --- Inspect Mode ---

  it('should render inspect map toggle in default state', () => {
    const { getByText } = render(<IndoorMapScreen navigation={mockNavigation} />);
    expect(getByText('Inspect map')).toBeTruthy();
    expect(getByText('zoom-in')).toBeTruthy();
  });

  it('should toggle inspect mode on and off', () => {
    const { getByText, queryByText } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );

    fireEvent.press(getByText('Inspect map'));
    expect(getByText('Inspecting map')).toBeTruthy();
    expect(getByText('zoom-out-map')).toBeTruthy();

    fireEvent.press(getByText('Inspecting map'));
    expect(getByText('Inspect map')).toBeTruthy();
    expect(queryByText('Inspecting map')).toBeNull();
  });

  it('should keep the room highlight visible in inspect mode', () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <IndoorMapScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Search room or click on map'), 'H837');
    fireEvent.press(getByText(/H837/));
    fireEvent.press(getByText('Inspect map'));

    expect(getByText('Inspecting map')).toBeTruthy();
    expect(getByTestId('selected-room-highlight')).toBeTruthy();
  });

  it('should show fallback when floor plan image is missing', () => {
    const originalImage = buildings.sgw[0].floors[0].image;
    buildings.sgw[0].floors[0].image = null;

    try {
      const { getByText } = render(
        <IndoorMapScreen navigation={mockNavigation} />
      );
      expect(getByText('Floor plan not available')).toBeTruthy();
    } finally {
      buildings.sgw[0].floors[0].image = originalImage;
    }
  });
});
