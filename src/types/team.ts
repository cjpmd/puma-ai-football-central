
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
  logoUrl?: string | null;
  isReadOnly?: boolean; // For linked teams
  created_at?: string;
  updated_at?: string;
}
