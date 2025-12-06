import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { NotionIntegration } from '@/lib/integrations/notion';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant_id from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const tenant_id = profile.tenant_id;

    // Create state parameter for CSRF protection
    const state = Buffer.from(JSON.stringify({ tenant_id })).toString('base64');

    // Get authorization URL
    const authUrl = NotionIntegration.getAuthorizationUrl(state);

    // Redirect to Notion OAuth consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Notion OAuth initiation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
