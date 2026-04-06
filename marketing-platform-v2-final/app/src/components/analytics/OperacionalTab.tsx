import {
  Users, Briefcase, Zap, DollarSign, TrendingUp, Star,
  RefreshCw, MapPin, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useOperationalSummary, useOperationalStatuses, useOperationalCities,
} from '@/features/analytics/hooks/useOperational';

/* ── Brazil States SVG Paths (simplified) ── */
const BRAZIL_STATES: Record<string, { path: string; cx: number; cy: number }> = {
  SP: { path: 'M365.7,352.3 L357.2,355.8 L357.9,357.0 L356.1,358.1 L353.2,357.2 L349.6,357.7 L339.5,362.6 L324.7,374.8 L310.0,366.8 L303.0,348.7 L261.3,343.0 L269.3,338.1 L287.9,311.0 L331.9,311.8 L345.7,346.8 L365.6,340.9 L367.8,344.0 L371.2,343.0 L372.2,345.3 L364.2,348.1 L365.7,352.3Z', cx: 339, cy: 348 },
  RJ: { path: 'M365.7,352.3 L364.2,348.1 L372.2,345.3 L371.2,343.0 L367.8,344.0 L365.6,340.9 L383.2,335.7 L386.4,337.1 L396.2,332.6 L395.5,331.5 L398.8,323.5 L400.5,323.5 L401.4,321.4 L403.6,322.0 L403.5,325.5 L413.4,327.7 L411.7,330.3 L412.8,335.9 L409.7,337.6 L405.5,338.9 L400.1,343.2 L401.6,344.7 L399.7,347.4 L387.2,347.6 L380.2,348.7 L376.9,347.1 L367.5,350.2 L368.0,351.7 L365.7,352.3Z', cx: 389, cy: 339 },
  MG: { path: 'M425.5,264.0 L421.7,274.3 L418.8,274.7 L417.2,280.4 L422.5,284.8 L421.5,287.2 L417.3,287.3 L415.4,289.8 L412.9,289.8 L410.0,292.2 L413.3,297.2 L411.7,300.7 L413.8,303.2 L407.6,314.3 L402.6,314.5 L401.4,321.4 L400.5,323.5 L398.8,323.5 L395.5,331.5 L396.2,332.6 L386.4,337.1 L383.2,335.7 L365.6,340.9 L345.7,346.8 L331.9,311.8 L287.9,311.0 L288.2,305.7 L296.1,296.4 L307.5,296.1 L312.3,292.2 L321.8,292.1 L326.7,294.3 L334.0,288.7 L333.6,264.6 L339.9,262.5 L339.5,251.8 L349.7,250.3 L349.5,254.7 L372.4,243.0 L425.5,264.0Z', cx: 376, cy: 296 },
  SC: { path: 'M254.5,387.1 L282.8,391.6 L284.2,387.6 L291.0,386.7 L292.7,384.3 L301.2,384.2 L306.0,386.5 L310.4,383.8 L317.5,383.8 L319.0,386.8 L316.6,392.5 L317.8,400.3 L317.7,406.2 L315.7,414.1 L303.0,423.7 L299.7,420.9 L301.9,414.7 L292.9,412.4 L277.9,401.0 L252.1,398.0 L254.5,387.1Z', cx: 296, cy: 397 },
  PR: { path: 'M261.3,343.0 L303.0,348.7 L310.0,366.8 L324.7,374.8 L317.5,383.8 L310.4,383.8 L306.0,386.5 L301.2,384.2 L292.7,384.3 L291.0,386.7 L284.2,387.6 L282.8,391.6 L254.5,387.1 L250.6,379.7 L242.7,379.1 L246.9,360.4 L250.6,353.2 L255.1,347.2 L261.3,343.0Z', cx: 281, cy: 372 },
  RS: { path: 'M252.1,398.0 L277.9,401.0 L292.9,412.4 L301.9,414.7 L299.7,420.9 L303.0,423.7 L296.4,437.9 L289.9,446.2 L285.1,450.3 L274.2,457.7 L274.1,454.1 L276.5,454.1 L282.4,450.1 L291.5,438.2 L285.2,437.0 L279.1,446.9 L271.7,454.0 L273.6,455.1 L273.6,457.9 L270.8,461.1 L268.2,468.1 L265.5,471.3 L257.8,476.9 L255.8,475.4 L257.3,471.1 L262.3,465.4 L265.0,466.9 L267.6,461.8 L265.4,460.4 L260.0,463.7 L231.0,442.8 L225.4,445.2 L207.6,432.6 L229.5,409.6 L252.1,398.0Z', cx: 269, cy: 445 },
  BA: { path: 'M447.2,183.8 L450.1,186.0 L450.3,191.5 L452.3,191.8 L453.4,196.0 L452.1,196.6 L452.1,200.5 L449.8,201.1 L449.4,200.4 L447.5,200.5 L446.7,201.8 L449.9,208.2 L456.7,211.4 L445.4,228.3 L442.9,226.7 L438.3,230.9 L436.8,249.1 L439.3,262.3 L433.8,279.2 L435.8,284.0 L434.1,286.5 L431.1,287.7 L429.2,292.0 L421.5,287.2 L422.5,284.8 L417.2,280.4 L418.8,274.7 L421.7,274.3 L425.5,264.0 L372.3,242.8 L349.5,254.7 L349.7,250.3 L346.9,227.5 L342.9,207.8 L352.3,195.0 L359.4,201.9 L373.3,199.6 L379.1,192.4 L376.8,186.6 L381.4,183.2 L390.5,187.4 L397.0,183.0 L401.5,183.0 L409.3,175.8 L415.8,181.7 L415.7,185.0 L420.1,185.1 L432.4,174.3 L441.7,179.8 L443.4,178.2 L446.3,180.4 L445.5,181.8 L447.2,183.8Z', cx: 420, cy: 218 },
  GO: { path: 'M292.7,225.5 L308.4,230.1 L346.9,227.5 L349.7,250.3 L339.5,251.8 L339.9,262.5 L333.6,264.6 L333.6,258.1 L321.5,258.1 L321.5,264.6 L333.6,264.6 L334.0,288.7 L326.7,294.3 L321.8,292.1 L312.3,292.2 L307.5,296.1 L296.1,296.4 L288.2,305.7 L264.5,295.5 L261.5,287.9 L259.4,283.6 L262.4,274.0 L271.6,262.7 L277.1,261.8 L279.8,252.8 L286.3,251.8 L292.7,225.5Z', cx: 306, cy: 267 },
};

