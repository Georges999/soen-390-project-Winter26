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

    it('should have reasonable travel times', () => {
      shuttleSchedule.routes.forEach((route) => {
        expect(route.estimatedTravelMin).toBeLessThan(120);
      });
    });

    it('should have reasonable intervals', () => {
      shuttleSchedule.routes.forEach((route) => {
        expect(route.weekday.intervalMin).toBeLessThan(180);
        expect(route.friday.intervalMin).toBeLessThan(180);
      });
    });
  });

  describe('Schedule Times', () => {
    it('should have start time before end time on weekdays', () => {
      shuttleSchedule.routes.forEach((route) => {
        const start = route.weekday.start.split(':').map(Number);
        const end = route.weekday.end.split(':').map(Number);
        const startMinutes = start[0] * 60 + start[1];
        const endMinutes = end[0] * 60 + end[1];
        expect(endMinutes).toBeGreaterThan(startMinutes);
      });
    });

    it('should have start time before end time on fridays', () => {
      shuttleSchedule.routes.forEach((route) => {
        const start = route.friday.start.split(':').map(Number);
        const end = route.friday.end.split(':').map(Number);
        const startMinutes = start[0] * 60 + start[1];
        const endMinutes = end[0] * 60 + end[1];
        expect(endMinutes).toBeGreaterThan(startMinutes);
      });
    });
  });

  describe('Route IDs', () => {
    it('should have unique route IDs', () => {
      const ids = shuttleSchedule.routes.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have non-empty route IDs', () => {
      shuttleSchedule.routes.forEach((route) => {
        expect(route.id).toBeTruthy();
        expect(route.id.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Stop Information', () => {
    it('should have stop names for all routes', () => {
      shuttleSchedule.routes.forEach((route) => {
        expect(route.stopName).toBeTruthy();
        expect(typeof route.stopName).toBe('string');
      });
    });

    it('should have addresses for all routes', () => {
      shuttleSchedule.routes.forEach((route) => {
        expect(route.address).toBeTruthy();
        expect(typeof route.address).toBe('string');
      });
    });

    it('should have valid from/to campus identifiers', () => {
      shuttleSchedule.routes.forEach((route) => {
        expect(['sgw', 'loyola']).toContain(route.from);
        expect(['sgw', 'loyola']).toContain(route.to);
      });
    });
  });

  describe('Updated Timestamp', () => {
    it('should have a valid timestamp format', () => {
      expect(shuttleSchedule.updatedAt).toBeTruthy();
      expect(typeof shuttleSchedule.updatedAt).toBe('string');
    });
  });
});
