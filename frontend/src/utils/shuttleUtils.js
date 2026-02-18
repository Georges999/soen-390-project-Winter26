//read array from json
const mapShuttleSchedules = (shuttleSchedule) =>
  shuttleSchedule.routes.map((route) => ({
    id: route.id,
    from: route.from,
    to: route.to,
    stop: route.stopName,
    address: route.address,
    weekday: route.weekday,
    friday: route.friday,
    estimatedTravelMin: route.estimatedTravelMin,
  }));

const getShuttleDepartures = (now = new Date(), schedule) => {
  const day = now.getDay(); // 0 Sun ... 6 Sat
  if (day === 0 || day === 6) return { active: false, times: [] }; //no shuttle on weekend

  //friday schedule is different
  const isFriday = day === 5;
  const parseTime = (t) => {
    const [h, m] = t.split(":").map((v) => parseInt(v, 10));
    return h * 60 + m;
  };
  const startMinutes = isFriday
    ? parseTime(schedule.friday.start)
    : parseTime(schedule.weekday.start);
  const endMinutes = isFriday
    ? parseTime(schedule.friday.end)
    : parseTime(schedule.weekday.end);
  const interval = isFriday
    ? schedule.friday.intervalMin
    : schedule.weekday.intervalMin;

  //current time to minutes
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  if (minutesNow > endMinutes) return { active: false, times: [] }; //past service hrs

  const nextTimes = [];
  const first =
    minutesNow <= startMinutes
      ? startMinutes
      : minutesNow +
        ((interval - ((minutesNow - startMinutes) % interval)) % interval);
  //list of future departures
  for (
    let t = first;
    t <= endMinutes && nextTimes.length < 6;
    t += interval
  ) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const label = `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}`;
    nextTimes.push(label);
  }

  return { active: true, times: nextTimes };
};

export { getShuttleDepartures, mapShuttleSchedules };
