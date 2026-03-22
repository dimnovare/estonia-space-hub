import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

type AuthView = "login" | "register" | "forgot" | "forgot-sent" | "reset";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<AuthView>("login");
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const { login, register, loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || "/account";

  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success(t("login.successLogin"));
      navigate(from, { replace: true });
    } catch { toast.error("Login failed"); }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success(t("login.successRegister"));
      navigate(from, { replace: true });
    } catch { toast.error("Registration failed"); }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success(t("login.successLogin"));
      navigate(from, { replace: true });
    } catch { toast.error("Google login failed"); }
    setLoading(false);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setView("forgot-sent");
  };

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
              <Label htmlFor="email">{t("login.email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" placeholder={t("login.emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <Button type="submit" className="w-full bg-accent py-5 text-accent-foreground hover:bg-accent/90">{t("login.sendReset")}</Button>
          </form>
        </div>
      </div>
    );
  }

  const isRegister = view === "register";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold">
            {isRegister ? t("login.register") : t("login.title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isRegister ? t("login.registerDesc") : t("login.loginDesc")}
          </p>
        </div>

        <div className="mt-8">
          <Button variant="outline" className="w-full gap-3 py-5" onClick={handleGoogle} disabled={loading}>
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {t("login.google")}
          </Button>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">{t("login.or")}</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
          {isRegister && (
            <div className="space-y-2">
              <Label htmlFor="name">{t("login.name")}</Label>
              <Input id="name" placeholder={t("login.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t("login.email")}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" placeholder={t("login.emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("login.password")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {!isRegister && (
            <div className="text-right">
              <button type="button" onClick={() => setView("forgot")} className="text-xs text-accent hover:underline">{t("login.forgotPassword")}</button>
            </div>
          )}

          <Button type="submit" className="w-full bg-accent py-5 text-accent-foreground hover:bg-accent/90" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isRegister ? t("login.register") : t("login.title")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isRegister ? t("login.hasAccount") : t("login.noAccount")}{" "}
          <button onClick={() => setView(isRegister ? "login" : "register")} className="font-medium text-accent hover:underline">
            {isRegister ? t("login.title") : t("login.register")}
          </button>
        </p>
      </div>
    </div>
  );
}
