import { NextRequest, NextResponse } from 'next/server';
import { NotionIntegration } from '@/lib/integrations/notion';
import { encryptCredentials } from '@/lib/integrations/encryption';

export async function GET(request: NextRequest) {
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
    const tokenData = await NotionIntegration.exchangeCodeForToken(code);
    console.log('[NOTION OAUTH] Token data received:', { 
      has_access_token: !!tokenData.access_token,
      workspace_id: tokenData.workspace_id,
      workspace_name: tokenData.workspace_name,
      bot_id: tokenData.bot_id
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
    
    // Notion tokens don't expire (until revoked)
    const credentials = {
      access_token: tokenData.access_token,
      workspace_id: tokenData.workspace_id,
      workspace_name: tokenData.workspace_name,
      bot_id: tokenData.bot_id,
    };
    
    console.log('[NOTION OAUTH] Credentials to encrypt:', {
      has_access_token: !!credentials.access_token,
      workspace_id: credentials.workspace_id
    });
    
    const encryptedCredentials = await encryptCredentials(credentials);
    console.log('[NOTION OAUTH] Encrypted credentials length:', encryptedCredentials?.length || 0);

    // Check if integration already exists for this tenant
    const { data: existing } = await supabase
      .from('integrations')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('provider', 'notion')
      .single();

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('integrations')
        .update({
          status: 'connected',
          credentials: encryptedCredentials,
          config: { workspace_name: tokenData.workspace_name },
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
          provider: 'notion',
          type: 'document',
          status: 'connected',
          credentials: encryptedCredentials,
          config: { workspace_name: tokenData.workspace_name },
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
      new URL('/integrations?success=notion_connected', appUrl)
    );
  } catch (error) {
    console.error('Notion OAuth callback error:', error);
    
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
