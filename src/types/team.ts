
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
  createdAt?: string;
  updatedAt?: string;
}
