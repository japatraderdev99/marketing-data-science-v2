import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { toPng } from 'html-to-image';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip as ReTooltip, CartesianGrid,
} from 'recharts';
import {
  Instagram, Facebook, Youtube, Linkedin, RefreshCw, Download,
  Eye, TrendingUp, Heart, MessageCircle, Bookmark, Share2,
  Users, BarChart3, Play, Grid3x3, User, ArrowUp, ArrowDown, ThumbsUp,
  Video, Repeat2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────
interface ChannelPost {
  id: string;
  thumbnail: string;
  caption: string;
  type: string;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  reach: number;
  impressions: number;
  engRate: number;
  date: string;
  permalink?: string;
}

interface ChannelProfile {
  avatar: string;
  username: string;
  name: string;
  bio: string;
  followers: number;
  following: number;
  posts: number;
}

interface ChannelKPI {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  icon: React.ElementType;
}

interface TrendPoint { day: string; engagement: number; reach: number; }
interface FormatSlice { name: string; value: number; color: string; }

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};

// ─── Palette ──────────────────────────────────────────────────
const CHANNEL_COLORS: Record<string, string> = {
  instagram: 'hsl(340 82% 52%)',
  facebook: 'hsl(221 44% 41%)',
  tiktok: 'hsl(0 0% 0%)',
  youtube: 'hsl(0 100% 50%)',
  linkedin: 'hsl(210 78% 46%)',
};

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--teal))', 'hsl(262 83% 58%)', 'hsl(45 93% 47%)'];

// ─── Mock data generators ─────────────────────────────────────
function mockTrend(base: number): TrendPoint[] {
  return Array.from({ length: 30 }, (_, i) => ({
    day: `${i + 1}`,
    engagement: Math.round(base + Math.random() * base * 0.4 - base * 0.2),
    reach: Math.round(base * 8 + Math.random() * base * 3),
  }));
}

