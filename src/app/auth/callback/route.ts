import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (!code) {
    console.error('❌ No OAuth code in URL');
    return NextResponse.redirect(new URL('/', requestUrl.origin));
  }

  const supabase = createRouteHandlerClient({ cookies });

  try {
    // Step 1: Exchange code for session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error('❌ Session exchange error:', exchangeError.message);
      return NextResponse.redirect(new URL('/', requestUrl.origin));
    }

    // Step 2: Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Failed to retrieve user:', userError?.message || 'No user');
      return NextResponse.redirect(new URL('/', requestUrl.origin));
    }

    // Step 3: Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('name, country')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // Not found is acceptable
      console.error('❌ Failed to fetch profile:', profileError.message);
      return NextResponse.redirect(new URL('/', requestUrl.origin));
    }

    // Step 4: Update missing data
    const updateData: { name?: string } = {};
    const meta = user.user_metadata;

    if ((!profile?.name) && (meta?.full_name || meta?.name)) {
      updateData.name = meta.full_name || meta.name;
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Profile update error:', updateError.message);
        return NextResponse.redirect(new URL('/', requestUrl.origin));
      }
    }

    // Step 5: Verify session and redirect
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ Session missing after exchange');
      return NextResponse.redirect(new URL('/', requestUrl.origin));
    }

    console.log('✅ Google login success. Redirecting to dashboard.');
    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
  } catch (error: any) {
    console.error('❌ Unexpected error during OAuth callback:', error.message || error);
    return NextResponse.redirect(new URL('/', requestUrl.origin));
  }
}
