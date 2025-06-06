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

export interface FAConnection {
  provider: string;
  isConnected: boolean;
  syncEnabled: boolean;
  lastSync?: string;
}

export type NameDisplayOption = 'firstName' | 'surname' | 'fullName' | 'initials';

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
  playerAttributes?: Record<PlayerAttributeGroup, PlayerAttribute[]>;
  faConnection?: FAConnection;
  staff?: TeamStaff[];
  nameDisplayOption?: NameDisplayOption;
  createdAt: string;
  updatedAt: string;
}

export interface TeamStaff {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  user_id?: string;
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

export interface PlayerAttribute {
  id: string;
  name: string;
  group: PlayerAttributeGroup;
  value: number;
  enabled: boolean;
}

export const DEFAULT_PLAYER_ATTRIBUTES: PlayerAttribute[] = [
  // Goalkeeping
  { id: 'shot_stopping', name: 'Shot Stopping', group: 'goalkeeping', value: 5, enabled: true },
  { id: 'distribution', name: 'Distribution', group: 'goalkeeping', value: 5, enabled: true },
  { id: 'positioning', name: 'Positioning', group: 'goalkeeping', value: 5, enabled: true },
  { id: 'communication', name: 'Communication', group: 'goalkeeping', value: 5, enabled: true },
  
  // Technical
  { id: 'first_touch', name: 'First Touch', group: 'technical', value: 5, enabled: true },
  { id: 'passing', name: 'Passing', group: 'technical', value: 5, enabled: true },
  { id: 'shooting', name: 'Shooting', group: 'technical', value: 5, enabled: true },
  { id: 'dribbling', name: 'Dribbling', group: 'technical', value: 5, enabled: true },
  { id: 'crossing', name: 'Crossing', group: 'technical', value: 5, enabled: true },
  { id: 'tackling', name: 'Tackling', group: 'technical', value: 5, enabled: true },
  { id: 'heading', name: 'Heading', group: 'technical', value: 5, enabled: true },
  
  // Physical
  { id: 'pace', name: 'Pace', group: 'physical', value: 5, enabled: true },
  { id: 'strength', name: 'Strength', group: 'physical', value: 5, enabled: true },
  { id: 'stamina', name: 'Stamina', group: 'physical', value: 5, enabled: true },
  { id: 'agility', name: 'Agility', group: 'physical', value: 5, enabled: true },
  { id: 'balance', name: 'Balance', group: 'physical', value: 5, enabled: true },
  
  // Mental
  { id: 'decision_making', name: 'Decision Making', group: 'mental', value: 5, enabled: true },
  { id: 'concentration', name: 'Concentration', group: 'mental', value: 5, enabled: true },
  { id: 'teamwork', name: 'Teamwork', group: 'mental', value: 5, enabled: true },
  { id: 'leadership', name: 'Leadership', group: 'mental', value: 5, enabled: true },
  { id: 'creativity', name: 'Creativity', group: 'mental', value: 5, enabled: true }
];
