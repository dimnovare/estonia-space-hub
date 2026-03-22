import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Vigane e-posti aadress"),
  password: z.string().min(8, "Parool peab olema vähemalt 8 tähemärki"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nimi peab olema vähemalt 2 tähemärki"),
  email: z.string().email("Vigane e-posti aadress"),
  password: z.string().min(8, "Parool peab olema vähemalt 8 tähemärki"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Paroolid ei kattu", path: ["confirmPassword"],
});

export const bookingContactSchema = z.object({
  name: z.string().min(2, "Nimi on kohustuslik"),
  email: z.string().email("Vigane e-posti aadress"),
  phone: z.string().min(7, "Telefon on kohustuslik"),
  notes: z.string().max(500).optional(),
});

export const bookingDetailsSchema = z.object({
  date: z.string().min(1, "Kuupäev on kohustuslik"),
  duration: z.string().min(1, "Periood on kohustuslik"),
});

export const profileSchema = z.object({
  name: z.string().min(2, "Nimi on kohustuslik"),
  phone: z.string().min(7).optional().or(z.literal("")),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Praegune parool on kohustuslik"),
  newPassword: z.string().min(8, "Uus parool peab olema vähemalt 8 tähemärki"),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Paroolid ei kattu", path: ["confirmPassword"],
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type BookingContactForm = z.infer<typeof bookingContactSchema>;
export type BookingDetailsForm = z.infer<typeof bookingDetailsSchema>;
export type ProfileForm = z.infer<typeof profileSchema>;
export type PasswordForm = z.infer<typeof passwordSchema>;
