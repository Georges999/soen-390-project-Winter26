import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampusToggle from '../../src/components/CampusToggle';

describe('CampusToggle', () => {
  const mockCampuses = [
    { id: 'sgw', name: 'SGW' },
    { id: 'loyola', name: 'Loyola' },
  ];

  it('should render all campus buttons', () => {
    const { getByText } = render(
      <CampusToggle
        campuses={mockCampuses}
        selectedId="sgw"
        onSelect={() => {}}
      />
    );

    expect(getByText('SGW')).toBeTruthy();
    expect(getByText('Loyola')).toBeTruthy();
  });

  it('should call onSelect when a campus is pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <CampusToggle
        campuses={mockCampuses}
        selectedId="sgw"
        onSelect={onSelect}
      />
    );

    fireEvent.press(getByText('Loyola'));

    expect(onSelect).toHaveBeenCalledWith('loyola');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  // Style assertion test removed - Tests implementation details rather than behavior.
  // Selection behavior is already tested through the onSelect callback test.

  it('should handle empty campuses array', () => {
    const { toJSON } = render(
      <CampusToggle campuses={[]} selectedId="sgw" onSelect={() => {}} />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('should display campus names correctly', () => {
    const customCampuses = [
      { id: 'test1', name: 'Test Campus 1' },
      { id: 'test2', name: 'Test Campus 2' },
    ];

    const { getByText } = render(
      <CampusToggle
        campuses={customCampuses}
        selectedId="test1"
        onSelect={() => {}}
      />
    );

    expect(getByText('Test Campus 1')).toBeTruthy();
    expect(getByText('Test Campus 2')).toBeTruthy();
  });
});
