// ===== DQEF Hub — Seed Data =====
// Dados reais extraídos dos documentos estratégicos da DQEF
// SEED VERSION: bump this to force localStorage reset when seed changes
export const SEED_VERSION = '2026-02-21-v6';

export type Channel = 'TikTok' | 'Meta Ads' | 'LinkedIn' | 'Google Ads' | 'Orgânico' | 'YouTube';
export type Priority = 'Alta' | 'Média' | 'Baixa';
export type KanbanStatus = 'ideia' | 'desenvolvimento' | 'revisao' | 'aprovado' | 'publicado';
export type CampaignStatus = 'Rascunho' | 'Aprovada' | 'Ativa' | 'Pausada' | 'Finalizada';
export type Funnel = 'Topo' | 'Meio' | 'Fundo';
export type ContentFormat = 'Post' | 'Reels' | 'Stories' | 'Carrossel' | 'Ads' | 'Shorts';
export type ContentObjective = 'Awareness' | 'Engajamento' | 'Conversão' | 'Retenção';
export type VideoFormat = 'Reels 9:16' | 'Shorts 9:16' | 'Feed 1:1' | 'Carrossel' | 'Stories 9:16' | 'Horizontal 16:9';
export type ViralMechanism = 'Choque financeiro' | 'Reconhecimento emocional' | 'POV imersivo' | 'ASMR sensorial' | 'Desafio/Challenge' | 'Humor cômica' | 'Indignação coletiva' | 'Prova social';
export type AITool = 'VEO 3.1' | 'Sora' | 'Seedance' | 'Midjourney' | 'Runway' | 'CapCut' | 'Manual';

export interface CampaignFrame {
  id: string;
  label: string; // ex: "Frame 01.A"
  title: string;
  subtitle: string;
  timing: string; // ex: "0s — 4s"
  purpose: string;
  prompt: string;
  type: 'setup' | 'disaster' | 'resolution' | 'hero' | 'cta';
}

export interface Campaign {
  id: string;
  name: string;
  channel: Channel[];
  status: CampaignStatus;
  kanbanStatus: KanbanStatus;
  priority: Priority;
  category: ContentObjective;
  responsible: string;
  avatar: string;
  startDate: string;
  endDate: string;
  budget: number;
  funnel: Funnel;
  objective: string;
  audience: string;
  description: string;
  // Campos criativos
  videoFormat?: VideoFormat;
  duration?: number; // segundos
  aiTool?: AITool[];
  viralMechanism?: ViralMechanism;
  cta?: string;
  hook?: string;
  caption?: string;
  frames?: CampaignFrame[];
  // Métricas
  impressions?: number;
  clicks?: number;
  leads?: number;
  conversions?: number;
  cpc?: number;
  cpl?: number;
  roas?: number;
  // Distribuição
  budgetPaid?: number;
  budgetOrganic?: number;
  targetReach?: number;
  // Gestão
  subtasks: { id: string; title: string; done: boolean }[];
  links: { label: string; url: string }[];
  history: { date: string; action: string; user: string }[];
}

export interface ContentItem {
  id: string;
  title: string;
  format: ContentFormat;
  channel: Channel;
  date: string;
  status: 'Rascunho' | 'Em produção' | 'Aprovado' | 'Publicado';
  copy?: string;
  responsible: string;
}

export interface CopyItem {
  id: string;
  title: string;
  copy: string;
  channel: Channel[];
  objective: ContentObjective;
  category: string;
  tags: string[];
}

export interface Roteiro {
  id: string;
  title: string;
  subtitle: string;
  format: ContentFormat;
  channel: Channel[];
  audience: string;
  concept: string;
  scenes: string[];
  caption: string;
  viralTrigger: string;
  persona: string;
}

export interface IdeiaDisruptiva {
  id: string;
  title: string;
  format: string;
  channel: Channel[];
  concept: string;
  whyViral: string;
  status: 'Aprovada' | 'Pendente' | 'Descartada';
  impact: 'Alto' | 'Médio' | 'Baixo';
}

