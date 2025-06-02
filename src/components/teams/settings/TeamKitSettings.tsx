
import { useState } from 'react';
import { Team } from '@/types/team';
import { KitDesigner } from '../KitDesigner';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
      
      // Save directly to database
      const { error } = await supabase
        .from('teams')
        .update({ 
          kit_designs: designs,
          updated_at: new Date().toISOString()
        })
        .eq('id', team.id);

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      // Update parent component
      onUpdate({ kitDesigns: designs });
      
      toast({
        title: 'Kit designs saved',
        description: 'Your kit designs have been saved successfully.',
      });
    } catch (error: any) {
      console.error('Error saving kit designs:', error);
      toast({
        title: 'Error saving kit designs',
        description: error.message || 'Failed to save kit designs',
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
