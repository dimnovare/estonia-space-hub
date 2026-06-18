import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "@/i18n/routing";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle, KeyRound } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import GoogleAuthScope from "@/components/GoogleAuthScope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createLoginSchema, createRegisterSchema, type LoginForm, type RegisterForm } from "@/lib/schemas";
import { authService } from "@/services";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SEO } from "@/components/SEO";
import { trackEvent } from "@/lib/analytics";

type AuthView = "login" | "register" | "forgot" | "forgot-sent" | "reset" | "verify-sent";

/**
 * Auth shell (pixel-spec 01-public-pages §LOGIN + 00-foundations):
 * centered white card (radius 14, shadow-card) on app bg, brand lockup,
 * navy-ink headings, green primary CTA. Wraps every auth view so the
 * surface stays consistent across login / register / forgot / reset.
 */
function AuthCard({ children, maxWidth = "max-w-[440px]" }: { children: React.ReactNode; maxWidth?: string }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4 py-12 sm:py-16">
      <div className={`w-full ${maxWidth} animate-in slide-in-from-bottom-2 duration-300`}>
        <Link
          to="/"
          aria-label="Ruumly"
          className="mx-auto mb-6 flex w-fit items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <img
            src="/ruumly-mark.png"
            alt=""
            aria-hidden="true"
            width={32}
            height={32}
            decoding="async"
            className="h-8 w-8 object-contain"
          />
          <span className="brand-word text-[22px]">Ruumly</span>
        </Link>
        <div className="rounded-[14px] border border-border bg-card p-6 shadow-card sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function LoginPageInner() {
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

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(createLoginSchema(t)) });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(createRegisterSchema(t)) });

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

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, from, navigate]);

  if (isAuthenticated) {
    return null; // Render nothing while the effect navigates away
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
      trackEvent("user_registered", { method: "email" });
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
      <AuthCard>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[14px] bg-accent/10">
          <KeyRound className="h-7 w-7 text-accent" />
        </div>
        <h1 className="mt-4 text-center font-display text-2xl font-bold text-navy-ink">{t("form.newPassword")}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">{t("form.newPasswordHint")}</p>
        <form onSubmit={handleReset} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-password">{t("form.newPassword")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                minLength={8}
                required
                className="pl-10 pr-10"
              />
              <button type="button" aria-pressed={showPassword} aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")} onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-95">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={resetLoading}>
            {resetLoading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("login.saving")}</>
              : t("form.saveNewPassword")}
          </Button>
        </form>
      </AuthCard>
    );
  }

  if (view === "verify-sent") {
    return (
      <AuthCard>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[14px] bg-accent/10">
          <Mail className="h-7 w-7 text-accent" />
        </div>
        <h1 className="mt-4 text-center font-display text-2xl font-bold text-navy-ink">{t("auth.verifyTitle")}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {t("auth.verifyDesc").replace("{email}", registeredEmail)}
        </p>
        <Button variant="outline" size="lg" className="mt-6 w-full" onClick={() => setView("login")}>{t("login.backToLogin")}</Button>
      </AuthCard>
    );
  }

  if (view === "forgot-sent") {
    return (
      <AuthCard>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[14px] bg-success/10">
          <CheckCircle className="h-7 w-7 text-success" />
        </div>
        <h1 className="mt-4 text-center font-display text-2xl font-bold text-navy-ink">{t("login.resetSent")}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">{t("login.resetSentDesc")}</p>
        <Button variant="outline" size="lg" className="mt-6 w-full" onClick={() => setView("login")}>{t("login.backToLogin")}</Button>
      </AuthCard>
    );
  }

  if (view === "forgot") {
    return (
      <AuthCard>
        <button onClick={() => setView("login")} className="mb-4 inline-flex items-center gap-1 rounded-md py-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-95">
          <ArrowLeft className="h-4 w-4" /> {t("login.backToLogin")}
        </button>
        <h1 className="font-display text-2xl font-bold text-navy-ink">{t("login.forgotTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("login.forgotDesc")}</p>
        <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="forgot-email">{t("login.email")}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="forgot-email" type="email" placeholder={t("login.emailPlaceholder")} value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="pl-10" required />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={forgotLoading}>
            {forgotLoading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("form.sending")}</>
              : t("login.sendReset")}
          </Button>
        </form>
      </AuthCard>
    );
  }

  const isRegister = view === "register";

  const switchMode = (next: "login" | "register") => {
    if (next === view) return;
    setView(next);
    loginForm.reset();
    registerForm.reset();
  };

  return (
    <AuthCard>
      <SEO title={`${t("seo.login")} — Ruumly`} description={t("seo.loginDesc")} path="/login" noindex={true} />

      {/* Segmented Sign in / Create account toggle */}
      <div role="tablist" aria-label={t("login.title")} className="flex rounded-md bg-secondary p-1">
        <button
          type="button"
          role="tab"
          aria-selected={!isRegister}
          onClick={() => switchMode("login")}
          className={`flex-1 rounded-[7px] px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
            !isRegister ? "bg-card text-navy-ink shadow-card" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("login.title")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isRegister}
          onClick={() => switchMode("register")}
          className={`flex-1 rounded-[7px] px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
            isRegister ? "bg-card text-navy-ink shadow-card" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("login.register")}
        </button>
      </div>

      <div className="mt-6 text-center">
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-navy-ink">
          {isRegister ? t("login.createTitle") : t("login.welcomeBack")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {isRegister ? t("login.createSubtitle") : t("login.loginSubtitle")}
        </p>
      </div>

      {googleEnabled && (
        <>
          <div className="mt-6 flex justify-center google-login-wrapper">
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                if (!credentialResponse.credential) return;
                setLoading(true);
                loginWithGoogle(credentialResponse.credential)
                  .then(({ isNewUser }) => {
                    if (isNewUser) trackEvent("user_registered", { method: "google" });
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
              width={300}
              text="continue_with"
              shape="rectangular"
              theme="outline"
              locale="et"
            />
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{t("login.or")}</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      {!googleEnabled && <div className="mt-6" />}

      {isRegister ? (
        <form key="register" onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reg-name">{t("login.name")}</Label>
            <Input id="reg-name" placeholder={t("login.namePlaceholder")} {...registerForm.register("name")} aria-invalid={!!registerForm.formState.errors.name} aria-describedby={registerForm.formState.errors.name ? "reg-name-error" : undefined} />
            {registerForm.formState.errors.name && <p id="reg-name-error" role="alert" className="text-xs text-destructive">{registerForm.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-email">{t("login.email")}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="reg-email" type="email" placeholder={t("login.emailPlaceholder")} {...registerForm.register("email")} className="pl-10" aria-invalid={!!registerForm.formState.errors.email} aria-describedby={registerForm.formState.errors.email ? "reg-email-error" : undefined} />
            </div>
            {registerForm.formState.errors.email && <p id="reg-email-error" role="alert" className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-password">{t("login.password")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="reg-password" type={showPassword ? "text" : "password"} placeholder="••••••••" {...registerForm.register("password")} className="pl-10 pr-10" aria-invalid={!!registerForm.formState.errors.password} aria-describedby={registerForm.formState.errors.password ? "reg-password-error" : undefined} />
              <button type="button" aria-pressed={showPassword} aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")} onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-95">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {registerForm.formState.errors.password && <p id="reg-password-error" role="alert" className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-confirm">{t("login.confirmPassword")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="reg-confirm" type={showPassword ? "text" : "password"} placeholder="••••••••" {...registerForm.register("confirmPassword")} className="pl-10" aria-invalid={!!registerForm.formState.errors.confirmPassword} aria-describedby={registerForm.formState.errors.confirmPassword ? "reg-confirm-error" : undefined} />
            </div>
            {registerForm.formState.errors.confirmPassword && <p id="reg-confirm-error" role="alert" className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>}
          </div>
          {inviteCodeRequired && (
            <div className="space-y-1.5">
              <Label htmlFor="reg-invite">{t("login.inviteCode")}</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="reg-invite" placeholder="RUUMLY2026" {...registerForm.register("inviteCode")} className="pl-10" />
              </div>
              <p className="text-xs text-muted-foreground">{t("login.inviteCodeHint")}</p>
            </div>
          )}
          <Button type="submit" size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("login.register")}
          </Button>
        </form>
      ) : (
        <form key="login" onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">{t("login.email")}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="login-email" type="email" placeholder={t("login.emailPlaceholder")} {...loginForm.register("email")} className="pl-10" aria-invalid={!!loginForm.formState.errors.email} aria-describedby={loginForm.formState.errors.email ? "login-email-error" : undefined} />
            </div>
            {loginForm.formState.errors.email && <p id="login-email-error" role="alert" className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">{t("login.password")}</Label>
              <button type="button" onClick={() => setView("forgot")} className="rounded-md text-xs font-medium text-accent transition-colors hover:text-accent/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-95">{t("login.forgotPassword")}</button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" {...loginForm.register("password")} className="pl-10 pr-10" aria-invalid={!!loginForm.formState.errors.password} aria-describedby={loginForm.formState.errors.password ? "login-password-error" : undefined} />
              <button type="button" aria-pressed={showPassword} aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")} onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-95">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {loginForm.formState.errors.password && <p id="login-password-error" role="alert" className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>}
          </div>

          <Button type="submit" size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("login.title")}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isRegister ? t("login.hasAccount") : t("login.noAccount")}{" "}
        <button onClick={() => switchMode(isRegister ? "login" : "register")} className="rounded-md font-semibold text-accent transition-colors hover:text-accent/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-95">
          {isRegister ? t("login.title") : t("login.register")}
        </button>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <GoogleAuthScope>
      <LoginPageInner />
    </GoogleAuthScope>
  );
}