export interface EstrategiaPublico {
  id: string;
  persona: string;
  icon: string;
  profile: string;
  ageRange: string;
  avgRate: string;
  painPoints: string[];
  approach: string;
  hooks: string[];
  channels: Channel[];
}

// Variação Ninja — série de frames para AI video generation
export interface NinjaVariacao {
  id: string;
  title: string;
  servico: string;
  descricao: string;
  duracao: string;
  color: string;
  frames: CampaignFrame[];
}

// ===== CAMPANHAS =====
export const initialCampaigns: Campaign[] = [
  {
    id: 'camp-awareness-template',
    name: '🎯 Template — Campanha de Awareness',
    channel: ['Meta Ads', 'TikTok'],
    status: 'Rascunho',
    kanbanStatus: 'ideia',
    priority: 'Alta',
    category: 'Awareness',
    responsible: '',
    avatar: 'TM',
    startDate: '',
    endDate: '',
    budget: 0,
    funnel: 'Topo',
    objective: '',
    audience: '',
    description: 'Template de campanha de Awareness. Edite os campos, preencha os dados e use a IA para gerar o plano completo.\n\n📋 Passo a passo:\n1. Edite o nome e objetivo da campanha\n2. Defina canais, público e budget\n3. Preencha as Diretrizes do CMO\n4. Clique em "Gerar Plano com IA"\n5. Aprove o plano → tarefas vão para Kanban e Calendário',
    subtasks: [],
    links: [],
    history: [
      { date: new Date().toISOString(), action: 'Template criado como modelo de referência', user: 'Sistema' },
    ],
  },
];

// ===== CONTEÚDOS EDITORIAIS =====
export const initialContents: ContentItem[] = [];

