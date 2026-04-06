import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { resolveWorkspace } from '../_shared/workspace.ts';
import { getGoogleAccessToken } from '../_shared/google-auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!saJson) return errorResponse('GOOGLE_SERVICE_ACCOUNT_JSON not configured');

    const propertyId = Deno.env.get('GA4_PROPERTY_ID');
    if (!propertyId) return errorResponse('GA4_PROPERTY_ID not configured');

    const ctx = await resolveWorkspace(req);
    if (!ctx) return errorResponse('Unauthorized — workspace not found', 401);
    const { workspaceId, supabase } = ctx;

    const body = await req.json().catch(() => ({}));
    const days = body.days || 30;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    const accessToken = await getGoogleAccessToken(saJson, 'https://www.googleapis.com/auth/analytics.readonly');

    // GA4 Data API — Run Report
    const reportUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
    const reportRes = await fetch(reportUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: fmt(startDate), endDate: fmt(endDate) }],
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
      }),
    });

    const reportData = await reportRes.json();
    if (reportData.error) {
      return jsonResponse({
        success: false,
        error: `GA4 API error: ${reportData.error.message}`,
        details: reportData.error,
      }, 400);
    }

    const rows = reportData.rows || [];
    const errors: string[] = [];

    // Delete existing rows for this date range to prevent duplicates
    await supabase.from('ga4_metrics').delete()
      .eq('workspace_id', workspaceId)
      .gte('metric_date', fmt(startDate))
      .lte('metric_date', fmt(endDate));

    const records: Record<string, unknown>[] = [];
    for (const row of rows) {
      try {
        const dims = row.dimensionValues || [];
        const mets = row.metricValues || [];
        const rawDate = dims[0]?.value || '';
        const metricDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;

        records.push({
          workspace_id: workspaceId,
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
        errors.push(`Row: ${rowErr instanceof Error ? rowErr.message : 'unknown'}`);
      }
    }

    // Batch insert in chunks of 500
    let synced = 0;
    for (let i = 0; i < records.length; i += 500) {
      const chunk = records.slice(i, i + 500);
      const { error: insertErr } = await supabase.from('ga4_metrics').insert(chunk);
      if (insertErr) errors.push(`Batch ${i}: ${insertErr.message}`);
      else synced += chunk.length;
    }

    return jsonResponse({
      success: true,
      property_id: propertyId,
      date_range: { start: fmt(startDate), end: fmt(endDate) },
      total_rows: rows.length,
      synced_rows: synced,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error('sync-ga4 error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
});
