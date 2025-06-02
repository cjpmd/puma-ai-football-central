export interface KitDesign {
  shirtColor: string;
  sleeveColor: string;
  hasStripes: boolean;
  stripeColor: string;
  shortsColor: string;
  socksColor: string;
}

export interface KitDesigns {
  home: KitDesign;
  away: KitDesign;
  training: KitDesign;
  goalkeeper: KitDesign;
}

export interface KitIcons {
  home: string;
  away: string;
  training: string;
  goalkeeper: string;
}

export interface Team {
  id: string;
  name: string;
  ageGroup: string;
  seasonStart: string;
  seasonEnd: string;
  clubId?: string;
  subscriptionType: string;
  gameFormat: string;
  kitIcons: KitIcons;
  logoUrl?: string | null;
  performanceCategories: string[];
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  privacySettings?: {
    showScoresToParents: boolean;
    showScoresToPlayers: boolean;
    showPlayerStatsToParents: boolean;
    showPlayerStatsToPlayers: boolean;
  };
  isReadOnly?: boolean;
  kitDesigns?: KitDesigns;
  createdAt: string;
  updatedAt: string;
}

export interface TeamStaff {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  linkingCode?: string;
  pvgChecked?: boolean;
  pvgCheckedBy?: string;
  pvgCheckedAt?: string;
  coachingBadges?: any[];
  certificates?: any[];
  createdAt: string;
  updatedAt: string;
}

export type PlayerAttributeGroup = "goalkeeping" | "mental" | "physical" | "technical";

export const DEFAULT_PLAYER_ATTRIBUTES = [
  // Goalkeeping
  { id: 'shot_stopping', name: 'Shot Stopping', group: 'goalkeeping' as PlayerAttributeGroup, value: 5, enabled: true },
  { id: 'distribution', name: 'Distribution', group: 'goalkeeping' as PlayerAttributeGroup, value: 5, enabled: true },
  { id: 'positioning', name: 'Positioning', group: 'goalkeeping' as PlayerAttributeGroup, value: 5, enabled: true },
  { id: 'communication', name: 'Communication', group: 'goalkeeping' as PlayerAttributeGroup, value: 5, enabled: true },
  
  // Technical
  { id: 'first_touch', name: 'First Touch', group: 'technical' as PlayerAttributeGroup, value: 5, enabled: true },
  { id: 'passing', name: 'Passing', group: 'technical' as PlayerAttributeGroup, value: 5, enabled: true },
  { id: 'shooting', name: 'Shooting', group: 'technical' as PlayerAttributeGroup, value: 5, enabled: true },
  { id: 'dribbling', name: 'Dribbling', group: 'technical' as PlayerAttributeGroup, value: 5, enabled: true },
  { id: 'crossing', name: 'Crossing', group: 'technical' as PlayerAttributeGroup, value: 5, enabled: true },
  { id: 'tackling', name: 'Tackling', group: 'technical' as PlayerAttributeGroup, value: 5, enabled: true },
  { id: 'heading', name: 'Heading', group: 'technical' as PlayerAttributeGroup, value: 5, enabled: true },
  
  // Physical
  { id: 'pace', name: 'Pace', group: 'physical' as PlayerAttributeGroup, value: 5, enabled: true },
  { id: 'strength', name: 'Strength', group: 'physical' as PlayerAttributeGroup, value: 5, enabled: true },
  { id: 'stamina', name: 'Stamina', group: 'physical' as PlayerAttributeGroup, value: 5, enabled: true },
  { id: 'agility', name: 'Agility', group: 'physical' as PlayerAttributeGroup, value: 5, enabled: true },
  { id: 'balance', name: 'Balance', group: 'physical' as PlayerAttributeGroup, value: 5, enabled: true },
  
  // Mental
  { id: 'decision_making', name: 'Decision Making', group: 'mental' as PlayerAttributeGroup, value: 5, enabled: true },
  { id: 'concentration', name: 'Concentration', group: 'mental' as PlayerAttributeGroup, value: 5, enabled: true },
  { id: 'teamwork', name: 'Teamwork', group: 'mental' as PlayerAttributeGroup, value: 5, enabled: true },
  { id: 'leadership', name: 'Leadership', group: 'mental' as PlayerAttributeGroup, value: 5, enabled: true },
  { id: 'creativity', name: 'Creativity', group: 'mental' as PlayerAttributeGroup, value: 5, enabled: true }
];
