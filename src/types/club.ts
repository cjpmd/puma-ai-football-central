
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
