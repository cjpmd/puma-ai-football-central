
import { 
  SubscriptionType,
  PlayerAttribute,
  Position
} from '@/types';

// Define types used specifically in team settings
export type PlayerAttributeGroup = 'goalkeeping' | 'mental' | 'physical' | 'technical';

export type GameFormat = '3-a-side' | '4-a-side' | '5-a-side' | '7-a-side' | '9-a-side' | '11-a-side';

export type TeamStaff = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'manager' | 'assistant_manager' | 'coach' | 'helper';
  coachingBadges?: string[];
  certificates?: {
    id: string;
    name: string;
    date: string;
    expires?: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type FAProvider = 'comet' | 'matchday' | 'fulltime' | 'playmetrix' | 'custom';

// Define performance category type
export type PerformanceCategory = {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  createdAt: string;
  updatedAt: string;
};

// Type to match the imported Team type from '@/types'
export interface Team {
  id: string;
  name: string;
  ageGroup: string;
  seasonStart: string;
  seasonEnd: string;
  clubId?: string;
  clubReferenceNumber?: string;
  subscriptionType: SubscriptionType;
  gameFormat: GameFormat;
  kitIcons: {
    home: string;
    away: string;
    training: string;
    goalkeeper: string;
  };
  performanceCategories: string[];
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  createdAt: string;
  updatedAt: string;
  staff?: TeamStaff[];
  playerAttributes?: Record<PlayerAttributeGroup, PlayerAttribute[]>;
  faConnection?: {
    provider: FAProvider;
    isConnected: boolean;
    syncEnabled: boolean;
    lastSync?: string;
  };
}

// Default player attributes to populate settings
export const DEFAULT_PLAYER_ATTRIBUTES = {
  goalkeeping: [
    'Aerial Reach',
    'Command of Area',
    'Communication',
    'Eccentricity',
    'Handling',
    'Kicking',
    'One on Ones',
    'Punching',
    'Reflexes',
    'Rushing Out',
    'Throwing'
  ],
  mental: [
    'Aggression',
    'Anticipation',
    'Bravery',
    'Composure',
    'Concentration',
    'Decisions',
    'Determination',
    'Flair',
    'Leadership',
    'Off the Ball',
    'Positioning',
    'Teamwork',
    'Vision',
    'Work Rate'
  ],
  physical: [
    'Acceleration',
    'Agility',
    'Balance',
    'Jumping',
    'Natural Fitness',
    'Pace',
    'Stamina',
    'Strength'
  ],
  technical: [
    'Corners',
    'Crossing',
    'Dribbling',
    'Finishing',
    'First Touch',
    'Free Kicks',
    'Heading',
    'Long Shots',
    'Long Throws',
    'Marking',
    'Passing',
    'Penalties',
    'Tackling',
    'Technique'
  ]
};
