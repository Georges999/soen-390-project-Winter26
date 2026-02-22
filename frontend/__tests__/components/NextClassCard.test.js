import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NextClassCard from '../../src/components/NextClassCard';

describe('NextClassCard', () => {
  const futureTime = new Date(Date.now() + 30 * 60 * 1000); // 30 mins from now

  const mockClass = {
    title: 'SOEN 390',
    startTime: futureTime.toISOString(),
  };

  it('should return null when nextClass is null', () => {
    const { toJSON } = render(
      <NextClassCard nextClass={null} buildingCode={null} onNavigate={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('should render class title', () => {
    const { getByText } = render(
      <NextClassCard nextClass={mockClass} buildingCode="H" onNavigate={jest.fn()} />,
    );
    expect(getByText('SOEN 390')).toBeTruthy();
  });

  it('should render Next Class header', () => {
    const { getByText } = render(
      <NextClassCard nextClass={mockClass} buildingCode="H" onNavigate={jest.fn()} />,
    );
    expect(getByText('Next Class')).toBeTruthy();
  });

  it('should render building code when provided', () => {
    const { getByText } = render(
      <NextClassCard nextClass={mockClass} buildingCode="EV" onNavigate={jest.fn()} />,
    );
    expect(getByText('EV')).toBeTruthy();
  });

  it('should not render building code when null', () => {
    const { queryByText } = render(
      <NextClassCard nextClass={mockClass} buildingCode={null} onNavigate={jest.fn()} />,
    );
    expect(queryByText('EV')).toBeNull();
  });

  it('should render Navigate button', () => {
    const { getByText } = render(
      <NextClassCard nextClass={mockClass} buildingCode="H" onNavigate={jest.fn()} />,
    );
    expect(getByText('Navigate')).toBeTruthy();
  });

  it('should call onNavigate when Navigate pressed', () => {
    const onNavigate = jest.fn();
    const { getByText } = render(
      <NextClassCard nextClass={mockClass} buildingCode="H" onNavigate={onNavigate} />,
    );
    fireEvent.press(getByText('Navigate'));
    expect(onNavigate).toHaveBeenCalled();
  });

  it('should show upcoming time for class within 60 minutes', () => {
    const soonClass = {
      title: 'COMP 346',
      startTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    const { getByText } = render(
      <NextClassCard nextClass={soonClass} buildingCode="H" onNavigate={jest.fn()} />,
    );
    // Should show "in X min"
    expect(getByText(/in \d+ min/)).toBeTruthy();
  });

  it('should not show upcoming for class more than 60 min away', () => {
    const farClass = {
      title: 'ENGR 301',
      startTime: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
    };
    const { queryByText } = render(
      <NextClassCard nextClass={farClass} buildingCode="H" onNavigate={jest.fn()} />,
    );
    expect(queryByText(/in \d+ min/)).toBeNull();
  });
});
