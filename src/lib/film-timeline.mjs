export const frameCount = 192;
export const openingScreens = 1.4;

// Distances are measured in viewport heights. Booking includes the whole SMS exchange.
const durations = [1.65, 2.45, 1.55, 1.75, 1.60, 1.55, .75];
const starts = durations.map((_, i) => openingScreens + durations.slice(0, i).reduce((sum, v) => sum + v, 0));
export const travelScreens = starts.at(-1) + durations.at(-1);
const cameraMarks = [0, 17, 52, 99, 132, 160, frameCount - 1];
const shotLengths = [openingScreens, ...durations.slice(0, 5)];
const speeds = shotLengths.map((length, i) => (cameraMarks[i+1] - cameraMarks[i]) / length);
// Adjacent camera segments share a velocity at each prop. The harmonic mean
// keeps the travel monotonic even when the caption reading distances differ.
const velocities = [speeds[0], ...speeds.slice(1).map((speed, i) =>
  2 * speeds[i] * speed / (speeds[i] + speed)), 0];
const unit = n => Math.max(0, Math.min(1, n));

export function chapterPosition(chapter, local) {
  return (starts[chapter] + durations[chapter] * unit(local)) / travelScreens;
}

export function filmPosition(progress) {
  const distance = unit(progress) * travelScreens;
  const isOpening = distance < openingScreens;
  const intro = unit(distance / openingScreens);
  let selected = 0;
  while (selected + 1 < starts.length && distance >= starts[selected + 1]) selected++;
  const local = unit((distance - starts[selected]) / durations[selected]);
  const shot = isOpening ? 0 : Math.min(selected + 1, cameraMarks.length - 2);
  const u = isOpening ? intro : selected >= 5 ? 1 : local;
  const v = 1 - u;
  const frame = cameraMarks[shot]*v*v*(1+2*u) + cameraMarks[shot+1]*u*u*(3-2*u)
    + shotLengths[shot]*u*v*(v*velocities[shot] - u*velocities[shot+1]);
  return {isOpening, intro, selected, local, frame};
}
