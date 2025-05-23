
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Player, PlayerSubscriptionType, SubscriptionStatus } from '@/types';
import { format } from 'date-fns';
import { calculateAge } from '@/lib/utils';

interface PlayerFormProps {
  player: Player | null;
  onSubmit: (data: Partial<Player>) => void;
  onCancel: () => void;
  teamId: string;
}

export const PlayerForm: React.FC<PlayerFormProps> = ({
  player,
  onSubmit,
  onCancel,
  teamId
}) => {
  // Format the date to YYYY-MM-DD for input if it exists
  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'yyyy-MM-dd');
    } catch (e) {
      console.error('Error formatting date:', e);
      return '';
    }
  };

  const [formData, setFormData] = useState<Partial<Player>>({
    name: player?.name || '',
    dateOfBirth: formatDateForInput(player?.dateOfBirth) || '',
    squadNumber: player?.squadNumber || 1,
    type: player?.type || 'outfield',
    teamId: teamId,
    subscriptionType: player?.subscriptionType || 'full_squad',
    subscriptionStatus: player?.subscriptionStatus || 'active',
    availability: player?.availability || 'green',
    status: player?.status || 'active'
  });

  const handleChange = (field: keyof Partial<Player>, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const playerAge = formData.dateOfBirth ? calculateAge(new Date(formData.dateOfBirth)) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Player Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g. John Smith"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">
              Date of Birth
              {playerAge !== null && (
                <span className="ml-2 text-sm text-muted-foreground">
                  (Age: {playerAge})
                </span>
              )}
            </Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleChange('dateOfBirth', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="squadNumber">Squad Number</Label>
            <Input
              id="squadNumber"
              type="number"
              value={formData.squadNumber}
              onChange={(e) => handleChange('squadNumber', parseInt(e.target.value))}
              min="1"
              max="99"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Player Type</Label>
          <Select 
            value={formData.type}
            onValueChange={(value) => handleChange('type', value)}
            required
          >
            <SelectTrigger id="type">
              <SelectValue placeholder="Select player type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="outfield">Outfield Player</SelectItem>
              <SelectItem value="goalkeeper">Goalkeeper</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subscriptionType">Subscription Type</Label>
          <Select 
            value={formData.subscriptionType}
            onValueChange={(value) => handleChange('subscriptionType', value as PlayerSubscriptionType)}
            required
          >
            <SelectTrigger id="subscriptionType">
              <SelectValue placeholder="Select subscription type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full_squad">Full Squad</SelectItem>
              <SelectItem value="training">Training Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subscriptionStatus">Subscription Status</Label>
          <Select 
            value={formData.subscriptionStatus}
            onValueChange={(value) => handleChange('subscriptionStatus', value as SubscriptionStatus)}
            required
          >
            <SelectTrigger id="subscriptionStatus">
              <SelectValue placeholder="Select subscription status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="availability">Availability Status</Label>
          <Select 
            value={formData.availability}
            onValueChange={(value) => handleChange('availability', value)}
            required
          >
            <SelectTrigger id="availability">
              <SelectValue placeholder="Select availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="green">Available</SelectItem>
              <SelectItem value="amber">Uncertain</SelectItem>
              <SelectItem value="red">Unavailable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {player && (
          <div className="space-y-2">
            <Label htmlFor="status">Player Status</Label>
            <Select 
              value={formData.status}
              onValueChange={(value) => handleChange('status', value)}
              required
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select player status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-puma-blue-500 hover:bg-puma-blue-600">
          {player ? 'Update Player' : 'Add Player'}
        </Button>
      </div>
    </form>
  );
};
