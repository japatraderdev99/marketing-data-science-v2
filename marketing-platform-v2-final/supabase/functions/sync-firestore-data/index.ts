import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { resolveWorkspace } from '../_shared/workspace.ts';
import { getGoogleAccessToken } from '../_shared/google-auth.ts';
import { ANALYZERS, type MetricRecord } from './analyzers.ts';

const FIRESTORE_PROJECT = 'deixaqueeufaco-a291c';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents`;

/** Extract a Firestore field value to a plain JS value. */
function extractFieldValue(field: any): any {
  if (!field) return null;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return Number(field.integerValue);
  if (field.doubleValue !== undefined) return field.doubleValue;
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.timestampValue !== undefined) return field.timestampValue;
  if (field.mapValue) {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) {
      result[k] = extractFieldValue(v);
    }
    return result;
  }
  if (field.arrayValue) {
    return (field.arrayValue.values || []).map(extractFieldValue);
  }
  return null;
}

/** Read-only: fetch all documents from a Firestore collection with pagination. */
async function fetchCollection(collName: string, accessToken: string): Promise<any[]> {
  const allDocs: any[] = [];
  let nextPageToken: string | undefined;

  do {
    const url = `${FIRESTORE_BASE}/${collName}?pageSize=300${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (data.documents) {
      for (const doc of data.documents) {
        const parsed: Record<string, any> = {};
        for (const [key, val] of Object.entries(doc.fields || {})) {
          parsed[key] = extractFieldValue(val);
        }
        parsed._id = doc.name?.split('/').pop();
        allDocs.push(parsed);
      }
    }
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return allDocs;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!saJson) return errorResponse('GOOGLE_SERVICE_ACCOUNT_JSON not configured');

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'discovery';

    const accessToken = await getGoogleAccessToken(saJson, 'https://www.googleapis.com/auth/datastore');

    // ── DISCOVERY MODE: list collections + sample fields ──
    if (mode === 'discovery') {
      const listUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents:listCollectionIds`;
      const listRes = await fetch(listUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageSize: 100 }),
      });
      const listData = await listRes.json();

      const collections: Record<string, any> = {};
      for (const collId of (listData.collectionIds || [])) {
        try {
          const sampleUrl = `${FIRESTORE_BASE}/${collId}?pageSize=1`;
          const sampleRes = await fetch(sampleUrl, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } });
          const sampleData = await sampleRes.json();
          const doc = sampleData.documents?.[0];
          if (doc) {
            const fields: Record<string, string> = {};
            for (const [key, val] of Object.entries(doc.fields || {})) {
              fields[key] = Object.keys(val as any).find((k: string) => k !== 'nullValue') || 'null';
            }
            collections[collId] = { fieldCount: Object.keys(fields).length, fields };
          } else {
            collections[collId] = { fieldCount: 0, note: 'empty' };
          }
        } catch {
          collections[collId] = { error: 'failed to sample' };
        }
      }

      return jsonResponse({
        success: true, mode: 'discovery', project: FIRESTORE_PROJECT,
        collectionCount: listData.collectionIds?.length || 0, collections,
      });
    }

    // ── SYNC MODE: analyze collections → operational_metrics table ──
    if (mode === 'sync') {
      const ctx = await resolveWorkspace(req);
      if (!ctx) return errorResponse('Unauthorized — workspace not found', 401);
      const { workspaceId, supabase } = ctx;

      const collectionsToSync = body.collections || ['users', 'bookings', 'transactions', 'services', 'reviews', 'disbursements'];
      const results: Record<string, any> = {};
      const today = new Date().toISOString().split('T')[0];

      for (const collName of collectionsToSync) {
        try {
          const docs = await fetchCollection(collName, accessToken);

          const analyzer = ANALYZERS[collName];
          const metricRecords: MetricRecord[] = analyzer
            ? analyzer(docs, today)
            : [{ metric_type: collName, metric_date: today, count: docs.length, total_value: 0, city: null, state: null, metadata: { source: `firestore_${collName}` } }];

          const dbRecords = metricRecords.map(r => ({
            workspace_id: workspaceId, ...r, synced_at: new Date().toISOString(),
          }));

          // Delete existing records for these metric types (full snapshot replacement)
          const metricTypes = [...new Set(metricRecords.map(r => r.metric_type))];
          for (const mt of metricTypes) {
            await supabase.from('operational_metrics').delete()
              .eq('workspace_id', workspaceId).eq('metric_type', mt);
          }

          const { error: insertErr } = await supabase.from('operational_metrics').insert(dbRecords);
          results[collName] = {
            docsRead: docs.length, metricsGenerated: dbRecords.length, metricTypes,
            error: insertErr?.message || null,
          };
        } catch (err) {
          results[collName] = { error: err instanceof Error ? err.message : 'unknown' };
        }
      }

      return jsonResponse({ success: true, mode: 'sync', readOnly: true, results });
    }

    return errorResponse(`Unknown mode: ${mode}`, 400);
  } catch (error) {
    console.error('sync-firestore-data error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
});
