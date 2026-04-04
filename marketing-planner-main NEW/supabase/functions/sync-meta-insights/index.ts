import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GRAPH_API = 'https://graph.facebook.com/v21.0';

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data: { user } } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id || null;
    }

    const body = await req.json().catch(() => ({}));
    const syncType = body.sync_type || 'organic';
    const postLimit = body.limit || 50;
    const targetAdAccountId = body.ad_account_id || null; // allow selecting specific ad account
    const listAccountsOnly = body.list_accounts || false;

    const results: Record<string, unknown> = { synced_posts: 0, synced_ads: 0, errors: [] };

    // 1. Discover Page + IG Account
    const pagesRes = await fetch(`${GRAPH_API}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${token}`);
    const pagesData = await pagesRes.json();
    
    if (!pagesData.data?.length) {
      return new Response(JSON.stringify({ success: false, error: 'No Facebook Pages found for this token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const page = pagesData.data[0];
    const pageToken = page.access_token || token;
    const igAccount = page.instagram_business_account;

    if (!igAccount?.id) {
      return new Response(JSON.stringify({ success: false, error: 'No Instagram Business Account linked to page: ' + page.name }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    results.page_name = page.name;
    results.ig_account_id = igAccount.id;
    results.ig_username = igAccount.username;

    // If just listing ad accounts, return them
    if (listAccountsOnly) {
      const adAccountsRes = await fetch(
        `${GRAPH_API}/me/adaccounts?fields=id,name,account_status&limit=50&access_token=${token}`
      );
      const adAccountsData = await adAccountsRes.json();
      return new Response(JSON.stringify({ 
        success: true, 
        ad_accounts: (adAccountsData.data || []).map((a: any) => ({
          id: a.id, name: a.name, status: a.account_status,
          status_label: a.account_status === 1 ? 'Ativa' : a.account_status === 3 ? 'Desativada' : a.account_status === 101 ? 'Fechada' : 'Outro'
        }))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch IG Profile Info (followers, bio, avatar, etc.)
    try {
      const profileRes = await fetch(
        `${GRAPH_API}/${igAccount.id}?fields=username,name,biography,followers_count,follows_count,media_count,profile_picture_url&access_token=${token}`
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
      (results.errors as string[]).push(`Profile fetch: ${profileErr instanceof Error ? profileErr.message : 'unknown'}`);
    }

    // 3. Sync Organic Posts
    if (syncType === 'organic' || syncType === 'all') {
      const mediaRes = await fetch(
        `${GRAPH_API}/${igAccount.id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${postLimit}&access_token=${token}`
      );
      const mediaData = await mediaRes.json();

      if (!mediaData.data) {
        (results.errors as string[]).push('Failed to fetch media: ' + JSON.stringify(mediaData.error || mediaData));
      } else {
        let syncedCount = 0;

        for (const post of mediaData.data) {
          try {
            // Fetch insights for each post
            const isVideo = post.media_type === 'VIDEO' || post.media_type === 'REELS';
            // v21.0+ compatible metrics
            const metrics = isVideo
              ? 'reach,saved,shares,ig_reels_aggregated_all_plays_count,total_interactions'
              : 'reach,saved,shares';

            let insightsData: any = { data: [] };
            try {
              const insightsRes = await fetch(
                `${GRAPH_API}/${post.id}/insights?metric=${metrics}&access_token=${token}`
              );
              insightsData = await insightsRes.json();
              if (insightsData.error) {
                // Log but continue - some posts may not have insights available
                (results.errors as string[]).push(`Insights ${post.id}: ${insightsData.error.message}`);
                insightsData = { data: [] };
              }
            } catch (_insightErr) {
              // Insights may fail for very new posts
            }

            const getMetric = (name: string): number => {
              const metric = insightsData.data?.find((m: any) => m.name === name);
              return metric?.values?.[0]?.value || 0;
            };

            const likes = post.like_count || 0;
            const comments = post.comments_count || 0;
            const saves = getMetric('saved');
            const shares = getMetric('shares');
            const reach = getMetric('reach');
            const impressions = reach; // impressions deprecated in v21+, use reach as proxy

            const postRow: Record<string, unknown> = {
              instagram_media_id: post.id,
              instagram_account_id: igAccount.id,
              caption: post.caption || null,
              media_type: post.media_type,
              media_url: post.media_url || null,
              thumbnail_url: post.thumbnail_url || post.media_url || null,
              permalink: post.permalink || null,
              published_at: post.timestamp,
              likes,
              comments,
              impressions,
              reach,
              saves,
              shares,
              video_views: isVideo ? getMetric('ig_reels_aggregated_all_plays_count') : 0,
              engagement: likes + comments + saves + shares,
              synced_at: new Date().toISOString(),
            };

            if (userId) {
              postRow.user_id = userId;
            }

            const { error: upsertErr } = await supabase
              .from('instagram_posts')
              .upsert(postRow, { onConflict: 'instagram_media_id' });

            if (upsertErr) {
              (results.errors as string[]).push(`Post ${post.id}: ${upsertErr.message}`);
            } else {
              syncedCount++;
            }
          } catch (postErr) {
            (results.errors as string[]).push(`Post ${post.id}: ${postErr instanceof Error ? postErr.message : 'unknown'}`);
          }
        }

        results.synced_posts = syncedCount;
        results.total_found = mediaData.data.length;
      }
    }

    // 4. Sync Ads (if requested)
    if (syncType === 'ads' || syncType === 'all') {
      try {
        let adAccount: { id: string; name: string } | null = null;

        if (targetAdAccountId) {
          adAccount = { id: targetAdAccountId, name: targetAdAccountId };
        } else {
          const adAccountsRes = await fetch(
            `${GRAPH_API}/me/adaccounts?fields=id,name,account_status&access_token=${token}`
          );
          const adAccountsData = await adAccountsRes.json();
          if (adAccountsData.data?.length) {
            adAccount = adAccountsData.data[0];
          }
        }

        if (adAccount) {
          
          const adsRes = await fetch(
            `${GRAPH_API}/${adAccount.id}/insights?level=ad&fields=ad_id,ad_name,adset_id,campaign_id,campaign_name,impressions,clicks,spend,cpc,cpm,ctr,actions&date_preset=last_30d&limit=50&access_token=${token}`
          );
          const adsData = await adsRes.json();

          if (adsData.data) {
            let adsSynced = 0;
            // Collect unique ad_ids to fetch creative details
            const uniqueAdIds = [...new Set(adsData.data.map((a: any) => a.ad_id))];
            
            // Batch fetch creative details (image_url, body, title)
            const creativeDetails = new Map<string, { image_url?: string; thumbnail_url?: string; body?: string; title?: string }>();
            for (let i = 0; i < uniqueAdIds.length; i += 10) {
              const batch = uniqueAdIds.slice(i, i + 10);
              const batchPromises = batch.map(async (adId: string) => {
                try {
                  const res = await fetch(
                    `${GRAPH_API}/${adId}?fields=creative{image_url,thumbnail_url,body,title,object_story_spec}&access_token=${token}`
                  );
                  const data = await res.json();
                  if (data.creative) {
                    creativeDetails.set(adId, {
                      image_url: data.creative.image_url || undefined,
                      thumbnail_url: data.creative.thumbnail_url || undefined,
                      body: data.creative.body || undefined,
                      title: data.creative.title || undefined,
                    });
                  }
                } catch (_) { /* skip failed creative fetches */ }
              });
              await Promise.all(batchPromises);
            }

            // Delete existing rows for this ad account to prevent duplicates
            if (userId) {
              await supabase
                .from('meta_ads_performance')
                .delete()
                .eq('user_id', userId)
                .eq('ad_account_id', adAccount.id);
            }

            const adRows: Record<string, unknown>[] = [];
            for (const ad of adsData.data) {
              const conversions = ad.actions?.find((a: any) => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0;
              const creative = creativeDetails.get(ad.ad_id);
              
              adRows.push({
                user_id: userId,
                ad_id: ad.ad_id,
                ad_name: ad.ad_name,
                adset_id: ad.adset_id,
                campaign_id: ad.campaign_id,
                campaign_name: ad.campaign_name,
                ad_account_id: adAccount.id,
                impressions: parseInt(ad.impressions) || 0,
                clicks: parseInt(ad.clicks) || 0,
                spend: parseFloat(ad.spend) || 0,
                cpc: parseFloat(ad.cpc) || 0,
                cpm: parseFloat(ad.cpm) || 0,
                ctr: parseFloat(ad.ctr) || 0,
                conversions: parseInt(conversions),
                date_start: ad.date_start,
                date_stop: ad.date_stop,
                synced_at: new Date().toISOString(),
                creative_url: creative?.image_url || null,
                thumbnail_url: creative?.thumbnail_url || creative?.image_url || null,
                ad_body: creative?.body || null,
                ad_title: creative?.title || null,
              });
            }

            for (let i = 0; i < adRows.length; i += 500) {
              const chunk = adRows.slice(i, i + 500);
              const { error } = await supabase.from('meta_ads_performance').insert(chunk);
              if (!error) adsSynced += chunk.length;
            }
            results.synced_ads = adsSynced;
            results.ad_account_name = adAccount.name;
            results.ad_account_id = adAccount.id;
            results.creatives_enriched = creativeDetails.size;
          }
        }
      } catch (adsErr) {
        (results.errors as string[]).push(`Ads sync: ${adsErr instanceof Error ? adsErr.message : 'unknown'}`);
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
