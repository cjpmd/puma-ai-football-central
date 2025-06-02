
import { useState } from 'react';
import { Team } from '@/types/team';
import { KitDesigner } from '../KitDesigner';
import { useToast } from '@/hooks/use-toast';

interface KitDesign {
  shirtColor: string;
  sleeveColor: string;
  hasStripes: boolean;
  stripeColor: string;
  shortsColor: string;
  socksColor: string;
}

interface KitDesigns {
  home: KitDesign;
  away: KitDesign;
  training: KitDesign;
  goalkeeper: KitDesign;
}

interface TeamKitSettingsProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const TeamKitSettings: React.FC<TeamKitSettingsProps> = ({
  team,
  onUpdate
}) => {
  const { toast } = useToast();

  // Convert existing kitDesigns to proper format
  const getInitialDesigns = (): Partial<KitDesigns> => {
    console.log('Getting initial designs for team:', team.name, 'kitDesigns:', team.kitDesigns);
    if (team.kitDesigns) {
      return team.kitDesigns;
    }
    return {};
  };

  const handleSaveDesigns = async (designs: KitDesigns) => {
    try {
      console.log('Saving kit designs:', designs);
      console.log('Current team data:', team);
      
      // Create the update object with ONLY the kitDesigns field
      // The parent component should handle preserving other fields
      const updateData: Partial<Team> = { 
        kitDesigns: designs
      };
      
      console.log('Update data for kit designs:', updateData);
      
      // Call the onUpdate function
      await onUpdate(updateData);
      
      console.log('Kit designs saved successfully');
    } catch (error) {
      console.error('Error saving kit designs:', error);
      toast({
        title: 'Error saving kit designs',
        description: 'There was a problem saving your kit designs. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold">Professional Kit Designer</h3>
        <p className="text-lg text-muted-foreground">
          Design custom professional kits for your team with realistic colors and patterns
        </p>
      </div>

      <KitDesigner 
        initialDesigns={getInitialDesigns()}
        onSave={handleSaveDesigns}
      />
    </div>
  );
};
