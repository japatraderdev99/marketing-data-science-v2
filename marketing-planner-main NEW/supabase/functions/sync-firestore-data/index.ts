import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIRESTORE_PROJECT = 'deixaqueeufaco-a291c';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents`;

// ── Google Auth (read-only scope) ──
async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  let sa: any;
  try { sa = JSON.parse(serviceAccountJson); } catch {
    try { sa = JSON.parse(atob(serviceAccountJson)); } catch {
      try { sa = JSON.parse(serviceAccountJson.replace(/\\n/g, '\n').replace(/\\"/g, '"')); } catch (e) {
        throw new Error(`Cannot parse service account JSON: ${e}`);
      }
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  // IMPORTANT: Only datastore scope (read-only access pattern)
  const payload = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
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
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(`Google auth failed: ${JSON.stringify(tokenData)}`);
  return tokenData.access_token;
}

// ── Firestore field value extractor ──
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
  if (field.nullValue !== undefined) return null;
  return null;
}

// ── READ-ONLY: Fetch all documents from a Firestore collection ──
async function fetchCollection(collName: string, accessToken: string): Promise<any[]> {
  const allDocs: any[] = [];
  let nextPageToken: string | undefined;

  do {
    const url = `${FIRESTORE_BASE}/${collName}?pageSize=300${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
    const res = await fetch(url, {
      method: 'GET', // EXPLICIT: Read-only
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

// ══════════════════════════════════════════════════════════════
// Collection-specific analyzers (READ-ONLY data extraction)
// ══════════════════════════════════════════════════════════════

interface MetricRecord {
  metric_type: string;
  metric_date: string;
  count: number;
  total_value: number;
  city: string | null;
  state: string | null;
  metadata: Record<string, any>;
}

function analyzeUsers(docs: any[], today: string): MetricRecord[] {
  const records: MetricRecord[] = [];
  let totalClients = 0, totalProviders = 0, totalOther = 0;
  const byState: Record<string, { clients: number; providers: number }> = {};
  const byStatus: Record<string, number> = {};

  for (const doc of docs) {
    const role = (doc.role || '').toLowerCase();
    const status = (doc.status || 'unknown').toLowerCase();
    byStatus[status] = (byStatus[status] || 0) + 1;

    if (role === 'client' || role === 'cliente') totalClients++;
    else if (role === 'provider' || role === 'prestador') totalProviders++;
    else totalOther++;

    // Users don't have direct location, but we track by role
    const state = doc.state || doc.estado || null;
    if (state) {
      if (!byState[state]) byState[state] = { clients: 0, providers: 0 };
      if (role === 'client' || role === 'cliente') byState[state].clients++;
      else if (role === 'provider' || role === 'prestador') byState[state].providers++;
    }
  }

  // Summary records
  records.push({
    metric_type: 'users_clients', metric_date: today,
    count: totalClients, total_value: 0, city: null, state: null,
    metadata: { total: true, source: 'firestore_users' },
  });
  records.push({
    metric_type: 'users_providers', metric_date: today,
    count: totalProviders, total_value: 0, city: null, state: null,
    metadata: { total: true, source: 'firestore_users' },
  });
  records.push({
    metric_type: 'users_total', metric_date: today,
    count: docs.length, total_value: 0, city: null, state: null,
    metadata: { total: true, clients: totalClients, providers: totalProviders, other: totalOther, byStatus, source: 'firestore_users' },
  });

  // By state
  for (const [state, data] of Object.entries(byState)) {
    records.push({
      metric_type: 'users_by_location', metric_date: today,
      count: data.clients + data.providers, total_value: 0,
      city: null, state,
      metadata: { clients: data.clients, providers: data.providers, source: 'firestore_users' },
    });
  }

  return records;
}

function analyzeBookings(docs: any[], today: string): MetricRecord[] {
  const records: MetricRecord[] = [];
  const byStatus: Record<string, { count: number; value: number }> = {};
  const byCity: Record<string, { count: number; value: number }> = {};
  let totalValue = 0;

  for (const doc of docs) {
    const status = (doc.status || 'unknown').toLowerCase();
    const pricing = doc.pricing || {};
    const value = Number(pricing.finalPrice || pricing.totalPrice || pricing.price || 0);
    totalValue += value;

    if (!byStatus[status]) byStatus[status] = { count: 0, value: 0 };
    byStatus[status].count++;
    byStatus[status].value += value;

    // Extract location from address mapValue
    const addr = doc.address || {};
    const city = addr.city || addr.cidade || null;
    const state = addr.state || addr.estado || addr.uf || null;
    if (city || state) {
      const key = `${city || ''}|${state || ''}`;
      if (!byCity[key]) byCity[key] = { count: 0, value: 0 };
      byCity[key].count++;
      byCity[key].value += value;
    }
  }

  // Summary
  records.push({
    metric_type: 'bookings_total', metric_date: today,
    count: docs.length, total_value: totalValue, city: null, state: null,
    metadata: { total: true, byStatus, source: 'firestore_bookings' },
  });

  // Completed/confirmed bookings = services delivered
  const completed = (byStatus['completed']?.count || 0) + (byStatus['concluido']?.count || 0) + (byStatus['finished']?.count || 0);
  const completedValue = (byStatus['completed']?.value || 0) + (byStatus['concluido']?.value || 0) + (byStatus['finished']?.value || 0);
  records.push({
    metric_type: 'services_completed', metric_date: today,
    count: completed, total_value: completedValue, city: null, state: null,
    metadata: { total: true, source: 'firestore_bookings' },
  });

  // By location
  for (const [key, data] of Object.entries(byCity)) {
    const [city, state] = key.split('|');
    records.push({
      metric_type: 'bookings_by_location', metric_date: today,
      count: data.count, total_value: data.value,
      city: city || null, state: state || null,
      metadata: { source: 'firestore_bookings' },
    });
  }

  return records;
}

function analyzeTransactions(docs: any[], today: string): MetricRecord[] {
  const records: MetricRecord[] = [];
  const byStatus: Record<string, { count: number; amount: number; platformFee: number; providerAmount: number }> = {};
  const byPaymentMethod: Record<string, { count: number; amount: number }> = {};
  let totalAmount = 0, totalPlatformFee = 0, totalProviderAmount = 0;

  for (const doc of docs) {
    const status = (doc.status || 'unknown').toLowerCase();
    const amount = Number(doc.amount || 0);
    const platformFee = Number(doc.platformFee || 0);
    const providerAmount = Number(doc.providerAmount || 0);
    const paymentMethod = doc.paymentMethod || 'unknown';

    totalAmount += amount;
    totalPlatformFee += platformFee;
    totalProviderAmount += providerAmount;

    if (!byStatus[status]) byStatus[status] = { count: 0, amount: 0, platformFee: 0, providerAmount: 0 };
    byStatus[status].count++;
    byStatus[status].amount += amount;
    byStatus[status].platformFee += platformFee;
    byStatus[status].providerAmount += providerAmount;

    if (!byPaymentMethod[paymentMethod]) byPaymentMethod[paymentMethod] = { count: 0, amount: 0 };
    byPaymentMethod[paymentMethod].count++;
    byPaymentMethod[paymentMethod].amount += amount;
  }

  // GMV = total transaction amount (in centavos, convert)
  const gmvReais = totalAmount / 100;
  const platformFeeReais = totalPlatformFee / 100;
  const providerAmountReais = totalProviderAmount / 100;
  const avgTicket = docs.length > 0 ? gmvReais / docs.length : 0;

  records.push({
    metric_type: 'transactions_total', metric_date: today,
    count: docs.length, total_value: gmvReais, city: null, state: null,
    metadata: {
      total: true,
      gmv_reais: gmvReais,
      platform_fee_reais: platformFeeReais,
      provider_amount_reais: providerAmountReais,
      avg_ticket: Math.round(avgTicket * 100) / 100,
      byStatus,
      byPaymentMethod,
      source: 'firestore_transactions',
    },
  });

  // Approved/paid transactions
  const approved = (byStatus['approved']?.count || 0) + (byStatus['paid']?.count || 0) + (byStatus['completed']?.count || 0);
  const approvedAmount = ((byStatus['approved']?.amount || 0) + (byStatus['paid']?.amount || 0) + (byStatus['completed']?.amount || 0)) / 100;
  records.push({
    metric_type: 'transactions_approved', metric_date: today,
    count: approved, total_value: approvedAmount, city: null, state: null,
    metadata: { total: true, source: 'firestore_transactions' },
  });

  return records;
}

function analyzeServices(docs: any[], today: string): MetricRecord[] {
  const records: MetricRecord[] = [];
  const byCategory: Record<string, { count: number; avgPrice: number; totalPrice: number }> = {};
  const byLocation: Record<string, { count: number }> = {};
  let activeCount = 0;

  for (const doc of docs) {
    const isActive = doc.isActive !== false;
    if (isActive) activeCount++;

    const category = doc.categoryName || doc.categoryId || 'sem_categoria';
    const price = Number(doc.price || 0);

    if (!byCategory[category]) byCategory[category] = { count: 0, avgPrice: 0, totalPrice: 0 };
    byCategory[category].count++;
    byCategory[category].totalPrice += price;

    // Extract location from mapValue
    const loc = doc.location || {};
    const city = loc.city || loc.cidade || null;
    const state = loc.state || loc.estado || loc.uf || null;
    if (state) {
      const key = `${city || ''}|${state}`;
      if (!byLocation[key]) byLocation[key] = { count: 0 };
      byLocation[key].count++;
    }
  }

  // Calc avg prices
  for (const cat of Object.values(byCategory)) {
    cat.avgPrice = cat.count > 0 ? Math.round((cat.totalPrice / cat.count) * 100) / 100 : 0;
  }

  records.push({
    metric_type: 'services_catalog', metric_date: today,
    count: docs.length, total_value: activeCount, city: null, state: null,
    metadata: { total: true, active: activeCount, inactive: docs.length - activeCount, byCategory, source: 'firestore_services' },
  });

  // By location for heatmap
  for (const [key, data] of Object.entries(byLocation)) {
    const [city, state] = key.split('|');
    records.push({
      metric_type: 'services_by_location', metric_date: today,
      count: data.count, total_value: 0,
      city: city || null, state: state || null,
      metadata: { source: 'firestore_services' },
    });
  }

  return records;
}

function analyzeReviews(docs: any[], today: string): MetricRecord[] {
  const records: MetricRecord[] = [];
  let totalRating = 0;
  const byRating: Record<number, number> = {};

  for (const doc of docs) {
    const rating = Number(doc.rating || 0);
    totalRating += rating;
    byRating[rating] = (byRating[rating] || 0) + 1;
  }

  const avgRating = docs.length > 0 ? Math.round((totalRating / docs.length) * 100) / 100 : 0;

  records.push({
    metric_type: 'reviews_total', metric_date: today,
    count: docs.length, total_value: avgRating, city: null, state: null,
    metadata: { total: true, avgRating, byRating, source: 'firestore_reviews' },
  });

  return records;
}

function analyzeDisbursements(docs: any[], today: string): MetricRecord[] {
  const records: MetricRecord[] = [];
  let totalPaid = 0, totalFee = 0;
  const byStatus: Record<string, { count: number; amount: number }> = {};

  for (const doc of docs) {
    const status = (doc.status || 'unknown').toLowerCase();
    const amount = Number(doc.totalAmountCents || 0);
    const fee = Number(doc.platformFeeCents || 0);
    totalPaid += amount;
    totalFee += fee;

    if (!byStatus[status]) byStatus[status] = { count: 0, amount: 0 };
    byStatus[status].count++;
    byStatus[status].amount += amount;
  }

  records.push({
    metric_type: 'disbursements_total', metric_date: today,
    count: docs.length, total_value: totalPaid / 100, city: null, state: null,
    metadata: { total: true, total_paid_reais: totalPaid / 100, total_fee_reais: totalFee / 100, byStatus, source: 'firestore_disbursements' },
  });

  return records;
}

function analyzePagarmeOrders(docs: any[], today: string): MetricRecord[] {
  const records: MetricRecord[] = [];
  let totalAmount = 0, totalFee = 0;
  const byPaymentMethod: Record<string, { count: number; amount: number }> = {};

  for (const doc of docs) {
    const amount = Number(doc.amount || 0);
    const fee = Number(doc.platformFee || 0);
    totalAmount += amount;
    totalFee += fee;

    const method = doc.paymentMethod || 'unknown';
    if (!byPaymentMethod[method]) byPaymentMethod[method] = { count: 0, amount: 0 };
    byPaymentMethod[method].count++;
    byPaymentMethod[method].amount += amount;
  }

  records.push({
    metric_type: 'pagarme_orders_total', metric_date: today,
    count: docs.length, total_value: totalAmount / 100, city: null, state: null,
    metadata: { total: true, total_reais: totalAmount / 100, fee_reais: totalFee / 100, byPaymentMethod, source: 'firestore_pagarme_orders' },
  });

  return records;
}

// ══════════════════════════════════════════════════════════════
// Main handler
// ══════════════════════════════════════════════════════════════

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'discovery';

    // Get user from auth header or body
    let userId: string | null = body.user_id || null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && !userId) {
      const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data: { user } } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id || null;
    }

    const accessToken = await getGoogleAccessToken(saJson);

    // ── DISCOVERY MODE ──
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
          const sampleRes = await fetch(sampleUrl, {
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const sampleData = await sampleRes.json();
          const doc = sampleData.documents?.[0];
          if (doc) {
            const fields: Record<string, string> = {};
            for (const [key, val] of Object.entries(doc.fields || {})) {
              const v = val as any;
              fields[key] = Object.keys(v).find(k => k !== 'nullValue') || 'null';
            }
            collections[collId] = { fieldCount: Object.keys(fields).length, fields, sampleDocId: doc.name?.split('/').pop() };
          } else {
            collections[collId] = { fieldCount: 0, fields: {}, note: 'empty collection' };
          }
        } catch {
          collections[collId] = { error: 'failed to sample' };
        }
      }

      return new Response(JSON.stringify({
        success: true, mode: 'discovery', project: FIRESTORE_PROJECT,
        collectionCount: listData.collectionIds?.length || 0, collections,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── SYNC MODE: Strategic read-only analysis ──
    if (mode === 'sync') {
      if (!userId) {
        return new Response(JSON.stringify({ success: false, error: 'user_id required for sync mode' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const collectionsToSync = body.collections || ['users', 'bookings', 'transactions', 'services', 'reviews', 'disbursements', 'pagarme_orders'];
      const results: Record<string, any> = {};
      const today = new Date().toISOString().split('T')[0];

      // Analyzer map
      const analyzers: Record<string, (docs: any[], today: string) => MetricRecord[]> = {
        users: analyzeUsers,
        bookings: analyzeBookings,
        transactions: analyzeTransactions,
        services: analyzeServices,
        reviews: analyzeReviews,
        disbursements: analyzeDisbursements,
        pagarme_orders: analyzePagarmeOrders,
      };

      for (const collName of collectionsToSync) {
        try {
          console.log(`[READ-ONLY] Fetching collection: ${collName}`);
          const docs = await fetchCollection(collName, accessToken);

          const analyzer = analyzers[collName];
          let metricRecords: MetricRecord[];

          if (analyzer) {
            metricRecords = analyzer(docs, today);
          } else {
            // Generic fallback: just count
            metricRecords = [{
              metric_type: collName, metric_date: today,
              count: docs.length, total_value: 0, city: null, state: null,
              metadata: { total: true, source: `firestore_${collName}` },
            }];
          }

          // Prepare for insert with user_id
          const dbRecords = metricRecords.map(r => ({
            user_id: userId,
            ...r,
            synced_at: new Date().toISOString(),
          }));

          // Delete ALL existing records for this user + metric_types (not just today)
          // Since each sync is a full snapshot, old dated records cause duplication
          const metricTypes = [...new Set(metricRecords.map(r => r.metric_type))];
          for (const mt of metricTypes) {
            await supabase.from('operational_metrics')
              .delete()
              .eq('user_id', userId)
              .eq('metric_type', mt);
          }

          const { error: insertErr } = await supabase.from('operational_metrics').insert(dbRecords);

          results[collName] = {
            docsRead: docs.length,
            metricsGenerated: dbRecords.length,
            metricTypes,
            error: insertErr?.message || null,
          };
        } catch (err) {
          results[collName] = { error: err instanceof Error ? err.message : 'unknown error' };
        }
      }

      return new Response(JSON.stringify({
        success: true, mode: 'sync', readOnly: true, results,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: false, error: `Unknown mode: ${mode}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('sync-firestore-data error:', error);
    return new Response(JSON.stringify({
      success: false, error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
