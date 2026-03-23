import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import MapView, {
  Polygon,
  Polyline,
  Marker,
  Circle,
} from '../../src/shims/react-native-maps-web';

describe('react-native-maps-web shim', () => {
  it('renders children and exposes imperative map methods', () => {
    const ref = React.createRef();
    const { getByText } = render(
      <MapView ref={ref}>
        <Text>Map child</Text>
      </MapView>
    );

    expect(getByText('Map child')).toBeTruthy();
    expect(typeof ref.current.animateToRegion).toBe('function');
    expect(typeof ref.current.fitToCoordinates).toBe('function');
  });

  it('applies children prop validation to map and shape shims', () => {
    expect(MapView.propTypes.children).toBeDefined();
    expect(Polygon.propTypes.children).toBeDefined();
    expect(Polyline.propTypes.children).toBeDefined();
    expect(Marker.propTypes.children).toBeDefined();
    expect(Circle.propTypes.children).toBeDefined();
  });

  it('renders generated shape components as passthrough views', () => {
    const { getByText } = render(
      <>
        <Polygon>
          <Text>Polygon child</Text>
        </Polygon>
        <Polyline>
          <Text>Polyline child</Text>
        </Polyline>
        <Marker>
          <Text>Marker child</Text>
        </Marker>
        <Circle>
          <Text>Circle child</Text>
        </Circle>
      </>
    );

    expect(getByText('Polygon child')).toBeTruthy();
    expect(getByText('Polyline child')).toBeTruthy();
    expect(getByText('Marker child')).toBeTruthy();
    expect(getByText('Circle child')).toBeTruthy();
  });
});
