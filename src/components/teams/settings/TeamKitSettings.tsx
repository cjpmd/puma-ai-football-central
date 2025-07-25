
import { useState } from 'react';
import { Team, KitDesigns } from '@/types/team';
import { KitDesigner } from '../KitDesigner';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TeamKitSettingsProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const TeamKitSettings: React.FC<TeamKitSettingsProps> = ({
  team,
  onUpdate
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const getInitialDesigns = (): Partial<KitDesigns> => {
    console.log('Getting initial designs for team:', team.name, 'kitDesigns:', team.kitDesigns);
    if (team.kitDesigns) {
      return team.kitDesigns as KitDesigns;
    }
    return {};
  };

  const handleSaveDesigns = async (designs: KitDesigns) => {
    setIsSaving(true);
    try {
      console.log('Saving kit designs:', designs);
      
      const { error } = await supabase
        .from('teams')
        .update({ 
          kit_designs: designs as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', team.id);

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      // Update parent component with new designs - DO NOT close modal
      onUpdate({ kitDesigns: designs });
      
      toast({
        title: 'Kit designs saved successfully',
        description: 'Your kit designs have been saved and updated.',
      });
    } catch (error: any) {
      console.error('Error saving kit designs:', error);
      toast({
        title: 'Error saving kit designs',
        description: error.message || 'Failed to save kit designs',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
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
        isSaving={isSaving}
      />
    </div>
  );
};
