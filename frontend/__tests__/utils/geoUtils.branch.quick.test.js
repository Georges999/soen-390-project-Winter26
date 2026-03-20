import { getPolygonCenter } from '../../src/utils/geoUtils';

it('covers getPolygonCenter default-arg branch', () => {
  expect(getPolygonCenter()).toBeNull();
});
