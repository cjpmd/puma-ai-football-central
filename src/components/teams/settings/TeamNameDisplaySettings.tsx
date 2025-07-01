
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import { Team, NameDisplayOption } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TeamNameDisplaySettingsProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const TeamNameDisplaySettings: React.FC<TeamNameDisplaySettingsProps> = ({
  team,
  onUpdate
}) => {
  const [nameDisplayOption, setNameDisplayOption] = useState<NameDisplayOption>(
    team.nameDisplayOption || 'surname'
  );
  const [saving, setSaving] = useState(false);

  const nameDisplayOptions = [
    { value: 'firstName', label: 'First Name Only', example: 'John' },
    { value: 'surname', label: 'Surname Only', example: 'Smith' },
    { value: 'fullName', label: 'Full Name', example: 'John Smith' },
    { value: 'initials', label: 'Initials', example: 'J.S.' }
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('Saving name display option:', nameDisplayOption, 'for team:', team.id);
      
      const { error } = await supabase
        .from('teams')
        .update({ name_display_option: nameDisplayOption })
        .eq('id', team.id);

      if (error) {
        console.error('Error updating name display setting:', error);
        throw error;
      }

      console.log('Name display option saved successfully');
      onUpdate({ nameDisplayOption });
      toast.success('Name display setting updated successfully');
    } catch (error) {
      console.error('Error updating name display setting:', error);
      toast.error('Failed to update name display setting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Player Name Display
          </CardTitle>
          <CardDescription>
            Choose how player names are displayed in formation overviews and team selections.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nameDisplay">Display Format</Label>
            <Select
              value={nameDisplayOption}
              onValueChange={(value: NameDisplayOption) => setNameDisplayOption(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select name display format" />
              </SelectTrigger>
              <SelectContent>
                {nameDisplayOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex justify-between items-center w-full">
                      <span>{option.label}</span>
                      <span className="text-muted-foreground ml-4">({option.example})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saving || nameDisplayOption === team.nameDisplayOption}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
