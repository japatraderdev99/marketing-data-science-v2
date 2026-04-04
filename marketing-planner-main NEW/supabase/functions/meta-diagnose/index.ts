import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get('META_ACCESS_TOKEN');
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'META_ACCESS_TOKEN not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: Record<string, unknown> = {};

    // 1. Check token debug info (permissions)
    const appId = Deno.env.get('META_APP_ID') || '';
    const appSecret = Deno.env.get('META_APP_SECRET') || '';

    // Get token permissions
    const permUrl = `https://graph.facebook.com/v21.0/me/permissions?access_token=${token}`;
    const permRes = await fetch(permUrl);
    const permData = await permRes.json();
    results.permissions = permData;

    // 2. Get user/page info
    const meUrl = `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${token}`;
    const meRes = await fetch(meUrl);
    const meData = await meRes.json();
    results.me = meData;

    // 3. List pages the token has access to
    const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${token}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();
    results.pages = pagesData;

    // 4. List ad accounts
    const adAccountsUrl = `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status&access_token=${token}`;
    const adAccountsRes = await fetch(adAccountsUrl);
    const adAccountsData = await adAccountsRes.json();
    results.adAccounts = adAccountsData;

    // 5. Debug token info (expiry, scopes)
    if (appId && appSecret) {
      const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`;
      const debugRes = await fetch(debugUrl);
      const debugData = await debugRes.json();
      results.tokenDebug = debugData;
    }

    // Summary
    const perms = (permData?.data || [])
      .filter((p: any) => p.status === 'granted')
      .map((p: any) => p.permission);

    const pages = (pagesData?.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      hasInstagram: !!p.instagram_business_account,
      instagramId: p.instagram_business_account?.id,
      instagramUsername: p.instagram_business_account?.username,
    }));

    const adAccounts = (adAccountsData?.data || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      status: a.account_status,
    }));

    const tokenExpiry = results.tokenDebug
      ? (results.tokenDebug as any)?.data?.expires_at
        ? new Date((results.tokenDebug as any).data.expires_at * 1000).toISOString()
        : 'never (long-lived)'
      : 'unknown (no app credentials to check)';

    const summary = {
      tokenValid: !meData.error,
      tokenOwner: meData.name || meData.error?.message,
      tokenExpiry,
      grantedPermissions: perms,
      pagesAccessible: pages,
      adAccountsAccessible: adAccounts,
      canReadOrganicInstagram: perms.includes('instagram_basic') || perms.includes('instagram_manage_insights'),
      canReadOrganicFacebook: perms.includes('pages_read_engagement') || perms.includes('read_insights'),
      canReadAds: perms.includes('ads_read'),
      missingForOrganic: [
        !perms.includes('instagram_basic') && 'instagram_basic',
        !perms.includes('instagram_manage_insights') && 'instagram_manage_insights',
        !perms.includes('pages_read_engagement') && 'pages_read_engagement',
        !perms.includes('read_insights') && 'read_insights',
      ].filter(Boolean),
    };

    return new Response(JSON.stringify({ success: true, summary, raw: results }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
