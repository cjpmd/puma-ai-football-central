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

  // Convert existing kitIcons to kitDesigns format if they exist
  const getInitialDesigns = (): Partial<KitDesigns> => {
    if (team.kitDesigns) {
      return team.kitDesigns;
    }
    // If we have old kit icons, we'll start fresh with the designer
    return {};
  };

  const handleSaveDesigns = async (designs: KitDesigns) => {
    try {
      console.log('Saving kit designs:', designs);
      
      // Update the team with new kit designs
      const updateData = { 
        kitDesigns: designs,
        // Keep kitIcons for backward compatibility but mark as using designer
        kitIcons: {
          home: 'designer',
          away: 'designer', 
          training: 'designer',
          goalkeeper: 'designer'
        }
      };
      
      console.log('Update data:', updateData);
      
      // Call the onUpdate function with the new data
      await onUpdate(updateData);
      
      toast({
        title: 'Kit designs saved successfully',
        description: 'Your team kit designs have been updated.',
      });
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Kit Designer</h3>
        <p className="text-sm text-muted-foreground">
          Design custom kits for your team with colors and patterns
        </p>
      </div>

      <KitDesigner 
        initialDesigns={getInitialDesigns()}
        onSave={handleSaveDesigns}
      />
    </div>
  );
};
