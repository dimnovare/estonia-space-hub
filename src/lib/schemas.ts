import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
  inviteCode: z.string().optional(),
}).refine(d => d.password === d.confirmPassword, {
  message: "PASSWORDS_DONT_MATCH", path: ["confirmPassword"],
});

export const bookingContactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  notes: z.string().max(500).optional(),
});

export const bookingDetailsSchema = z.object({
  date: z.string().min(1),
  duration: z.string().min(1),
});

export const profileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7).optional().or(z.literal("")),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "PASSWORDS_DONT_MATCH", path: ["confirmPassword"],
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type BookingContactForm = z.infer<typeof bookingContactSchema>;
export type BookingDetailsForm = z.infer<typeof bookingDetailsSchema>;
export type ProfileForm = z.infer<typeof profileSchema>;
export type PasswordForm = z.infer<typeof passwordSchema>;
