import { useState } from 'react';
import { ArrowDownTrayIcon, KeyIcon, TrashIcon } from '@heroicons/react/24/outline';
import { motion, useReducedMotion, useAnimate } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useT } from '../../hooks/use-t';
import { cn } from '../../components/ui/utils';
import { toast } from 'sonner';
import { MOTION_EASE } from '../../lib/tokens';
import type { Tenant } from '../../types';

interface SectionProps {
  tenant: Tenant;
  onUpdate: (patch: Partial<Tenant>) => void;
}

export function AdvancedSection({ tenant }: SectionProps) {
  const t = useT();
  const [confirmText, setConfirmText] = useState('');
  const reduceMotion = useReducedMotion();
  const [deleteRef, animateDelete] = useAnimate();

  const exportData = () => {
    const dump: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('barberpro_')) continue;
      const raw = localStorage.getItem(key);
      try {
        dump[key] = raw ? JSON.parse(raw) : null;
      } catch {
        dump[key] = raw;
      }
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tenant.displayName ?? tenant.name ?? 'shop'}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('settings.advanced.exportDataSuccess'));
  };

  const deleteShop = () => {
    if (confirmText.trim() !== tenant.name) {
      if (!reduceMotion) animateDelete(deleteRef.current, { x: [0, -6, 6, -6, 6, 0] }, { duration: 0.35 });
      toast.error(t('settings.advanced.deleteShopMismatch'));
      return;
    }
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('barberpro_')) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    toast.success(t('settings.advanced.deleteShopSuccess'));
    window.location.reload();
  };

  return (
    <div className="space-y-5">
      <motion.div
        className="rounded-xl border-2 border-rose-200 dark:border-rose-500/30 bg-rose-50/40 dark:bg-rose-500/[0.04] px-5 py-4"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: MOTION_EASE }}
      >
        <h2 className="text-[15px] font-semibold tracking-tight text-rose-700 dark:text-rose-400">
          {t('settings.advanced.dangerZone')}
        </h2>
        <p className="mt-0.5 text-[12px] text-rose-700/80 dark:text-rose-400/80">
          {t('settings.advanced.dangerZoneHint')}
        </p>
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: MOTION_EASE, delay: 0.06 }}
      >
        <ActionCard
          icon={ArrowDownTrayIcon}
          title={t('settings.advanced.exportData')}
          description={t('settings.advanced.exportDataHint')}
          cta={t('settings.advanced.exportDataCta')}
          onClick={exportData}
        />
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: MOTION_EASE, delay: 0.12 }}
      >
        <ActionCard
          icon={KeyIcon}
          title={t('settings.advanced.apiKeys')}
          description={t('settings.advanced.apiKeysHint')}
          cta={t('settings.comingSoon')}
          disabled
        />
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: MOTION_EASE, delay: 0.18 }}
      >
        <section className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-card overflow-hidden">
          <header className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-rose-200 dark:border-rose-500/30">
            <TrashIcon className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-[14px] font-semibold tracking-tight text-rose-700 dark:text-rose-400">
                {t('settings.advanced.deleteShop')}
              </h3>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{t('settings.advanced.deleteShopHint')}</p>
            </div>
          </header>
          <div className="px-5 py-4 space-y-3">
            <Label className="text-[12px] font-medium text-foreground">
              {t('settings.advanced.deleteShopType').replace('{name}', tenant.name)}
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={tenant.name}
              className="border-rose-200 dark:border-rose-500/30"
            />
            <div ref={deleteRef}>
              <Button
                onClick={deleteShop}
                disabled={confirmText.trim() !== tenant.name}
                className={cn(
                  'bg-rose-600 hover:bg-rose-700 text-white',
                  confirmText.trim() !== tenant.name && 'opacity-50',
                )}
              >
                <TrashIcon className="h-4 w-4 mr-1.5" />
                {t('settings.advanced.deleteShopConfirm')}
              </Button>
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  cta,
  onClick,
  disabled,
}: {
  icon: typeof ArrowDownTrayIcon;
  title: string;
  description: string;
  cta: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.section
      className="rounded-xl border border-border bg-card overflow-hidden"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      <div className="flex items-start gap-3 px-5 py-4">
        <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold tracking-tight text-foreground">{title}</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClick} disabled={disabled}>
          {cta}
        </Button>
      </div>
    </motion.section>
  );
}
