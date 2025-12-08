import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { GoogleDocsIntegration } from '@/lib/integrations/google-docs';

export async function GET(request: NextRequest) {
  console.log('[GOOGLE DOCS AUTH] Route hit');
  try {
    const supabase = await createServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const state = Buffer.from(JSON.stringify({ tenant_id: profile.tenant_id })).toString('base64');
    const authUrl = GoogleDocsIntegration.getAuthorizationUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Google Docs OAuth error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
