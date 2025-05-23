
export interface Club {
  id: string;
  name: string;
  reference_number?: string;
  subscription_type?: string;
  serial_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeamStaff {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'manager' | 'assistant_manager' | 'coach' | 'helper';
  user_id?: string;
  coachingBadges?: string[];
  certificates?: {
    name: string;
    issuedBy: string;
    dateIssued: string;
    expiryDate?: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
}

export type PlayerAttributeGroup = "goalkeeping" | "mental" | "physical" | "technical";

export const DEFAULT_PLAYER_ATTRIBUTES: Record<PlayerAttributeGroup, string[]> = {
  goalkeeping: [
    'Shot Stopping',
    'Distribution',
    'Communication',
    'Cross Handling',
    'One-on-One',
    'Footwork'
  ],
  mental: [
    'Decision Making',
    'Concentration',
    'Leadership',
    'Work Rate',
    'Teamwork',
    'Composure'
  ],
  physical: [
    'Pace',
    'Stamina',
    'Strength',
    'Jumping',
    'Balance',
    'Agility'
  ],
  technical: [
    'First Touch',
    'Passing',
    'Shooting',
    'Dribbling',
    'Crossing',
    'Tackling'
  ]
};

export type FAProvider = 'comet' | 'matchday' | 'fulltime' | 'playmetrix' | 'custom';

export interface PlayerAttribute {
  id: string;
  name: string;
  group: PlayerAttributeGroup;
  value: number;
  enabled: boolean;
}

export interface FAConnection {
  provider: FAProvider;
  isConnected: boolean;
  syncEnabled: boolean;
  lastSync?: string;
}

export interface Team {
  id: string;
  name: string;
  ageGroup: string;
  seasonStart: string;
  seasonEnd: string;
  clubId?: string;
  gameFormat: string;
  subscriptionType?: string;
  performanceCategories?: string[];
  kitIcons?: {
    home: string;
    away: string;
    training: string;
    goalkeeper: string;
  };
  staff?: TeamStaff[];
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  playerAttributes?: Record<PlayerAttributeGroup, PlayerAttribute[]>;
  faConnection?: FAConnection;
  createdAt?: string;
  updatedAt?: string;
}
