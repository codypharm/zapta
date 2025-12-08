import { NextRequest, NextResponse } from 'next/server';
import { SlackIntegration } from '@/lib/integrations/slack';
import { encryptCredentials } from '@/lib/integrations/encryption';
import { createClient } from '@supabase/supabase-js';

// Use service role for callback (user might not be authenticated in this context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  console.log('[SLACK CALLBACK] Route hit');
  
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

    // Decode state to get tenant_id
    let stateData: { tenant_id: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (e) {
      return NextResponse.redirect(new URL('/integrations?error=invalid_state', appUrl));
    }

    // Exchange code for token
    const tokenData = await SlackIntegration.exchangeCodeForToken(code);
    
    console.log('[SLACK CALLBACK] Token obtained for team:', tokenData.team_name);

    // Encrypt credentials
    const encryptedCredentials = encryptCredentials({
      access_token: tokenData.access_token,
      team_id: tokenData.team_id,
      team_name: tokenData.team_name,
      bot_user_id: tokenData.bot_user_id,
      scope: tokenData.scope,
    });

    // Check for existing integration
    const { data: existing } = await supabase
      .from('integrations')
      .select('id')
      .eq('tenant_id', stateData.tenant_id)
      .eq('provider', 'slack')
      .maybeSingle();

    if (existing) {
      // Update existing integration
      await supabase
        .from('integrations')
        .update({
          credentials: encryptedCredentials,
          status: 'connected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Create new integration
      await supabase
        .from('integrations')
        .insert({
          tenant_id: stateData.tenant_id,
          provider: 'slack',
          type: 'slack',
          status: 'connected',
          credentials: encryptedCredentials,
          config: {
            team_name: tokenData.team_name,
          },
        });
    }

    return NextResponse.redirect(new URL('/integrations?success=slack_connected', appUrl));
  } catch (error) {
    console.error('Slack callback error:', error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`, appUrl)
    );
  }
}
