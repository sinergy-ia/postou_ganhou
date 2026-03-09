export type PromotionType = 'story' | 'post' | 'both';

export interface Establishment {
  id: string;
  name: string;
  category: string;
  avatar: string;
  cover: string;
  address: string;
  distance: string;
  description: string;
}

export interface Promotion {
  id: string;
  establishmentId: string;
  title: string;
  description: string;
  type: PromotionType;
  baseReward: string;
  maxReward: string;
  badges: string[];
  rules: string[];
  expiresAt: string;
  stats: {
    participants: number;
    avgLikes: number;
    couponsIssued: number;
  };
  status?: 'active' | 'scheduled' | 'ended';
  isActive?: boolean;
}

export interface Post {
  id: string;
  userName: string;
  userHandle: string;
  userAvatar: string;
  establishmentId: string;
  promotionId: string;
  imageUrl: string;
  likes: number;
  discountEarned: string;
  type: 'story' | 'post';
  badges: string[];
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'redeemed';
}

export interface Coupon {
  id: string;
  code: string;
  userName: string;
  campaignName: string;
  benefit: string;
  validUntil: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
}

export const mockEstablishments: Establishment[] = [
  {
    id: 'e1',
    name: 'Yuruzu Sushi',
    category: 'Restaurantes',
    avatar: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=150&q=80',
    cover: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1200&q=80',
    address: 'Av. Paulista, 1500 - Bela Vista, São Paulo',
    distance: '1.2 km',
    description: 'O melhor rodízio japonês da região, agora com recompensas exclusivas para você que adora compartilhar bons momentos.',
  },
  {
    id: 'e2',
    name: 'Café do Brejo',
    category: 'Cafeterias',
    avatar: 'https://images.unsplash.com/photo-1559925313-8a140452401b?w=150&q=80',
    cover: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=1200&q=80',
    address: 'Rua Augusta, 1000 - Consolação, São Paulo',
    distance: '800m',
    description: 'Cafés especiais e doces artesanais em um ambiente acolhedor.',
  },
  {
    id: 'e3',
    name: 'Burger & Co',
    category: 'Hamburguerias',
    avatar: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=150&q=80',
    cover: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=1200&q=80',
    address: 'Rua Oscar Freire, 200 - Jardins, São Paulo',
    distance: '3.5 km',
    description: 'Hambúrgueres artesanais feitos na brasa com ingredientes premium.',
  },
  {
    id: 'e4',
    name: 'Urban Streetwear',
    category: 'Moda',
    avatar: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=150&q=80',
    cover: 'https://images.unsplash.com/photo-1608667500224-df311311ff99?w=1200&q=80',
    address: 'Rua da Consolação, 2500 - Jardins, São Paulo',
    distance: '2.1 km',
    description: 'Moda urbana com atitude e estilo exclusivo.',
  }
];

export const mockPromotions: Promotion[] = [
  {
    id: 'p1',
    establishmentId: 'e1',
    title: 'Ganhe 15% OFF no Rodízio',
    description: 'Compartilhe um story do seu combinado favorito e marque nosso perfil para liberar o cupom imediato.',
    type: 'story',
    baseReward: '15% OFF',
    maxReward: '20% OFF (100+ likes)',
    badges: ['Cupom imediato', 'Destaque'],
    rules: [
      'Poste um story marcando @yuruzusushi',
      'Adicione a localização do restaurante',
      'Válido apenas de segunda a quinta'
    ],
    expiresAt: '2026-12-31',
    stats: {
      participants: 452,
      avgLikes: 120,
      couponsIssued: 450,
    },
    status: 'active'
  },
  {
    id: 'p2',
    establishmentId: 'e2',
    title: 'Café Grátis no Feed',
    description: 'Poste uma foto do seu café da manhã no feed e ganhe um espresso ou cappuccino por nossa conta.',
    type: 'post',
    baseReward: '1 Café Grátis',
    maxReward: 'Café + Fatias de Bolo (200+ likes)',
    badges: ['Meta de likes'],
    rules: [
      'Poste uma foto no feed marcando @cafedobrejo',
      'Use a hashtag #CafeDoBrejo'
    ],
    expiresAt: '2026-06-30',
    stats: {
      participants: 128,
      avgLikes: 350,
      couponsIssued: 115,
    },
    status: 'scheduled'
  },
  {
    id: 'p3',
    establishmentId: 'e3',
    title: 'Batata Frita Free',
    description: 'Story ou Post com nosso burger te dá uma batata frita média grátis na próxima compra.',
    type: 'both',
    baseReward: 'Batata Frita Média',
    maxReward: 'Combo Família Free (1000+ likes)',
    badges: ['Cupom imediato', 'Popular'],
    rules: [
      'Poste marcando @burgerandco',
      'Mostre o burger na foto',
      'Cupom válido por 15 dias após validação'
    ],
    expiresAt: '2026-10-31',
    stats: {
      participants: 890,
      avgLikes: 85,
      couponsIssued: 880,
    },
    status: 'ended'
  }
];

