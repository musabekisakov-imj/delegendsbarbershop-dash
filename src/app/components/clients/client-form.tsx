import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Field } from '../ui/field';
import { clientFormSchema, type ClientFormValues } from '../../lib/schemas';
import { cn } from '../ui/utils';
import type { Gender } from '../../types';

interface ClientFormProps {
  defaultValues?: Partial<ClientFormValues>;
  onSubmit: (values: ClientFormValues) => void;
  onCancel: () => void;
  submitLabel: string;
  isSubmitting?: boolean;
}

const EMPTY: ClientFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  notes: '',
};

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export function ClientForm({
  defaultValues, onSubmit, onCancel, submitLabel, isSubmitting = false,
}: ClientFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting: rhfSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: { ...EMPTY, ...defaultValues },
    mode: 'onBlur',
  });

  const submitting = isSubmitting || rhfSubmitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" required error={errors.firstName?.message}>
          <Input {...register('firstName')} placeholder="John" aria-invalid={!!errors.firstName} />
        </Field>
        <Field label="Last name" required error={errors.lastName?.message}>
          <Input {...register('lastName')} placeholder="Doe" aria-invalid={!!errors.lastName} />
        </Field>
      </div>
      <Field label="Email" required error={errors.email?.message}>
        <Input type="email" {...register('email')} placeholder="john@example.com" aria-invalid={!!errors.email} />
      </Field>
      <Field label="Phone" required error={errors.phone?.message}>
        <Input {...register('phone')} placeholder="+1 (555) 123-4567" aria-invalid={!!errors.phone} />
      </Field>

      <Field label="Gender" error={errors.gender?.message}>
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <div role="radiogroup" className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
              {GENDER_OPTIONS.map(opt => {
                const active = field.value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => field.onChange(active ? undefined : opt.value)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                      active
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        />
      </Field>

      <Field label="Notes" error={errors.notes?.message}>
        <Textarea {...register('notes')} placeholder="Any preferences or notes…" rows={2} />
      </Field>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1" disabled={submitting}>
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
