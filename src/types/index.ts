
export type UserRole = 
  | "admin" 
  | "team_manager" 
  | "team_assistant_manager" 
  | "team_coach" 
  | "team_helper" 
  | "parent" 
  | "player" 
  | "club_admin" 
  | "club_chair" 
  | "club_secretary"
  | "global_admin";

export type SubscriptionType = "free" | "analytics_plus";
export type PlayerSubscriptionType = "full_squad" | "training";
export type SubscriptionStatus = "active" | "inactive" | "pending" | "paused";

export type User = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  roles: UserRole[];
  faId?: string;
  coachingBadges?: any[];
};

export type Team = {
  id: string;
  name: string;
  ageGroup: string;
  seasonStart: string;
  seasonEnd: string;
  clubId?: string;
  subscriptionType: SubscriptionType;
  gameFormat: GameFormat;
  kitIcons: {
    home: string;
    away: string;
    training: string;
    goalkeeper: string;
  };
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
  createdAt: string;
  updatedAt: string;
};

export type Club = {
  id: string;
  name: string;
  referenceNumber?: string;
  serialNumber?: string;
  teams: string[]; // Array of team IDs
  subscriptionType: SubscriptionType;
  logoUrl?: string | null;
  officials?: ClubOfficial[];
  facilities?: Facility[];
  createdAt: string;
  updatedAt: string;
};

export type PlayerAttribute = {
  id: string;
  name: string;
  group: "goalkeeping" | "mental" | "physical" | "technical";
  value: number; // 1-10
  enabled: boolean; // Added enabled flag for attributes
};

export type PlayerObjective = {
  id: string;
  title: string;
  description: string;
  difficultyRating: number; // 1-5
  reviewDate: string;
  status: "ongoing" | "improving" | "complete";
  createdAt: string;
  createdBy: string;
};

export type PlayerComment = {
  id: string;
  text: string;
  createdAt: string;
  createdBy: string;
};

export type Position = 
  | "GK" | "SK" 
  | "DL" | "DCL" | "DC" | "DCR" | "DR" 
  | "WBL" | "DCML" | "DCM" | "DCMR" | "WBR" 
  | "ML" | "MCL" | "MC" | "MCR" | "MR" 
  | "AML" | "AMCL" | "AMC" | "AMCR" | "AMR" 
  | "STCL" | "STC" | "STCR"
  | "DM" | "STL" | "STR" 
  | "none"; // Added "none" as a valid Position

export type Formation = 
  | "1-1-3-1" | "2-3-1" | "3-2-1" 
  | "3-2-3" | "2-4-2" | "3-3-2" 
  | "custom";

export type GameFormat = 
  | "3-a-side" | "4-a-side" | "5-a-side" 
  | "7-a-side" | "9-a-side" | "11-a-side";

export type MatchStats = {
  totalGames: number;
  captainGames: number;
  playerOfTheMatchCount: number;
  totalMinutes: number;
  minutesByPosition: Record<Position, number>;
  performanceCategoryStats?: Record<string, {
    totalMinutes: number;
    totalGames: number;
    captainGames: number;
    potmCount: number;
    minutesByPosition: Record<string, number>;
  }>;
  recentGames: {
    id: string;
    date: string;
    opponent?: string;
    captain: boolean;
    playerOfTheMatch: boolean;
    minutes: number;
    minutesByPosition: Record<Position, number>;
    performanceCategory?: string;
    wasSubstitute?: boolean;
  }[];
};

export type Player = {
  id: string;
  name: string;
  dateOfBirth: string;
  squadNumber: number;
  type: "outfield" | "goalkeeper";
  teamId: string;
  attributes: PlayerAttribute[];
  objectives: PlayerObjective[];
  comments: PlayerComment[];
  matchStats: MatchStats;
  availability: "amber" | "green" | "red";
  parentId?: string;
  subscriptionType?: PlayerSubscriptionType;
  subscriptionStatus?: SubscriptionStatus;
  status?: "active" | "inactive"; // Player status (active or left the team)
  leaveDate?: string; // Date when player left the team
  leaveComments?: string; // Comments about player leaving
  kit_sizes?: Record<string, string>; // Added kit_sizes property
  createdAt: string;
  updatedAt: string;
};

export type Parent = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  playerId: string;
  linkCode: string;
  subscriptionType?: PlayerSubscriptionType;
  subscriptionStatus?: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
};

export type PlayerTransfer = {
  id: string;
  playerId: string;
  fromTeamId?: string;
  toTeamId?: string;
  transferDate: string;
  status: "pending" | "accepted" | "rejected";
  dataTransferOptions: {
    full: boolean;
    attributes: boolean;
    comments: boolean;
    objectives: boolean;
    events: boolean;
  };
  requestedBy: string;
  acceptedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type AttributeHistory = {
  id: string;
  playerId: string;
  attributeName: string;
  attributeGroup: string;
  value: number;
  recordedDate: string;
  recordedBy: string;
  createdAt: string;
};

export type EventType = 
  | "fixture" | "friendly" | "tournament" 
  | "festival" | "training" | "social";

export type TeamSelection = {
  teamId: string;
  formation: Formation;
  performanceCategory?: string;
  captainId?: string;
  players: {
    playerId: string;
    position: Position;
  }[];
  substitutes: string[]; // Player IDs
};

export type Period = {
  id: string;
  name: string;
  duration: number; // minutes
  teamSelections: Record<string, TeamSelection>; // key is team ID
};

export interface Event {
  id?: string;
  teamId: string;
  title: string;
  description?: string;
  type: 'training' | 'match' | 'fixture' | 'tournament' | 'festival' | 'social' | 'friendly';
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
  gameFormat?: GameFormat;
  opponent?: string;
  isHome?: boolean;
  facilityId?: string;
  trainingNotes?: string;
  scores?: {
    home: number;
    away: number;
  };
  playerOfTheMatchId?: string;
  meetingTime?: string;
  teams?: string[];
}

export type EquipmentItem = {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  quantity: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  createdAt: string;
  updatedAt: string;
};

export type Facility = {
  id: string;
  clubId: string;
  name: string;
  description?: string;
  bookableUnits: string;
  createdAt: string;
  updatedAt: string;
};

export type ClubRole = 'admin' | 'chair' | 'secretary';

export type ClubOfficial = {
  id: string;
  clubId: string;
  userId: string;
  role: ClubRole;
  assignedAt: string;
  assignedBy?: string;
  createdAt: string;
  updatedAt: string;
  profile?: {
    name: string;
    email: string;
  };
};

export type FacilityAvailability = {
  id: string;
  facilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  bookedByTeamId?: string;
  eventType?: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffCertification = {
  id: string;
  userId: string;
  clubId: string;
  certificationType: string;
  certificationName: string;
  awardedDate: string;
  expiryDate?: string;
  awardedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type TeamSubscription = {
  id: string;
  teamId: string;
  subscriptionType: string;
  status: string;
  startDate: string;
  endDate?: string;
  valuePerPeriod?: number;
  billingPeriod?: string;
  createdAt: string;
  updatedAt: string;
};

export type ClubEvent = {
  id: string;
  teamId: string;
  title: string;
  eventType: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  opponent?: string;
  totalMinutes?: number;
  playerOfMatchId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  roles: string[];
  fa_id: string | null;
  coaching_badges: any[];
  created_at: string;
  updated_at: string;
};
