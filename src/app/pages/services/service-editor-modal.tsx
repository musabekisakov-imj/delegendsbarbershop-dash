import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { ScissorsIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { cn } from '../../components/ui/utils';
import type { Category } from '../../types';
import { ServicePhotoField } from './service-photo-field';
import { StaffMultiSelect } from './staff-multi-select';
import { useT } from '../../hooks/use-t';
import { usePriceFormatter } from '../../hooks/use-price-formatter';
import { getCategoryColor, colorForCategoryFallback } from '../../lib/tokens';
import { MOTION_DUR, MOTION_EASE } from '../../lib/tokens';
import { pluralKey } from '../../i18n/plural';
import { useLanguageStore } from '../../store/language-store';

// Responsive <img> attrs for Unsplash URLs — serves 400/800/1200 widths instead of always 800.
// For non-Unsplash URLs we just return a single src untouched.
function responsiveImg(url: string) {
  const isUnsplash = /^https:\/\/images\.unsplash\.com\//.test(url);
  if (!isUnsplash) return { src: url };
  let base: string;
  try {
    const u = new URL(url);
    u.searchParams.delete('w');
    base = u.toString();
  } catch {
    return { src: url };
  }
  const sep = base.includes('?') ? '&' : '?';
  return {
    src: `${base}${sep}w=800`,
    srcSet: [400, 800, 1200].map(w => `${base}${sep}w=${w} ${w}w`).join(', '),
    sizes: '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw',
  };
}

export interface ServiceForm {
  name: string;
  price: string;
  duration: string;
  categoryId: string;
  description: string;
  imageUrl: string;
  staffIds: string[];
  prepMinutes: string;
  cleanupMinutes: string;
  isPublic: boolean;
}

export const emptyForm: ServiceForm = {
  name: '',
  price: '',
  duration: '',
  categoryId: '',
  description: '',
  imageUrl: '',
  staffIds: [],
  prepMinutes: '',
  cleanupMinutes: '',
  isPublic: true,
};

// ─── ServiceEditorModal ─────────────────────────────────────────
export function ServiceEditorModal({
  open,
  onOpenChange,
  mode,
  form,
  setForm,
  categories,
  isSubmitting,
  onSave,
  officeId,
  bookingCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  form: ServiceForm;
  setForm: (f: ServiceForm) => void;
  categories: Category[];
  isSubmitting: boolean;
  onSave: () => void;
  officeId?: string;
  bookingCount?: number;
}) {
  const t = useT();
  const fmt = usePriceFormatter();
  const language = useLanguageStore(s => s.language);
  const [prepOpen, setPrepOpen] = useState(false);

  const initial = (form.name.charAt(0) || 'S').toUpperCase();

  const handleCategoryChange = (categoryId: string) => {
    setForm({ ...form, categoryId });
    localStorage.setItem('lastUsedCategoryId', categoryId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MOTION_DUR.base, ease: MOTION_EASE }}
        >
          <DialogHeader>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {mode === 'create' ? t('services.editor.create.title') : t('services.editor.edit.title')}
            </p>
            <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
              {mode === 'create' ? t('services.editor.create.title') : form.name || t('services.editor.edit.title')}
            </DialogTitle>
          </DialogHeader>

          {/* Hero photo preview */}
          <div className={cn(
            'relative aspect-[5/2] rounded-xl overflow-hidden mt-4',
            !form.imageUrl && 'bg-gradient-to-br from-muted to-accent/60 dark:from-muted dark:to-accent/20 border border-border',
          )}>
            {form.imageUrl ? (
              <img
                {...responsiveImg(form.imageUrl)}
                alt="preview"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-foreground/15 font-black leading-none select-none text-[6rem]">
                    {initial}
                  </span>
                </div>
                <ScissorsIcon className="absolute -bottom-2 -right-2 h-24 w-24 text-foreground/10 rotate-12" />
              </>
            )}
            {form.imageUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />}
            {form.price && (
              <div className="absolute top-3 right-3 inline-flex items-center rounded-full bg-white dark:bg-black/80 px-3 py-1 text-sm font-bold tabular-nums text-foreground shadow-sm">
                {fmt(parseFloat(form.price) || 0)}
              </div>
            )}
          </div>

          <div className="space-y-4 mt-4">
            {/* Name */}
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t('services.editor.fields.name')}
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('services.serviceNamePlaceholder')}
                className="mt-1.5"
                autoFocus
              />
            </div>

            {/* Category */}
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t('services.editor.fields.category')}
              </Label>
              <Select value={form.categoryId} onValueChange={handleCategoryChange}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={t('services.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full shrink-0', getCategoryColor(cat.color ?? colorForCategoryFallback(cat.id)).dot)} />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price + Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t('services.editor.fields.price')}
                </Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="35"
                  step="0.01"
                  min="0"
                  className="mt-1.5 tabular-nums"
                />
              </div>
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t('services.editor.fields.duration')}
                </Label>
                <Input
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  placeholder="30"
                  step="5"
                  min="5"
                  className="mt-1.5 tabular-nums"
                />
              </div>
            </div>

            {/* Staff multi-select */}
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t('services.editor.fields.staff')}
              </Label>
              <div className="mt-1.5">
                <StaffMultiSelect
                  value={form.staffIds}
                  onChange={(ids) => setForm({ ...form, staffIds: ids })}
                  officeId={officeId}
                />
              </div>
            </div>

            {/* Prep & Cleanup collapsible */}
            <div>
              <button
                type="button"
                onClick={() => setPrepOpen(v => !v)}
                className="flex w-full items-center justify-between rounded-md px-0 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{t('services.editor.fields.prepCleanup.toggle')}</span>
                <ChevronDownIcon className={cn('h-4 w-4 transition-transform', prepOpen && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {prepOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: MOTION_DUR.base, ease: MOTION_EASE }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {t('services.editor.fields.prep')}
                        </Label>
                        <Input
                          type="number"
                          value={form.prepMinutes}
                          onChange={(e) => setForm({ ...form, prepMinutes: e.target.value })}
                          placeholder="0"
                          step="5"
                          min="0"
                          className="mt-1.5 tabular-nums"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {t('services.editor.fields.cleanup')}
                        </Label>
                        <Input
                          type="number"
                          value={form.cleanupMinutes}
                          onChange={(e) => setForm({ ...form, cleanupMinutes: e.target.value })}
                          placeholder="0"
                          step="5"
                          min="0"
                          className="mt-1.5 tabular-nums"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Visibility switch */}
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground cursor-pointer">
                  {t('services.editor.fields.visibility')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {form.isPublic ? t('services.editor.visibility.public') : t('services.editor.visibility.private')}
                </p>
              </div>
              <Switch
                checked={form.isPublic}
                onCheckedChange={(checked) => setForm({ ...form, isPublic: checked })}
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t('services.editor.fields.description')}
              </Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('services.editor.fields.description.placeholder')}
                className="mt-1.5"
                rows={3}
              />
            </div>

            {/* Photo field */}
            <ServicePhotoField
              imageUrl={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
            />

            {/* Edit-mode popularity readout */}
            {mode === 'edit' && bookingCount !== undefined && (
              <p className="text-xs text-muted-foreground">
                {t(`services.editor.popularity.bookingsCount.${pluralKey(bookingCount, language)}`, { count: bookingCount })}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('services.editor.cancel')}
              </Button>
              <Button onClick={onSave} disabled={isSubmitting}>
                {t('services.editor.save')}
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
