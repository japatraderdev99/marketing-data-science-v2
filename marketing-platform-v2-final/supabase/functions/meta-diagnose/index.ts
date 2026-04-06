import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get('META_ACCESS_TOKEN');
    if (!token) return errorResponse('META_ACCESS_TOKEN not configured');

    const results: Record<string, unknown> = {};

    // 1. Token permissions
    const permRes = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${token}`);
    const permData = await permRes.json();
    results.permissions = permData;

    // 2. User/page info
    const meRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${token}`);
    const meData = await meRes.json();
    results.me = meData;

    // 3. Pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${token}`,
    );
    const pagesData = await pagesRes.json();
    results.pages = pagesData;

    // 4. Ad accounts
    const adAccountsRes = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status&access_token=${token}`,
    );
    const adAccountsData = await adAccountsRes.json();
    results.adAccounts = adAccountsData;

    // 5. Debug token
    const appId = Deno.env.get('META_APP_ID') || '';
    const appSecret = Deno.env.get('META_APP_SECRET') || '';
    if (appId && appSecret) {
      const debugRes = await fetch(
        `https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`,
      );
      results.tokenDebug = await debugRes.json();
    }

    // Summary
    const perms = (permData?.data || [])
      .filter((p: any) => p.status === 'granted')
      .map((p: any) => p.permission);

    const pages = (pagesData?.data || []).map((p: any) => ({
      id: p.id, name: p.name,
      hasInstagram: !!p.instagram_business_account,
      instagramId: p.instagram_business_account?.id,
      instagramUsername: p.instagram_business_account?.username,
    }));

    const adAccounts = (adAccountsData?.data || []).map((a: any) => ({
      id: a.id, name: a.name, status: a.account_status,
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
      canReadAds: perms.includes('ads_read'),
      missingForOrganic: [
        !perms.includes('instagram_basic') && 'instagram_basic',
        !perms.includes('instagram_manage_insights') && 'instagram_manage_insights',
        !perms.includes('pages_read_engagement') && 'pages_read_engagement',
      ].filter(Boolean),
    };

    return jsonResponse({ success: true, summary, raw: results });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
});
