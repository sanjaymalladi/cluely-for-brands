export function getAdjustedDimensions(
  width: number,
  height: number,
): { width: number; height: number } {
  const maxDim = 1024;
  const minDim = 64;

  const roundToMultipleOf16 = (n: number) => Math.round(n / 16) * 16;

  const aspectRatio = width / height;

  let scaledWidth = width;
  let scaledHeight = height;

  if (width > maxDim || height > maxDim) {
    if (aspectRatio >= 1) {
      scaledWidth = maxDim;
      scaledHeight = Math.round(maxDim / aspectRatio);
    } else {
      scaledHeight = maxDim;
      scaledWidth = Math.round(maxDim * aspectRatio);
    }
  }

  const adjustedWidth = Math.min(
    maxDim,
    Math.max(minDim, roundToMultipleOf16(scaledWidth)),
  );
  const adjustedHeight = Math.min(
    maxDim,
    Math.max(minDim, roundToMultipleOf16(scaledHeight)),
  );

  return { width: adjustedWidth, height: adjustedHeight };
}
