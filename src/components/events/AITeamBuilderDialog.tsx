import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FormationPeriod } from '@/types/teamSelection';

interface AITeamBuilderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (periods: FormationPeriod[], captainId?: string, reasoning?: string) => void;
  teamId: string;
  eventId: string;
  gameFormat: string;
  gameDuration: number;
}

interface QuickAction {
  label: string;
  prompt: string;
}

const quickActions: QuickAction[] = [
  { label: 'Even Rotation', prompt: 'Create a balanced lineup with even playing time for all players across multiple periods' },
  { label: 'Strongest XI', prompt: 'Select the strongest starting eleven based on total minutes and recent performance' },
  { label: 'Youth Focus', prompt: 'Prioritize younger players and rotate positions for development' },
  { label: 'Position Rotation', prompt: 'Rotate players between similar positions across periods while maintaining balance' },
];

export const AITeamBuilderDialog: React.FC<AITeamBuilderDialogProps> = ({
  isOpen,
  onClose,
  onApply,
  teamId,
  eventId,
  gameFormat,
  gameDuration,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const handleQuickAction = (action: QuickAction) => {
    setPrompt(action.prompt);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setLoading(true);
    setPreviewData(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-team-builder', {
        body: {
          prompt,
          teamId,
          eventId,
          gameFormat,
          gameDuration,
        },
      });

      if (error) throw error;

      console.log('AI team builder response:', data);
      setPreviewData(data);
      toast.success('AI team selection generated!');
    } catch (error: any) {
      console.error('Error generating team:', error);
      toast.error(error.message || 'Failed to generate team selection');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!previewData?.periods) {
      toast.error('No selection to apply');
      return;
    }

    // Convert AI output to FormationPeriod format
    const formattedPeriods: FormationPeriod[] = previewData.periods.map((period: any) => ({
      id: `period-${period.periodNumber}`,
      periodNumber: period.periodNumber,
      formation: period.formation,
      duration: period.duration,
      positions: period.positions.map((pos: any, idx: number) => ({
        id: `position-${idx}`,
        positionName: pos.positionName,
        abbreviation: pos.positionName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
        positionGroup: pos.positionName.toLowerCase().includes('goalkeeper') ? 'goalkeeper' :
                       pos.positionName.toLowerCase().includes('back') || pos.positionName.toLowerCase().includes('def') ? 'defender' :
                       pos.positionName.toLowerCase().includes('mid') ? 'midfielder' : 'forward',
        x: 50,
        y: 50,
        playerId: pos.playerId,
      })),
      substitutes: period.substitutes || [],
      captainId: period.captainId,
    }));

    const captainId = previewData.periods[0]?.captainId;
    
    onApply(formattedPeriods, captainId, previewData.reasoning);
    toast.success('AI selection applied to formation');
    onClose();
  };

  const handleClose = () => {
    setPrompt('');
    setPreviewData(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Team Builder
          </DialogTitle>
          <DialogDescription>
            Describe how you'd like to build your team lineup and the AI will create periods with player positions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Actions */}
          <div>
            <p className="text-sm font-medium mb-2">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Badge
                  key={action.label}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleQuickAction(action)}
                >
                  {action.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., Create a 4-3-3 with even minutes for all players, prioritizing experienced players in defense..."
              className="min-h-[100px]"
              disabled={loading}
            />
          </div>

          {/* Preview */}
          {previewData && (
            <div className="space-y-3 p-4 bg-accent/50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium">Generated {previewData.periods?.length || 0} period(s)</p>
              </div>
              
              {previewData.reasoning && (
                <p className="text-sm text-muted-foreground">{previewData.reasoning}</p>
              )}

              {previewData.periods?.map((period: any) => (
                <div key={period.periodNumber} className="text-sm space-y-1">
                  <p className="font-medium">
                    Period {period.periodNumber}: {period.formation} ({period.duration} min)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {period.positions?.length || 0} players positioned
                    {period.captainId && ', Captain assigned'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            {!previewData ? (
              <Button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleApply}>
                Apply to Formation
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
