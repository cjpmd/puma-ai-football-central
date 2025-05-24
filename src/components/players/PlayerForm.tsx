
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Player } from '@/types';
import { PlayerKitSizes } from './PlayerKitSizes';
import { PlayerKitTracking } from './PlayerKitTracking';

interface PlayerFormProps {
  player?: Player | null;
  teamId: string;
  onSubmit: (playerData: Partial<Player>) => void;
  onCancel: () => void;
}

export const PlayerForm: React.FC<PlayerFormProps> = ({
  player,
  teamId,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: player?.name || '',
    dateOfBirth: player?.dateOfBirth || '',
    squadNumber: player?.squadNumber || 0,
    type: player?.type || 'outfield' as 'outfield' | 'goalkeeper',
    availability: player?.availability || 'green' as 'amber' | 'green' | 'red',
    subscriptionType: player?.subscriptionType || 'full_squad' as 'full_squad' | 'training',
    kit_sizes: player?.kit_sizes || {}
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      teamId,
      kit_sizes: formData.kit_sizes
    });
  };

  const handleKitSizesUpdate = (kitSizes: Record<string, string>) => {
    setFormData(prev => ({ ...prev, kit_sizes: kitSizes }));
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Player Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth *</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="squadNumber">Squad Number *</Label>
            <Input
              id="squadNumber"
              type="number"
              min="1"
              max="99"
              value={formData.squadNumber}
              onChange={(e) => setFormData({ ...formData, squadNumber: parseInt(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Player Type</Label>
            <RadioGroup
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as 'outfield' | 'goalkeeper' })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="outfield" id="outfield" />
                <Label htmlFor="outfield">Outfield Player</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="goalkeeper" id="goalkeeper" />
                <Label htmlFor="goalkeeper">Goalkeeper</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="availability">Availability</Label>
            <Select value={formData.availability} onValueChange={(value) => setFormData({ ...formData, availability: value as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="green">Available</SelectItem>
                <SelectItem value="amber">Limited</SelectItem>
                <SelectItem value="red">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subscriptionType">Subscription Type</Label>
            <Select value={formData.subscriptionType} onValueChange={(value) => setFormData({ ...formData, subscriptionType: value as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_squad">Full Squad</SelectItem>
                <SelectItem value="training">Training Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
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

      {/* Kit Sizes Section - shown for both new and existing players */}
      <PlayerKitSizes 
        player={{ 
          id: player?.id || 'temp', 
          team_id: teamId, 
          kit_sizes: formData.kit_sizes 
        }} 
        onUpdate={handleKitSizesUpdate} 
      />

      {/* Kit Tracking - only shown for existing players */}
      {player && (
        <PlayerKitTracking player={{ ...player, team_id: teamId }} />
      )}
    </div>
  );
};
