
export interface Club {
  id: string;
  name: string;
  referenceNumber?: string;
  subscriptionType?: string;
  serialNumber?: string;
  teams?: any[];
  logoUrl?: string | null;
  userRole?: string; // For linked clubs
  isReadOnly?: boolean; // For linked clubs
  created_at?: string;
  updated_at?: string;
}
