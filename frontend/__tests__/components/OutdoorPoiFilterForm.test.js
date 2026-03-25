import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OutdoorPoiFilterForm from '../../src/components/OutdoorPoiFilterForm';

const styles = {
  poiPanelSectionLabel: {},
  poiCategoryRow: { flexDirection: 'row' },
  poiCategoryChip: {},
  poiCategoryChipActive: {},
  poiCategoryChipText: {},
  poiCategoryChipTextActive: {},
  poiRadiusRow: { flexDirection: 'row' },
  poiRadiusButton: {},
  poiRadiusButtonText: {},
  poiRadiusValueBox: {},
  poiRadiusValueText: {},
};

describe('OutdoorPoiFilterForm', () => {
  it('calls onShowOnMap with defaults: Coffee, nearest, radius 1000, fetchRadius max(radius, 2000)', () => {
    const onShowOnMap = jest.fn();
    const { getByText } = render(
      <OutdoorPoiFilterForm styles={styles} maroon="#95223D" onShowOnMap={onShowOnMap} />,
    );

    fireEvent.press(getByText('Show on map'));

    expect(onShowOnMap).toHaveBeenCalledWith({
      category: 'Coffee',
      mode: 'nearest',
      radius: 1000,
      fetchRadius: 2000,
    });
  });

  it('uses Range mode and passes UI radius as fetchRadius', () => {
    const onShowOnMap = jest.fn();
    const { getByText } = render(
      <OutdoorPoiFilterForm styles={styles} maroon="#95223D" onShowOnMap={onShowOnMap} />,
    );

    fireEvent.press(getByText('Range'));
    fireEvent.press(getByText('Food'));
    fireEvent.press(getByText('Show on map'));

    expect(onShowOnMap).toHaveBeenCalledWith({
      category: 'Food',
      mode: 'range',
      radius: 1000,
      fetchRadius: 1000,
    });
  });

  it('nearest mode uses fetchRadius above 2000 when stored radius was raised in Range UI', () => {
    const onShowOnMap = jest.fn();
    const { getByText } = render(
      <OutdoorPoiFilterForm styles={styles} maroon="#95223D" onShowOnMap={onShowOnMap} />,
    );

    fireEvent.press(getByText('Range'));
    for (let i = 0; i < 11; i += 1) {
      fireEvent.press(getByText('+'));
    }
    fireEvent.press(getByText('Nearest'));
    fireEvent.press(getByText('Show on map'));

    expect(onShowOnMap).toHaveBeenCalledWith({
      category: 'Coffee',
      mode: 'nearest',
      radius: 2100,
      fetchRadius: 2100,
    });
  });

  it('shows radius steppers only in Range mode', () => {
    const onShowOnMap = jest.fn();
    const { getByText, queryByText } = render(
      <OutdoorPoiFilterForm styles={styles} maroon="#95223D" onShowOnMap={onShowOnMap} />,
    );

    expect(queryByText('+')).toBeNull();

    fireEvent.press(getByText('Range'));
    expect(getByText('+')).toBeTruthy();
    expect(getByText('-')).toBeTruthy();
  });
});
