/**
 * Client-side image compression for localStorage-friendly storage.
 *
 * localStorage has ~5MB per origin. A raw phone photo is 3-8MB and base64
 * encoding bloats it by 33%, so uploading even one untouched photo can blow
 * the quota. We downscale to `maxSide` px and re-encode as JPEG at `quality`.
 *
 *   5MB JPEG  → ~120KB data URL after this pipeline
 *   Good enough for product catalogue thumbnails
 *
 * Returns a data URL string on success, rejects on invalid file / read error.
 */
export async function fileToDataUrl(
  file: File,
  opts: { maxSide?: number; quality?: number } = {},
): Promise<string> {
  const maxSide = opts.maxSide ?? 1200;
  const quality = opts.quality ?? 0.82;

  if (!file.type.startsWith('image/')) {
    throw new Error('Not an image file');
  }

  // Read file → HTMLImageElement so we can draw it to canvas.
  const dataUrl = await readAsDataUrl(file);
  const img = await loadImage(dataUrl);

  // Compute target dimensions — preserve aspect ratio.
  let { width, height } = img;
  if (width > maxSide || height > maxSide) {
    const ratio = Math.min(maxSide / width, maxSide / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Draw + re-encode. JPEG instead of PNG for 10× size savings on photos.
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', quality);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = src;
  });
}

/** Rough byte-size of a data URL. Useful for quota warnings. */
export function dataUrlBytes(dataUrl: string): number {
  // Strip the "data:image/...;base64," prefix, then base64 → bytes (3/4 ratio).
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx < 0) return dataUrl.length;
  const b64 = dataUrl.slice(commaIdx + 1);
  return Math.ceil((b64.length * 3) / 4);
}
