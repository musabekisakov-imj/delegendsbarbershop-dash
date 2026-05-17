import { useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { fileToDataUrl, dataUrlBytes } from '../../lib/image-upload';

// ─── ServicePhotoField ─────────────────────────────────────
// Upload a file from disk OR paste a URL. Uploaded files are downscaled to
// 1200px and re-encoded as JPEG in the browser before being stored as a
// data-URL — otherwise a single phone photo would blow the localStorage
// quota (~5MB total per origin).
export function ServicePhotoField({
  imageUrl,
  onChange,
}: {
  imageUrl: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlField, setShowUrlField] = useState(false);
  const hasImage = !!imageUrl;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    // Keep raw source sane — ~15MB cap on the input side. Compression brings
    // the stored size down to under 250KB regardless.
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image too large (max 15MB)');
      return;
    }
    setIsUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file, { maxSide: 1200, quality: 0.82 });
      const kb = Math.round(dataUrlBytes(dataUrl) / 1024);
      onChange(dataUrl);
      toast.success(`Photo uploaded (${kb} KB)`);
    } catch (err) {
      toast.error((err as Error).message ?? 'Upload failed');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <PhotoIcon className="h-3.5 w-3.5" />
        Photo
      </Label>

      {/* Hidden native file input — the custom button triggers it. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="mt-1.5 space-y-2">
        {/* Upload / replace button */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={hasImage ? 'outline' : 'default'}
            size="sm"
            loading={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            <PhotoIcon className="h-4 w-4 mr-1.5" />
            {hasImage ? 'Replace photo' : 'Upload photo'}
          </Button>

          {hasImage && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange('')}
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Remove
            </Button>
          )}

          <button
            type="button"
            onClick={() => setShowUrlField(v => !v)}
            className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            {showUrlField ? 'Hide URL field' : 'Paste URL instead'}
          </button>
        </div>

        {/* Optional: paste a URL directly (for Unsplash/CDN). Hidden by default. */}
        {showUrlField && (
          <Input
            value={imageUrl.startsWith('data:') ? '' : imageUrl}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://images.unsplash.com/…"
            className="font-mono text-xs"
          />
        )}

        <p className="text-xs text-muted-foreground">
          {hasImage
            ? 'Shown as the hero image on the service card.'
            : 'Upload from your device — auto-resized to 1200px. Or paste a URL.'}
        </p>
      </div>
    </div>
  );
}
