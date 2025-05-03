import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  // If no code is present, redirect to home page
  if (!code) {
    console.error('No code in URL');
    return NextResponse.redirect(new URL('/', requestUrl.origin));
  }

  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      return NextResponse.redirect(new URL('/', requestUrl.origin)); // Redirect to home if exchange fails
    }

    // Retrieve the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Error retrieving user:', userError);
      return NextResponse.redirect(new URL('/', requestUrl.origin)); // Redirect to home if user retrieval fails
    }

    // Check if the user's profile already has a name and country
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('name, country')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.redirect(new URL('/', requestUrl.origin)); // Redirect to home if profile fetching fails
    }

    // If name or country is missing, try to get from user metadata
    if ((!profile?.name || !profile?.country) && user.user_metadata) {
      const updateData: { name?: string; country?: string } = {};

      // Get name from OAuth provider if available
      if (!profile?.name && user.user_metadata.full_name) {
        updateData.name = user.user_metadata.full_name;
      } else if (!profile?.name && user.user_metadata.name) {
        updateData.name = user.user_metadata.name;
      }

      // We could attempt to get country via IP geolocation here, but for simplicity, we'll let the user update it later if needed

      // Update the profile if we have new data
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating profile:', updateError);
          return NextResponse.redirect(new URL('/', requestUrl.origin)); // Redirect to home if update fails
        }
      }
    }

    // Ensure session is valid before redirecting
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No session found.');
      return NextResponse.redirect(new URL('/', requestUrl.origin)); // Redirect to home if session is invalid
    }

    // Redirect to the dashboard after successful login and profile setup
    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));

  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return NextResponse.redirect(new URL('/', requestUrl.origin)); // Redirect to home if an unexpected error occurs
  }
}
