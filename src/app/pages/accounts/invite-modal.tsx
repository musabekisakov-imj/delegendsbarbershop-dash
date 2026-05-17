import { useEffect, useRef, useState } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { motion } from 'motion/react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Field } from '../../components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { cn } from '../../components/ui/utils';
import { AVATAR_GRADIENTS, hashToIndex, MOTION_DUR, MOTION_EASE } from '../../lib/tokens';
import { fileToDataUrl } from '../../lib/image-upload';
import type { Account, StaffRole, AccountStatus } from '../../types';

const PHONE_RE = /^\+?[1-9]\d{1,14}$/;

export interface InviteModalData {
  email: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  officeIds: string[];
  avatarUrl?: string;
  status?: AccountStatus;
  phone?: string;
  positionTitle?: string;
  startDate?: string;
}

interface InviteModalProps {
  open: boolean;
  account: Account | null;
  offices: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (data: InviteModalData) => void;
  submitting: boolean;
  labels: {
    editLabel: string;
    inviteLabel: string;
    newMember: string;
    firstName: string;
    lastName: string;
    email: string;
    emailHint: string;
    role: string;
    offices: string;
    officesHint: string;
    phone: string;
    position: string;
    startDate: string;
    uploadPhoto: string;
    replacePhoto: string;
    removePhoto: string;
    photoHint: string;
    cancel: string;
    save: string;
    send: string;
    roleDescriptions: Record<StaffRole, string>;
    roleOptions: Record<StaffRole, string>;
    validationRequired: string;
    validationPhone: string;
    validationOffices: string;
  };
}

export function InviteModal({
  open, account, offices, onClose, onSubmit, submitting, labels,
}: InviteModalProps) {
  const isEdit = !!account;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('receptionist');
  const [officeIds, setOfficeIds] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [phone, setPhone] = useState('');
  const [positionTitle, setPositionTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFirstName(account?.firstName ?? '');
      setLastName(account?.lastName ?? '');
      setEmail(account?.email ?? '');
      setRole(account?.role ?? 'receptionist');
      setOfficeIds(account?.officeIds ?? offices.map(o => o.id));
      setAvatarUrl(account?.avatarUrl);
      setPhone(account?.phone ?? '');
      setPositionTitle(account?.positionTitle ?? '');
      setStartDate(account?.startDate ? account.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    }
  }, [open, account, offices]);

  const toggleOffice = (id: string) =>
    setOfficeIds(prev => prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]);

  const handleAvatarFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error('Image too large (max 15MB)'); return; }
    setUploadingAvatar(true);
    try {
      const dataUrl = await fileToDataUrl(file, { maxSide: 512, quality: 0.85 });
      setAvatarUrl(dataUrl);
    } catch (err) {
      toast.error((err as Error).message ?? 'Upload failed');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error(labels.validationRequired);
      return;
    }
    if (phone.trim() && !PHONE_RE.test(phone.trim())) {
      toast.error(labels.validationPhone);
      return;
    }
    if (officeIds.length === 0) {
      toast.error(labels.validationOffices);
      return;
    }
    onSubmit({
      firstName, lastName, email, role, officeIds, avatarUrl,
      phone: phone.trim() || undefined,
      positionTitle: positionTitle.trim() || undefined,
      startDate: startDate || undefined,
    });
  };

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  const previewGradient = AVATAR_GRADIENTS[hashToIndex(account?.id ?? email, AVATAR_GRADIENTS.length)];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MOTION_DUR.base, ease: MOTION_EASE }}
        >
          <DialogHeader>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {isEdit ? labels.editLabel : labels.inviteLabel}
            </p>
            <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
              {isEdit ? `${account.firstName} ${account.lastName}` : labels.newMember}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar preview" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className={cn(
                    'flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-white',
                    previewGradient,
                  )}>
                    {initials || '?'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleAvatarFile(e.target.files?.[0])}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={avatarUrl ? 'outline' : 'default'}
                    loading={uploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <PhotoIcon className="h-4 w-4 mr-1.5" />
                    {avatarUrl ? labels.replacePhoto : labels.uploadPhoto}
                  </Button>
                  {avatarUrl && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setAvatarUrl(undefined)}>
                      {labels.removePhoto}
                    </Button>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{labels.photoHint}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={labels.firstName} required>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
              </Field>
              <Field label={labels.lastName} required>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
              </Field>
            </div>

            <Field label={labels.email} required hint={isEdit ? labels.emailHint : undefined}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@barberpro.com"
                disabled={isEdit}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={labels.phone}>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                />
              </Field>
              <Field label={labels.position}>
                <Input
                  value={positionTitle}
                  onChange={(e) => setPositionTitle(e.target.value)}
                  placeholder="Senior Barber"
                />
              </Field>
            </div>

            <Field label={labels.startDate}>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>

            <Field label={labels.role} required hint={labels.roleDescriptions[role]}>
              <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['owner', 'manager', 'receptionist', 'barber'] as StaffRole[]).map(r => (
                    <SelectItem key={r} value={r}>{labels.roleOptions[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label={labels.offices} required hint={labels.officesHint}>
              <div className="flex flex-wrap gap-2">
                {offices.map(o => {
                  const active = officeIds.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggleOffice(o.id)}
                      className={cn(
                        'text-sm px-3 py-1.5 rounded-md border transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-muted-foreground border-border hover:bg-accent',
                      )}
                    >
                      {o.name}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>{labels.cancel}</Button>
              <Button type="submit" loading={submitting}>
                {isEdit ? labels.save : labels.send}
              </Button>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
