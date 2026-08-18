import { describe, it, expect } from "vitest";
import { PNG } from "pngjs";
import { diffImages, getPngDimensions } from "@/server/screenshot/diff-images";

function solidPng(width: number, height: number, [r, g, b]: [number, number, number]): Buffer {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) {
    png.data[i * 4] = r;
    png.data[i * 4 + 1] = g;
    png.data[i * 4 + 2] = b;
    png.data[i * 4 + 3] = 255;
  }
  return PNG.sync.write(png);
}

function solidPngWithSpot(width: number, height: number): Buffer {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) {
    png.data[i * 4] = 255;
    png.data[i * 4 + 1] = 255;
    png.data[i * 4 + 2] = 255;
    png.data[i * 4 + 3] = 255;
  }
  const spots: [number, number][] = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ];
  for (const [x, y] of spots) {
    const idx = (width * y + x) * 4;
    png.data[idx] = 255;
    png.data[idx + 1] = 0;
    png.data[idx + 2] = 0;
    png.data[idx + 3] = 255;
  }
  return PNG.sync.write(png);
}

describe("diffImages", () => {
  it("reports 0% difference for identical images", () => {
    const image = solidPng(10, 10, [255, 255, 255]);
    const result = diffImages(image, image);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.diffPixelCount).toBe(0);
      expect(result.diffPercentage).toBe(0);
    }
  });

  it("detects a real pixel difference between two images", () => {
    const baseline = solidPng(10, 10, [255, 255, 255]);
    const candidate = solidPngWithSpot(10, 10);
    const result = diffImages(baseline, candidate);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.diffPixelCount).toBeGreaterThan(0);
      expect(result.diffPercentage).toBeGreaterThan(0);
      expect(result.diffImage.length).toBeGreaterThan(0);
    }
  });

  it("fails with a clear error when dimensions don't match", () => {
    const baseline = solidPng(10, 10, [255, 255, 255]);
    const candidate = solidPng(20, 20, [255, 255, 255]);
    const result = diffImages(baseline, candidate);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/dimensions don't match/i);
    }
  });

  it("fails cleanly for a non-PNG buffer", () => {
    const notAPng = Buffer.from("this is not a png file");
    const result = diffImages(notAPng, notAPng);

    expect(result.ok).toBe(false);
  });
});

describe("getPngDimensions", () => {
  it("reads dimensions from a valid PNG", () => {
    const image = solidPng(42, 17, [0, 0, 0]);
    expect(getPngDimensions(image)).toEqual({ width: 42, height: 17 });
  });

  it("returns null for an invalid PNG", () => {
    expect(getPngDimensions(Buffer.from("not a png"))).toBeNull();
  });
});
