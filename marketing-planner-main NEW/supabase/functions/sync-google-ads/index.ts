import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v19';

// Google Auth: get access token from service account JSON
async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  let sa: any;
  try {
    sa = JSON.parse(serviceAccountJson);
  } catch {
    try {
      sa = JSON.parse(atob(serviceAccountJson));
    } catch {
      try {
        sa = JSON.parse(serviceAccountJson.replace(/\\n/g, '\n').replace(/\\"/g, '"'));
      } catch {
        try {
          sa = JSON.parse(`{${serviceAccountJson}}`);
        } catch (e) {
          throw new Error(`Cannot parse service account JSON. First 40 chars: "${serviceAccountJson.substring(0, 40)}...". Error: ${e}`);
        }
      }
    }
  }
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/adwords',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));

  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );

  const signInput = new TextEncoder().encode(`${header}.${payload}`);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, signInput);
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${header}.${payload}.${sig}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenText = await tokenRes.text();
  let tokenData: any;
  try {
    tokenData = JSON.parse(tokenText);
  } catch {
    throw new Error(`Google auth returned non-JSON (status ${tokenRes.status}): ${tokenText.substring(0, 200)}`);
  }
  if (!tokenData.access_token) {
    throw new Error(`Google auth failed: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!saJson) {
      return new Response(JSON.stringify({ success: false, error: 'GOOGLE_SERVICE_ACCOUNT_JSON not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const devToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    if (!devToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'GOOGLE_ADS_DEVELOPER_TOKEN não configurado.',
        setup_required: true,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const managerId = Deno.env.get('GOOGLE_ADS_MANAGER_ID')?.replace(/-/g, '');

    const customerId = Deno.env.get('GOOGLE_ADS_CUSTOMER_ID');
    if (!customerId) {
      return new Response(JSON.stringify({ success: false, error: 'GOOGLE_ADS_CUSTOMER_ID not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Remove hyphens from customer ID
    const cleanCustomerId = customerId.replace(/-/g, '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user from auth header
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data: { user } } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id || null;
    }

    const body = await req.json().catch(() => ({}));
    const days = body.days || 30;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const accessToken = await getGoogleAccessToken(saJson);

    // Google Ads Query Language (GAQL)
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        ad_group.id,
        ad_group.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_cpm,
        metrics.interaction_rate,
        segments.date
      FROM campaign
      WHERE segments.date BETWEEN '${formatDate(startDate)}' AND '${formatDate(endDate)}'
      ORDER BY segments.date DESC
      LIMIT 10000
    `;

    const searchUrl = `${GOOGLE_ADS_API}/customers/${cleanCustomerId}/googleAds:search`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': devToken,
      'Content-Type': 'application/json',
    };
    if (managerId) {
      headers['login-customer-id'] = managerId;
    }

    const adsRes = await fetch(searchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
    });

    const adsText = await adsRes.text();
    let adsData: any;
    try {
      adsData = JSON.parse(adsText);
    } catch {
      return new Response(JSON.stringify({
        success: false,
        error: `Google Ads API returned non-JSON (status ${adsRes.status}): ${adsText.substring(0, 200)}`,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (adsData.error || (Array.isArray(adsData) && adsData[0]?.error)) {
      const err = adsData.error || adsData[0]?.error;
      return new Response(JSON.stringify({
        success: false,
        error: `Google Ads API error: ${err.message || JSON.stringify(err)}`,
        details: err,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse results from search endpoint
    const allResults: any[] = [];
    if (Array.isArray(adsData)) {
      // searchStream format
      for (const batch of adsData) {
        if (batch.results) allResults.push(...batch.results);
      }
    } else if (adsData.results) {
      // search format
      allResults.push(...adsData.results);
    }

    let synced = 0;
    const errors: string[] = [];

    // Delete existing rows for this date range to prevent duplicates
    if (userId) {
      await supabase
        .from('google_ads_campaigns')
        .delete()
        .eq('user_id', userId)
        .gte('date_start', formatDate(startDate))
        .lte('date_stop', formatDate(endDate));
    }

    const records: Record<string, unknown>[] = [];
    for (const result of allResults) {
      try {
        const campaign = result.campaign || {};
        const adGroup = result.adGroup || {};
        const metrics = result.metrics || {};
        const segments = result.segments || {};
        const costMicros = parseInt(metrics.costMicros) || 0;

        records.push({
          user_id: userId,
          campaign_id: campaign.id?.toString() || '',
          campaign_name: campaign.name || null,
          campaign_status: campaign.status || null,
          campaign_type: campaign.advertisingChannelType || null,
          ad_group_id: adGroup.id?.toString() || null,
          ad_group_name: adGroup.name || null,
          impressions: parseInt(metrics.impressions) || 0,
          clicks: parseInt(metrics.clicks) || 0,
          cost_micros: costMicros,
          cost: costMicros / 1_000_000,
          conversions: parseFloat(metrics.conversions) || 0,
          conversion_value: parseFloat(metrics.conversionsValue) || 0,
          ctr: parseFloat(metrics.ctr) || 0,
          avg_cpc: parseInt(metrics.averageCpc || 0) / 1_000_000,
          avg_cpm: parseInt(metrics.averageCpm || 0) / 1_000_000,
          interaction_rate: parseFloat(metrics.interactionRate) || 0,
          date_start: segments.date,
          date_stop: segments.date,
          synced_at: new Date().toISOString(),
        });
      } catch (rowErr) {
        errors.push(`Row error: ${rowErr instanceof Error ? rowErr.message : 'unknown'}`);
      }
    }

    for (let i = 0; i < records.length; i += 500) {
      const chunk = records.slice(i, i + 500);
      const { error: insertErr } = await supabase.from('google_ads_campaigns').insert(chunk);
      if (insertErr) {
        errors.push(`Batch ${i}: ${insertErr.message}`);
      } else {
        synced += chunk.length;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      customer_id: customerId,
      date_range: { start: formatDate(startDate), end: formatDate(endDate) },
      total_rows: allResults.length,
      synced_rows: synced,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('sync-google-ads error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
