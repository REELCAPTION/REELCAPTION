'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/post-login');
      }
    };

    checkSession();
  }, [supabase, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        router.push('/post-login');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred during login');
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://reelcaption.in/auth/callback', // correct URL for production
        },
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred during Google login');
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
      <div className="w-full max-w-md space-y-8 bg-gray-900 p-8 rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Log In</h1>
          <p className="mt-2 text-gray-400">Log in to access your REELCAPTION account</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-300 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white p-2"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white p-2"
                placeholder="••••••••"
                minLength={8}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </div>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-gray-900 px-2 text-gray-400">Or continue with</span>
          </div>
        </div>

        <div>
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="group relative flex w-full justify-center items-center rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Logging in with Google...</span>
            ) : (
              <>
                <svg className="h-5 w-5 text-white mr-2" viewBox="0 0 48 48" fill="none">
                  <path
                    fill="currentColor"
                    d="M23.49 12.3c0-.77-.07-1.5-.2-2.19H12.8v4.26h5.51c-2.42 2-5.96 2.57-8.51 1.04v4.22c2.48 1.45 5.51 1.25 7.73-.47 2.22-1.72 3.47-4.59 3.47-7.86z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </button>
        </div>

        <div className="mt-4 text-center text-sm">
          Don't have an account?{' '}
          <Link href="/signup" className="text-indigo-400 hover:text-indigo-300">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
