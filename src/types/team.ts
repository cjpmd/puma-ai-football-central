
import { SubscriptionType, GameFormat } from './index';

export type PlayerAttributeGroup = "goalkeeping" | "mental" | "physical" | "technical";

export interface PlayerAttribute {
  id: string;
  name: string;
  group: PlayerAttributeGroup;
  value: number;
  enabled: boolean;
}

export const DEFAULT_PLAYER_ATTRIBUTES: Record<PlayerAttributeGroup, string[]> = {
  goalkeeping: [
    "Shot Stopping",
    "Handling",
    "Distribution",
    "Positioning",
    "Command of Area",
    "Reflexes"
  ],
  technical: [
    "Ball Control",
    "Passing",
    "Shooting",
    "Dribbling",
    "Crossing",
    "Finishing"
  ],
  physical: [
    "Pace",
    "Strength",
    "Stamina",
    "Agility",
    "Balance",
    "Jumping"
  ],
  mental: [
    "Decision Making",
    "Composure",
    "Leadership",
    "Communication",
    "Concentration",
    "Teamwork"
  ]
};

export interface TeamStaff {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  linkingCode?: string;
  userId?: string;
  pvgChecked?: boolean;
  pvgCheckedBy?: string;
  pvgCheckedAt?: string;
  certificates?: any[];
  coachingBadges?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export type FAProvider = "comet" | "matchday" | "fulltime" | "playmetrix" | "custom";

export interface Team {
  id: string;
  name: string;
  ageGroup: string;
  seasonStart: string;
  seasonEnd: string;
  clubId?: string;
  gameFormat: GameFormat;
  subscriptionType?: SubscriptionType;
  performanceCategories?: string[];
  kitIcons?: {
    home: string;
    away: string;
    training: string;
    goalkeeper: string;
  };
  logoUrl?: string | null;
  playerAttributes?: Record<PlayerAttributeGroup, PlayerAttribute[]>;
  staff?: TeamStaff[];
  faConnection?: {
    provider: string;
    connectionId?: string;
    isConnected: boolean;
    lastSync?: string;
    credentials?: Record<string, any>;
    syncEnabled?: boolean;
  };
  isReadOnly?: boolean; // For linked teams
  createdAt?: string;
  updatedAt?: string;
}