// ===== COPIES PRONTAS =====
export const initialCopies: CopyItem[] = [];
// ===== ROTEIROS DE CARROSSEL =====
export const initialRoteiros: Roteiro[] = [];
// ===== IDEIAS DISRUPTIVAS =====
export const initialIdeias: IdeiaDisruptiva[] = [];
// ===== ESTRATÉGIAS POR PÚBLICO =====
export const initialEstrategias: EstrategiaPublico[] = [
  {
    id: 'est-000',
    persona: 'Prestador Geral',
    icon: '🛠️',
    profile: 'Qualquer profissional autônomo que presta serviços residenciais ou comerciais — eletricista, encanador, pintor, faxineira, marido de aluguel. Quer mais clientes, menos burocracia e receber rápido pelo trabalho.',
    ageRange: '25–55 anos',
    avgRate: 'R$60–200/hora',
    painPoints: [
      'Taxas abusivas de plataformas intermediárias',
      'Agenda vazia — falta de previsibilidade de renda',
      'Falta de visibilidade digital para novos clientes',
      'Pagamento demorado ou calote frequente',
      'Concorrência com preço baixo desqualificado',
      'Não sabe usar marketing digital a seu favor',
    ],
    approach: 'Comunicação ampla — fala com todos os ofícios de uma vez. Foco nas dores universais: taxa, agenda vazia, pagamento lento. Mostra a DQEF como a ferramenta que liberta o prestador.',
    hooks: [
      'Cansou de pagar taxa pra trabalhar? A DQEF é sua.',
      'PIX na hora. Sem intermediário. Sem taxa abusiva.',
      'Sua agenda cheia. Seu preço justo. Sem depender de plataforma.',
      'Você é bom no que faz. A DQEF cuida do resto.',
      'De autônomo invisível a profissional disputado.',
    ],
    channels: ['Meta Ads', 'TikTok', 'Orgânico'],
  },
  {
    id: 'est-001',
    persona: 'O Eletricista',
    icon: '⚡',
    profile: 'Aprendeu o ofício na prática ou com familiar. Sabe que seu serviço é essencial mas tem medo de cobrar o que vale. Agenda irregular — ou atolado ou parado.',
    ageRange: '35–50 anos',
    avgRate: 'R$80–120/hora',
    painPoints: [
      'Agenda irregular — ou atolado ou parado',
      'Medo de cobrar o valor justo',
      'Dependência de indicação boca a boca',
      'Plataformas que cobram antes de garantir o serviço',
      'Concorrência com preço baixo desqualificado',
    ],
    approach: 'Alta demanda — abordagem de valorização financeira e profissional. Mostrar que ele pode cobrar mais e ter agenda cheia sem pagar taxa absurda.',
    hooks: [
      'Faz a conta: quanto a plataforma tirou de você esse mês?',
      'Você instala o Brasil. Merece cobrar o que vale.',
      'Agenda cheia sem pagar por lead frio.',
    ],
    channels: ['TikTok', 'Meta Ads'],
  },
  {
    id: 'est-002',
    persona: 'O Piscineiro',
    icon: '🏊',
    profile: 'Em Floripa, vive de outubro a março. Nos outros meses, busca bicos ou fica parado. Tem carteira fiel de clientes mas não sabe escalar. Altamente local.',
    ageRange: '28–45 anos',
    avgRate: '6 meses de alta temporada',
    painPoints: [
      'Sazonalidade crítica — 6 meses bons, 6 meses difíceis',
      'Não sabe como ampliar a carteira de clientes',
      'Alta dependência do boca a boca de temporada',
      'Falta de ferramentas de gestão de agenda',
    ],
    approach: 'Sazonal crítico — abordagem de estabilidade e escala. Mostrar como a DQEF pode garantir renda nos meses de baixa temporada.',
    hooks: [
      'Outubro a março é só o começo. A DQEF funciona o ano todo.',
      'Sua carteira de clientes pode crescer mesmo na baixa temporada.',
    ],
    channels: ['Meta Ads', 'Orgânico'],
  },
  {
    id: 'est-003',
    persona: 'O Marido de Aluguel',
    icon: '🔧',
    profile: 'Faz tudo um pouco. Instalações, reparos, pequenas obras. Problema: cliente subestima o serviço porque "é coisa simples". Dificuldade de dependência de 2–3 clientes fixos.',
    ageRange: '30–48 anos',
    avgRate: 'R$60–100/hora',
    painPoints: [
      'Clientes subestimam e querem pagar menos',
      'Dependência de 2-3 clientes fixos — perder um desestabiliza tudo',
      'Dificuldade de precificação de serviços variados',
      'Alta versatilidade não reconhecida como diferencial',
    ],
    approach: 'Alta conversão — abordagem de valorização da versatilidade e diversificação de clientes. A DQEF como base para construir agenda diversa.',
    hooks: [
      'Você resolve tudo. A DQEF resolve o resto.',
      'De 3 clientes para 30 — sem depender de um só.',
    ],
    channels: ['TikTok', 'Meta Ads'],
  },
  {
    id: 'est-004',
    persona: 'A Diarista / Limpeza Airbnb',
    icon: '🧹',
    profile: 'Recorrência altíssima. 3-5 clientes fixos que representam 80% da renda. Cresce no orgânico — indicações são sua força. Airbnb Floripa é nicho premium com alta demanda.',
    ageRange: '25–45 anos',
    avgRate: 'R$150–300/diária',
    painPoints: [
      'Concentração de renda em poucos clientes fixos',
      'Falta de sistema para gerenciar múltiplos Airbnbs',
      'Comunicação manual e descoordenada com proprietários',
      'Sazonalidade do turismo afetando a demanda',
    ],
    approach: 'Recorrência alta — abordagem de organização, escala e premium. A DQEF como ferramenta profissional para crescer no mercado Airbnb de Floripa.',
    hooks: [
      'Floripa tem 12.000 Airbnbs. Só quem é organizado fica com todos.',
      'De 3 para 10 Airbnbs — com a agenda na mão.',
    ],
    channels: ['Meta Ads', 'Orgânico'],
  },
];
