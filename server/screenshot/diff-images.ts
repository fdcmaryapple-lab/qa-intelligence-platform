import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

export interface DiffSuccess {
  ok: true;
  diffPixelCount: number;
  diffPercentage: number;
  diffImage: Buffer;
  width: number;
  height: number;
}

export interface DiffFailure {
  ok: false;
  error: string;
}

export function diffImages(baselineBuffer: Buffer, candidateBuffer: Buffer): DiffSuccess | DiffFailure {
  let baseline: PNG;
  try {
    baseline = PNG.sync.read(baselineBuffer);
  } catch {
    return { ok: false, error: "The baseline image isn't a valid PNG." };
  }

  let candidate: PNG;
  try {
    candidate = PNG.sync.read(candidateBuffer);
  } catch {
    return { ok: false, error: "The uploaded image isn't a valid PNG." };
  }

  if (baseline.width !== candidate.width || baseline.height !== candidate.height) {
    return {
      ok: false,
      error: `Image dimensions don't match: baseline is ${baseline.width}×${baseline.height}, uploaded image is ${candidate.width}×${candidate.height}.`,
    };
  }

  const { width, height } = baseline;
  const diff = new PNG({ width, height });

  const diffPixelCount = pixelmatch(baseline.data, candidate.data, diff.data, width, height, {
    threshold: 0.1,
  });

  const totalPixels = width * height;
  const diffPercentage = totalPixels > 0 ? (diffPixelCount / totalPixels) * 100 : 0;

  return {
    ok: true,
    diffPixelCount,
    diffPercentage,
    diffImage: PNG.sync.write(diff),
    width,
    height,
  };
}

export function getPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    const png = PNG.sync.read(buffer);
    return { width: png.width, height: png.height };
  } catch {
    return null;
  }
}
