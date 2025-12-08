import { NextRequest, NextResponse } from 'next/server';
import { GmailIntegration } from '@/lib/integrations/gmail';
import { encryptCredentials } from '@/lib/integrations/encryption';

export async function GET(request: NextRequest) {
  console.log('[GMAIL CALLBACK] Route hit - /api/integrations/gmail/callback');
  console.log('[GMAIL CALLBACK] URL:', request.url);
  
  try {
    // Get the app base URL for redirects
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXT_PUBLIC_SITE_URL ||
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(`/integrations?error=${encodeURIComponent(error)}`, appUrl)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/integrations?error=missing_code', appUrl)
      );
    }

    // Verify state matches (CSRF protection)
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { tenant_id } = stateData;

    if (!tenant_id) {
      return NextResponse.redirect(
        new URL('/integrations?error=invalid_state', appUrl)
      );
    }

    // Exchange code for tokens
    const tokenData = await GmailIntegration.exchangeCodeForToken(code);
    console.log('[GMAIL CALLBACK] Token data received:', { 
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
    
    const encryptedCredentials = await encryptCredentials(credentials);
    console.log('[GMAIL CALLBACK] Encrypted credentials length:', encryptedCredentials?.length || 0);

    // Check if integration already exists for this tenant
    const { data: existing } = await supabase
      .from('integrations')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('provider', 'gmail')
      .single();

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('integrations')
        .update({
          status: 'connected',
          credentials: encryptedCredentials,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Failed to update integration:', updateError);
        return NextResponse.redirect(
          new URL('/integrations?error=database_error', appUrl)
        );
      }
    } else {
      // Create new
      const { error: dbError } = await supabase
        .from('integrations')
        .insert({
          tenant_id,
          provider: 'gmail',
          type: 'email',
          status: 'connected',
          credentials: encryptedCredentials,
          config: {},
        });

      if (dbError) {
        console.error('Failed to save integration:', dbError);
        return NextResponse.redirect(
          new URL('/integrations?error=database_error', appUrl)
        );
      }
    }

    // Redirect back to integrations page with success
    return NextResponse.redirect(
      new URL('/integrations?success=gmail_connected', appUrl)
    );
  } catch (error) {
    console.error('Gmail OAuth callback error:', error);
    
    // Get app URL for error redirect
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXT_PUBLIC_SITE_URL ||
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    return NextResponse.redirect(
      new URL(
        `/integrations?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`,
        appUrl
      )
    );
  }
}
