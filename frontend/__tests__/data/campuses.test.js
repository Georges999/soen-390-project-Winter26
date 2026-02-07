import campuses from '../../src/data/campuses.json';

describe('campuses.json', () => {
  it('should have SGW and Loyola campuses', () => {
    expect(campuses).toHaveProperty('sgw');
    expect(campuses).toHaveProperty('loyola');
  });

  describe('Campus Structure', () => {
    ['sgw', 'loyola'].forEach((campusKey) => {
      describe(`${campusKey.toUpperCase()} campus`, () => {
        const campus = campuses[campusKey];

        it('should have required top-level properties', () => {
          expect(campus).toHaveProperty('id');
          expect(campus).toHaveProperty('name');
          expect(campus).toHaveProperty('region');
          expect(campus).toHaveProperty('buildings');
        });

        it('should have valid region coordinates', () => {
          expect(campus.region).toHaveProperty('latitude');
          expect(campus.region).toHaveProperty('longitude');
          expect(campus.region).toHaveProperty('latitudeDelta');
          expect(campus.region).toHaveProperty('longitudeDelta');

          // Validate coordinate ranges
          expect(campus.region.latitude).toBeGreaterThan(-90);
          expect(campus.region.latitude).toBeLessThan(90);
          expect(campus.region.longitude).toBeGreaterThan(-180);
          expect(campus.region.longitude).toBeLessThan(180);
        });

        it('should have at least one building', () => {
          expect(campus.buildings).toBeDefined();
          expect(Array.isArray(campus.buildings)).toBe(true);
          expect(campus.buildings.length).toBeGreaterThan(0);
        });

        describe('Buildings', () => {
          it('should have required fields for each building', () => {
            campus.buildings.forEach((building, index) => {
              expect(building).toHaveProperty('id');
              expect(building).toHaveProperty('label');
              expect(building).toHaveProperty('name');
              expect(building).toHaveProperty('coordinates');

              // Validate coordinates array
              expect(Array.isArray(building.coordinates)).toBe(true);
              expect(building.coordinates.length).toBeGreaterThanOrEqual(3);
            });
          });

          it('should have valid coordinate points', () => {
            campus.buildings.forEach((building) => {
              building.coordinates.forEach((coord, coordIndex) => {
                expect(coord).toHaveProperty('latitude');
                expect(coord).toHaveProperty('longitude');

                // Validate coordinate ranges
                expect(coord.latitude).toBeGreaterThan(-90);
                expect(coord.latitude).toBeLessThan(90);
                expect(coord.longitude).toBeGreaterThan(-180);
                expect(coord.longitude).toBeLessThan(180);
              });
            });
          });

          it('should have unique building IDs', () => {
            const buildingIds = campus.buildings.map((b) => b.id);
            const uniqueIds = new Set(buildingIds);
            expect(uniqueIds.size).toBe(buildingIds.length);
          });
        });
      });
    });
  });

  describe('SGW Campus Specific', () => {
    it('should have Hall Building (H)', () => {
      const hBuilding = campuses.sgw.buildings.find((b) => b.label === 'H');
      expect(hBuilding).toBeDefined();
      expect(hBuilding.name).toContain('Hall');
    });

    it('should have EV Building', () => {
      const evBuilding = campuses.sgw.buildings.find((b) => b.label === 'EV');
      expect(evBuilding).toBeDefined();
    });
  });

  describe('Loyola Campus Specific', () => {
    it('should have Central Building (CC)', () => {
      const ccBuilding = campuses.loyola.buildings.find((b) => b.label === 'CC');
      expect(ccBuilding).toBeDefined();
    });
  });

  describe('Building Labels', () => {
    it('should have non-empty labels for all buildings', () => {
      ['sgw', 'loyola'].forEach((campusKey) => {
        campuses[campusKey].buildings.forEach((building) => {
          expect(building.label).toBeTruthy();
          expect(building.label.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have non-empty names for all buildings', () => {
      ['sgw', 'loyola'].forEach((campusKey) => {
        campuses[campusKey].buildings.forEach((building) => {
          expect(building.name).toBeTruthy();
          expect(building.name.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have string type labels', () => {
      ['sgw', 'loyola'].forEach((campusKey) => {
        campuses[campusKey].buildings.forEach((building) => {
          expect(typeof building.label).toBe('string');
        });
      });
    });
  });

  describe('Coordinate Consistency', () => {
    it('should have numeric latitude values', () => {
      ['sgw', 'loyola'].forEach((campusKey) => {
        campuses[campusKey].buildings.forEach((building) => {
          building.coordinates.forEach((coord) => {
            expect(typeof coord.latitude).toBe('number');
            expect(isNaN(coord.latitude)).toBe(false);
          });
        });
      });
    });

    it('should have numeric longitude values', () => {
      ['sgw', 'loyola'].forEach((campusKey) => {
        campuses[campusKey].buildings.forEach((building) => {
          building.coordinates.forEach((coord) => {
            expect(typeof coord.longitude).toBe('number');
            expect(isNaN(coord.longitude)).toBe(false);
          });
        });
      });
    });

    it('should have coordinates in Montreal area', () => {
      ['sgw', 'loyola'].forEach((campusKey) => {
        campuses[campusKey].buildings.forEach((building) => {
          building.coordinates.forEach((coord) => {
            // Montreal is roughly at 45.5°N, 73.5°W
            expect(coord.latitude).toBeGreaterThan(45);
            expect(coord.latitude).toBeLessThan(46);
            expect(coord.longitude).toBeGreaterThan(-74);
            expect(coord.longitude).toBeLessThan(-73);
          });
        });
      });
    });
  });

  describe('Data Integrity', () => {
    it('should have consistent building structure', () => {
      ['sgw', 'loyola'].forEach((campusKey) => {
        campuses[campusKey].buildings.forEach((building) => {
          const keys = Object.keys(building);
          expect(keys).toContain('id');
          expect(keys).toContain('label');
          expect(keys).toContain('name');
          expect(keys).toContain('coordinates');
        });
      });
    });

    it('should have at least 3 coordinate points per building', () => {
      ['sgw', 'loyola'].forEach((campusKey) => {
        campuses[campusKey].buildings.forEach((building) => {
          expect(building.coordinates.length).toBeGreaterThanOrEqual(3);
        });
      });
    });
  });
});
