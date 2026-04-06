import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { resolveWorkspace } from '../_shared/workspace.ts';
import { getGoogleAccessToken } from '../_shared/google-auth.ts';

const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v19';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!saJson) return errorResponse('GOOGLE_SERVICE_ACCOUNT_JSON not configured');

    const devToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    if (!devToken) return errorResponse('GOOGLE_ADS_DEVELOPER_TOKEN não configurado', 400);

    const customerId = Deno.env.get('GOOGLE_ADS_CUSTOMER_ID');
    if (!customerId) return errorResponse('GOOGLE_ADS_CUSTOMER_ID not configured');

    const managerId = Deno.env.get('GOOGLE_ADS_MANAGER_ID')?.replace(/-/g, '');
    const cleanCustomerId = customerId.replace(/-/g, '');

    const ctx = await resolveWorkspace(req);
    if (!ctx) return errorResponse('Unauthorized — workspace not found', 401);
    const { workspaceId, supabase } = ctx;

    const body = await req.json().catch(() => ({}));
    const days = body.days || 30;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    const accessToken = await getGoogleAccessToken(saJson, 'https://www.googleapis.com/auth/adwords');

    // GAQL query
    const query = `
      SELECT
        campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
        ad_group.id, ad_group.name,
        metrics.impressions, metrics.clicks, metrics.cost_micros,
        metrics.conversions, metrics.conversions_value,
        metrics.ctr, metrics.average_cpc, metrics.average_cpm, metrics.interaction_rate,
        segments.date
      FROM campaign
      WHERE segments.date BETWEEN '${fmt(startDate)}' AND '${fmt(endDate)}'
      ORDER BY segments.date DESC
      LIMIT 10000
    `;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': devToken,
      'Content-Type': 'application/json',
    };
    if (managerId) headers['login-customer-id'] = managerId;

    const adsRes = await fetch(`${GOOGLE_ADS_API}/customers/${cleanCustomerId}/googleAds:search`, {
      method: 'POST', headers, body: JSON.stringify({ query }),
    });

    const adsText = await adsRes.text();
    let adsData: any;
    try { adsData = JSON.parse(adsText); } catch {
      return errorResponse(`Google Ads API returned non-JSON (status ${adsRes.status}): ${adsText.substring(0, 200)}`, 400);
    }

    if (adsData.error || (Array.isArray(adsData) && adsData[0]?.error)) {
      const err = adsData.error || adsData[0]?.error;
      return jsonResponse({ success: false, error: `Google Ads API error: ${err.message || JSON.stringify(err)}`, details: err }, 400);
    }

    // Parse results
    const allResults: any[] = [];
    if (Array.isArray(adsData)) {
      for (const batch of adsData) { if (batch.results) allResults.push(...batch.results); }
    } else if (adsData.results) {
      allResults.push(...adsData.results);
    }

    // Delete existing rows for date range
    await supabase.from('google_ads_campaigns').delete()
      .eq('workspace_id', workspaceId)
      .gte('date_start', fmt(startDate))
      .lte('date_stop', fmt(endDate));

    const records: Record<string, unknown>[] = [];
    const errors: string[] = [];

    for (const r of allResults) {
      try {
        const c = r.campaign || {};
        const ag = r.adGroup || {};
        const m = r.metrics || {};
        const s = r.segments || {};
        const costMicros = parseInt(m.costMicros) || 0;

        records.push({
          workspace_id: workspaceId,
          campaign_id: c.id?.toString() || '',
          campaign_name: c.name || null,
          campaign_status: c.status || null,
          campaign_type: c.advertisingChannelType || null,
          ad_group_id: ag.id?.toString() || null,
          ad_group_name: ag.name || null,
          impressions: parseInt(m.impressions) || 0,
          clicks: parseInt(m.clicks) || 0,
          cost_micros: costMicros,
          cost: costMicros / 1_000_000,
          conversions: parseFloat(m.conversions) || 0,
          conversion_value: parseFloat(m.conversionsValue) || 0,
          ctr: parseFloat(m.ctr) || 0,
          avg_cpc: parseInt(m.averageCpc || 0) / 1_000_000,
          avg_cpm: parseInt(m.averageCpm || 0) / 1_000_000,
          interaction_rate: parseFloat(m.interactionRate) || 0,
          date_start: s.date, date_stop: s.date,
          synced_at: new Date().toISOString(),
        });
      } catch (rowErr) {
        errors.push(`Row: ${rowErr instanceof Error ? rowErr.message : 'unknown'}`);
      }
    }

    let synced = 0;
    for (let i = 0; i < records.length; i += 500) {
      const chunk = records.slice(i, i + 500);
      const { error: insertErr } = await supabase.from('google_ads_campaigns').insert(chunk);
      if (insertErr) errors.push(`Batch ${i}: ${insertErr.message}`);
      else synced += chunk.length;
    }

    return jsonResponse({
      success: true,
      customer_id: customerId,
      date_range: { start: fmt(startDate), end: fmt(endDate) },
      total_rows: allResults.length,
      synced_rows: synced,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error('sync-google-ads error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
});
