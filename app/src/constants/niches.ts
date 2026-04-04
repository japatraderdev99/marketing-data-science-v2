export interface NicheCategory {
  id: string;
  label: string;
  emoji: string;
  niches: string[];
}

/** Special persona options that apply across all niches */
export const SPECIAL_PERSONAS = [
  { id: '__geral__', label: 'Geral', desc: 'Conteúdo genérico para todos os nichos', emoji: '🌐' },
  { id: '__institucional__', label: 'Institucional', desc: 'Comunicação da marca DQEF', emoji: '🏢' },
] as const;

export const NICHE_CATEGORIES: NicheCategory[] = [
  {
    id: 'classicos',
    label: 'Clássicos da casa',
    emoji: '🔧',
    niches: [
      'Eletricista', 'Encanador', 'Marido de aluguel / Faz-tudo', 'Pintor de paredes',
      'Pedreiro / Construção', 'Gesseiro / Drywall', 'Assentador de piso / Azulejista',
      'Carpinteiro / Marceneiro', 'Vidraceiro', 'Impermeabilizador',
      'Instalador de câmeras', 'Chaveiro', 'Estofador', 'Montador de móveis',
    ],
  },
  {
    id: 'domesticos',
    label: 'Serviços domésticos e cuidado',
    emoji: '🏠',
    niches: [
      'Diarista / Limpeza', 'Passadeira / Lavanderia', 'Jardineiro / Paisagista',
      'Piscineiro', 'Técnico de AR condicionado', 'Desentupidor', 'Dedetizador',
      'Babá / Cuidadora infantil', 'Cuidadora de idosos',
      'Auxiliar de enfermagem home care',
    ],
  },
  {
    id: 'beleza',
    label: 'Beleza, estética e bem-estar',
    emoji: '💅',
    niches: [
      'Cabeleireira / Barbeiro', 'Manicure / Nail tech', 'Maquiadora profissional',
      'Massagista / Terapeuta', 'Tatuador', 'Nutricionista autônoma',
      'Personal trainer', 'Personal organizer', 'Pet walker / Dog sitter',
    ],
  },
  {
    id: 'tech',
    label: 'Tech, criativo e freelancer',
    emoji: '💻',
    niches: [
      'Técnico de informática', 'Designer gráfico / UX', 'Fotógrafa / Videomaker',
      'Videomaker de eventos', 'Assistente virtual / Admin', 'Designer de interiores',
      'Professor de tecnologia', 'Mecânico móvel / Auto',
    ],
  },
  {
    id: 'logistica',
    label: 'Serviços, logística e mobilidade',
    emoji: '🚚',
    niches: [
      'Freteiro / Mudança', 'Motorista / Transfer', 'Mototaxista / Entregador',
      'Contador autônomo', 'Advogado autônomo', 'Mecânico de bicicleta',
      'Corretor de seguros',
    ],
  },
  {
    id: 'gastronomia',
    label: 'Gastronomia e alimentação',
    emoji: '🍳',
    niches: [
      'Cozinheira / Chef autônoma', 'Churrasqueiro autônomo', 'Confeiteira / Doceira',
      'Barman / Bartender', 'Auxiliar de buffet',
    ],
  },
  {
    id: 'eventos',
    label: 'Festas, eventos e entretenimento',
    emoji: '🎉',
    niches: [
      'Garçom autônomo', 'DJ de festa', 'Cantor / Músico vocal',
      'Baterista / Músico de evento', 'Palhaço / Animador infantil',
      'Animador de festa / Recreacionista', 'Mágico / Ilusionista',
      'Cerimonialista / Wedding planner', 'Mestre de cerimônias / MC',
      'Decoradora de festas', 'Florista / Decoradora floral',
      'Sonorizador / Técnico de som', 'Iluminador de eventos',
      'Segurança de eventos',
    ],
  },
  {
    id: 'professores',
    label: 'Professores e instrutores',
    emoji: '🎓',
    niches: [
      'Professor de inglês', 'Professor de matemática / Exatas',
      'Professor particular / Tutor', 'Professor de LIBRAS',
      'Professor de música / Violão', 'Professor de violino', 'Professor de piano',
      'Professor de canto', 'Professor de pintura / Artes', 'Professor de dança',
      'Professor de yoga / Pilates', 'Professor de boxe / Muay thai',
      'Professor de natação', 'Professor de surf', 'Professor de kitesurf',
      'Professor de beach tênis', 'Professor de tênis', 'Professor de padel',
      'Professor de capoeira', 'Professor de skate', 'Professor de xadrez',
      'Instrutor de direção defensiva',
    ],
  },
];

/** Total niche count */
export const TOTAL_NICHES = NICHE_CATEGORIES.reduce((sum, c) => sum + c.niches.length, 0);
