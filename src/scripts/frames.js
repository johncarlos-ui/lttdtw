// Keep decoded frames near the playhead. A fast jump prioritizes its destination.
export function framePlayer(canvas, frameCount, source, onDraw, requestPaint) {
  const context = canvas.getContext('2d', { alpha: false });
  const frames = new Map();
  const pending = new Set();
  const failed = new Set();
  let current = -1;
  let drawn = -1;
  let stopped = false;
  let work = [];
  let prefetchBase = -1;
  let prefetchDirection = 1;

  function paint() {
    if (!context || !frames.size) return;
    const low = Math.floor(current), high = Math.ceil(current);
    const canBlend = frames.has(low) && frames.has(high);
    const position = canBlend ? current : [...frames.keys()].reduce((closest, i) =>
      Math.abs(i-current) < Math.abs(closest-current) ? i : closest);
    if (position === drawn) return;
    context.drawImage(frames.get(Math.floor(position)), 0, 0, canvas.width, canvas.height);
    const fraction = position - Math.floor(position);
    if (fraction > 0) {
      context.globalAlpha = fraction;
      context.drawImage(frames.get(Math.ceil(position)), 0, 0, canvas.width, canvas.height);
      context.globalAlpha = 1;
    }
    drawn = position;
    onDraw?.(position);
  }
  function pump() {
    while (!stopped && pending.size < 3 && work.length) {
      const index = work.shift();
      if (frames.has(index) || pending.has(index) || failed.has(index)) continue;
      const image = new Image();
      pending.add(index);
      image.decoding = 'async';
      image.onload = async () => {
        // Finish decompression before the display callback that needs the frame.
        if (image.decode) {
          try { await image.decode(); } catch { /* The loaded image can still be drawn. */ }
        }
        pending.delete(index);
        if (stopped) return;
        frames.set(index, image);
        if (drawn<0 || Math.abs(index-current)<=1 || Math.abs(index-current)<Math.abs(drawn-current)) requestPaint();
        if (frames.size > 18) {
          const farthest = [...frames.keys()].sort((a,b)=>Math.abs(b-current)-Math.abs(a-current))[0];
          frames.delete(farthest);
        }
        pump();
      };
      image.onerror = () => {
        pending.delete(index);
        failed.add(index);
        pump();
      };
      image.src = source(index);
    }
  }
  return {
    seek(target) {
      const position = Math.max(0, Math.min(frameCount-1, target));
      if (stopped || !context) return;
      const direction = position === current ? prefetchDirection : current > position ? -1 : 1;
      current = position;
      paint();
      const base = direction > 0 ? Math.floor(position) : Math.ceil(position);
      if (base===prefetchBase && direction===prefetchDirection) return;
      prefetchBase = base;
      prefetchDirection = direction;
      work = [0,1,-1,2,3,-2,4,5,6,7,8].map(offset=>base+direction*offset)
        .filter(i=>i>=0 && i<frameCount);
      pump();
    },
    destroy() { stopped=true; work=[]; frames.clear(); }
  };
}
