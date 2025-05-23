
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
export type SubscriptionStatus = "active" | "inactive" | "pending";

export type GameFormat = 
  | "3-a-side" | "4-a-side" | "5-a-side" 
  | "7-a-side" | "9-a-side" | "11-a-side";

export type Formation = 
  | "1-1-3-1" | "2-3-1" | "3-2-1" 
  | "3-2-3" | "2-4-2" | "3-3-2" 
  | "custom";

export type Position = 
  | "GK" | "SK" 
  | "DL" | "DCL" | "DC" | "DCR" | "DR" 
  | "WBL" | "DCML" | "DCM" | "DCMR" | "WBR" 
  | "ML" | "MCL" | "MC" | "MCR" | "MR" 
  | "AML" | "AMCL" | "AMC" | "AMCR" | "AMR" 
  | "STCL" | "STC" | "STCR"
  | "DM" | "STL" | "STR";

export type FAProvider = 
  | "comet" | "matchday" | "fulltime" | "playmetrix" | "custom";

export type PlayerAttributeGroup = "goalkeeping" | "mental" | "physical" | "technical";

export type PlayerAttribute = {
  id: string;
  name: string;
  group: PlayerAttributeGroup;
  value: number; // 1-10
  enabled: boolean;
};

export type TeamStaff = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "manager" | "assistant_manager" | "coach" | "helper";
  coachingBadges?: string[];
  certificates?: string[];
  createdAt: string;
  updatedAt: string;
};

export type PlayerSubscription = {
  id: string;
  playerId: string;
  type: PlayerSubscriptionType;
  status: SubscriptionStatus;
  value: number; // in pounds
  startDate: string;
  endDate?: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Team = {
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
  faConnection?: {
    provider: FAProvider;
    isConnected: boolean;
    syncEnabled: boolean;
    lastSync?: string;
  };
  playerAttributes: {
    goalkeeping: PlayerAttribute[];
    mental: PlayerAttribute[];
    physical: PlayerAttribute[];
    technical: PlayerAttribute[];
  };
  staff: TeamStaff[];
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_PLAYER_ATTRIBUTES: Record<PlayerAttributeGroup, string[]> = {
  goalkeeping: [
    "Aerial Reach", "Command of Area", "Communication", "Eccentricity", 
    "Handling", "Kicking", "One on Ones", "Punching", "Reflexes", 
    "Rushing Out", "Throwing"
  ],
  mental: [
    "Aggression", "Anticipation", "Bravery", "Composure", "Concentration", 
    "Decisions", "Determination", "Flair", "Leadership", "Off the Ball", 
    "Positioning", "Teamwork", "Vision", "Work Rate"
  ],
  physical: [
    "Acceleration", "Agility", "Balance", "Jumping", "Natural Fitness", 
    "Pace", "Stamina", "Strength"
  ],
  technical: [
    "Corners", "Crossing", "Dribbling", "Finishing", "First Touch", 
    "Free Kicks", "Heading", "Long Shots", "Long Throws", "Marking", 
    "Passing", "Penalties", "Tackling", "Technique"
  ]
};

export const FORMATIONS_BY_FORMAT: Record<GameFormat, Formation[]> = {
  "7-a-side": ["1-1-3-1", "2-3-1", "3-2-1"],
  "9-a-side": ["3-2-3", "2-4-2", "3-3-2"],
  "3-a-side": ["custom"],
  "4-a-side": ["custom"],
  "5-a-side": ["custom"],
  "11-a-side": ["custom"]
};

export const POSITIONS_BY_FORMATION: Record<Formation, Position[]> = {
  "1-1-3-1": ["GK", "DC", "DM", "AML", "AMC", "AMR", "STC"],
  "2-3-1": ["GK", "DL", "DR", "ML", "MC", "MR", "STC"],
  "3-2-1": ["GK", "DL", "DC", "DR", "MCL", "MCR", "STC"],
  "3-2-3": ["GK", "DL", "DC", "DR", "MCL", "MCR", "AMC", "STL", "STR"],
  "2-4-2": ["GK", "DCL", "DCR", "DM", "ML", "MR", "AMC", "STC"],
  "3-3-2": ["GK", "DL", "DC", "DR", "ML", "MC", "MR", "STL", "STR"],
  "custom": [] // All positions available
};
