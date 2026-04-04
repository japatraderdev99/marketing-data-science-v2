import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Google Auth: get access token from service account JSON
async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  // Handle various storage formats: raw JSON, base64-encoded, or double-escaped
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
          // Maybe missing braces
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
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));

  // Import the private key and sign
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

  const tokenData = await tokenRes.json();
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

    const propertyId = Deno.env.get('GA4_PROPERTY_ID');
    if (!propertyId) {
      return new Response(JSON.stringify({ success: false, error: 'GA4_PROPERTY_ID not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));

    // Get user from auth header or body
    let userId: string | null = body.user_id || null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && !userId) {
      const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data: { user } } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id || null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: 'user_id required (via auth header or body)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const days = body.days || 30;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Get Google access token
    const accessToken = await getGoogleAccessToken(saJson);

    // GA4 Data API - Run Report
    const reportUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

    const reportBody = {
      dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
      dimensions: [
        { name: 'date' },
        { name: 'sessionDefaultChannelGroup' },
        { name: 'sessionCampaignName' },
        { name: 'landingPage' },
        { name: 'deviceCategory' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'conversions' },
        { name: 'userConversionRate' },
        { name: 'eventCount' },
      ],
      limit: '10000',
    };

    const reportRes = await fetch(reportUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportBody),
    });

    const reportData = await reportRes.json();

    if (reportData.error) {
      return new Response(JSON.stringify({
        success: false,
        error: `GA4 API error: ${reportData.error.message}`,
        details: reportData.error,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = reportData.rows || [];
    let synced = 0;
    const errors: string[] = [];

    // Delete existing rows for this date range + user to prevent duplicates
    if (userId) {
      await supabase
        .from('ga4_metrics')
        .delete()
        .eq('user_id', userId)
        .gte('metric_date', formatDate(startDate))
        .lte('metric_date', formatDate(endDate));
    }

    // Build all records first, then batch insert
    const records: Record<string, unknown>[] = [];
    for (const row of rows) {
      try {
        const dims = row.dimensionValues || [];
        const mets = row.metricValues || [];

        const rawDate = dims[0]?.value || '';
        const metricDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;

        records.push({
          user_id: userId,
          metric_date: metricDate,
          source_medium: dims[1]?.value || '(not set)',
          campaign_name: dims[2]?.value === '(not set)' ? null : dims[2]?.value,
          landing_page: dims[3]?.value || null,
          device_category: dims[4]?.value || null,
          sessions: parseInt(mets[0]?.value) || 0,
          total_users: parseInt(mets[1]?.value) || 0,
          new_users: parseInt(mets[2]?.value) || 0,
          page_views: parseInt(mets[3]?.value) || 0,
          avg_session_duration: parseFloat(mets[4]?.value) || 0,
          bounce_rate: parseFloat(mets[5]?.value) || 0,
          conversions: parseInt(mets[6]?.value) || 0,
          conversion_rate: parseFloat(mets[7]?.value) || 0,
          events_count: parseInt(mets[8]?.value) || 0,
          synced_at: new Date().toISOString(),
        });
      } catch (rowErr) {
        errors.push(`Row error: ${rowErr instanceof Error ? rowErr.message : 'unknown'}`);
      }
    }

    // Batch insert in chunks of 500
    for (let i = 0; i < records.length; i += 500) {
      const chunk = records.slice(i, i + 500);
      const { error: insertErr } = await supabase.from('ga4_metrics').insert(chunk);
      if (insertErr) {
        errors.push(`Batch ${i}: ${insertErr.message}`);
      } else {
        synced += chunk.length;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      property_id: propertyId,
      date_range: { start: formatDate(startDate), end: formatDate(endDate) },
      total_rows: rows.length,
      synced_rows: synced,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('sync-ga4 error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
