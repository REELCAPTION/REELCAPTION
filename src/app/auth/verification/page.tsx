'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Verification() {
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // If no session, redirect to login
        router.push('/auth/login');
        return;
      }
      
      if (session.user.email) {
        setEmail(session.user.email);
      }
      
      // If the email is already confirmed, redirect to dashboard
      if (session.user.email_confirmed_at) {
        router.push('/post-login');
        return;
      }
      
      setIsLoading(false);
    };
    
    checkUser();
  }, [supabase, router]);

  const handleResendEmail = async () => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email as string,
      });
      
      if (error) {
        throw error;
      }
      
      alert('Verification email has been resent!');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
        <div className="w-full max-w-md space-y-8 bg-gray-900 p-8 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
      <div className="w-full max-w-md space-y-8 bg-gray-900 p-8 rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Verify Your Email</h1>
          <div className="mt-6 flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-indigo-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-lg text-gray-300">
            We've sent a verification email to:
          </p>
          <p className="mt-2 text-xl font-semibold text-indigo-400">
            {email}
          </p>
          <p className="mt-4 text-gray-400">
            Please check your inbox and click the verification link to complete your registration.
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <button
            onClick={handleResendEmail}
            disabled={isLoading}
            className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Resend verification email'}
          </button>
          
          <p className="text-center text-sm text-gray-400">
            Already verified?{' '}
            <Link href="/auth/login" className="font-medium text-indigo-400 hover:text-indigo-300">
              Sign in
            </Link>
          </p>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-700">
          <h2 className="text-lg font-medium text-gray-300">Didn't receive the email?</h2>
          <ul className="mt-4 list-disc pl-5 space-y-2 text-sm text-gray-400">
            <li>Check your spam or junk folder</li>
            <li>Verify you entered the correct email address</li>
            <li>Allow some time for the email to arrive</li>
            <li>If you still haven't received it, try resending the verification email</li>
          </ul>
        </div>
      </div>
    </div>
  );
}