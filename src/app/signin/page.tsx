"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { BRAND_NAME } from "@/lib/config";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { isValidBdMobile } from "@/lib/auth/bd-phone";

/**
 * Where to send the user after a successful sign-in — the `?next=` search
 * param (set e.g. by `src/proxy.ts` when it bounces an unauthenticated visitor
 * off `/admin/*`), falling back to `/account`. Read straight from
 * `window.location.search` (not `useSearchParams`) since this is only ever
 * called from inside client event handlers, never during render — so it needs
 * no `<Suspense>` boundary and can't trip the "Missing Suspense boundary with
 * useSearchParams" build-time bailout for prerendered client pages (see
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md).
 * Only ever returns a same-origin path (rejects `//evil.com`-style values, and
 * `/\evil.com`-style values — WHATWG URL parsing treats a leading backslash
 * like a slash, so that's just as much an open redirect) so a crafted `next`
 * can't turn this into an open redirect.
 */
function getNextParam(): string {
  if (typeof window === "undefined") return "/account";
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
    ? next
    : "/account";
}

// Brand glyphs for the social sign-in buttons. lucide dropped brand icons, so
// these are inline SVG (simple-icons paths) — same pattern as the footer.
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
    </svg>
  );
}

export default function SignInPage() {
  const router = useRouter();
  // Stable for the component's lifetime, same pattern as AuthProvider.
  const [supabase] = useState(() => createBrowserSupabase());
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Step 2: password popup.
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [revealPw, setRevealPw] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [acceptedSignUpTerms, setAcceptedSignUpTerms] = useState(false);

  // Sign-up modal fields — previously unwired (no value/onChange at all).
  const [signUpFullName, setSignUpFullName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPhone, setSignUpPhone] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [signUpLoading, setSignUpLoading] = useState(false);

  // Human-verification (CAPTCHA) step — UI only, shown after "Create account".
  const [showVerify, setShowVerify] = useState(false);
  const [captchaChecked, setCaptchaChecked] = useState(false);
  const [captchaVerifying, setCaptchaVerifying] = useState(false);

  // Post sign-up: Supabase requires email confirmation before the account can
  // sign in, so swap the main card for a "check your email" state instead of
  // pretending the account is immediately usable.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");

  // Step 1 → open the password popup once an identifier is entered.
  const handleIdentifierSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email or phone number.");
      return;
    }
    setShowPassword(true);
  };

  const closePasswordPopup = () => {
    setShowPassword(false);
    setPassword("");
    setRevealPw(false);
  };

  const closeSignUpModal = () => {
    setShowSignUp(false);
    setAcceptedSignUpTerms(false);
  };

  const closeVerify = () => {
    setShowVerify(false);
    setCaptchaChecked(false);
    setCaptchaVerifying(false);
  };

  // Sign-up submit → validate the (now-wired) fields, then open the
  // human-verification modal. The actual `signUp()` call fires once that
  // completes (see `handleVerify`) — that's the flow's true "finish" point.
  const handleCreateAccount = () => {
    if (!signUpFullName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(signUpEmail.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!isValidBdMobile(signUpPhone)) {
      toast.error("Please enter a valid Bangladeshi phone number (e.g. 01712345678).");
      return;
    }
    if (!signUpPassword) {
      toast.error("Please create a password.");
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!acceptedSignUpTerms) {
      toast.error("Please accept the Terms and Conditions to continue.");
      return;
    }
    setShowVerify(true);
  };

  // Placeholder reCAPTCHA: simulate the "checking…" spinner, then mark it done.
  const runCaptcha = () => {
    if (captchaChecked || captchaVerifying) return;
    setCaptchaVerifying(true);
    window.setTimeout(() => {
      setCaptchaVerifying(false);
      setCaptchaChecked(true);
    }, 800);
  };

  // Verify → this is where the account is actually created. Supabase emails a
  // confirmation link (see `/auth/callback`); until it's followed the account
  // can't sign in, so we swap the card for an "check your email" state rather
  // than claim success outright.
  const handleVerify = async () => {
    if (!captchaChecked || signUpLoading) return;
    setSignUpLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signUpEmail.trim(),
      password: signUpPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: signUpFullName.trim(), phone: signUpPhone.trim() },
      },
    });
    setSignUpLoading(false);
    if (error) {
      toast.error(error.message);
      closeVerify(); // back to the sign-up modal so the user can fix and retry
      return;
    }
    closeVerify();
    closeSignUpModal();
    setConfirmationEmail(signUpEmail);
    setAwaitingConfirmation(true);
    toast.success("Check your email", {
      description: `We sent a confirmation link to ${signUpEmail}.`,
    });
  };

  const handleBackToSignIn = () => {
    setAwaitingConfirmation(false);
    setSignUpFullName("");
    setSignUpEmail("");
    setSignUpPhone("");
    setSignUpPassword("");
    setSignUpConfirmPassword("");
    setAcceptedSignUpTerms(false);
  };

  // Google OAuth — used by both the top-level "Google" button and the one
  // inside the sign-up modal (Supabase treats sign-in/sign-up via OAuth as the
  // same call: it creates the account on first use). Redirects the browser
  // away to Google, so there's no local success path to handle — only errors
  // (e.g. the popup/redirect being blocked) come back here.
  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    const next = getNextParam();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
  };

  // Step 2 → real Supabase email/password sign-in.
  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) {
      toast.error("Please enter your password.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setShowPassword(false);
    toast.success("Signed in successfully.");
    router.push(getNextParam());
  };

  // Close the popup on Escape.
  useEffect(() => {
    if (!showPassword && !showSignUp && !showVerify) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Close the topmost layer first (verify sits above the sign-up modal).
      if (showVerify) {
        closeVerify();
        return;
      }
      if (showSignUp) closeSignUpModal();
      if (showPassword) closePasswordPopup();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPassword, showSignUp, showVerify]);

  return (
    // Bare route: the mobile bottom bar isn't rendered here, but <body> still
    // reserves 3.5rem for it. Subtract that (and dvh, so a phone's URL bar can't
    // inflate it) or the page scrolls by exactly that dead strip. md+ has no
    // body padding, so it's a plain full-height column there.
    <main className="flex min-h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] flex-col bg-paper px-4 md:min-h-dvh">
      {/* brand wordmark — name only, centered at top */}
      <div className="flex justify-center pt-8 pb-4">
        <Link
          href="/"
          className="font-display text-2xl font-bold tracking-tight text-ink"
        >
          {BRAND_NAME}
        </Link>
      </div>

      {/* Content column — sits just under the wordmark. A fixed top offset is
          fine at this size (wordmark + card ≈ 560px, so it clears even a short
          window), but keep it modest: a larger one overflowed and brought the
          scrollbar back. */}
      <div className="flex flex-1 items-start justify-center pt-24">
        <div className="w-full max-w-sm">
          {awaitingConfirmation ? (
            // Sign-up succeeded, but the account can't sign in until the
            // confirmation link is followed — swap the whole card rather than
            // pretend the account is immediately usable.
            <div className="text-center">
              <h1 className="font-sans text-2xl font-normal leading-[28.8px] tracking-normal text-black">
                Check your email
              </h1>
              <p className="mt-2 font-sans text-sm font-normal leading-[21px] tracking-normal text-[#0000008f]">
                We sent a confirmation link to{" "}
                <span className="font-semibold text-ink break-all">
                  {confirmationEmail}
                </span>
                . Follow it to activate your account, then sign in.
              </p>
              <button
                type="button"
                onClick={handleBackToSignIn}
                className="mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-neem text-base font-semibold text-paper transition hover:bg-neem-deep"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h1 className="font-sans text-2xl font-normal leading-[28.8px] tracking-normal text-black">
                Sign in
              </h1>
              <p className="mt-2 font-sans text-sm font-normal leading-[21px] tracking-normal text-[#0000008f]">
                Sign in to track orders, save your wishlist, and check out faster
              </p>

              {/* Continue with Shop */}
              <button
                type="button"
                onClick={() => toast.info("Shop sign-in isn’t wired up yet.")}
                className="mt-5 flex h-12 w-full items-center justify-center rounded-lg bg-[#5a31f4] text-base font-semibold text-white transition hover:bg-[#4a27d4]"
              >
                Continue with
              </button>

              {/* social sign-in */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="flex h-12 items-center justify-center gap-2.5 rounded-lg border border-cream-300 bg-paper text-[15px] font-medium text-ink transition hover:bg-cream-100 disabled:pointer-events-none disabled:opacity-60"
                >
                  {googleLoading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <GoogleIcon className="size-5" />
                  )}
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => toast.info("Social sign-in isn’t wired up yet.")}
                  className="flex h-12 items-center justify-center gap-2.5 rounded-lg border border-cream-300 bg-paper text-[15px] font-medium text-ink transition hover:bg-cream-100"
                >
                  <FacebookIcon className="size-5 text-[#1877F2]" />
                  Facebook
                </button>
              </div>

              {/* divider */}
              <div className="my-4 flex items-center gap-4">
                <span className="h-px flex-1 bg-cream-300" />
                <span className="text-sm text-ink-muted">or</span>
                <span className="h-px flex-1 bg-cream-300" />
              </div>

              {/* email + arrow submit */}
              <form onSubmit={handleIdentifierSubmit} noValidate>
                <div className="flex items-stretch rounded-lg border border-cream-300 bg-paper transition-colors focus-within:border-neem">
                  <input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email or Phone Number"
                    aria-label="Email or Phone Number"
                    className="h-12 w-full flex-1 bg-transparent px-4 text-[15px] text-ink outline-none placeholder:text-ink-soft"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    aria-label="Continue"
                    className="group/arrow m-1.5 flex w-10 items-center justify-center rounded-md bg-neem text-paper transition-all duration-200 ease-out hover:scale-[1.04] hover:bg-neem-deep active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60"
                  >
                    <ArrowRight className="size-5 transition-transform duration-200 ease-out group-hover/arrow:translate-x-1" />
                  </button>
                </div>

                <p className="mt-4 text-center text-sm text-ink-muted">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setShowSignUp(true)}
                    className="font-semibold text-neem-deep underline-offset-2 hover:underline"
                  >
                    Sign up
                  </button>
                </p>

                {/* terms */}
                <p className="mt-4 text-center text-sm text-ink-muted">
                  By continuing, you agree to our{" "}
                  <Link
                    href="/policy/terms"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    Terms and Conditions
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>

      {/* step 2: password popup */}
      <AnimatePresence>
        {showPassword ? (
          <motion.div
            key="pw-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePasswordPopup}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Enter your password"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-sm rounded-2xl border border-cream-300 bg-paper p-6 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.28)] sm:p-7"
            >
              <button
                type="button"
                onClick={closePasswordPopup}
                aria-label="Close"
                className="absolute right-4 top-4 text-ink-soft transition-colors hover:text-ink"
              >
                <X className="size-5" />
              </button>

              <span className="flex size-11 items-center justify-center rounded-full bg-neem/10 text-neem-deep">
                <Lock className="size-5" />
              </span>
              <h2 className="mt-4 font-display text-xl font-bold text-ink">
                Enter your password
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Signing in as <span className="font-semibold text-ink break-all">{email}</span>
              </p>

              <form onSubmit={handlePasswordSubmit} noValidate className="mt-5">
                <div className="flex items-stretch rounded-lg border border-cream-300 bg-paper transition-colors focus-within:border-neem">
                  <input
                    id="password"
                    type={revealPw ? "text" : "password"}
                    autoComplete="current-password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    aria-label="Password"
                    className="h-12 w-full flex-1 bg-transparent px-4 text-[15px] text-ink outline-none placeholder:text-ink-soft"
                  />
                  <button
                    type="button"
                    onClick={() => setRevealPw((v) => !v)}
                    aria-label={revealPw ? "Hide password" : "Show password"}
                    className="flex w-11 items-center justify-center text-ink-soft transition-colors hover:text-ink"
                  >
                    {revealPw ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 flex h-12 w-full items-center justify-center rounded-lg bg-neem text-base font-semibold text-paper transition hover:bg-neem-deep disabled:opacity-60"
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => toast.info("Password reset isn’t wired up yet.")}
                className="mt-4 w-full text-center text-sm text-wood-deep underline-offset-2 hover:underline"
              >
                Forgot password?
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* sign-up modal: UI only */}
      <AnimatePresence>
        {showSignUp ? (
          <motion.div
            key="signup-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSignUpModal}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Create your account"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-cream-300 bg-paper p-6 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.28)] [scrollbar-width:thin] sm:p-7"
            >
              <button
                type="button"
                onClick={closeSignUpModal}
                aria-label="Close"
                className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-100 hover:text-ink"
              >
                <X className="size-5" />
              </button>

              <span className="flex size-11 items-center justify-center rounded-full bg-neem/10 text-neem-deep">
                <UserPlus className="size-5" />
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold text-ink">
                Create account
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                Save your details, wishlist, and checkout preferences.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg border border-cream-300 bg-paper text-sm font-semibold text-ink transition hover:bg-cream-100 disabled:pointer-events-none disabled:opacity-60"
                >
                  {googleLoading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <GoogleIcon className="size-5" />
                  )}
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => toast.info("Social sign-up is UI-only for now.")}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg border border-cream-300 bg-paper text-sm font-semibold text-ink transition hover:bg-cream-100"
                >
                  <FacebookIcon className="size-5 text-[#1877F2]" />
                  Facebook
                </button>
              </div>

              <div className="my-5 flex items-center gap-4">
                <span className="h-px flex-1 bg-cream-300" />
                <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                  or
                </span>
                <span className="h-px flex-1 bg-cream-300" />
              </div>

              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCreateAccount();
                }}
                className="space-y-3.5"
              >
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">
                    Full name
                  </span>
                  <input
                    type="text"
                    autoComplete="name"
                    value={signUpFullName}
                    onChange={(e) => setSignUpFullName(e.target.value)}
                    placeholder="Your full name"
                    className="h-11 w-full rounded-lg border border-cream-300 bg-paper px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-neem"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">
                    Email
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-11 w-full rounded-lg border border-cream-300 bg-paper px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-neem"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">
                    Phone number
                  </span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    inputMode="numeric"
                    value={signUpPhone}
                    onChange={(e) => setSignUpPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="h-11 w-full rounded-lg border border-cream-300 bg-paper px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-neem"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">
                    Password
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="Create a password"
                    className="h-11 w-full rounded-lg border border-cream-300 bg-paper px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-neem"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">
                    Confirm Password
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="h-11 w-full rounded-lg border border-cream-300 bg-paper px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-neem"
                  />
                </label>

              </form>

              <label className="mt-4 flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={acceptedSignUpTerms}
                  onChange={(e) => setAcceptedSignUpTerms(e.target.checked)}
                  className="mt-0.5 size-4 flex-none rounded border-cream-300 accent-neem"
                />
                <span className="text-sm leading-6 text-ink-muted">
                  By continuing, you agree to our{" "}
                  <Link
                    href="/policy/terms"
                    className="font-medium text-blue-600 underline-offset-2 hover:underline"
                  >
                    Terms and Conditions
                  </Link>{" "}
                </span>
              </label>

              <button
                type="button"
                disabled={!acceptedSignUpTerms}
                onClick={handleCreateAccount}
                className="mt-4 flex h-12 w-full items-center justify-center rounded-lg bg-neem text-base font-semibold text-paper transition hover:bg-neem-deep disabled:pointer-events-none disabled:opacity-50"
              >
                Create account
              </button>

              <p className="mt-4 text-center text-sm text-ink-muted">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={closeSignUpModal}
                  className="font-semibold text-neem-deep underline-offset-2 hover:underline"
                >
                  Sign in
                </button>
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* human verification (CAPTCHA) modal — UI only, no real reCAPTCHA */}
      <AnimatePresence>
        {showVerify ? (
          <motion.div
            key="verify-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeVerify}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Verify you're human"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-sm rounded-2xl border border-cream-300 bg-paper p-6 text-center shadow-[0_30px_80px_-30px_rgba(15,23,42,0.28)] sm:p-7"
            >
              <button
                type="button"
                onClick={closeVerify}
                aria-label="Close"
                className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-100 hover:text-ink"
              >
                <X className="size-5" />
              </button>

              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-neem/10 text-neem-deep">
                <ShieldCheck className="size-6" />
              </span>
              <h2 className="mt-4 font-display text-xl font-bold text-ink">
                Verify you&apos;re human
              </h2>
              <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-ink-muted">
                Complete the check below to confirm you&apos;re not a robot before we
                create your account.
              </p>

              {/* Google reCAPTCHA-style placeholder (non-functional) */}
              <div className="mt-5 flex justify-center">
                <div className="flex w-full max-w-[304px] items-center gap-3 rounded-[3px] border border-[#d3d3d3] bg-[#f9f9f9] px-3 py-3 shadow-sm">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={captchaChecked}
                    aria-label="I'm not a robot"
                    onClick={runCaptcha}
                    className="flex size-7 flex-none items-center justify-center rounded-[2px] border-2 border-[#c1c1c1] bg-white"
                  >
                    {captchaVerifying ? (
                      <Loader2 className="size-5 animate-spin text-[#4285F4]" />
                    ) : captchaChecked ? (
                      <Check className="size-6 text-[#1e9e50]" strokeWidth={3} />
                    ) : null}
                  </button>
                  <span className="text-[15px] leading-none text-[#3c4043]">
                    I&apos;m not a robot
                  </span>
                  <div className="ml-auto flex flex-col items-center gap-0.5 text-[#9aa0a6]">
                    <RefreshCw className="size-7 text-[#1c3aa9]" strokeWidth={2.2} />
                    <span className="text-[10px] font-medium leading-none text-[#5f6368]">
                      reCAPTCHA
                    </span>
                    <span className="text-[8px] leading-none">Privacy · Terms</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={closeVerify}
                  className="flex h-11 flex-1 items-center justify-center rounded-lg border border-cream-300 bg-paper text-sm font-semibold text-ink transition hover:bg-cream-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!captchaChecked || signUpLoading}
                  onClick={handleVerify}
                  className="flex h-11 flex-1 items-center justify-center rounded-lg bg-neem text-sm font-semibold text-paper transition hover:bg-neem-deep disabled:pointer-events-none disabled:opacity-50"
                >
                  {signUpLoading ? "Creating account…" : "Verify"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* privacy policy — pinned at bottom */}
      <div className="flex justify-center py-5">
        <Link
          href="/policy/privacy"
          className="text-[15px] text-wood-deep underline-offset-2 hover:underline"
        >
          Privacy policy
        </Link>
      </div>
    </main>
  );
}
