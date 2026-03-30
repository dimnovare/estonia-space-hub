import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle, KeyRound } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, registerSchema, type LoginForm, type RegisterForm } from "@/lib/schemas";
import { authService } from "@/services";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SEO } from "@/components/SEO";
import { trackEvent } from "@/lib/analytics";

type AuthView = "login" | "register" | "forgot" | "forgot-sent" | "reset" | "verify-sent";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<AuthView>("login");
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const { t } = useLanguage();
  const { login, register: authRegister, loginWithGoogle, isAuthenticated } = useAuth();
  const { inviteCodeRequired } = usePlatformSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || "/account";

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  // Check for reset token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const viewParam = params.get("view");
    if (token && viewParam === "reset") {
      setResetToken(token);
      setView("reset");
    }
  }, []);

  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  const handleLogin = async (data: LoginForm) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      trackEvent("login", { method: "email" });
      toast.success(t("login.successLogin"));
      navigate(from, { replace: true });
    } catch (err: any) { const msg = err.message || ""; toast.error(msg.startsWith("error.") ? t(msg) : msg || t("error.loginFailed")); }
    setLoading(false);
  };

  const handleRegister = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const email = await authRegister(data.name, data.email, data.password, data.inviteCode);
      trackEvent("register", { method: "email" });
      setRegisteredEmail(email);
      setView("verify-sent");
    } catch (err: any) { const msg = err.message || ""; toast.error(msg.startsWith("error.") ? t(msg) : msg || t("error.registerFailed")); }
    setLoading(false);
  };

  const googleEnabled = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      const currentLang = localStorage.getItem("ruumly-lang") ?? "et";
      await authService.forgotPassword(forgotEmail.trim(), currentLang);
      setView("forgot-sent");
    } catch {
      // Still show sent view for security (don't reveal if email exists)
      setView("forgot-sent");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassword || resetPassword.length < 8) {
      toast.error(t("error.passwordTooShort"));
      return;
    }
    setResetLoading(true);
    try {
      await authService.resetPassword(resetToken, resetPassword);
      toast.success(t("error.passwordChanged"));
      setView("login");
    } catch (err: any) {
      toast.error(err.message || t("error.passwordChangeFailed"));
    } finally {
      setResetLoading(false);
    }
  };

  if (view === "reset") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <KeyRound className="h-8 w-8 text-accent" />
          </div>
          <h1 className="mt-4 text-center font-display text-2xl font-bold">{t("form.newPassword")}</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">Vali uus parool oma kontole.</p>
          <form onSubmit={handleReset} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">{t("form.newPassword")}</Label>
              <Input
                id="reset-password"
                type="password"
                placeholder="••••••••"
                value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-accent py-5 text-accent-foreground hover:bg-accent/90" disabled={resetLoading}>
              {resetLoading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("login.saving")}</>
                : t("form.saveNewPassword")}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (view === "verify-sent") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-center">
            <Mail className="mx-auto h-8 w-8 text-accent" />
            <h3 className="mt-2 font-semibold">{t("auth.verifyTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("auth.verifyDesc").replace("{email}", registeredEmail)}
            </p>
          </div>
          <Button variant="outline" className="mt-6 w-full" onClick={() => setView("login")}>{t("login.backToLogin")}</Button>
        </div>
      </div>
    );
  }

  if (view === "forgot-sent") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">{t("login.resetSent")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("login.resetSentDesc")}</p>
          <Button variant="outline" className="mt-6" onClick={() => setView("login")}>{t("login.backToLogin")}</Button>
        </div>
      </div>
    );
  }

  if (view === "forgot") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <button onClick={() => setView("login")} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t("login.backToLogin")}
          </button>
          <h1 className="font-display text-2xl font-bold">{t("login.forgotTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("login.forgotDesc")}</p>
          <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">{t("login.email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="forgot-email" type="email" placeholder={t("login.emailPlaceholder")} value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <Button type="submit" className="w-full bg-accent py-5 text-accent-foreground hover:bg-accent/90" disabled={forgotLoading}>
              {forgotLoading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saadame...</>
                : t("login.sendReset")}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const isRegister = view === "register";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <SEO title="Logi sisse — Ruumly" description="Logi sisse oma Ruumly kontole." canonical="/login" noindex={true} />
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold">
            {isRegister ? t("login.register") : t("login.title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isRegister ? t("login.registerDesc") : t("login.loginDesc")}
          </p>
        </div>

        {googleEnabled && (
          <>
            <div className="mt-8 flex justify-center google-login-wrapper">
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  if (!credentialResponse.credential) return;
                  setLoading(true);
                  loginWithGoogle(credentialResponse.credential)
                    .then(() => {
                      trackEvent("login", { method: "google" });
                      toast.success(t("login.successLogin"));
                      navigate(from, { replace: true });
                    })
                    .catch((err: any) => {
                      const msg = err.message || "";
                      const toastMsg = msg.startsWith("error.") ? t(msg) : msg || t("error.googleFailed");
                      toast.error(toastMsg);
                    })
                    .finally(() => setLoading(false));
                }}
                onError={() => {
                  toast.error(t("error.googleFailed2"));
                }}
                useOneTap={false}
                width={320}
                text="continue_with"
                shape="rectangular"
                theme="outline"
                locale="et"
              />
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">{t("login.or")}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        {!googleEnabled && <div className="mt-8" />}

        {isRegister ? (
          <form key="register" onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-name">{t("login.name")}</Label>
              <Input id="reg-name" placeholder={t("login.namePlaceholder")} {...registerForm.register("name")} />
              {registerForm.formState.errors.name && <p className="text-xs text-destructive">{registerForm.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">{t("login.email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="reg-email" type="email" placeholder={t("login.emailPlaceholder")} {...registerForm.register("email")} className="pl-10" />
              </div>
              {registerForm.formState.errors.email && <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">{t("login.password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="reg-password" type={showPassword ? "text" : "password"} placeholder="••••••••" {...registerForm.register("password")} className="pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {registerForm.formState.errors.password && <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-confirm">{t("login.confirmPassword")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="reg-confirm" type={showPassword ? "text" : "password"} placeholder="••••••••" {...registerForm.register("confirmPassword")} className="pl-10" />
              </div>
              {registerForm.formState.errors.confirmPassword && <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>}
            </div>
            {inviteCodeRequired && (
              <div className="space-y-2">
                <Label htmlFor="reg-invite">{t("login.inviteCode")}</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="reg-invite" placeholder="RUUMLY2026" {...registerForm.register("inviteCode")} className="pl-10" />
                </div>
                <p className="text-xs text-muted-foreground">{t("login.inviteCodeHint")}</p>
              </div>
            )}
            <Button type="submit" className="w-full bg-accent py-5 text-accent-foreground hover:bg-accent/90" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("login.register")}
            </Button>
          </form>
        ) : (
          <form key="login" onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">{t("login.email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="login-email" type="email" placeholder={t("login.emailPlaceholder")} {...loginForm.register("email")} className="pl-10" />
              </div>
              {loginForm.formState.errors.email && <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">{t("login.password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" {...loginForm.register("password")} className="pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {loginForm.formState.errors.password && <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>}
            </div>

            <div className="text-right">
              <button type="button" onClick={() => setView("forgot")} className="text-xs text-accent hover:underline">{t("login.forgotPassword")}</button>
            </div>

            <Button type="submit" className="w-full bg-accent py-5 text-accent-foreground hover:bg-accent/90" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("login.title")}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isRegister ? t("login.hasAccount") : t("login.noAccount")}{" "}
          <button onClick={() => { setView(isRegister ? "login" : "register"); loginForm.reset(); registerForm.reset(); }} className="font-medium text-accent hover:underline">
            {isRegister ? t("login.title") : t("login.register")}
          </button>
        </p>
      </div>
    </div>
  );
}
