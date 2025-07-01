
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Club, SubscriptionType } from '@/types/index';
import { LogoUpload } from '@/components/shared/LogoUpload';

interface ClubFormProps {
  club?: Club | null;
  onSubmit: (clubData: Partial<Club>) => void;
  onCancel: () => void;
}

export const ClubForm: React.FC<ClubFormProps> = ({ club, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: club?.name || '',
    reference_number: club?.reference_number || '',
    subscription_type: (club?.subscription_type || 'free') as SubscriptionType,
    logo_url: club?.logo_url || null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleLogoChange = (logoUrl: string | null) => {
    setFormData(prev => ({ ...prev, logo_url: logoUrl }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{club ? 'Edit Club' : 'Create New Club'}</CardTitle>
        <CardDescription>
          {club ? 'Update your club details' : 'Add a new club with automatic serial number generation'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          {club && (
            <LogoUpload
              currentLogoUrl={formData.logo_url}
              onLogoChange={handleLogoChange}
              entityType="club"
              entityId={club.id}
              entityName={formData.name || 'Club'}
            />
          )}

          {/* Basic Information */}
          <div className="space-y-2">
            <Label htmlFor="name">Club Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter club name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_number">Reference Number (Optional)</Label>
            <Input
              id="reference_number"
              value={formData.reference_number}
              onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
              placeholder="Enter reference number"
            />
          </div>

          {/* Subscription Type */}
          <div className="space-y-2">
            <Label htmlFor="subscription_type">Subscription Type</Label>
            <Select 
              value={formData.subscription_type} 
              onValueChange={(value: SubscriptionType) => 
                setFormData(prev => ({ ...prev, subscription_type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subscription type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="pro">Professional</SelectItem>
                <SelectItem value="analytics_plus">Analytics Plus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-puma-blue-500 hover:bg-puma-blue-600">
              {club ? 'Update Club' : 'Create Club'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
