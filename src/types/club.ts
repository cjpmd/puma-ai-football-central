
import { SubscriptionType } from './index';

export interface Club {
  id: string;
  name: string;
  reference_number?: string;
  subscription_type?: SubscriptionType;
  serial_number?: string;
  teams?: any[];
  logo_url?: string | null;
  userRole?: string; // For linked clubs
  isReadOnly?: boolean; // For linked clubs
  created_at?: string;
  updated_at?: string;
}
