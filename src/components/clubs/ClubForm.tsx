
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
    referenceNumber: club?.referenceNumber || '',
    subscriptionType: club?.subscriptionType || 'free' as SubscriptionType,
    logoUrl: club?.logoUrl || null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleLogoChange = (logoUrl: string | null) => {
    setFormData(prev => ({ ...prev, logoUrl }));
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
              currentLogoUrl={formData.logoUrl}
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
            <Label htmlFor="referenceNumber">Reference Number (Optional)</Label>
            <Input
              id="referenceNumber"
              value={formData.referenceNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
              placeholder="Enter reference number"
            />
          </div>

          {/* Subscription Type */}
          <div className="space-y-2">
            <Label htmlFor="subscriptionType">Subscription Type</Label>
            <Select 
              value={formData.subscriptionType} 
              onValueChange={(value: SubscriptionType) => 
                setFormData(prev => ({ ...prev, subscriptionType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subscription type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="pro">Professional</SelectItem>
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
