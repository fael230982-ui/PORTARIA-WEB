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
import { login as loginService } from '@/services/auth.service';

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

        <h1 className="mb-6 text-2xl font-bold text-white">Entrar</h1>

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
        </form>

        <div className="mt-8 border-t border-zinc-800 pt-5">
          <div className="mt-3 flex justify-center">
            <div className="rounded-lg bg-white px-5 py-3 shadow-sm text-center">
              <BrandPoweredBy imageClassName="h-20 w-auto object-contain" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