const HEAT_COLORS = ['#1a1a2e', '#E8603C33', '#E8603C66', '#E8603C99', '#E8603Ccc', '#E8603C'];

function getHeatColor(bookings: number, max: number) {
  if (bookings === 0) return HEAT_COLORS[0];
  const idx = Math.min(Math.ceil((bookings / max) * 5), 5);
  return HEAT_COLORS[idx];
}

export default function OperacionalTab({ period }: { period: string }) {
  const { data: summary, isLoading: loadingSummary } = useOperationalSummary(period);
  const { data: statuses } = useOperationalStatuses(period);
  const { data: cities } = useOperationalCities(period);

  const s = summary ?? {
    clients: 0, clientsTotal: 0, providers: 0, providersPct: '0%',
    bookings: 0, completed: 0, gmv: 0, revenue: 0, rating: 0, reviews: 0,
  };
  const statusList = statuses ?? [];
  const cityList = cities ?? [];

  const stateBookings = cityList.reduce<Record<string, number>>((acc, c) => {
    acc[c.state] = (acc[c.state] || 0) + c.bookings;
    return acc;
  }, {});
  const maxBookings = Math.max(...Object.values(stateBookings), 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-brand" />
          <div>
            <span className="font-heading font-black text-base text-text-primary">Operação Brasil</span>
            <span className="text-xs text-text-muted ml-2">Dados em tempo real do Firestore</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 uppercase">Live</span>
          {loadingSummary && <Loader2 className="w-4 h-4 text-brand animate-spin" />}
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated text-text-secondary text-xs font-bold hover:text-text-primary">
          <RefreshCw className="w-3.5 h-3.5" /> Sync
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { icon: Users, label: 'CLIENTES', value: String(s.clients), sub: `de ${s.clientsTotal} total`, color: 'text-brand' },
          { icon: Briefcase, label: 'PRESTADORES', value: String(s.providers), sub: s.providersPct, color: 'text-brand' },
          { icon: Zap, label: 'AGENDAMENTOS', value: String(s.bookings), sub: `${s.completed} concluídos`, color: 'text-brand' },
          { icon: DollarSign, label: 'GMV', value: `R$${s.gmv}`, sub: s.bookings > 0 ? `Ticket: R$${Math.round(s.gmv / s.bookings)}` : '', color: 'text-brand' },
          { icon: TrendingUp, label: 'RECEITA', value: `R$${s.revenue}`, sub: s.gmv > 0 ? `${((s.revenue / s.gmv) * 100).toFixed(1)}% take` : '', color: 'text-emerald-400' },
          { icon: Star, label: 'RATING', value: s.rating > 0 ? s.rating.toFixed(2) : '—', sub: `${s.reviews} reviews`, color: 'text-warning', extra: true },
        ].map(({ icon: Icon, label, value, sub, color, extra }) => (
          <div key={label} className="p-4 rounded-xl border border-border bg-surface-elevated">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className={cn('w-4 h-4', color)} />
              <span className="text-[10px] font-bold text-text-muted uppercase">{label}</span>
            </div>
            <p className="font-heading font-black text-2xl text-text-primary">
              {value}{extra && <span className="text-warning ml-1">&#9733;</span>}
            </p>
            <p className="text-[11px] text-text-muted">{sub}</p>
          </div>
        ))}
      </div>

      {/* Status Badges */}
      {statusList.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {statusList.map(({ label, count, color }) => (
            <span key={label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-elevated text-[11px] font-bold text-text-primary">
              <span className={cn('w-2 h-2 rounded-full', color)} />
              {label}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Map + Ranking */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 p-5 rounded-xl border border-border bg-surface-elevated">
          <svg viewBox="0 500 540 200" className="w-full h-[340px]">
            {Object.entries(BRAZIL_STATES).map(([code, { path, cx, cy }]) => {
              const bookings = stateBookings[code] || 0;
              return (
                <g key={code}>
                  <path d={path} fill={getHeatColor(bookings, maxBookings)} stroke="#2A2A2E" strokeWidth="1" className="transition-colors hover:brightness-125 cursor-pointer" />
                  {bookings > 0 && (
                    <>
                      <circle cx={cx} cy={cy} r="14" fill="#E8603C" opacity="0.9" />
                      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">{code}</text>
                      <text x={cx} y={cy + 6} textAnchor="middle" fill="white" fontSize="7">{bookings}</text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
          <div className="flex items-center justify-center gap-4 mt-2">
            {['bg-brand/20', 'bg-brand/40', 'bg-brand/60', 'bg-brand/80', 'bg-brand'].map((c, i) => (
              <div key={i} className={cn('w-4 h-4 rounded', c)} />
            ))}
            <span className="text-[10px] text-text-muted ml-1">Volume</span>
            <div className="w-4 h-4 rounded bg-surface-hover" />
            <span className="text-[10px] text-text-muted">Sem dados</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-surface-elevated">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-brand" />
            <span className="font-heading font-bold text-sm text-text-primary">Ranking por Cidade</span>
          </div>
          {cityList.length > 0 ? (
            <div className="space-y-3">
              {cityList.map((city, i) => (
                <div key={city.city} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand/15 text-brand text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <div>
                      <p className="text-sm font-bold text-text-primary">{city.city}</p>
                      <p className="text-[10px] text-text-muted">{city.state}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-text-primary">{city.bookings}</p>
                    <p className="text-[10px] text-text-muted uppercase">Agend.</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center mt-8">Sem dados geográficos</p>
          )}
        </div>
      </div>
    </div>
  );
}
