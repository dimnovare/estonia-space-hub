import { z } from "zod";

// Factory patterns for localized validation messages

export const createLoginSchema = (t: (k: string) => string) => z.object({
  email: z.string().email(t("error.invalidEmail") || "Invalid email"),
  password: z.string().min(8, t("error.passwordMin") || "Password must be at least 8 characters"),
});

export const createRegisterSchema = (t: (k: string) => string) => z.object({
  name: z.string().min(2, t("error.nameMin") || "Name required"),
  email: z.string().email(t("error.invalidEmail") || "Invalid email"),
  password: z.string().min(8, t("error.passwordMin") || "Min 8 characters"),
  confirmPassword: z.string(),
  inviteCode: z.string().optional(),
}).refine(d => d.password === d.confirmPassword, {
  message: t("error.passwordMismatch") || "Passwords don't match",
  path: ["confirmPassword"],
});

export const createBookingContactSchema = (t: (k: string) => string) => z.object({
  name: z.string().min(2, t("error.nameMin") || "Name must be at least 2 characters"),
  email: z.string().email(t("error.invalidEmail") || "Invalid email address"),
  phone: z.string().min(7, t("error.phoneMin") || "Phone must be at least 7 digits"),
  notes: z.string().max(500, t("error.notesTooLong") || "Notes too long").optional(),
});

export const createProfileSchema = (t: (k: string) => string) => z.object({
  name: z.string().min(2, t("error.nameMin") || "Name required"),
  phone: z.string().min(7, t("error.phoneMin") || "Phone min 7 digits").optional().or(z.literal("")),
});

export const createPasswordSchema = (t: (k: string) => string) => z.object({
  currentPassword: z.string().min(1, t("error.required") || "Required"),
  newPassword: z.string().min(8, t("error.passwordMin") || "Min 8 characters"),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: t("error.passwordMismatch") || "Passwords don't match",
  path: ["confirmPassword"],
});

export const bookingDetailsSchema = z.object({
  date: z.string().min(1),
  duration: z.string().min(1),
});

// Backward-compatible exports (fallback to key as message)
export const loginSchema = createLoginSchema(k => k);
export const registerSchema = createRegisterSchema(k => k);
export const bookingContactSchema = createBookingContactSchema(k => k);
export const profileSchema = createProfileSchema(k => k);
export const passwordSchema = createPasswordSchema(k => k);

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type BookingContactForm = z.infer<typeof bookingContactSchema>;
export type BookingDetailsForm = z.infer<typeof bookingDetailsSchema>;
export type ProfileForm = z.infer<typeof profileSchema>;
export type PasswordForm = z.infer<typeof passwordSchema>;
