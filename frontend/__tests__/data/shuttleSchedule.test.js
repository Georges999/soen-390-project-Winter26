import shuttleSchedule from '../../src/data/shuttleSchedule.json';

describe('shuttleSchedule.json', () => {
  it('should have valid structure', () => {
    expect(shuttleSchedule).toHaveProperty('updatedAt');
    expect(shuttleSchedule).toHaveProperty('routes');
    expect(Array.isArray(shuttleSchedule.routes)).toBe(true);
  });

  it('should have routes between SGW and Loyola', () => {
    const sgwToLoyola = shuttleSchedule.routes.find(
      (r) => r.from === 'sgw' && r.to === 'loyola'
    );
    const loyolaToSgw = shuttleSchedule.routes.find(
      (r) => r.from === 'loyola' && r.to === 'sgw'
    );

    expect(sgwToLoyola).toBeDefined();
    expect(loyolaToSgw).toBeDefined();
  });

  describe('Route Structure', () => {
    it('should have required fields for each route', () => {
      shuttleSchedule.routes.forEach((route) => {
        expect(route).toHaveProperty('id');
        expect(route).toHaveProperty('from');
        expect(route).toHaveProperty('to');
        expect(route).toHaveProperty('stopName');
        expect(route).toHaveProperty('address');
        expect(route).toHaveProperty('weekday');
        expect(route).toHaveProperty('friday');
        expect(route).toHaveProperty('estimatedTravelMin');
      });
    });

    it('should have valid time formats', () => {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

      shuttleSchedule.routes.forEach((route) => {
        expect(route.weekday.start).toMatch(timeRegex);
        expect(route.weekday.end).toMatch(timeRegex);
        expect(route.friday.start).toMatch(timeRegex);
        expect(route.friday.end).toMatch(timeRegex);
      });
    });

    it('should have positive interval minutes', () => {
      shuttleSchedule.routes.forEach((route) => {
        expect(route.weekday.intervalMin).toBeGreaterThan(0);
        expect(route.friday.intervalMin).toBeGreaterThan(0);
      });
    });

    it('should have positive travel time', () => {
      shuttleSchedule.routes.forEach((route) => {
        expect(route.estimatedTravelMin).toBeGreaterThan(0);
      });
    });
  });
});
