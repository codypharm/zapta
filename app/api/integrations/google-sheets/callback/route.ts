import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsIntegration } from '@/lib/integrations/google-sheets';
import { encryptCredentials } from '@/lib/integrations/encryption';

export async function GET(request: NextRequest) {
  console.log('[GOOGLE SHEETS CALLBACK] Route hit');
  
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL(`/integrations?error=${encodeURIComponent(error)}`, appUrl));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/integrations?error=missing_code', appUrl));
    }

    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { tenant_id } = stateData;

    if (!tenant_id) {
      return NextResponse.redirect(new URL('/integrations?error=invalid_state', appUrl));
    }

    const tokenData = await GoogleSheetsIntegration.exchangeCodeForToken(code);
    console.log('[GOOGLE SHEETS CALLBACK] Token received');

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const credentials = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: Date.now() + tokenData.expires_in * 1000,
    };
    
    const encryptedCredentials = await encryptCredentials(credentials);

    const { data: existing } = await supabase
      .from('integrations')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('provider', 'google_sheets')
      .single();

    if (existing) {
      await supabase
        .from('integrations')
        .update({
          status: 'connected',
          credentials: encryptedCredentials,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('integrations')
        .insert({
          tenant_id,
          provider: 'google_sheets',
          type: 'document',
          status: 'connected',
          credentials: encryptedCredentials,
          config: {},
        });
    }

    return NextResponse.redirect(new URL('/integrations?success=google_sheets_connected', appUrl));
  } catch (error) {
    console.error('Google Sheets callback error:', error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`, appUrl)
    );
  }
}