const MOCK_CHANNELS: Record<string, {
  profile: ChannelProfile;
  kpis: ChannelKPI[];
  trend: TrendPoint[];
  formats: FormatSlice[];
  posts: ChannelPost[];
}> = {
  facebook: {
    profile: { avatar: '', username: 'deixaqueeufaco', name: 'Deixa que eu faço', bio: 'Agência de Marketing Digital 🚀\n💡 Estratégia · Criação · Performance', followers: 4820, following: 312, posts: 245 },
    kpis: [
      { label: 'Alcance', value: '42.1k', delta: '+12%', positive: true, icon: Eye },
      { label: 'Impressões', value: '89.3k', delta: '+8%', positive: true, icon: BarChart3 },
      { label: 'Eng. Rate', value: '3.2%', delta: '+0.4%', positive: true, icon: TrendingUp },
      { label: 'Reações', value: '1.8k', delta: '-5%', positive: false, icon: ThumbsUp },
      { label: 'Shares', value: '423', delta: '+18%', positive: true, icon: Share2 },
      { label: 'Crescimento', value: '+86', delta: '+1.8%', positive: true, icon: Users },
    ],
    trend: mockTrend(150),
    formats: [{ name: 'Link Posts', value: 35, color: PIE_COLORS[0] }, { name: 'Imagens', value: 30, color: PIE_COLORS[1] }, { name: 'Vídeos', value: 25, color: PIE_COLORS[2] }, { name: 'Carrosséis', value: 10, color: PIE_COLORS[3] }],
    posts: Array.from({ length: 10 }, (_, i) => ({ id: `fb-${i}`, thumbnail: `https://picsum.photos/seed/fb${i}/300/300`, caption: `Post Facebook #${i + 1} — Estratégia digital`, type: i % 3 === 0 ? 'Video' : 'Image', likes: Math.round(80 + Math.random() * 200), comments: Math.round(5 + Math.random() * 40), saves: Math.round(2 + Math.random() * 15), shares: Math.round(10 + Math.random() * 60), reach: Math.round(800 + Math.random() * 3000), impressions: Math.round(1500 + Math.random() * 5000), engRate: +(1.5 + Math.random() * 4).toFixed(1), date: new Date(Date.now() - i * 86400000 * 2).toISOString() })),
  },
  tiktok: {
    profile: { avatar: '', username: '@deixaqueeufaco', name: 'Deixa que eu faço', bio: '🎬 Marketing criativo\n📈 Dicas de growth', followers: 12400, following: 189, posts: 87 },
    kpis: [
      { label: 'Views', value: '320k', delta: '+45%', positive: true, icon: Eye },
      { label: 'Impressões', value: '890k', delta: '+32%', positive: true, icon: BarChart3 },
      { label: 'Eng. Rate', value: '8.7%', delta: '+1.2%', positive: true, icon: TrendingUp },
      { label: 'Likes', value: '28k', delta: '+22%', positive: true, icon: Heart },
      { label: 'Shares', value: '3.2k', delta: '+38%', positive: true, icon: Share2 },
      { label: 'Crescimento', value: '+1.2k', delta: '+10.7%', positive: true, icon: Users },
    ],
    trend: mockTrend(800),
    formats: [{ name: 'Vídeos curtos', value: 65, color: PIE_COLORS[0] }, { name: 'Trends', value: 20, color: PIE_COLORS[1] }, { name: 'Duets', value: 10, color: PIE_COLORS[2] }, { name: 'Lives', value: 5, color: PIE_COLORS[3] }],
    posts: Array.from({ length: 10 }, (_, i) => ({ id: `tt-${i}`, thumbnail: `https://picsum.photos/seed/tt${i}/300/300`, caption: `🎵 TikTok trend #${i + 1}`, type: 'Video', likes: Math.round(500 + Math.random() * 5000), comments: Math.round(20 + Math.random() * 200), saves: Math.round(10 + Math.random() * 100), shares: Math.round(50 + Math.random() * 500), reach: Math.round(5000 + Math.random() * 50000), impressions: Math.round(8000 + Math.random() * 80000), engRate: +(4 + Math.random() * 12).toFixed(1), date: new Date(Date.now() - i * 86400000).toISOString() })),
  },
  youtube: {
    profile: { avatar: '', username: 'DeixaQueEuFaco', name: 'Deixa que eu faço', bio: 'Canal oficial — Tutoriais de marketing e growth hacking', followers: 2150, following: 45, posts: 38 },
    kpis: [
      { label: 'Views', value: '85k', delta: '+15%', positive: true, icon: Eye },
      { label: 'Watch Time (h)', value: '1.2k', delta: '+9%', positive: true, icon: BarChart3 },
      { label: 'CTR', value: '5.8%', delta: '+0.3%', positive: true, icon: TrendingUp },
      { label: 'Likes', value: '4.2k', delta: '+11%', positive: true, icon: ThumbsUp },
      { label: 'Shares', value: '312', delta: '-2%', positive: false, icon: Share2 },
      { label: 'Inscritos', value: '+124', delta: '+6.1%', positive: true, icon: Users },
    ],
    trend: mockTrend(300),
    formats: [{ name: 'Shorts', value: 45, color: PIE_COLORS[0] }, { name: 'Long-form', value: 35, color: PIE_COLORS[1] }, { name: 'Lives', value: 12, color: PIE_COLORS[2] }, { name: 'Community', value: 8, color: PIE_COLORS[3] }],
    posts: Array.from({ length: 10 }, (_, i) => ({ id: `yt-${i}`, thumbnail: `https://picsum.photos/seed/yt${i}/300/170`, caption: `📹 Tutorial de marketing #${i + 1}`, type: i % 2 === 0 ? 'Short' : 'Video', likes: Math.round(40 + Math.random() * 300), comments: Math.round(3 + Math.random() * 50), saves: 0, shares: Math.round(5 + Math.random() * 40), reach: Math.round(2000 + Math.random() * 15000), impressions: Math.round(3000 + Math.random() * 20000), engRate: +(2 + Math.random() * 6).toFixed(1), date: new Date(Date.now() - i * 86400000 * 3).toISOString() })),
  },
  linkedin: {
    profile: { avatar: '', username: 'deixa-que-eu-faco', name: 'Deixa que eu faço', bio: 'Agência de Marketing Digital | B2B | Estratégia & Performance', followers: 3200, following: 890, posts: 156 },
    kpis: [
      { label: 'Impressões', value: '28k', delta: '+18%', positive: true, icon: Eye },
      { label: 'Cliques', value: '1.4k', delta: '+7%', positive: true, icon: BarChart3 },
      { label: 'Eng. Rate', value: '4.1%', delta: '+0.6%', positive: true, icon: TrendingUp },
      { label: 'Reações', value: '2.1k', delta: '+14%', positive: true, icon: ThumbsUp },
      { label: 'Reposts', value: '189', delta: '+25%', positive: true, icon: Repeat2 },
      { label: 'Seguidores', value: '+95', delta: '+3.1%', positive: true, icon: Users },
    ],
    trend: mockTrend(200),
    formats: [{ name: 'Artigos', value: 30, color: PIE_COLORS[0] }, { name: 'Carrosséis', value: 35, color: PIE_COLORS[1] }, { name: 'Imagens', value: 20, color: PIE_COLORS[2] }, { name: 'Vídeos', value: 15, color: PIE_COLORS[3] }],
    posts: Array.from({ length: 10 }, (_, i) => ({ id: `li-${i}`, thumbnail: `https://picsum.photos/seed/li${i}/300/300`, caption: `💼 Insight B2B #${i + 1} — Growth e estratégia`, type: i % 3 === 0 ? 'Carrossel' : 'Artigo', likes: Math.round(30 + Math.random() * 150), comments: Math.round(5 + Math.random() * 30), saves: Math.round(3 + Math.random() * 20), shares: Math.round(5 + Math.random() * 30), reach: Math.round(1000 + Math.random() * 8000), impressions: Math.round(2000 + Math.random() * 12000), engRate: +(2 + Math.random() * 5).toFixed(1), date: new Date(Date.now() - i * 86400000 * 2).toISOString() })),
  },
};