export const mockPosts: Post[] = [
  {
    id: 'post1',
    userName: 'Mariana Silva',
    userHandle: '@marisilva',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
    establishmentId: 'e1',
    promotionId: 'p1',
    imageUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&q=80',
    likes: 154,
    discountEarned: '20% OFF',
    type: 'story',
    badges: ['Cupom liberado', 'Meta batida'],
    createdAt: 'Hoje, 14:30',
    status: 'approved'
  },
  {
    id: 'post2',
    userName: 'Rafael Costa',
    userHandle: '@rafacosta_sp',
    userAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&q=80',
    establishmentId: 'e3',
    promotionId: 'p3',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
    likes: 1200,
    discountEarned: 'Combo Família',
    type: 'post',
    badges: ['Top da semana', 'Meta batida'],
    createdAt: 'Ontem, 20:15',
    status: 'redeemed'
  },
  {
    id: 'post3',
    userName: 'Ana Beatriz',
    userHandle: '@anab_12',
    userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80',
    establishmentId: 'e2',
    promotionId: 'p2',
    imageUrl: 'https://images.unsplash.com/photo-1495474472251-52d1115f2cb9?w=400&q=80',
    likes: 45,
    discountEarned: '1 Café Grátis',
    type: 'post',
    badges: ['Cupom liberado'],
    createdAt: 'Hoje, 09:10',
    status: 'pending'
  }
];

export const mockCoupons: Coupon[] = [
  { id: 'c1', code: 'YURUZU20OFF', userName: 'Mariana Silva', campaignName: 'Ganhe 15% OFF no Rodízio', benefit: '20% OFF', validUntil: '15/04/2026', status: 'active' },
  { id: 'c2', code: 'COFFEELOVER', userName: 'João Pedro', campaignName: 'Café Grátis no Feed', benefit: '1 Espresso', validUntil: '10/04/2026', status: 'used' },
  { id: 'c3', code: 'BURGERFAM', userName: 'Rafael Costa', campaignName: 'Batata Frita Free', benefit: 'Combo Família', validUntil: '01/04/2026', status: 'expired' },
  { id: 'c4', code: 'YURUZU15', userName: 'Carla Dias', campaignName: 'Ganhe 15% OFF no Rodízio', benefit: '15% OFF', validUntil: '20/04/2026', status: 'active' },
];

export const mockMetrics = {
  activeCampaigns: 12,
  totalPosts: 1245,
  couponsIssued: 1100,
  couponsRedeemed: 850,
  estimatedReach: '1.2M',
  avgEngagement: '4.8%',
};

export const mockChartData = [
  { name: 'Seg', posts: 40, resgates: 24 },
  { name: 'Ter', posts: 30, resgates: 13 },
  { name: 'Qua', posts: 20, resgates: 48 },
  { name: 'Qui', posts: 65, resgates: 39 },
  { name: 'Sex', posts: 120, resgates: 90 },
  { name: 'Sáb', posts: 250, resgates: 180 },
  { name: 'Dom', posts: 210, resgates: 150 },
];
