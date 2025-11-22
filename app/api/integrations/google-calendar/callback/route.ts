import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { GoogleCalendarIntegration } from '@/lib/integrations/google-calendar';
import { encryptCredentials } from '@/lib/integrations/encryption';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(`/integrations?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/integrations?error=missing_code', request.url)
      );
    }

    // Verify state matches (CSRF protection)
    // In a real implementation, you'd store the state in a session/cookie and verify it here
    // For now, we'll parse it to get tenant_id
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { tenant_id } = stateData;

    if (!tenant_id) {
      return NextResponse.redirect(
        new URL('/integrations?error=invalid_state', request.url)
      );
    }

    // Exchange code for tokens
    const tokenData = await GoogleCalendarIntegration.exchangeCodeForToken(code);
    console.log('[OAUTH] Token data received:', { 
      has_access_token: !!tokenData.access_token,
      has_refresh_token: !!tokenData.refresh_token,
      expires_in: tokenData.expires_in 
    });

    // Use service role client to bypass RLS for integration creation
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Encrypt the credentials
    const credentials = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: Date.now() + tokenData.expires_in * 1000,
    };
    
    console.log('[OAUTH] Credentials to encrypt:', {
      has_access_token: !!credentials.access_token,
      has_refresh_token: !!credentials.refresh_token,
      token_expires_at: credentials.token_expires_at
    });
    
    const encryptedCredentials = await encryptCredentials(credentials);
    console.log('[OAUTH] Encrypted credentials length:', encryptedCredentials?.length || 0);

    // Create or update the integration
    const { data, error: dbError } = await supabase
      .from('integrations')
      .insert({
        tenant_id,
        provider: 'google_calendar',
        type: 'calendar',
        status: 'connected',
        credentials: encryptedCredentials,
        config: {},
      })
      .select()
      .single();

    console.log('[OAUTH] Database insert result:', { success: !dbError, hasData: !!data });

    if (dbError) {
      console.error('Failed to save integration:', dbError);
      return NextResponse.redirect(
        new URL('/integrations?error=database_error', request.url)
      );
    }

    // Redirect back to integrations page with success
    return NextResponse.redirect(
      new URL('/integrations?success=google_calendar_connected', request.url)
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/integrations?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`,
        request.url
      )
    );
  }
}
