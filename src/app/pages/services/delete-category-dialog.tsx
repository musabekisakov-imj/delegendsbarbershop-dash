import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { Category } from '../../types';

// ─── DeleteCategoryDialog ────────────────────────────────────────────────────

interface DeleteCategoryDialogProps {
  open: boolean;
  category: Category | null;
  serviceCount: number;
  otherCategories: Category[];
  onMove: (targetCategoryId: string) => void;
  onDeleteServices: () => void;
  onCancel: () => void;
}

export function DeleteCategoryDialog({
  open,
  category,
  serviceCount,
  otherCategories,
  onMove,
  onDeleteServices,
  onCancel,
}: DeleteCategoryDialogProps) {
  const [targetId, setTargetId] = useState<string>('');

  if (!category) return null;

  const hasServices = serviceCount > 0;
  const canMove = otherCategories.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-rose-500 shrink-0" />
            Delete &ldquo;{category.name}&rdquo;?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {hasServices && (
            <p className="text-sm text-muted-foreground">
              {serviceCount} service{serviceCount === 1 ? '' : 's'} will be affected.
            </p>
          )}

          <div className="space-y-2">
            {/* Option 1 — move services to another category */}
            {hasServices && canMove && (
              <div className="flex items-center gap-2">
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger className="flex-1 h-8 text-sm">
                    <SelectValue placeholder="Pick a category…" />
                  </SelectTrigger>
                  <SelectContent>
                    {otherCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!targetId}
                  onClick={() => onMove(targetId)}
                >
                  Move services
                </Button>
              </div>
            )}

            {/* Option 2 — delete services along with the category */}
            {hasServices && (
              <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={onDeleteServices}
              >
                Delete services too
              </Button>
            )}

            {/* No-services case — simple confirm */}
            {!hasServices && (
              <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={onDeleteServices}
              >
                Delete category
              </Button>
            )}

            {/* Option 3 — cancel */}
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
