import { z } from 'zod';
import { isValidBirthDate, isFutureDateIstanbul, isValidDateOnly } from '../../lib/dateGuards';

export const clientSchema = z.object({
  fileNumber: z
    .string()
    .trim()
    .max(32, 'Dosya no en fazla 32 karakter')
    .optional()
    .or(z.literal('')),
  firstName: z
    .string()
    .trim()
    .min(1, 'Ad zorunlu')
    .max(80, 'Ad en fazla 80 karakter')
    .refine((v) => !/[\u0000-\u001f\u007f]/.test(v), 'Geçersiz karakter'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Soyad zorunlu')
    .max(80, 'Soyad en fazla 80 karakter')
    .refine((v) => !/[\u0000-\u001f\u007f]/.test(v), 'Geçersiz karakter'),
  birthDate: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) => {
        if (!v) return true;
        if (!isValidDateOnly(v)) return false;
        if (!isValidBirthDate(v)) return false;
        if (isFutureDateIstanbul(v)) return false;
        return true;
      },
      { message: 'Doğum tarihi geçersiz veya ileri tarih' },
    ),
  phone: z
    .string()
    .trim()
    .max(32, 'Telefon en fazla 32 karakter')
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || !/[\u0000-\u001f\u007f]/.test(v), 'Geçersiz karakter'),
  email: z
    .string()
    .trim()
    .max(254)
    .optional()
    .or(z.literal(''))
    .refine(
      (v) => {
        if (!v) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      { message: 'E-posta geçersiz' },
    ),
  profession: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || !/[\u0000-\u001f\u007f]/.test(v), 'Geçersiz karakter'),
  education: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || !/[\u0000-\u001f\u007f]/.test(v), 'Geçersiz karakter'),
  status: z.enum(['active', 'archived']).optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
