import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Exchange the code for a session
    await supabase.auth.exchangeCodeForSession(code);

    // For OAuth logins, update user profile if needed
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Check if user's profile already has a name and country
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name, country')
        .eq('id', user.id)
        .single();

      // If name or country is missing, try to get from user metadata
      if ((!profile?.name || !profile?.country) && user.user_metadata) {
        const updateData: { name?: string; country?: string } = {};
        
        // Get name from OAuth provider if available
        if (!profile?.name && user.user_metadata.full_name) {
          updateData.name = user.user_metadata.full_name;
        } else if (!profile?.name && user.user_metadata.name) {
          updateData.name = user.user_metadata.name;
        }

        // We could attempt to get country via IP geolocation here
        // but for simplicity, we'll let the user update it later if needed

        // Update the profile if we have new data
        if (Object.keys(updateData).length > 0) {
          await supabase
            .from('user_profiles')
            .update(updateData)
            .eq('id', user.id);
        }
      }
    }
  }

  // Redirect to dashboard or the appropriate page
  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
}