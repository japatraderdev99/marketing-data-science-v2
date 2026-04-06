export interface MetricRecord {
  metric_type: string;
  metric_date: string;
  count: number;
  total_value: number;
  city: string | null;
  state: string | null;
  metadata: Record<string, any>;
}

export function analyzeUsers(docs: any[], today: string): MetricRecord[] {
  const records: MetricRecord[] = [];
  let totalClients = 0, totalProviders = 0;
  const byState: Record<string, { clients: number; providers: number }> = {};
  const byStatus: Record<string, number> = {};

  for (const doc of docs) {
    const role = (doc.role || '').toLowerCase();
    const status = (doc.status || 'unknown').toLowerCase();
    byStatus[status] = (byStatus[status] || 0) + 1;

    if (role === 'client' || role === 'cliente') totalClients++;
    else if (role === 'provider' || role === 'prestador') totalProviders++;

    const state = doc.state || doc.estado || null;
    if (state) {
      if (!byState[state]) byState[state] = { clients: 0, providers: 0 };
      if (role === 'client' || role === 'cliente') byState[state].clients++;
      else if (role === 'provider' || role === 'prestador') byState[state].providers++;
    }
  }

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
    metadata: { total: true, clients: totalClients, providers: totalProviders, byStatus, source: 'firestore_users' },
  });

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

export function analyzeBookings(docs: any[], today: string): MetricRecord[] {
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

  records.push({
    metric_type: 'bookings_total', metric_date: today,
    count: docs.length, total_value: totalValue, city: null, state: null,
    metadata: { total: true, byStatus, source: 'firestore_bookings' },
  });

  const completed = (byStatus['completed']?.count || 0) + (byStatus['concluido']?.count || 0) + (byStatus['finished']?.count || 0);
  const completedValue = (byStatus['completed']?.value || 0) + (byStatus['concluido']?.value || 0) + (byStatus['finished']?.value || 0);
  records.push({
    metric_type: 'services_completed', metric_date: today,
    count: completed, total_value: completedValue, city: null, state: null,
    metadata: { total: true, source: 'firestore_bookings' },
  });

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

export function analyzeTransactions(docs: any[], today: string): MetricRecord[] {
  const records: MetricRecord[] = [];
  const byStatus: Record<string, { count: number; amount: number }> = {};
  let totalAmount = 0, totalPlatformFee = 0, totalProviderAmount = 0;

  for (const doc of docs) {
    const status = (doc.status || 'unknown').toLowerCase();
    const amount = Number(doc.amount || 0);
    totalAmount += amount;
    totalPlatformFee += Number(doc.platformFee || 0);
    totalProviderAmount += Number(doc.providerAmount || 0);

    if (!byStatus[status]) byStatus[status] = { count: 0, amount: 0 };
    byStatus[status].count++;
    byStatus[status].amount += amount;
  }

  const gmvReais = totalAmount / 100;
  records.push({
    metric_type: 'transactions_total', metric_date: today,
    count: docs.length, total_value: gmvReais, city: null, state: null,
    metadata: {
      total: true, gmv_reais: gmvReais,
      platform_fee_reais: totalPlatformFee / 100,
      provider_amount_reais: totalProviderAmount / 100,
      avg_ticket: docs.length > 0 ? Math.round((gmvReais / docs.length) * 100) / 100 : 0,
      byStatus, source: 'firestore_transactions',
    },
  });

  const approved = (byStatus['approved']?.count || 0) + (byStatus['paid']?.count || 0) + (byStatus['completed']?.count || 0);
  const approvedAmt = ((byStatus['approved']?.amount || 0) + (byStatus['paid']?.amount || 0) + (byStatus['completed']?.amount || 0)) / 100;
  records.push({
    metric_type: 'transactions_approved', metric_date: today,
    count: approved, total_value: approvedAmt, city: null, state: null,
    metadata: { total: true, source: 'firestore_transactions' },
  });

  return records;
}

export function analyzeServices(docs: any[], today: string): MetricRecord[] {
  const records: MetricRecord[] = [];
  const byCategory: Record<string, { count: number; totalPrice: number }> = {};
  let activeCount = 0;

  for (const doc of docs) {
    if (doc.isActive !== false) activeCount++;
    const category = doc.categoryName || doc.categoryId || 'sem_categoria';
    const price = Number(doc.price || 0);
    if (!byCategory[category]) byCategory[category] = { count: 0, totalPrice: 0 };
    byCategory[category].count++;
    byCategory[category].totalPrice += price;
  }

  records.push({
    metric_type: 'services_catalog', metric_date: today,
    count: docs.length, total_value: activeCount, city: null, state: null,
    metadata: { total: true, active: activeCount, inactive: docs.length - activeCount, byCategory, source: 'firestore_services' },
  });

  return records;
}

export function analyzeReviews(docs: any[], today: string): MetricRecord[] {
  let totalRating = 0;
  const byRating: Record<number, number> = {};
  for (const doc of docs) {
    const rating = Number(doc.rating || 0);
    totalRating += rating;
    byRating[rating] = (byRating[rating] || 0) + 1;
  }
  const avgRating = docs.length > 0 ? Math.round((totalRating / docs.length) * 100) / 100 : 0;

  return [{
    metric_type: 'reviews_total', metric_date: today,
    count: docs.length, total_value: avgRating, city: null, state: null,
    metadata: { total: true, avgRating, byRating, source: 'firestore_reviews' },
  }];
}

export function analyzeDisbursements(docs: any[], today: string): MetricRecord[] {
  let totalPaid = 0, totalFee = 0;
  for (const doc of docs) {
    totalPaid += Number(doc.totalAmountCents || 0);
    totalFee += Number(doc.platformFeeCents || 0);
  }

  return [{
    metric_type: 'disbursements_total', metric_date: today,
    count: docs.length, total_value: totalPaid / 100, city: null, state: null,
    metadata: { total: true, total_paid_reais: totalPaid / 100, total_fee_reais: totalFee / 100, source: 'firestore_disbursements' },
  }];
}

/** Map of collection name → analyzer function */
export const ANALYZERS: Record<string, (docs: any[], today: string) => MetricRecord[]> = {
  users: analyzeUsers,
  bookings: analyzeBookings,
  transactions: analyzeTransactions,
  services: analyzeServices,
  reviews: analyzeReviews,
  disbursements: analyzeDisbursements,
};
