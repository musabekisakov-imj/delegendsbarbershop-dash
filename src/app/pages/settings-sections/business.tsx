import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { PencilSquareIcon, PlusIcon, TrashIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { useT } from '../../hooks/use-t';
import { cn } from '../../components/ui/utils';
import { AVATAR_GRADIENTS, hashToIndex, MOTION_EASE } from '../../lib/tokens';
import type { Tenant, Office } from '../../types';

interface SectionProps {
  tenant: Tenant;
  onUpdate: (patch: Partial<Tenant>) => void;
}

/**
 * Business section — three cards: brand identity, contact, locations.
 * All fields auto-save via the parent's useAutoSave (no Save buttons).
 */
export function BusinessSection({ tenant, onUpdate }: SectionProps) {
  const t = useT();
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [creatingOffice, setCreatingOffice] = useState(false);

  return (
    <div className="space-y-5">
      {/* ─── Brand identity ──── */}
      <Card title={t('settings.business.brandIdentity')} delay={0}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('settings.business.businessName')} required>
            <Input
              value={tenant.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="DeLegends Barbershop"
            />
          </Field>
          <Field
            label={t('settings.business.displayName')}
            hint={t('settings.business.displayNameHint')}
          >
            <Input
              value={tenant.displayName ?? ''}
              onChange={(e) => onUpdate({ displayName: e.target.value })}
              placeholder="DeLegends"
            />
          </Field>
        </div>
      </Card>

      {/* ─── Contact ──── */}
      <Card title={t('settings.business.contact')} delay={0.06}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('settings.business.email')} required>
            <Input
              type="email"
              value={tenant.email}
              onChange={(e) => onUpdate({ email: e.target.value })}
              placeholder="contact@delegendsbarbershop.com"
            />
          </Field>
          <Field label={t('settings.business.phone')} required>
            <Input
              type="tel"
              value={tenant.phone}
              onChange={(e) => onUpdate({ phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </Field>
          <Field label={t('settings.business.website')}>
            <Input
              value={tenant.website ?? ''}
              onChange={(e) => onUpdate({ website: e.target.value })}
              placeholder="delegends.com"
            />
          </Field>
          <Field label={t('settings.business.instagram')}>
            <Input
              value={tenant.instagram ?? ''}
              onChange={(e) => onUpdate({ instagram: e.target.value })}
              placeholder="@delegendsbarbershop"
            />
          </Field>
        </div>
      </Card>

      {/* ─── Locations ──── */}
      <Card
        title={t('settings.business.locations')}
        delay={0.12}
        actions={
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
            {tenant.offices.length} {t('settings.business.locationsActive')}
          </span>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tenant.offices.map((office, idx) => (
            <LocationCard
              key={office.id}
              office={office}
              index={idx}
              onEdit={() => setEditingOffice(office)}
            />
          ))}
          <button
            type="button"
            onClick={() => setCreatingOffice(true)}
            className="group flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card px-4 py-8 transition-colors hover:border-foreground/40 hover:bg-accent/40 focus:outline-none focus-visible:border-foreground/40"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted group-hover:bg-accent">
              <PlusIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-[12px] font-medium text-muted-foreground">
              {t('settings.business.addLocation')}
            </span>
          </button>
        </div>
      </Card>

      {/* ─── Edit / Create modal ──── */}
      <LocationEditModal
        open={creatingOffice || !!editingOffice}
        office={editingOffice}
        onClose={() => {
          setEditingOffice(null);
          setCreatingOffice(false);
        }}
        onSave={(office) => {
          if (editingOffice) {
            onUpdate({
              offices: tenant.offices.map((o) => (o.id === office.id ? office : o)),
            });
          } else {
            onUpdate({ offices: [...tenant.offices, office] });
          }
          setEditingOffice(null);
          setCreatingOffice(false);
        }}
        onDelete={
          editingOffice
            ? () => {
                onUpdate({ offices: tenant.offices.filter((o) => o.id !== editingOffice.id) });
                setEditingOffice(null);
              }
            : undefined
        }
      />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────

function Card({
  title,
  actions,
  children,
  delay = 0,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Stagger seconds — cards lift in sequence on first paint. */
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: MOTION_EASE, delay }}
      className="rounded-xl border border-border bg-card"
    >
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border">
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
        {actions}
      </header>
      <div className="px-5 py-4">{children}</div>
    </motion.section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-rose-600 dark:text-rose-400">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function LocationCard({ office, onEdit, index = 0 }: { office: Office; onEdit: () => void; index?: number }) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const grad = AVATAR_GRADIENTS[hashToIndex(office.id, AVATAR_GRADIENTS.length)];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${office.name} ${office.address}`,
  )}`;
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: MOTION_EASE, delay: 0.18 + index * 0.05 }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      className="group relative overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
    >
      {/* Gradient cover with brand circle — replaces the Google Maps iframe
          which was visual noise on the card. Map lives in the edit modal. */}
      <div className={cn('h-20 bg-gradient-to-br relative', grad)}>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={reduceMotion ? false : { scale: 0.85 }}
            animate={{ scale: 1 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 22, delay: 0.22 + index * 0.05 }}
            className="h-9 w-9 rounded-full bg-foreground/85 ring-2 ring-card"
          />
        </div>
        <motion.button
          type="button"
          onClick={onEdit}
          whileHover={reduceMotion ? undefined : { scale: 1.05 }}
          whileTap={reduceMotion ? undefined : { scale: 0.92 }}
          className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-card text-foreground shadow-sm hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label={t('settings.business.editLocation')}
        >
          <PencilSquareIcon className="h-3.5 w-3.5" />
        </motion.button>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[13px] font-semibold text-foreground truncate">{office.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{office.address}</p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowTopRightOnSquareIcon className="h-2.5 w-2.5" />
          {t('settings.business.openInMaps')}
        </a>
      </div>
    </motion.div>
  );
}

function LocationEditModal({
  open,
  office,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  office: Office | null;
  onClose: () => void;
  onSave: (office: Office) => void;
  onDelete?: () => void;
}) {
  const t = useT();
  const emptyOffice = () => ({ id: `office-${Math.random().toString(36).substring(2, 9)}`, name: '', address: '', phone: '', timezone: '' });
  const [draft, setDraft] = useState<Office>(() => office ?? emptyOffice());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(office ?? emptyOffice());
      setShowDeleteConfirm(false);
    }
  }, [open, office]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{office ? t('settings.business.editLocation') : t('settings.business.addLocation')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label={t('settings.business.locationName')} required>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label={t('settings.business.locationAddress')} required>
            <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
          </Field>
          <Field label={t('settings.business.locationPhone')}>
            <Input value={draft.phone ?? ''} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          </Field>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {onDelete && !showDeleteConfirm && (
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
              >
                <TrashIcon className="h-4 w-4 mr-1.5" />
                {t('settings.business.deleteLocation')}
              </Button>
            )}
            {onDelete && showDeleteConfirm && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-rose-600 dark:text-rose-400">
                  {t('settings.business.deleteLocationConfirm')}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDelete}
                  className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                >
                  {t('common.confirm')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (!draft.name.trim() || !draft.address.trim()) return;
                onSave(draft);
              }}
              disabled={!draft.name.trim() || !draft.address.trim()}
            >
              {t('common.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
