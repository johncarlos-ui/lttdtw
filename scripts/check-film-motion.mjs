import assert from 'node:assert/strict';
import { chapterPosition, filmPosition, frameCount } from '../src/lib/film-timeline.mjs';
import { framePlayer } from '../src/scripts/frames.js';

const frameAt = progress => filmPosition(progress).frame;
const step = .000001;
for (let chapter = 0; chapter <= 5; chapter++) {
  const p = chapterPosition(chapter, 0);
  const left = (frameAt(p) - frameAt(p-step)) / step;
  const right = (frameAt(p+step) - frameAt(p)) / step;
  assert(Math.abs(left-right) < .02, 'Camera velocity changes at chapter '+chapter);
}
let previous = 0;
for (let i = 0; i <= 10000; i++) {
  const frame = frameAt(i/10000);
  assert(frame >= previous-1e-9 && frame <= frameCount-1+1e-9);
  previous = frame;
}
assert.equal(frameAt(0), 0);
assert.equal(frameAt(1), frameCount-1);

// Complete the two neighboring decodes out of order. Only a display tick may
// paint, even if multiple images finish decoding between wheel events.
const requests = new Map();
globalThis.Image = class { set src(index) { requests.set(index, this); } };
const paints = [];
let wakeups = 0;
const context = {globalAlpha:1, drawImage() {}};
const player = framePlayer({width:1120,height:630,getContext:()=>context},
  frameCount, i=>i, frame=>paints.push(frame), ()=>wakeups++);
player.seek(80.25);
await requests.get(81).onload();
await requests.get(80).onload();
assert(wakeups>0);
assert.equal(paints.length,0);
player.seek(80.25);
player.seek(80.25);
player.seek(80.125);
assert.deepEqual(paints,[80.25,80.125]);
const before = wakeups;
player.destroy();
await requests.get(79).onload();
assert.equal(wakeups,before);
console.log('Verified continuous camera velocity at all six handoffs, monotonic travel and display-timed frame blending.');
