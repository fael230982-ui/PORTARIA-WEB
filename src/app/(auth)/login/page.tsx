'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { BrandPoweredBy } from '@/components/branding/brand-powered-by';
import { brandClasses } from '@/config/brand-classes';
import { brandConfig } from '@/config/brand';
import { getRouteForRole } from '@/features/auth/access-control';
import { acceptCurrentLegalVersion } from '@/features/legal/legal-documents';
import { useAuth } from '@/hooks/use-auth';
import {
  login as loginService,
  requestPasswordReset,
  resetPassword,
} from '@/services/auth.service';

export default function LoginPage() {
  const router = useRouter();
  const {
    token,
    user,
    isAuthenticated,
    loading,
    setSession,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const isResetMode = Boolean(resetToken);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setResetToken(params.get('token') ?? params.get('resetToken') ?? '');
    const motivo = params.get('motivo') ?? '';
    const flashMessage = window.sessionStorage.getItem('login_flash_message');

    if (flashMessage) {
      setError(flashMessage);
      window.sessionStorage.removeItem('login_flash_message');
      return;
    }

    if (motivo === 'sessao-expirada') {
      setError('Sua sessão expirou. Entre novamente.');
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!token || !user || !isAuthenticated) return;
    router.replace(getRouteForRole(user.role));
  }, [loading, token, user, isAuthenticated, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await loginService(email, password);

      if (!response?.token || !response?.user) {
        throw new Error('Resposta inválida da autenticação.');
      }

      setSession(response.token, response.user);
      if (acceptedTerms) {
        acceptCurrentLegalVersion();
      }
      router.replace(getRouteForRole(response.user.role));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'E-mail ou senha inválidos.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetError(null);
    setResetMessage(null);

    const targetEmail = resetEmail.trim() || email.trim();
    if (!targetEmail) {
      setResetError('Informe o e-mail cadastrado.');
      return;
    }

    setResetSubmitting(true);
    try {
      await requestPasswordReset(targetEmail);
      setResetMessage('Se o e-mail estiver cadastrado, você receberá as instruções para criar uma nova senha.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível solicitar a recuperação de senha.';
      setResetError(message);
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetError(null);
    setResetMessage(null);

    if (newPassword.length < 6) {
      setResetError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setResetError('As senhas informadas não conferem.');
      return;
    }

    setResetSubmitting(true);
    try {
      await resetPassword(resetToken, newPassword);
      setResetMessage('Senha alterada. Entre usando a nova senha.');
      setNewPassword('');
      setConfirmNewPassword('');
      router.replace('/login');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível alterar a senha.';
      setResetError(message);
    } finally {
      setResetSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Carregando...
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4">
      <Image
        src={brandConfig.primaryLogo.src}
        alt=""
        width={980}
        height={320}
        aria-hidden="true"
        className="pointer-events-none absolute left-[18%] top-1/2 hidden h-auto w-[42vw] max-w-[620px] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.075] brightness-125 grayscale md:block"
        priority
      />
      <Image
        src={brandConfig.primaryLogo.src}
        alt=""
        width={980}
        height={320}
        aria-hidden="true"
        className="pointer-events-none absolute right-[18%] top-1/2 hidden h-auto w-[42vw] max-w-[620px] translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.075] brightness-125 grayscale md:block"
        priority
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/95 p-8 shadow-lg backdrop-blur-sm">
        <div className="mb-6 flex flex-col items-center gap-4">
          <Image
            src={brandConfig.primaryLogo.src}
            alt={brandConfig.primaryLogo.alt}
            width={brandConfig.primaryLogo.width}
            height={brandConfig.primaryLogo.height}
            className="h-28 w-auto object-contain"
          />
          <p className="text-center text-sm text-zinc-400">
            {brandConfig.loginTagline}
          </p>
        </div>

        <h1 className="mb-6 text-2xl font-bold text-white">
          {isResetMode ? 'Criar nova senha' : 'Entrar'}
        </h1>

        {isResetMode ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-300">Nova senha</label>
              <input
                type="password"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-300">Confirmar nova senha</label>
              <input
                type="password"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {resetError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {resetError}
              </div>
            )}

            {resetMessage && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {resetMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={resetSubmitting}
              className="w-full rounded-lg bg-white px-4 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resetSubmitting ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-300">E-mail</label>
            <input
              type="email"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-300">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 pr-12 text-white outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className={`absolute inset-y-0 right-0 inline-flex items-center justify-center px-4 transition ${brandClasses.accentTextSoft}`}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4"
              required
            />
            <span>
              Li e estou ciente do{' '}
              <Link
                href="/termos"
                className="text-sm font-semibold text-primary transition hover:opacity-80"
              >
                Termo de Uso
              </Link>{' '}
              e da{' '}
              <Link
                href="/privacidade"
                className="text-sm font-semibold text-primary transition hover:opacity-80"
              >
                Política de Privacidade
              </Link>.
            </span>
          </label>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-white px-4 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>

          <button
            type="button"
            onClick={() => {
              setResetEmail(email);
              setResetError(null);
              setResetMessage(null);
              setShowForgotPassword(true);
            }}
            className="w-full text-center text-sm font-semibold text-primary transition hover:opacity-80"
          >
            Esqueci minha senha
          </button>
        </form>
        )}

        <div className="mt-8 border-t border-zinc-800 pt-5">
          <div className="mt-3 flex justify-center">
            <div className="rounded-lg bg-white px-5 py-3 shadow-sm text-center">
              <BrandPoweredBy imageClassName="h-20 w-auto object-contain" />
            </div>
          </div>
        </div>
      </div>

      {showForgotPassword && !isResetMode && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-white">Recuperar senha</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Informe seu e-mail para receber as instruções de acesso.
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-300">E-mail</label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {resetError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {resetError}
                </div>
              )}

              {resetMessage && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  {resetMessage}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="flex-1 rounded-lg border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="flex-1 rounded-lg bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resetSubmitting ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
