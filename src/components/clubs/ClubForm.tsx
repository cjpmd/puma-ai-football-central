
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Club, SubscriptionType } from '@/types';

interface ClubFormProps {
  club: Club | null;
  onSubmit: (data: Partial<Club>) => void;
  onCancel: () => void;
}

export const ClubForm: React.FC<ClubFormProps> = ({
  club,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<Club>>({
    name: club?.name || '',
    referenceNumber: club?.referenceNumber || '',
    subscriptionType: club?.subscriptionType || 'free',
    teams: club?.teams || []
  });

  const handleChange = (field: keyof Partial<Club>, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Club Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g. Ajax FC"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="referenceNumber">Reference Number (optional)</Label>
          <Input
            id="referenceNumber"
            value={formData.referenceNumber}
            onChange={(e) => handleChange('referenceNumber', e.target.value)}
            placeholder="e.g. FA-12345"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subscriptionType">Subscription Type</Label>
          <Select 
            value={formData.subscriptionType}
            onValueChange={(value) => handleChange('subscriptionType', value as SubscriptionType)}
            required
          >
            <SelectTrigger id="subscriptionType">
              <SelectValue placeholder="Select subscription type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="analytics_plus">Analytics Plus</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-puma-blue-500 hover:bg-puma-blue-600">
          {club ? 'Update Club' : 'Create Club'}
        </Button>
      </div>
    </form>
  );
};
