'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader, Loader2 } from 'lucide-react';

const countries = [
  "United States",
  "India",
  "Brazil",
  "Indonesia",
  "Philippines",
  "United Kingdom",
  "Canada",
  "Nigeria"
];

export default function ProfilePage() {
  const [profile, setProfile] = useState({ name: '', country: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!session) return router.push('/auth/login');

        const { data, error: fetchError } = await supabase
          .from('user_profiles')
          .select('name, country')
          .eq('id', session.user.id)
          .single();

        if (fetchError?.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              id: session.user.id,
              email: session.user.email,
              name: '',
              country: '',
              credits: 20
            });

          if (insertError) {
            throw new Error(`Profile creation failed: ${insertError.message}`);
          }
          setProfile({ name: '', country: '' });
        } else if (fetchError) {
          throw new Error(fetchError.message);
        } else {
          setProfile(data || { name: '', country: '' });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router, supabase]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }

      if (!profile.name.trim()) {
        setError('Name is required');
        return;
      }

      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          id: session.user.id,
          name: profile.name.trim(),
          country: profile.country,
          email: session.user.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-white text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 md:px-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="ml-4 text-2xl font-bold tracking-wide">Edit Your Profile</h1>
        </div>

        {error && (
          <div className="bg-red-600/10 border border-red-600 px-4 py-3 rounded-lg mb-6 flex items-start">
            <svg className="h-5 w-5 mt-0.5 mr-2 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-400">Error</h3>
              <p className="text-sm text-red-300 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-600/10 border border-green-600 px-4 py-3 rounded-lg mb-6 flex items-start">
            <svg className="h-5 w-5 mt-0.5 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-green-400">Success</h3>
              <p className="text-sm text-green-300 mt-0.5">{success}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Your full name"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="country" className="block text-sm font-medium">
              Country
            </label>
            <select
              id="country"
              value={profile.country}
              onChange={(e) => setProfile({ ...profile, country: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="">Select your country</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium flex items-center justify-center transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
