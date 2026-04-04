import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  MapPin, Users, Briefcase, DollarSign, X, TrendingUp,
  Activity, RefreshCw, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Real geographic SVG paths (TopoJSON IBGE projection) ── */
const BRAZIL_STATES: Record<string, { path: string; cx: number; cy: number; label: string }> = {
  AC: { path: 'M2.4,157.3 L45.9,169.7 L89.9,189.8 L92.5,190.8 L68.2,205.3 L42.2,204.0 L42.4,185.9 L34.5,192.2 L23.1,191.7 L20.5,185.1 L10.0,184.8 L13.8,180.7 L6.3,171.6 L3.3,166.6 L3.3,165.0 L0.3,162.9 L0.3,159.9 L2.7,159.9 L2.4,157.3Z', cx: 26.5, cy: 178, label: 'Acre' },
  AL: { path: 'M486.0,178.6 L483.1,183.0 L478.2,188.2 L474.4,193.0 L471.3,195.6 L471.3,196.2 L470.1,197.9 L469.4,196.8 L468.0,196.9 L467.9,195.9 L467.0,195.0 L466.3,195.4 L463.2,193.1 L463.1,192.1 L450.1,186.0 L447.2,183.8 L452.6,178.2 L463.2,184.6 L463.8,183.3 L466.4,183.3 L467.3,184.2 L475.5,178.2 L478.7,179.0 L480.9,177.8 L486.0,178.6Z', cx: 469, cy: 188, label: 'Alagoas' },
  AM: { path: 'M132.6,45.6 L140.8,49.9 L146.7,75.9 L143.7,81.3 L156.4,90.8 L155.1,81.9 L160.4,77.7 L166.4,82.6 L171.3,80.1 L169.9,78.0 L174.3,69.0 L188.7,68.7 L189.1,76.9 L196.0,85.7 L220.5,99.0 L194.9,153.6 L197.9,159.8 L194.8,177.4 L155.7,177.7 L148.2,177.3 L139.4,167.8 L130.4,167.8 L121.5,179.0 L113.7,179.2 L113.8,185.3 L96.2,185.1 L89.9,189.8 L45.9,169.7 L2.4,157.3 L3.8,152.8 L10.7,149.6 L9.0,144.5 L14.8,133.3 L31.5,124.9 L50.5,123.6 L57.3,84.1 L49.6,74.1 L49.4,65.0 L60.6,64.7 L60.5,59.4 L52.0,59.5 L52.0,51.4 L72.3,51.2 L81.7,46.0 L86.1,50.1 L86.4,58.0 L105.7,64.2 L132.6,45.6Z', cx: 111, cy: 108, label: 'Amazonas' },
  AP: { path: 'M298.3,64.2 L278.5,80.7 L279.2,85.5 L270.7,86.1 L254.8,57.0 L245.6,51.1 L240.5,51.1 L238.8,42.4 L241.6,42.2 L244.3,45.7 L249.3,46.0 L252.2,43.7 L258.3,43.9 L259.5,45.7 L264.1,45.7 L282.8,18.5 L290.0,44.2 L301.8,52.6 L301.5,59.8 L298.3,64.2Z', cx: 268, cy: 54, label: 'Amapá' },
  BA: { path: 'M447.2,183.8 L450.1,186.0 L450.3,191.5 L452.3,191.8 L453.4,196.0 L452.1,196.6 L452.1,200.5 L449.8,201.1 L449.4,200.4 L447.5,200.5 L446.7,201.8 L449.9,208.2 L456.7,211.4 L445.4,228.3 L442.9,226.7 L438.3,230.9 L436.8,249.1 L439.3,262.3 L433.8,279.2 L435.8,284.0 L434.1,286.5 L431.1,287.7 L429.2,292.0 L421.5,287.2 L422.5,284.8 L417.2,280.4 L418.8,274.7 L421.7,274.3 L425.5,264.0 L372.3,242.8 L349.5,254.7 L349.7,250.3 L346.9,227.5 L342.9,207.8 L352.3,195.0 L359.4,201.9 L373.3,199.6 L379.1,192.4 L376.8,186.6 L381.4,183.2 L390.5,187.4 L397.0,183.0 L401.5,183.0 L409.3,175.8 L415.8,181.7 L415.7,185.0 L420.1,185.1 L432.4,174.3 L441.7,179.8 L443.4,178.2 L446.3,180.4 L445.5,181.8 L447.2,183.8Z', cx: 420, cy: 218, label: 'Bahia' },
  CE: { path: 'M458.7,129.8 L454.6,131.4 L442.9,148.3 L440.4,155.4 L443.3,159.5 L441.1,165.0 L435.9,165.0 L428.9,160.0 L418.2,160.7 L420.1,153.2 L416.3,151.7 L412.0,130.8 L408.5,107.0 L402.2,104.6 L408.5,107.0 L424.8,106.1 L444.1,116.4 L451.3,124.0 L458.7,127.9 L458.7,129.8Z', cx: 434, cy: 137, label: 'Ceará' },
  DF: { path: 'M333.6,264.6 L321.5,264.6 L321.5,258.1 L333.6,258.1 L333.6,264.6Z', cx: 328, cy: 261, label: 'DF' },
  ES: { path: 'M413.4,327.7 L403.5,325.5 L403.6,322.0 L401.4,321.4 L402.6,314.5 L407.6,314.3 L413.8,303.2 L411.7,300.7 L413.3,297.2 L410.0,292.2 L412.9,289.8 L415.4,289.8 L417.3,287.3 L421.5,287.2 L429.2,292.0 L427.5,297.3 L428.8,304.0 L427.5,307.6 L424.0,309.9 L422.2,315.2 L418.0,322.1 L415.3,322.3 L413.4,327.7Z', cx: 415, cy: 307, label: 'Espírito Santo' },
  GO: { path: 'M292.7,225.5 L308.4,230.1 L346.9,227.5 L349.7,250.3 L339.5,251.8 L339.9,262.5 L333.6,264.6 L333.6,258.1 L321.5,258.1 L321.5,264.6 L333.6,264.6 L334.0,288.7 L326.7,294.3 L321.8,292.1 L312.3,292.2 L307.5,296.1 L296.1,296.4 L288.2,305.7 L264.5,295.5 L261.5,287.9 L259.4,283.6 L262.4,274.0 L271.6,262.7 L277.1,261.8 L279.8,252.8 L286.3,251.8 L292.7,225.5Z', cx: 306, cy: 267, label: 'Goiás' },
  MA: { path: 'M318.2,134.0 L330.6,126.6 L339.0,114.8 L349.1,84.4 L365.4,90.3 L369.7,100.5 L374.9,102.2 L380.7,98.7 L393.7,104.8 L402.3,104.7 L387.7,122.8 L388.5,152.0 L381.5,154.7 L379.7,151.7 L373.9,153.8 L367.8,159.9 L356.8,164.0 L350.5,178.3 L352.3,195.0 L345.1,193.3 L342.7,188.4 L336.9,180.1 L340.0,172.4 L344.0,171.8 L343.3,166.5 L336.9,167.9 L329.1,158.8 L332.9,147.1 L331.2,137.7 L318.2,134.0Z', cx: 355, cy: 144, label: 'Maranhão' },
  MG: { path: 'M425.5,264.0 L421.7,274.3 L418.8,274.7 L417.2,280.4 L422.5,284.8 L421.5,287.2 L417.3,287.3 L415.4,289.8 L412.9,289.8 L410.0,292.2 L413.3,297.2 L411.7,300.7 L413.8,303.2 L407.6,314.3 L402.6,314.5 L401.4,321.4 L400.5,323.5 L398.8,323.5 L395.5,331.5 L396.2,332.6 L386.4,337.1 L383.2,335.7 L365.6,340.9 L345.7,346.8 L331.9,311.8 L287.9,311.0 L288.2,305.7 L296.1,296.4 L307.5,296.1 L312.3,292.2 L321.8,292.1 L326.7,294.3 L334.0,288.7 L333.6,264.6 L339.9,262.5 L339.5,251.8 L349.7,250.3 L349.5,254.7 L372.4,243.0 L425.5,264.0Z', cx: 376, cy: 296, label: 'Minas Gerais' },
  MS: { path: 'M261.5,287.9 L264.5,295.5 L288.2,305.7 L287.9,311.0 L269.3,338.1 L261.3,343.0 L255.1,347.2 L250.6,353.2 L246.9,360.4 L241.4,358.8 L233.2,360.0 L227.1,339.2 L200.6,338.5 L200.9,323.6 L196.9,311.5 L206.6,287.1 L216.4,280.0 L225.5,277.9 L236.2,283.8 L248.7,283.5 L253.9,278.2 L253.9,283.7 L249.2,288.0 L261.5,287.9Z', cx: 243, cy: 314, label: 'Mato Grosso do Sul' },
  MT: { path: 'M166.6,236.4 L177.0,219.6 L177.1,204.1 L155.6,203.8 L155.7,177.7 L194.8,177.4 L197.9,159.8 L215.5,184.8 L297.2,190.1 L290.8,209.2 L292.7,225.5 L286.3,251.8 L279.8,252.8 L277.1,261.8 L271.6,262.7 L262.4,274.0 L259.4,283.6 L261.5,287.9 L249.2,288.0 L253.9,283.7 L253.9,278.2 L248.7,283.5 L236.2,283.8 L225.5,277.9 L216.4,280.0 L206.6,287.1 L196.0,279.2 L196.0,267.1 L172.8,267.2 L172.7,258.0 L167.8,252.8 L171.9,253.0 L171.7,247.2 L170.1,240.2 L166.6,236.4Z', cx: 220, cy: 247, label: 'Mato Grosso' },
  PA: { path: 'M349.1,84.4 L339.0,114.8 L330.6,126.6 L318.2,134.0 L315.6,136.2 L322.6,139.0 L315.8,152.7 L312.1,153.6 L307.7,163.1 L310.5,165.8 L297.2,190.1 L215.5,184.8 L197.9,159.8 L194.9,153.6 L220.5,99.0 L196.0,85.7 L189.1,76.9 L188.7,68.7 L189.0,56.6 L210.7,49.0 L224.8,48.5 L224.3,42.3 L238.8,42.4 L240.5,51.1 L245.6,51.1 L254.8,57.0 L270.7,86.1 L279.2,85.5 L278.5,80.7 L298.3,64.2 L300.2,68.1 L304.9,67.7 L319.5,75.1 L319.8,78.0 L325.6,80.0 L329.4,77.2 L349.1,84.4Z', cx: 274, cy: 98, label: 'Pará' },
  PB: { path: 'M487.9,149.8 L489.8,162.6 L486.7,160.7 L481.6,161.5 L480.8,163.8 L475.0,165.9 L472.0,165.5 L467.7,167.1 L467.4,169.7 L462.6,171.7 L458.5,167.2 L463.0,161.5 L459.1,159.2 L450.4,164.7 L441.1,165.0 L443.3,159.5 L440.4,155.4 L442.9,148.3 L448.7,149.9 L459.2,143.8 L460.4,145.7 L456.5,152.1 L466.2,155.8 L470.3,149.6 L487.9,149.8Z', cx: 465, cy: 159, label: 'Paraíba' },
  PE: { path: 'M489.8,162.6 L486.0,178.6 L480.9,177.8 L478.7,179.0 L475.5,178.2 L467.3,184.2 L466.4,183.3 L463.8,183.3 L463.2,184.6 L452.6,178.2 L447.2,183.8 L445.5,181.8 L446.3,180.4 L443.4,178.2 L441.7,179.8 L432.4,174.3 L420.1,185.1 L415.7,185.0 L415.8,181.7 L409.3,175.8 L418.2,168.7 L418.1,165.8 L416.0,165.1 L416.1,161.6 L418.2,160.7 L428.9,160.0 L435.9,165.0 L441.1,165.0 L450.4,164.7 L459.1,159.2 L463.0,161.5 L458.5,167.2 L462.6,171.7 L467.4,169.7 L467.7,167.1 L472.0,165.5 L475.0,165.9 L480.8,163.8 L481.6,161.5 L486.7,160.7 L489.8,162.6Z', cx: 452, cy: 172, label: 'Pernambuco' },
  PI: { path: 'M402.3,104.7 L408.5,107.0 L412.0,130.8 L416.3,151.7 L420.1,153.2 L418.2,160.7 L416.1,161.6 L416.0,165.1 L418.1,165.8 L418.2,168.7 L409.3,175.8 L401.5,183.0 L397.0,183.0 L390.5,187.4 L381.4,183.2 L376.8,186.6 L379.1,192.4 L373.3,199.6 L359.4,201.9 L352.3,195.0 L350.5,178.3 L356.8,164.0 L367.8,159.9 L373.9,153.8 L379.7,151.7 L381.5,154.7 L388.5,152.0 L387.7,122.8 L402.3,104.7Z', cx: 392, cy: 162, label: 'Piauí' },
  PR: { path: 'M261.3,343.0 L303.0,348.7 L310.0,366.8 L324.7,374.8 L317.5,383.8 L310.4,383.8 L306.0,386.5 L301.2,384.2 L292.7,384.3 L291.0,386.7 L284.2,387.6 L282.8,391.6 L254.5,387.1 L250.6,379.7 L242.7,379.1 L246.9,360.4 L250.6,353.2 L255.1,347.2 L261.3,343.0Z', cx: 281, cy: 372, label: 'Paraná' },
  RJ: { path: 'M365.7,352.3 L364.2,348.1 L372.2,345.3 L371.2,343.0 L367.8,344.0 L365.6,340.9 L383.2,335.7 L386.4,337.1 L396.2,332.6 L395.5,331.5 L398.8,323.5 L400.5,323.5 L401.4,321.4 L403.6,322.0 L403.5,325.5 L413.4,327.7 L411.7,330.3 L412.8,335.9 L409.7,337.6 L405.5,338.9 L400.1,343.2 L401.6,344.7 L399.7,347.4 L387.2,347.6 L380.2,348.7 L376.9,347.1 L367.5,350.2 L368.0,351.7 L365.7,352.3Z', cx: 389, cy: 339, label: 'Rio de Janeiro' },
  RN: { path: 'M458.7,129.8 L466.6,133.0 L475.5,132.6 L483.0,134.6 L487.9,149.8 L470.3,149.6 L466.2,155.8 L456.5,152.1 L460.4,145.7 L459.2,143.8 L448.7,149.9 L442.9,148.3 L454.6,131.4 L458.7,129.8Z', cx: 464, cy: 142, label: 'Rio G. do Norte' },
  RO: { path: 'M89.9,189.8 L96.2,185.1 L113.8,185.3 L113.7,179.2 L121.5,179.0 L130.4,167.8 L139.4,167.8 L148.2,177.3 L155.7,177.7 L155.6,203.8 L177.1,204.1 L177.0,219.6 L166.6,236.4 L162.1,234.1 L151.7,234.4 L147.8,230.2 L127.3,221.0 L122.4,222.8 L108.6,212.6 L108.7,190.9 L92.5,190.8 L89.9,189.8Z', cx: 132, cy: 200, label: 'Rondônia' },
  RR: { path: 'M189.0,56.6 L188.7,68.7 L174.3,69.0 L169.9,78.0 L171.3,80.1 L166.4,82.6 L160.4,77.7 L155.1,81.9 L156.4,90.8 L143.7,81.3 L146.7,75.9 L140.8,49.9 L132.6,45.6 L132.4,43.0 L125.1,43.1 L122.3,29.1 L114.3,21.3 L115.5,20.4 L117.9,22.4 L123.6,22.8 L125.2,25.1 L135.2,24.7 L137.7,28.7 L141.1,27.7 L139.7,24.4 L145.9,21.9 L149.4,22.8 L166.0,14.6 L165.8,9.2 L174.8,9.0 L175.1,17.7 L179.7,19.3 L179.8,26.4 L175.4,36.0 L175.7,43.6 L178.2,44.5 L178.2,49.5 L184.5,55.6 L189.0,56.6Z', cx: 155, cy: 44, label: 'Roraima' },
  RS: { path: 'M252.1,398.0 L277.9,401.0 L292.9,412.4 L301.9,414.7 L299.7,420.9 L303.0,423.7 L296.4,437.9 L289.9,446.2 L285.1,450.3 L274.2,457.7 L274.1,454.1 L276.5,454.1 L282.4,450.1 L291.5,438.2 L285.2,437.0 L279.1,446.9 L271.7,454.0 L273.6,455.1 L273.6,457.9 L270.8,461.1 L268.2,468.1 L265.5,471.3 L257.8,476.9 L255.8,475.4 L257.3,471.1 L262.3,465.4 L265.0,466.9 L267.6,461.8 L265.4,460.4 L260.0,463.7 L231.0,442.8 L225.4,445.2 L207.6,432.6 L229.5,409.6 L252.1,398.0Z', cx: 269, cy: 445, label: 'Rio G. do Sul' },
  SC: { path: 'M254.5,387.1 L282.8,391.6 L284.2,387.6 L291.0,386.7 L292.7,384.3 L301.2,384.2 L306.0,386.5 L310.4,383.8 L317.5,383.8 L319.0,386.8 L316.6,392.5 L317.8,400.3 L317.7,406.2 L315.7,414.1 L303.0,423.7 L299.7,420.9 L301.9,414.7 L292.9,412.4 L277.9,401.0 L252.1,398.0 L254.5,387.1Z', cx: 296, cy: 397, label: 'Santa Catarina' },
  SE: { path: 'M450.1,186.0 L463.1,192.1 L463.2,193.1 L466.3,195.4 L467.0,195.0 L467.9,195.9 L468.0,196.9 L469.4,196.8 L470.1,197.9 L469.7,198.4 L468.3,198.4 L463.6,201.5 L456.7,211.4 L449.9,208.2 L446.7,201.8 L447.5,200.5 L449.4,200.4 L449.8,201.1 L452.1,200.5 L452.1,196.6 L453.4,196.0 L452.3,191.8 L450.3,191.5 L450.1,186.0Z', cx: 458, cy: 197, label: 'Sergipe' },
  SP: { path: 'M365.7,352.3 L357.2,355.8 L357.9,357.0 L356.1,358.1 L353.2,357.2 L349.6,357.7 L339.5,362.6 L324.7,374.8 L310.0,366.8 L303.0,348.7 L261.3,343.0 L269.3,338.1 L287.9,311.0 L331.9,311.8 L345.7,346.8 L365.6,340.9 L367.8,344.0 L371.2,343.0 L372.2,345.3 L364.2,348.1 L365.7,352.3Z', cx: 339, cy: 348, label: 'São Paulo' },
  TO: { path: 'M352.3,195.0 L342.9,207.8 L346.9,227.5 L308.4,230.1 L292.7,225.5 L290.8,209.2 L297.2,190.1 L310.5,165.8 L307.7,163.1 L312.1,153.6 L315.8,152.7 L322.6,139.0 L315.6,136.2 L318.2,134.0 L331.2,137.7 L332.9,147.1 L329.1,158.8 L336.9,167.9 L343.3,166.5 L344.0,171.8 L340.0,172.4 L336.9,180.1 L342.7,188.4 L345.1,193.3 L352.3,195.0Z', cx: 327, cy: 176, label: 'Tocantins' },
};