// ─── Shared Components ────────────────────────────────────────

function ProfileHeader({ profile, color }: { profile: ChannelProfile; color: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full" style={{ background: color }}>
        {profile.avatar ? (
          <img src={profile.avatar} alt={profile.username} className="h-14 w-14 rounded-full object-cover border-2 border-background" />
        ) : (
          <User className="h-7 w-7 text-white" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold truncate">{profile.username}</p>
        {profile.name && <p className="text-xs text-muted-foreground font-medium">{profile.name}</p>}
        {profile.bio && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 whitespace-pre-line">{profile.bio}</p>}
      </div>
      <div className="flex gap-6 text-center shrink-0">
        <div><p className="text-lg font-bold">{fmt(profile.posts)}</p><p className="text-[10px] text-muted-foreground uppercase">Posts</p></div>
        <div><p className="text-lg font-bold">{fmt(profile.followers)}</p><p className="text-[10px] text-muted-foreground uppercase">Seguidores</p></div>
        <div><p className="text-lg font-bold">{fmt(profile.following)}</p><p className="text-[10px] text-muted-foreground uppercase">Seguindo</p></div>
      </div>
    </div>
  );
}

function KPICards({ kpis }: { kpis: ChannelKPI[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((k) => (
        <Card key={k.label} className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <k.icon className="h-3.5 w-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wider">{k.label}</span>
          </div>
          <p className="text-xl font-bold">{k.value}</p>
          <div className={cn("flex items-center gap-0.5 text-xs font-medium mt-0.5", k.positive ? 'text-emerald-500' : 'text-red-400')}>
            {k.positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {k.delta}
          </div>
        </Card>
      ))}
    </div>
  );
}

function ChannelCharts({ trend, formats }: { trend: TrendPoint[]; formats: FormatSlice[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Engagement Trend — 30 dias</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--teal))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--teal))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <ReTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="engagement" stroke="hsl(var(--primary))" fill="url(#engGrad)" strokeWidth={2} name="Engagement" />
            <Area type="monotone" dataKey="reach" stroke="hsl(var(--teal))" fill="url(#reachGrad)" strokeWidth={2} name="Alcance" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Formatos</p>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={formats} cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={3} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {formats.map((f, i) => <Cell key={i} fill={f.color} />)}
            </Pie>
            <ReTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function TopPostsTable({ posts, showAction, onUseAsRef }: { posts: ChannelPost[]; showAction?: boolean; onUseAsRef?: (post: ChannelPost) => void }) {
  const sorted = [...posts].sort((a, b) => b.engRate - a.engRate).slice(0, 10);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Top Posts por Engagement</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Caption</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Likes</TableHead>
              <TableHead className="text-right">Comentários</TableHead>
              <TableHead className="text-right">Saves</TableHead>
              <TableHead className="text-right">Alcance</TableHead>
              <TableHead className="text-right">Eng %</TableHead>
              <TableHead>Data</TableHead>
              {showAction && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="p-1">
                  <img src={p.thumbnail} alt="" className="h-9 w-9 rounded object-cover" />
                </TableCell>
                <TableCell className="max-w-[180px] truncate text-xs">{p.caption}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[10px]">{p.type}</Badge>
                </TableCell>
                <TableCell className="text-right text-xs">{fmt(p.likes)}</TableCell>
                <TableCell className="text-right text-xs">{fmt(p.comments)}</TableCell>
                <TableCell className="text-right text-xs">{fmt(p.saves)}</TableCell>
                <TableCell className="text-right text-xs">{fmt(p.reach)}</TableCell>
                <TableCell className="text-right">
                  <span className={cn("text-xs font-semibold", p.engRate > 5 ? 'text-emerald-500' : p.engRate > 3 ? 'text-primary' : 'text-muted-foreground')}>
                    {p.engRate}%
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(p.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </TableCell>
                {showAction && (
                  <TableCell>
                    <Button size="sm" variant="ghost" className="text-[10px] h-7 text-primary" onClick={() => onUseAsRef?.(p)}>
                      Usar como Ref.
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Mock Channel Tab ─────────────────────────────────────────
function MockChannelTab({ channelKey }: { channelKey: string }) {
  const data = MOCK_CHANNELS[channelKey];
  if (!data) return null;
  const color = CHANNEL_COLORS[channelKey];
  return (
    <div className="space-y-5">
      <ProfileHeader profile={data.profile} color={color} />
      <KPICards kpis={data.kpis} />
      <ChannelCharts trend={data.trend} formats={data.formats} />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="border-dashed">Mock Data</Badge>
        <span>Dados simulados — conecte a API para dados reais</span>
      </div>
      <TopPostsTable posts={data.posts} />
    </div>
  );
}

// ─── Instagram Tab (real data) ────────────────────────────────
interface IGProfile {
  username: string;
  name: string;
  biography: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  profile_picture_url: string;
}

interface InstagramPost {
  id: string;
  instagram_media_id: string;
  caption: string | null;
  media_type: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  permalink: string | null;
  impressions: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  video_views: number | null;
  published_at: string | null;
}

function InstagramTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [igProfile, setIgProfile] = useState<IGProfile | null>(() => {
    const saved = localStorage.getItem('grid_igProfile');
    return saved ? JSON.parse(saved) : null;
  });
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (igProfile) localStorage.setItem('grid_igProfile', JSON.stringify(igProfile)); }, [igProfile]);
  useEffect(() => { if (user) fetchPosts(); }, [user]);

  async function fetchPosts() {
    setLoading(true);
    const { data } = await supabase.from('instagram_posts').select('*').order('published_at', { ascending: false }).limit(100);
    if (data) setPosts(data as InstagramPost[]);
    setLoading(false);
  }

  async function syncInstagram() {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-meta-insights', { body: { sync_type: 'organic', limit: 50 } });
      if (error) throw error;
      if (data?.success) {
        if (data.profile) setIgProfile(data.profile);
        toast({ title: `✅ ${data.synced_posts} posts sincronizados!`, description: `@${data.profile?.username || 'Instagram'}` });
        await fetchPosts();
      } else {
        toast({ title: 'Erro na sincronização', description: data?.error || 'Erro desconhecido', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Falha', variant: 'destructive' });
    }
    setSyncing(false);
  }

  const followers = igProfile?.followers_count || 0;

  // Build KPIs
  const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.comments || 0), 0);
  const totalSaves = posts.reduce((s, p) => s + (p.saves || 0), 0);
  const totalShares = posts.reduce((s, p) => s + (p.shares || 0), 0);
  const totalReach = posts.reduce((s, p) => s + (p.reach || 0), 0);
  const totalImpressions = posts.reduce((s, p) => s + (p.impressions || 0), 0);
  const avgEng = posts.length && followers
    ? posts.reduce((s, p) => s + ((p.likes || 0) + (p.comments || 0) + (p.saves || 0) + (p.shares || 0)) / followers * 100, 0) / posts.length
    : 0;

  const kpis: ChannelKPI[] = [
    { label: 'Alcance', value: fmt(totalReach), delta: posts.length ? `${posts.length} posts` : '—', positive: true, icon: Eye },
    { label: 'Impressões', value: fmt(totalImpressions), delta: '—', positive: true, icon: BarChart3 },
    { label: 'Eng. Rate', value: `${avgEng.toFixed(1)}%`, delta: avgEng > 3 ? 'Excelente' : 'Média', positive: avgEng > 2, icon: TrendingUp },
    { label: 'Saves', value: fmt(totalSaves), delta: '—', positive: true, icon: Bookmark },
    { label: 'Shares', value: fmt(totalShares), delta: '—', positive: true, icon: Share2 },
    { label: 'Seguidores', value: fmt(followers), delta: '—', positive: true, icon: Users },
  ];

  // Build trend from real posts (group by day)
  const trend: TrendPoint[] = posts.slice(0, 30).reverse().map((p, i) => ({
    day: p.published_at ? new Date(p.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : `${i + 1}`,
    engagement: (p.likes || 0) + (p.comments || 0) + (p.saves || 0) + (p.shares || 0),
    reach: p.reach || 0,
  }));

  // Format breakdown
  const reels = posts.filter(p => p.media_type === 'VIDEO').length;
  const carousels = posts.filter(p => p.media_type === 'CAROUSEL_ALBUM').length;
  const images = posts.filter(p => p.media_type === 'IMAGE').length;
  const formats: FormatSlice[] = [
    { name: 'Reels', value: reels, color: PIE_COLORS[0] },
    { name: 'Carrosséis', value: carousels, color: PIE_COLORS[1] },
    { name: 'Imagens', value: images, color: PIE_COLORS[2] },
  ].filter(f => f.value > 0);

  // Map to ChannelPost for table
  const channelPosts: ChannelPost[] = posts.map(p => {
    const totalEng = (p.likes || 0) + (p.comments || 0) + (p.saves || 0) + (p.shares || 0);
    return {
      id: p.id,
      thumbnail: p.thumbnail_url || p.media_url || '',
      caption: p.caption || '',
      type: p.media_type === 'VIDEO' ? 'Reel' : p.media_type === 'CAROUSEL_ALBUM' ? 'Carrossel' : 'Imagem',
      likes: p.likes || 0,
      comments: p.comments || 0,
      saves: p.saves || 0,
      shares: p.shares || 0,
      reach: p.reach || 0,
      impressions: p.impressions || 0,
      engRate: followers > 0 ? +((totalEng / followers) * 100).toFixed(1) : 0,
      date: p.published_at || '',
      permalink: p.permalink || undefined,
    };
  });

  const profile: ChannelProfile = {
    avatar: igProfile?.profile_picture_url || '',
    username: igProfile?.username || 'seuperfil',
    name: igProfile?.name || '',
    bio: igProfile?.biography || '',
    followers: igProfile?.followers_count || 0,
    following: igProfile?.follows_count || 0,
    posts: igProfile?.media_count || posts.length,
  };

  function handleUseAsRef(post: ChannelPost) {
    const refData = {
      caption: post.caption,
      type: post.type,
      thumbnail: post.thumbnail,
      likes: post.likes,
      comments: post.comments,
      saves: post.saves,
      shares: post.shares,
      reach: post.reach,
      engRate: post.engRate,
      permalink: post.permalink,
      channel: 'Instagram',
    };

    if (post.type === 'Carrossel') {
      localStorage.setItem('ig_ref_to_carousel', JSON.stringify(refData));
      navigate('/ai-carrosseis');
      toast({ title: '📋 Referência carregada', description: 'Post carrossel usado como referência para novo carrossel.' });
    } else if (post.type === 'Reel') {
      localStorage.setItem('ig_ref_to_video', JSON.stringify(refData));
      navigate('/video-ia');
      toast({ title: '📋 Referência carregada', description: 'Reel usado como referência para novo vídeo.' });
    } else {
      localStorage.setItem('ig_ref_to_criativo', JSON.stringify(refData));
      navigate('/criativo');
      toast({ title: '📋 Referência carregada', description: 'Post usado como referência para novo criativo.' });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={syncInstagram} disabled={syncing}>
          <RefreshCw className={cn("mr-1 h-3.5 w-3.5", syncing && "animate-spin")} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Instagram'}
        </Button>
        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">Dados Reais</Badge>
      </div>

      <ProfileHeader profile={profile} color={CHANNEL_COLORS.instagram} />

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando posts...</div>
      ) : posts.length === 0 ? (
        <Card className="p-10 text-center">
          <RefreshCw className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum post sincronizado</p>
          <Button size="sm" className="mt-3" onClick={syncInstagram} disabled={syncing}>Sincronizar agora</Button>
        </Card>
      ) : (
        <>
          <KPICards kpis={kpis} />
          <ChannelCharts trend={trend} formats={formats} />
          <TopPostsTable posts={channelPosts} showAction onUseAsRef={handleUseAsRef} />
        </>
      )}
    </div>
  );
}

// ─── TikTok Icon (custom) ─────────────────────────────────────
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.92 2.92 0 0 1 .88.13V9.04a6.33 6.33 0 0 0-.88-.07 6.34 6.34 0 1 0 6.34 6.34V9.83a8.18 8.18 0 0 0 3.76.92V7.31a4.85 4.85 0 0 1-1-.62Z"/>
    </svg>
  );
}

// MetaAdsTab moved to Analytics page

// ─── Main Page ────────────────────────────────────────────────
export default function CanaisOrganicos() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="instagram" className="w-full">
        <TabsList className="w-full justify-start gap-1 bg-card border border-border h-auto p-1 flex-wrap">
          <TabsTrigger value="instagram" className="gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500/20 data-[state=active]:to-amber-500/20 data-[state=active]:text-pink-400">
            <Instagram className="h-4 w-4" /> Instagram
          </TabsTrigger>
          <TabsTrigger value="facebook" className="gap-1.5 data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-400">
            <Facebook className="h-4 w-4" /> Facebook
          </TabsTrigger>
          <TabsTrigger value="tiktok" className="gap-1.5">
            <TikTokIcon className="h-4 w-4" /> TikTok
          </TabsTrigger>
          <TabsTrigger value="youtube" className="gap-1.5 data-[state=active]:bg-red-500/15 data-[state=active]:text-red-400">
            <Youtube className="h-4 w-4" /> YouTube
          </TabsTrigger>
          <TabsTrigger value="linkedin" className="gap-1.5 data-[state=active]:bg-blue-600/15 data-[state=active]:text-blue-500">
            <Linkedin className="h-4 w-4" /> LinkedIn
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instagram"><InstagramTab /></TabsContent>
        <TabsContent value="facebook"><MockChannelTab channelKey="facebook" /></TabsContent>
        <TabsContent value="tiktok"><MockChannelTab channelKey="tiktok" /></TabsContent>
        <TabsContent value="youtube"><MockChannelTab channelKey="youtube" /></TabsContent>
        <TabsContent value="linkedin"><MockChannelTab channelKey="linkedin" /></TabsContent>
      </Tabs>
    </div>
  );
}
