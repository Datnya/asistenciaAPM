export function clampEvidencePan(stage: { width: number; height: number }, image: { width: number; height: number }, zoom: number, x: number, y: number) {
  if (zoom <= 1 || !stage.width || !stage.height || !image.width || !image.height) return { x: 0, y: 0 };
  const fit = Math.min(stage.width / image.width, stage.height / image.height);
  const maxX = Math.max(0, (image.width * fit * zoom - stage.width) / 2);
  const maxY = Math.max(0, (image.height * fit * zoom - stage.height) / 2);
  return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
}