interface CityData {
  city: string;
  state: string;
  bookings: number;
  value: number;
}

interface OperationalSummary {
  totalUsers: number;
  totalClients: number;
  totalProviders: number;
  totalBookings: number;
  completedServices: number;
  gmvReais: number;
  avgTicket: number;
  platformFeeReais: number;
  avgRating: number;
  totalReviews: number;
  byStatus: Record<string, any>;
}

export default function BrazilHeatmap({ period = '30d' }: { period?: '7d' | '30d' | '90d' }) {
  const { user } = useAuth();
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [summary, setSummary] = useState<OperationalSummary | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from('operational_metrics')
      .select('*')
      .order('metric_date', { ascending: false });

    if (data) {
      const seen = new Set<string>();
      const deduped = data.filter(r => {
        const key = `${r.metric_type}|${r.city || ''}|${r.state || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const cities: CityData[] = [];
      for (const row of deduped.filter(r => r.metric_type === 'bookings_by_location')) {
        if (row.city || row.state) {
          cities.push({ city: row.city || '', state: row.state || '', bookings: row.count, value: Number(row.total_value) || 0 });
        }
      }
      setCityData(cities);

      const usersTotal = deduped.find(r => r.metric_type === 'users_total' && (r.metadata as any)?.total);
      const bookingsTotal = deduped.find(r => r.metric_type === 'bookings_total' && (r.metadata as any)?.total);
      const servicesCompleted = deduped.find(r => r.metric_type === 'services_completed');
      const transactionsTotal = deduped.find(r => r.metric_type === 'transactions_total' && (r.metadata as any)?.total);
      const reviewsTotal = deduped.find(r => r.metric_type === 'reviews_total');

      const usersMeta = (usersTotal?.metadata || {}) as any;
      const txMeta = (transactionsTotal?.metadata || {}) as any;
      const bookingsMeta = (bookingsTotal?.metadata || {}) as any;
      const reviewsMeta = (reviewsTotal?.metadata || {}) as any;

      setSummary({
        totalUsers: usersTotal?.count || 0,
        totalClients: usersMeta.clients || 0,
        totalProviders: usersMeta.providers || 0,
        totalBookings: bookingsTotal?.count || 0,
        completedServices: servicesCompleted?.count || 0,
        gmvReais: txMeta.gmv_reais || 0,
        avgTicket: txMeta.avg_ticket || 0,
        platformFeeReais: txMeta.platform_fee_reais || 0,
        avgRating: reviewsMeta.avgRating || 0,
        totalReviews: reviewsTotal?.count || 0,
        byStatus: bookingsMeta.byStatus || {},
      });
    }
    setLoading(false);
  }

  async function syncFirestore() {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-firestore-data', {
        body: { mode: 'sync', user_id: user!.id },
      });
      if (error) throw error;
      if (data?.success) await loadData();
    } catch (err) { console.error('Sync error:', err); }
    setSyncing(false);
  }

  const stateData = useMemo(() => {
    const map: Record<string, { count: number; value: number; cities: CityData[] }> = {};
    for (const c of cityData) {
      const st = c.state?.toUpperCase()?.trim();
      if (!st) continue;
      if (!map[st]) map[st] = { count: 0, value: 0, cities: [] };
      map[st].count += c.bookings;
      map[st].value += c.value;
      map[st].cities.push(c);
    }
    return map;
  }, [cityData]);

  const maxCount = Math.max(1, ...Object.values(stateData).map(s => s.count));

  const getStateColor = (uf: string) => {
    const sd = stateData[uf];
    if (!sd) return 'hsl(var(--muted) / 0.08)';
    const intensity = Math.max(0.15, Math.min(1, sd.count / maxCount));
    if (intensity > 0.6) return `hsl(var(--primary) / ${(0.4 + intensity * 0.55).toFixed(2)})`;
    if (intensity > 0.25) return `hsl(25 80% 55% / ${(0.25 + intensity * 0.45).toFixed(2)})`;
    return `hsl(160 50% 45% / ${(0.15 + intensity * 0.4).toFixed(2)})`;
  };

  const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));

  const selectedStateCities = selectedState ? stateData[selectedState]?.cities || [] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-black text-foreground tracking-tight">Operação Brasil</h2>
            <p className="text-[10px] text-muted-foreground">Dados em tempo real do Firestore</p>
          </div>
          <Badge variant="outline" className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border-emerald-500/30 ml-1">LIVE</Badge>
        </div>
        <button onClick={syncFirestore} disabled={syncing} className={cn(
          "flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold bg-card hover:bg-muted/50 transition-all",
          syncing && "opacity-50"
        )}>
          <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
          {syncing ? 'Sincronizando...' : 'Sync'}
        </button>
      </div>

      {/* KPIs */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { icon: Users, label: 'Clientes', value: fmt(summary.totalClients), accent: 'from-blue-500/20 to-blue-600/5', iconColor: 'text-blue-400', sub: `de ${summary.totalUsers} total` },
            { icon: Briefcase, label: 'Prestadores', value: fmt(summary.totalProviders), accent: 'from-purple-500/20 to-purple-600/5', iconColor: 'text-purple-400', sub: `${summary.totalUsers > 0 ? ((summary.totalProviders / summary.totalUsers) * 100).toFixed(0) : 0}%` },
            { icon: Activity, label: 'Agendamentos', value: fmt(summary.totalBookings), accent: 'from-primary/20 to-primary/5', iconColor: 'text-primary', sub: `${summary.completedServices} concluídos` },
            { icon: DollarSign, label: 'GMV', value: summary.gmvReais > 0 ? `R$${fmt(summary.gmvReais)}` : 'R$0', accent: 'from-emerald-500/20 to-emerald-600/5', iconColor: 'text-emerald-400', sub: `Ticket: R$${summary.avgTicket.toFixed(0)}` },
            { icon: DollarSign, label: 'Receita', value: `R$${summary.platformFeeReais.toFixed(0)}`, accent: 'from-teal-500/20 to-teal-600/5', iconColor: 'text-teal-400', sub: `${summary.gmvReais > 0 ? ((summary.platformFeeReais / summary.gmvReais) * 100).toFixed(1) : 0}% take` },
            { icon: TrendingUp, label: 'Rating', value: summary.avgRating > 0 ? `${summary.avgRating}⭐` : '—', accent: 'from-amber-500/20 to-amber-600/5', iconColor: 'text-amber-400', sub: `${summary.totalReviews} reviews` },
          ].map(kpi => (
            <Card key={kpi.label} className="border-border/50 bg-card overflow-hidden">
              <CardContent className="p-3 relative">
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", kpi.accent)} />
                <div className="relative">
                  <div className="flex items-center gap-1 mb-1">
                    <kpi.icon className={cn("h-3 w-3", kpi.iconColor)} />
                    <span className="text-[8px] text-muted-foreground uppercase tracking-widest font-bold">{kpi.label}</span>
                  </div>
                  <p className="text-xl font-black text-foreground leading-none">{kpi.value}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{kpi.sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Status Badges */}
      {summary && Object.keys(summary.byStatus).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(summary.byStatus)
            .sort(([, a]: any, [, b]: any) => (b.count || 0) - (a.count || 0))
            .map(([status, data]: [string, any]) => {
              const labels: Record<string, string> = {
                pending_quote: '⏳ Aguard. Orçamento', quote_accepted: '✅ Aceito', confirmed: '📋 Confirmado',
                completed: '✓ Concluído', cancelled: '✗ Cancelado', in_progress: '🔧 Em Andamento',
                paid: '💰 Pago', pending: '⏱ Pendente', quote_sent: '📤 Orçamento Enviado',
              };
              const isGood = ['completed', 'paid', 'confirmed', 'quote_accepted'].includes(status);
              const isBad = status === 'cancelled';
              return (
                <Badge key={status} variant="outline" className={cn("text-[9px] py-1 px-2",
                  isGood ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' :
                  isBad ? 'border-red-500/30 bg-red-500/5 text-red-400' :
                  'border-border text-muted-foreground'
                )}>
                  {labels[status] || status}: {data.count}
                </Badge>
              );
            })}
        </div>
      )}

      {/* Map + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Brazil Map */}
        <Card className="lg:col-span-3 border-border/50 bg-gradient-to-b from-card to-background overflow-hidden">
          <CardContent className="p-4">
            <div className="relative">
              <svg viewBox="-10 0 520 490" className="w-full max-w-[560px] mx-auto" style={{ overflow: 'visible' }}>
                <defs>
                  <filter id="state-glow">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id="ocean-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--background))" />
                    <stop offset="100%" stopColor="hsl(var(--muted) / 0.1)" />
                  </linearGradient>
                </defs>

                {/* State shapes */}
                {Object.entries(BRAZIL_STATES).map(([uf, state]) => {
                  const hasData = !!stateData[uf];
                  const isActive = selectedState === uf;
                  const isHovered = hoveredState === uf;
                  return (
                    <g key={uf}
                      className="cursor-pointer"
                      onClick={() => { if (hasData) { setSelectedState(isActive ? null : uf); setSelectedCity(null); } }}
                      onMouseEnter={() => setHoveredState(uf)}
                      onMouseLeave={() => setHoveredState(null)}
                    >
                      <path
                        d={state.path}
                        fill={getStateColor(uf)}
                        stroke={isActive || isHovered ? 'hsl(var(--primary))' : hasData ? 'hsl(var(--border) / 0.4)' : 'hsl(var(--border) / 0.15)'}
                        strokeWidth={isActive || isHovered ? 2 : 0.6}
                        strokeLinejoin="round"
                        style={{
                          filter: hasData && (isActive || isHovered) ? 'url(#state-glow)' : 'none',
                          transition: 'all 0.3s ease',
                        }}
                      />
                      {/* State label */}
                      <text
                        x={state.cx} y={state.cy - (hasData ? 3 : 0)}
                        textAnchor="middle" dominantBaseline="central"
                        fontSize={uf === 'DF' || uf === 'SE' || uf === 'AL' || uf === 'RN' || uf === 'PB' ? '5.5' : hasData ? '8' : '6.5'}
                        fontWeight={hasData ? '800' : '500'}
                        fill={hasData ? 'white' : 'hsl(var(--muted-foreground) / 0.35)'}
                        className="pointer-events-none select-none"
                        style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.06em' }}
                      >
                        {uf}
                      </text>
                      {hasData && uf !== 'DF' && uf !== 'SE' && (
                        <text
                          x={state.cx} y={state.cy + 10}
                          textAnchor="middle" fontSize="6.5" fontWeight="700"
                          fill="hsl(var(--foreground) / 0.75)"
                          className="pointer-events-none select-none"
                          style={{ fontFamily: 'system-ui' }}
                        >
                          {stateData[uf].count}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Hover tooltip */}
                {hoveredState && stateData[hoveredState] && BRAZIL_STATES[hoveredState] && (() => {
                  const st = BRAZIL_STATES[hoveredState];
                  const sd = stateData[hoveredState];
                  const tx = Math.min(Math.max(st.cx, 60), 440);
                  const ty = Math.max(st.cy - 45, 10);
                  return (
                    <g className="pointer-events-none">
                      <rect x={tx - 65} y={ty} width={130} height={32} rx={8}
                        fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={0.8} opacity={0.97}
                      />
                      <text x={tx} y={ty + 12} textAnchor="middle" fontSize="8" fontWeight="800"
                        fill="hsl(var(--foreground))" style={{ fontFamily: 'system-ui' }}>
                        {st.label}
                      </text>
                      <text x={tx} y={ty + 24} textAnchor="middle" fontSize="7"
                        fill="hsl(var(--muted-foreground))" style={{ fontFamily: 'system-ui' }}>
                        {sd.count} agendamentos · R${fmt(sd.value / 100)}
                      </text>
                    </g>
                  );
                })()}
              </svg>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[0.15, 0.3, 0.5, 0.7, 0.9].map((o, i) => (
                      <div key={i} className="h-2.5 w-5 rounded-sm" style={{
                        background: i < 2 ? `hsl(160 50% 45% / ${0.15 + o * 0.4})` : i < 4 ? `hsl(25 80% 55% / ${0.25 + o * 0.45})` : `hsl(var(--primary) / ${0.4 + o * 0.55})`
                      }} />
                    ))}
                  </div>
                  <span className="text-[9px] text-muted-foreground font-medium">Volume</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-muted/20 border border-border/30" />
                  <span className="text-[9px] text-muted-foreground">Sem dados</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-3">
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {selectedState ? `${BRAZIL_STATES[selectedState]?.label || selectedState}` : 'Ranking por Cidade'}
                </CardTitle>
                {selectedState && (
                  <button onClick={() => { setSelectedState(null); setSelectedCity(null); }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-thin">
              {(selectedState ? selectedStateCities : cityData)
                .sort((a, b) => b.bookings - a.bookings)
                .map((city, i) => (
                  <button
                    key={`${city.city}-${city.state}-${i}`}
                    onClick={() => setSelectedCity(city)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-all",
                      selectedCity?.city === city.city && selectedCity?.state === city.state
                        ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                        : "border-border/50 hover:border-primary/40 hover:bg-muted/20"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-muted-foreground/50 w-4 text-right">{i + 1}</span>
                      <div>
                        <p className="text-xs font-bold text-foreground leading-tight">{city.city || 'N/A'}</p>
                        {!selectedState && <p className="text-[9px] text-muted-foreground">{city.state}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-foreground">{city.bookings}</p>
                      <p className="text-[8px] text-muted-foreground uppercase tracking-wider">agend.</p>
                    </div>
                  </button>
                ))}
              {(selectedState ? selectedStateCities : cityData).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhuma cidade com dados</p>
              )}
            </CardContent>
          </Card>

          {/* City detail */}
          {selectedCity && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-foreground">{selectedCity.city}</h3>
                  <button onClick={() => setSelectedCity(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-card p-2.5 border border-border/50">
                    <p className="text-[8px] text-muted-foreground uppercase tracking-widest mb-0.5">Agendamentos</p>
                    <p className="text-lg font-black text-foreground">{selectedCity.bookings}</p>
                  </div>
                  <div className="rounded-lg bg-card p-2.5 border border-border/50">
                    <p className="text-[8px] text-muted-foreground uppercase tracking-widest mb-0.5">Valor</p>
                    <p className="text-lg font-black text-foreground">R${fmt(selectedCity.value / 100)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
