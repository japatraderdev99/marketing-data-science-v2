import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { resolveWorkspace } from '../_shared/workspace.ts';

const GRAPH_API = 'https://graph.facebook.com/v21.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get('META_ACCESS_TOKEN');
    if (!token) return errorResponse('META_ACCESS_TOKEN not configured');

    const ctx = await resolveWorkspace(req);
    if (!ctx) return errorResponse('Unauthorized — workspace not found', 401);
    const { workspaceId, supabase } = ctx;

    const body = await req.json().catch(() => ({}));
    const syncType = body.sync_type || 'organic';
    const postLimit = body.limit || 50;
    const targetAdAccountId = body.ad_account_id || null;
    const listAccountsOnly = body.list_accounts || false;

    const results: Record<string, unknown> = { synced_posts: 0, synced_ads: 0, errors: [] };

    // 1. Discover Page + IG Account
    const pagesRes = await fetch(
      `${GRAPH_API}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${token}`,
    );
    const pagesData = await pagesRes.json();

    if (!pagesData.data?.length) {
      return errorResponse('No Facebook Pages found for this token', 400);
    }

    const page = pagesData.data[0];
    const pageToken = page.access_token || token;
    const igAccount = page.instagram_business_account;

    if (!igAccount?.id) {
      return errorResponse('No Instagram Business Account linked to page: ' + page.name, 400);
    }

    results.page_name = page.name;
    results.ig_account_id = igAccount.id;
    results.ig_username = igAccount.username;

    // List ad accounts only
    if (listAccountsOnly) {
      const adAccountsRes = await fetch(
        `${GRAPH_API}/me/adaccounts?fields=id,name,account_status&limit=50&access_token=${token}`,
      );
      const adAccountsData = await adAccountsRes.json();
      return jsonResponse({
        success: true,
        ad_accounts: (adAccountsData.data || []).map((a: any) => ({
          id: a.id, name: a.name, status: a.account_status,
          status_label: a.account_status === 1 ? 'Ativa' : a.account_status === 3 ? 'Desativada' : 'Outro',
        })),
      });
    }

    // 2. Fetch IG Profile Info
    try {
      const profileRes = await fetch(
        `${GRAPH_API}/${igAccount.id}?fields=username,name,biography,followers_count,follows_count,media_count,profile_picture_url&access_token=${token}`,
      );
      const profileData = await profileRes.json();
      if (profileData && !profileData.error) {
        results.profile = {
          username: profileData.username || igAccount.username,
          name: profileData.name || '',
          biography: profileData.biography || '',
          followers_count: profileData.followers_count || 0,
          follows_count: profileData.follows_count || 0,
          media_count: profileData.media_count || 0,
          profile_picture_url: profileData.profile_picture_url || '',
        };
      }
    } catch (profileErr) {
      (results.errors as string[]).push(`Profile: ${profileErr instanceof Error ? profileErr.message : 'unknown'}`);
    }

    // 3. Sync Organic Posts
    if (syncType === 'organic' || syncType === 'all') {
      const syncedCount = await syncOrganicPosts(
        igAccount.id, token, postLimit, workspaceId, supabase, results.errors as string[],
      );
      results.synced_posts = syncedCount.synced;
      results.total_found = syncedCount.total;
    }

    // 4. Sync Ads
    if (syncType === 'ads' || syncType === 'all') {
      const adResult = await syncAds(
        token, targetAdAccountId, workspaceId, supabase, results.errors as string[],
      );
      Object.assign(results, adResult);
    }

    return jsonResponse({ success: true, ...results });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
});

