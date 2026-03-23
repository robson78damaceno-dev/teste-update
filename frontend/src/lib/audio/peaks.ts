/**
 * Downsampling de samples para waveform: blocos de N samples -> min/max.
 * Nao desenha sample a sample para nao travar o main thread.
 */

export type MinMax = { min: number; max: number; range: number };

export function getMinMax(
  data: Float32Array,
  startIndex: number,
  length: number
): MinMax {
  let min = 1;
  let max = -1;
  const end = Math.min(startIndex + length, data.length);
  for (let i = startIndex; i < end; i += 1) {
    const v = data[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min > max) {
    min = 0;
    max = 0;
  }
  return { min, max, range: max - min };
}

export function getPeaks(
  channelData: Float32Array,
  width: number
): { min: Float32Array; max: Float32Array } {
  const min = new Float32Array(width);
  const max = new Float32Array(width);
  const step = channelData.length / width;

  for (let i = 0; i < width; i += 1) {
    const start = Math.floor(i * step);
    const len = Math.max(1, Math.floor(step));
    const mm = getMinMax(channelData, start, len);
    min[i] = mm.min;
    max[i] = mm.max;
  }

  return { min, max };
}
