
import { SubscriptionType } from './index';

export interface Club {
  id: string;
  name: string;
  referenceNumber?: string;
  subscriptionType?: SubscriptionType;
  serialNumber?: string;
  teams?: any[];
  logoUrl?: string | null;
  userRole?: string; // For linked clubs
  isReadOnly?: boolean; // For linked clubs
  createdAt?: string;
  updatedAt?: string;
}