async function syncOrganicPosts(
  igId: string, token: string, limit: number, workspaceId: string,
  supabase: any, errors: string[],
): Promise<{ synced: number; total: number }> {
  const mediaRes = await fetch(
    `${GRAPH_API}/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${token}`,
  );
  const mediaData = await mediaRes.json();

  if (!mediaData.data) {
    errors.push('Failed to fetch media: ' + JSON.stringify(mediaData.error || mediaData));
    return { synced: 0, total: 0 };
  }

  let syncedCount = 0;
  for (const post of mediaData.data) {
    try {
      const isVideo = post.media_type === 'VIDEO' || post.media_type === 'REELS';
      const metrics = isVideo
        ? 'reach,saved,shares,ig_reels_aggregated_all_plays_count,total_interactions'
        : 'reach,saved,shares';

      let insightsData: any = { data: [] };
      try {
        const insightsRes = await fetch(`${GRAPH_API}/${post.id}/insights?metric=${metrics}&access_token=${token}`);
        insightsData = await insightsRes.json();
        if (insightsData.error) {
          errors.push(`Insights ${post.id}: ${insightsData.error.message}`);
          insightsData = { data: [] };
        }
      } catch { /* insights may fail for new posts */ }

      const getMetric = (name: string): number => {
        const m = insightsData.data?.find((x: any) => x.name === name);
        return m?.values?.[0]?.value || 0;
      };

      const likes = post.like_count || 0;
      const comments = post.comments_count || 0;
      const saves = getMetric('saved');
      const shares = getMetric('shares');
      const reach = getMetric('reach');

      const { error: upsertErr } = await supabase
        .from('instagram_posts')
        .upsert({
          workspace_id: workspaceId,
          instagram_media_id: post.id,
          instagram_account_id: igId,
          caption: post.caption || null,
          media_type: post.media_type,
          media_url: post.media_url || null,
          thumbnail_url: post.thumbnail_url || post.media_url || null,
          permalink: post.permalink || null,
          published_at: post.timestamp,
          likes, comments, impressions: reach, reach, saves, shares,
          video_views: isVideo ? getMetric('ig_reels_aggregated_all_plays_count') : 0,
          engagement: likes + comments + saves + shares,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id,instagram_media_id' });

      if (upsertErr) errors.push(`Post ${post.id}: ${upsertErr.message}`);
      else syncedCount++;
    } catch (postErr) {
      errors.push(`Post ${post.id}: ${postErr instanceof Error ? postErr.message : 'unknown'}`);
    }
  }

  return { synced: syncedCount, total: mediaData.data.length };
}

async function syncAds(
  token: string, targetAdAccountId: string | null, workspaceId: string,
  supabase: any, errors: string[],
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = { synced_ads: 0 };

  let adAccount: { id: string; name: string } | null = null;
  if (targetAdAccountId) {
    adAccount = { id: targetAdAccountId, name: targetAdAccountId };
  } else {
    const res = await fetch(`${GRAPH_API}/me/adaccounts?fields=id,name,account_status&access_token=${token}`);
    const data = await res.json();
    if (data.data?.length) adAccount = data.data[0];
  }

  if (!adAccount) return result;

  const adsRes = await fetch(
    `${GRAPH_API}/${adAccount.id}/insights?level=ad&fields=ad_id,ad_name,adset_id,campaign_id,campaign_name,impressions,clicks,spend,cpc,cpm,ctr,actions&date_preset=last_30d&limit=50&access_token=${token}`,
  );
  const adsData = await adsRes.json();
  if (!adsData.data) return result;

  // Fetch creative details in batches of 10
  const uniqueAdIds = [...new Set(adsData.data.map((a: any) => a.ad_id))] as string[];
  const creativeDetails = new Map<string, { image_url?: string; thumbnail_url?: string; body?: string; title?: string }>();

  for (let i = 0; i < uniqueAdIds.length; i += 10) {
    const batch = uniqueAdIds.slice(i, i + 10);
    await Promise.all(batch.map(async (adId) => {
      try {
        const res = await fetch(`${GRAPH_API}/${adId}?fields=creative{image_url,thumbnail_url,body,title}&access_token=${token}`);
        const data = await res.json();
        if (data.creative) {
          creativeDetails.set(adId, {
            image_url: data.creative.image_url, thumbnail_url: data.creative.thumbnail_url,
            body: data.creative.body, title: data.creative.title,
          });
        }
      } catch { /* skip */ }
    }));
  }

  // Delete existing rows for this workspace+ad_account then insert fresh
  await supabase.from('meta_ads_performance').delete()
    .eq('workspace_id', workspaceId).eq('ad_account_id', adAccount.id);

  const adRows: Record<string, unknown>[] = [];
  for (const ad of adsData.data) {
    const conversions = ad.actions?.find((a: any) => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0;
    const creative = creativeDetails.get(ad.ad_id);

    adRows.push({
      workspace_id: workspaceId,
      ad_id: ad.ad_id, ad_name: ad.ad_name, adset_id: ad.adset_id,
      campaign_id: ad.campaign_id, campaign_name: ad.campaign_name,
      ad_account_id: adAccount.id,
      impressions: parseInt(ad.impressions) || 0,
      clicks: parseInt(ad.clicks) || 0,
      spend: parseFloat(ad.spend) || 0,
      cpc: parseFloat(ad.cpc) || 0,
      cpm: parseFloat(ad.cpm) || 0,
      ctr: parseFloat(ad.ctr) || 0,
      conversions: parseInt(conversions),
      metric_date: ad.date_start,
      date_start: ad.date_start, date_stop: ad.date_stop,
      creative_url: creative?.image_url || null,
      thumbnail_url: creative?.thumbnail_url || creative?.image_url || null,
      ad_body: creative?.body || null, ad_title: creative?.title || null,
      synced_at: new Date().toISOString(),
    });
  }

  let adsSynced = 0;
  for (let i = 0; i < adRows.length; i += 500) {
    const chunk = adRows.slice(i, i + 500);
    const { error } = await supabase.from('meta_ads_performance').insert(chunk);
    if (!error) adsSynced += chunk.length;
  }

  result.synced_ads = adsSynced;
  result.ad_account_name = adAccount.name;
  result.ad_account_id = adAccount.id;
  result.creatives_enriched = creativeDetails.size;
  return result;
}
