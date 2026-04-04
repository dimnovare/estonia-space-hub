import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createLoginSchema, createRegisterSchema, type LoginForm, type RegisterForm } from "@/lib/schemas";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

interface BookingInlineAuthProps {
  onSuccess: () => void;
}

export default function BookingInlineAuth({ onSuccess }: BookingInlineAuthProps) {
  const [view, setView] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const { login, register: authRegister, loginWithGoogle } = useAuth();
  const { inviteCodeRequired } = usePlatformSettings();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(createLoginSchema(t)) });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(createRegisterSchema(t)) });

  const googleEnabled = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isRegister = view === "register";

  const handleLogin = async (data: LoginForm) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success(t("login.successLogin"));
      onSuccess();
    } catch (err: any) {
      const msg = err.message || "";
      toast.error(msg.startsWith("error.") ? t(msg) : msg || t("error.loginFailed"));
    }
    setLoading(false);
  };

  const handleRegister = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await authRegister(data.name, data.email, data.password, data.inviteCode);
      toast.success(t("login.successRegister"));
      onSuccess();
    } catch (err: any) {
      const msg = err.message || "";
      toast.error(msg.startsWith("error.") ? t(msg) : msg || t("error.registerFailed"));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-accent/20 bg-accent/5 p-6">
        <h3 className="font-display text-lg font-semibold text-center">
          {t("booking.authPrompt")}
        </h3>

        {/* View toggle tabs */}
        <div className="mt-4 flex rounded-lg bg-secondary p-1">
          <button
            type="button"
            onClick={() => { setView("login"); loginForm.reset(); registerForm.reset(); }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              !isRegister ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("login.title")}
          </button>
          <button
            type="button"
            onClick={() => { setView("register"); loginForm.reset(); registerForm.reset(); }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isRegister ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("login.register")}
          </button>
        </div>

        {googleEnabled && (
          <>
            <div className="mt-4 flex justify-center google-login-wrapper">
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  if (!credentialResponse.credential) return;
                  setLoading(true);
                  loginWithGoogle(credentialResponse.credential)
                    .then(() => {
                      toast.success(t("login.successLogin"));
                      onSuccess();
                    })
                    .catch((err: any) => {
                      const msg = err.message || "";
                      toast.error(msg.startsWith("error.") ? t(msg) : msg || t("error.googleFailed"));
                    })
                    .finally(() => setLoading(false));
                }}
                onError={() => toast.error(t("error.googleFailed2"))}
                useOneTap={false}
                width={280}
                text="continue_with"
                shape="rectangular"
                theme="outline"
                locale="et"
              />
            </div>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">{t("login.or")}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        {isRegister ? (
          <form key="booking-register" onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="b-reg-name" className="text-xs">{t("login.name")}</Label>
              <Input id="b-reg-name" placeholder={t("login.namePlaceholder")} {...registerForm.register("name")} />
              {registerForm.formState.errors.name && <p className="text-xs text-destructive">{registerForm.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-reg-email" className="text-xs">{t("login.email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="b-reg-email" type="email" placeholder={t("login.emailPlaceholder")} {...registerForm.register("email")} className="pl-10" />
              </div>
              {registerForm.formState.errors.email && <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-reg-password" className="text-xs">{t("login.password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="b-reg-password" type={showPassword ? "text" : "password"} placeholder="••••••••" {...registerForm.register("password")} className="pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {registerForm.formState.errors.password && <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-reg-confirm" className="text-xs">{t("login.confirmPassword")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="b-reg-confirm" type={showPassword ? "text" : "password"} placeholder="••••••••" {...registerForm.register("confirmPassword")} className="pl-10" />
              </div>
              {registerForm.formState.errors.confirmPassword && <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>}
            </div>
            {inviteCodeRequired && (
              <div className="space-y-1.5">
                <Label htmlFor="b-reg-invite" className="text-xs">{t("login.inviteCode")}</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="b-reg-invite" placeholder="RUUMLY2026" {...registerForm.register("inviteCode")} className="pl-10" />
                </div>
              </div>
            )}
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("booking.registerAndBook")}
            </Button>
          </form>
        ) : (
          <form key="booking-login" onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="b-login-email" className="text-xs">{t("login.email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="b-login-email" type="email" placeholder={t("login.emailPlaceholder")} {...loginForm.register("email")} className="pl-10" />
              </div>
              {loginForm.formState.errors.email && <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-login-password" className="text-xs">{t("login.password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="b-login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" {...loginForm.register("password")} className="pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {loginForm.formState.errors.password && <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("booking.loginAndBook")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
