import { mapShuttleSchedules, getShuttleDepartures } from '../../src/utils/shuttleUtils';

const mockShuttleSchedule = {
  routes: [
    {
      id: 'sgw-to-loy',
      from: 'SGW',
      to: 'Loyola',
      stopName: 'SGW Campus Stop',
      address: '1455 De Maisonneuve Blvd. W.',
      weekday: { start: '09:15', end: '17:30', intervalMin: 15 },
      friday: { start: '09:15', end: '17:30', intervalMin: 30 },
      estimatedTravelMin: 30,
    },
    {
      id: 'loy-to-sgw',
      from: 'Loyola',
      to: 'SGW',
      stopName: 'Loyola Campus Stop',
      address: '7141 Sherbrooke St. W.',
      weekday: { start: '09:30', end: '17:45', intervalMin: 15 },
      friday: { start: '09:30', end: '17:45', intervalMin: 30 },
      estimatedTravelMin: 30,
    },
  ],
};

describe('shuttleUtils', () => {
  describe('mapShuttleSchedules', () => {
    it('should map routes to the expected structure', () => {
      const result = mapShuttleSchedules(mockShuttleSchedule);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'sgw-to-loy',
        from: 'SGW',
        to: 'Loyola',
        stop: 'SGW Campus Stop',
        address: '1455 De Maisonneuve Blvd. W.',
        weekday: { start: '09:15', end: '17:30', intervalMin: 15 },
        friday: { start: '09:15', end: '17:30', intervalMin: 30 },
        estimatedTravelMin: 30,
      });
    });

    it('should handle empty routes', () => {
      const result = mapShuttleSchedules({ routes: [] });
      expect(result).toEqual([]);
    });

    it('should map all route fields correctly', () => {
      const result = mapShuttleSchedules(mockShuttleSchedule);
      const route = result[1];
      expect(route.id).toBe('loy-to-sgw');
      expect(route.from).toBe('Loyola');
      expect(route.to).toBe('SGW');
      expect(route.stop).toBe('Loyola Campus Stop');
    });
  });

  describe('getShuttleDepartures', () => {
    const schedule = mockShuttleSchedule.routes[0];

    it('should return inactive on Sunday', () => {
      const sunday = new Date('2025-01-05T12:00:00'); // Sunday
      const result = getShuttleDepartures(sunday, schedule);
      expect(result).toEqual({ active: false, times: [] });
    });

    it('should return inactive on Saturday', () => {
      const saturday = new Date('2025-01-04T12:00:00'); // Saturday
      const result = getShuttleDepartures(saturday, schedule);
      expect(result).toEqual({ active: false, times: [] });
    });

    it('should return active with times on weekday', () => {
      // Monday at 10:00
      const monday = new Date('2025-01-06T10:00:00');
      const result = getShuttleDepartures(monday, schedule);
      expect(result.active).toBe(true);
      expect(result.times.length).toBeGreaterThan(0);
      expect(result.times.length).toBeLessThanOrEqual(6);
    });

    it('should return departures starting from next interval on weekday', () => {
      // Monday at 10:00. weekday start=09:15, interval=15
      // minutesNow = 600, startMinutes = 555
      // first = 600 + ((15 - ((600 - 555) % 15)) % 15) = 600 + ((15 - 0) % 15) = 600 + 0 = 600
      const monday = new Date('2025-01-06T10:00:00');
      const result = getShuttleDepartures(monday, schedule);
      expect(result.times[0]).toBe('10:00');
    });

    it('should use friday schedule on friday', () => {
      // Friday at 10:00. friday start=09:15, interval=30
      const friday = new Date('2025-01-03T10:00:00'); // Friday
      const result = getShuttleDepartures(friday, schedule);
      expect(result.active).toBe(true);
      // interval is 30 on Friday vs 15 on weekday → fewer departures
      expect(result.times.length).toBeGreaterThan(0);
    });

    it('should return inactive past end of service hours', () => {
      // Monday at 18:00 (end is 17:30)
      const monday = new Date('2025-01-06T18:00:00');
      const result = getShuttleDepartures(monday, schedule);
      expect(result).toEqual({ active: false, times: [] });
    });

    it('should start from beginning if current time is before start', () => {
      // Monday at 08:00 (before 09:15 start)
      const monday = new Date('2025-01-06T08:00:00');
      const result = getShuttleDepartures(monday, schedule);
      expect(result.active).toBe(true);
      expect(result.times[0]).toBe('09:15');
    });

    it('should return at most 6 departure times', () => {
      // Monday at 09:15 with 15-min interval → many departures available
      const monday = new Date('2025-01-06T09:15:00');
      const result = getShuttleDepartures(monday, schedule);
      expect(result.times.length).toBeLessThanOrEqual(6);
    });

    it('should format times with zero padding', () => {
      const monday = new Date('2025-01-06T09:00:00');
      const result = getShuttleDepartures(monday, schedule);
      expect(result.active).toBe(true);
      result.times.forEach(time => {
        expect(time).toMatch(/^\d{2}:\d{2}$/);
      });
    });
  });
});
