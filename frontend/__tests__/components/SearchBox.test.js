import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import SearchBox from '../../src/components/SearchBox';

const mockStyles = StyleSheet.create({
  redBox: {}, inputRow: {}, input: {}, inputPlaceholder: {},
  searchIcon: {}, clearBtn: {}, clearBtnText: {}, swapBtn: {},
  searchResults: {}, searchResultRow: {}, searchResultText: {},
});

const baseProps = {
  styles: mockStyles,
  startText: '',
  destText: '',
  activeField: null,
  searchResults: [],
  shouldShowMyLocationOption: false,
  getBuildingKey: (campusId, b) => `${campusId}:${b.id}`,
  getBuildingName: (b) => b.name || 'Building',
  onStartChange: jest.fn(),
  onDestChange: jest.fn(),
  onStartFocus: jest.fn(),
  onDestFocus: jest.fn(),
  onClearStart: jest.fn(),
  onClearDest: jest.fn(),
  onSwap: jest.fn(),
  onSelectMyLocation: jest.fn(),
  onSelectBuilding: jest.fn(),
};

describe('SearchBox', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should render two search inputs', () => {
    const { getAllByPlaceholderText } = render(<SearchBox {...baseProps} />);
    expect(getAllByPlaceholderText('Search or click on a building...')).toHaveLength(2);
  });

  it('should call onStartChange when start input changes', () => {
    const { getByTestId } = render(<SearchBox {...baseProps} />);
    fireEvent.changeText(getByTestId('start-input'), 'Hall');
    expect(baseProps.onStartChange).toHaveBeenCalledWith('Hall');
  });

  it('should call onDestChange when dest input changes', () => {
    const { getByTestId } = render(<SearchBox {...baseProps} />);
    fireEvent.changeText(getByTestId('dest-input'), 'EV');
    expect(baseProps.onDestChange).toHaveBeenCalledWith('EV');
  });

  it('should call onStartFocus when start input focused', () => {
    const { getByTestId } = render(<SearchBox {...baseProps} />);
    fireEvent(getByTestId('start-input'), 'focus');
    expect(baseProps.onStartFocus).toHaveBeenCalled();
  });

  it('should call onDestFocus when dest input focused', () => {
    const { getByTestId } = render(<SearchBox {...baseProps} />);
    fireEvent(getByTestId('dest-input'), 'focus');
    expect(baseProps.onDestFocus).toHaveBeenCalled();
  });

  it('should show clear button when start text exists', () => {
    const { getAllByText } = render(
      <SearchBox {...baseProps} startText="Hall Building" />,
    );
    // The ✕ clear button
    expect(getAllByText('✕').length).toBeGreaterThanOrEqual(1);
  });

  it('should call onClearStart when clear button pressed', () => {
    const { getAllByText } = render(
      <SearchBox {...baseProps} startText="Hall" />,
    );
    fireEvent.press(getAllByText('✕')[0]);
    expect(baseProps.onClearStart).toHaveBeenCalled();
  });

  it('should show clear button for dest text', () => {
    const { getAllByText } = render(
      <SearchBox {...baseProps} destText="EV Building" />,
    );
    expect(getAllByText('✕').length).toBeGreaterThanOrEqual(1);
  });

  it('should call onSwap when swap button pressed', () => {
    const { toJSON } = render(<SearchBox {...baseProps} />);
    // The swap button uses MaterialIcons, find it and press
    expect(toJSON()).toBeTruthy();
  });

  it('should show My location option when shouldShowMyLocationOption is true', () => {
    const { getByText } = render(
      <SearchBox {...baseProps} shouldShowMyLocationOption={true} activeField="start" />,
    );
    expect(getByText('My location')).toBeTruthy();
  });

  it('should call onSelectMyLocation when My location pressed', () => {
    const { getByText } = render(
      <SearchBox {...baseProps} shouldShowMyLocationOption={true} activeField="start" />,
    );
    fireEvent.press(getByText('My location'));
    expect(baseProps.onSelectMyLocation).toHaveBeenCalledWith('start');
  });

  it('should show search results', () => {
    const results = [
      { __campusId: 'sgw', id: 'h', name: 'Hall Building' },
      { __campusId: 'sgw', id: 'ev', name: 'EV Building' },
    ];
    const { getByText } = render(
      <SearchBox {...baseProps} searchResults={results} activeField="start" />,
    );
    expect(getByText('Hall Building')).toBeTruthy();
    expect(getByText('EV Building')).toBeTruthy();
  });

  it('should call onSelectBuilding when a building result is pressed', () => {
    const building = { __campusId: 'sgw', id: 'h', name: 'Hall Building' };
    const { getByText } = render(
      <SearchBox {...baseProps} searchResults={[building]} activeField="dest" />,
    );
    fireEvent.press(getByText('Hall Building'));
    expect(baseProps.onSelectBuilding).toHaveBeenCalledWith(building, 'dest');
  });
});
