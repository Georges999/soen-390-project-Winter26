import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import BuildingBottomSheet from '../../src/components/BuildingBottomSheet';

const mockStyles = StyleSheet.create({
  sheetWrap: {}, sheet: {}, sheetHandle: {}, sheetHeaderRow: {},
  sheetHeaderLeft: {}, buildingIcon: {}, buildingIconImage: {},
  buildingTitle: {}, buildingSub: {}, amenitiesWrap: {},
  amenitiesTitle: {}, amenityRow: {}, amenityLeft: {},
  amenityLabel: {}, amenityValue: {}, closeBtn: {}, closeBtnText: {},
  directionsBtn: {}, directionsBtnText: {}, directionsBtnIcon: {},
});

describe('BuildingBottomSheet', () => {
  const baseProps = {
    styles: mockStyles,
    maroon: '#95223D',
    selectedBuilding: null,
    getBuildingName: (b) => b?.name || 'Building',
    getAmenities: (b) => ({
      bathrooms: true,
      waterFountains: false,
      genderNeutralBathrooms: true,
      wheelchairAccessible: false,
    }),
    onClose: jest.fn(),
    onDirections: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('should return null when no building selected', () => {
    const { toJSON } = render(<BuildingBottomSheet {...baseProps} />);
    expect(toJSON()).toBeNull();
  });

  it('should render building name when selected', () => {
    const building = { name: 'Hall Building', address: '1455 De Maisonneuve W' };
    const { getByText } = render(
      <BuildingBottomSheet {...baseProps} selectedBuilding={building} />,
    );
    expect(getByText('HALL BUILDING')).toBeTruthy();
  });

  it('should render building address', () => {
    const building = { name: 'Hall Building', address: '1455 De Maisonneuve W' };
    const { getByText } = render(
      <BuildingBottomSheet {...baseProps} selectedBuilding={building} />,
    );
    expect(getByText('1455 De Maisonneuve W')).toBeTruthy();
  });

  it('should show "No address available" when no address', () => {
    const building = { name: 'Hall Building' };
    const { getByText } = render(
      <BuildingBottomSheet {...baseProps} selectedBuilding={building} />,
    );
    expect(getByText('No address available')).toBeTruthy();
  });

  it('should show amenities', () => {
    const building = { name: 'Hall Building', address: '123 St' };
    const { getByText } = render(
      <BuildingBottomSheet {...baseProps} selectedBuilding={building} />,
    );
    expect(getByText('Amenities')).toBeTruthy();
    expect(getByText('Bathrooms')).toBeTruthy();
    expect(getByText('Water fountains')).toBeTruthy();
    expect(getByText('Gender-neutral bathrooms')).toBeTruthy();
    expect(getByText('Wheelchair accessible')).toBeTruthy();
  });

  it('should show amenity availability values', () => {
    const building = { name: 'Hall', address: '123' };
    const { getAllByText } = render(
      <BuildingBottomSheet {...baseProps} selectedBuilding={building} />,
    );
    expect(getAllByText('Available').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Not available').length).toBeGreaterThanOrEqual(1);
  });

  it('should call onClose when close pressed', () => {
    const building = { name: 'Hall', address: '123' };
    const { getByText } = render(
      <BuildingBottomSheet {...baseProps} selectedBuilding={building} />,
    );
    fireEvent.press(getByText('✕'));
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('should call onDirections when Directions pressed', () => {
    const building = { name: 'Hall', address: '123' };
    const { getByText } = render(
      <BuildingBottomSheet {...baseProps} selectedBuilding={building} />,
    );
    fireEvent.press(getByText('Directions'));
    expect(baseProps.onDirections).toHaveBeenCalled();
  });

  it('should display Yes/No for boolean amenities', () => {
    const building = { name: 'Hall', address: '123' };
    const { getAllByText } = render(
      <BuildingBottomSheet {...baseProps} selectedBuilding={building} />,
    );
    expect(getAllByText('Yes').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('No').length).toBeGreaterThanOrEqual(1);
  });
});
