import { z } from 'zod';

// Shared zod schemas for form validation. Pairs with react-hook-form's zodResolver
// so fields get typed + validated from a single source of truth.

export const clientFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().min(5, 'Phone number looks too short'),
  gender: z.enum(['male', 'female', 'other']).optional(),
  notes: z.string().optional().default(''),
});

export const serviceFormSchema = z.object({
  name: z.string().trim().min(1, 'Service name is required'),
  categoryId: z.string().min(1, 'Select a category'),
  price: z.coerce.number({ invalid_type_error: 'Enter a price' }).nonnegative('Price must be 0 or more'),
  duration: z.coerce.number({ invalid_type_error: 'Enter duration' }).int('Duration must be whole minutes').positive('Duration must be greater than 0'),
  description: z.string().optional().default(''),
  imageUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

export const newBookingFormSchema = z.object({
  clientId: z.string().min(1, 'Pick a client'),
  serviceId: z.string().min(1, 'Pick a service'),
  staffId: z.string().min(1, 'Pick a staff member'),
  date: z.string().min(1, 'Pick a date'),
  time: z.string().min(1, 'Pick a time'),
  notes: z.string().optional().default(''),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
export type ServiceFormValues = z.infer<typeof serviceFormSchema>;
export type NewBookingFormValues = z.infer<typeof newBookingFormSchema>;
