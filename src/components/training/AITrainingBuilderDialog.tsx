import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Target, Zap, Users, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'challenges',
    label: 'Address Recent Challenges',
    icon: <Target className="h-4 w-4" />,
    prompt: 'Create a training session focused on addressing the challenges identified in recent match reports'
  },
  {
    id: 'strengths',
    label: 'Build on Strengths',
    icon: <CheckCircle2 className="h-4 w-4" />,
    prompt: 'Create a training session that reinforces and builds upon our team strengths from recent performances'
  },
  {
    id: 'balanced',
    label: 'Balance Technical & Physical',
    icon: <Zap className="h-4 w-4" />,
    prompt: 'Create a balanced session mixing technical skills and physical conditioning'
  },
  {
    id: 'position',
    label: 'Position-Specific Focus',
    icon: <Users className="h-4 w-4" />,
    prompt: 'Create a session with position-specific drills for different player groups'
  },
  {
    id: 'short',
    label: 'Short Session (30-45min)',
    icon: <Clock className="h-4 w-4" />,
    prompt: 'Create a focused, high-intensity 30-45 minute session'
  },
  {
    id: 'full',
    label: 'Full Session (60-90min)',
    icon: <Clock className="h-4 w-4" />,
    prompt: 'Create a comprehensive 60-90 minute training session'
  }
];

interface Drill {
  drillId?: string;
  name: string;
  description?: string;
  duration: number;
  tags?: string[];
  notes?: string;
}

interface Equipment {
  name: string;
  quantity: number;
}

interface GeneratedSession {
  sessionTitle: string;
  drills: Drill[];
  equipment?: Equipment[];
  reasoning: string;
}

interface AITrainingBuilderDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (session: GeneratedSession) => void;
  teamId: string;
  eventId?: string;
}

export const AITrainingBuilderDialog = ({
  open,
  onClose,
  onApply,
  teamId,
  eventId
}: AITrainingBuilderDialogProps) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<GeneratedSession | null>(null);

  const handleQuickAction = (actionId: string) => {
    setSelectedActions(prev => 
      prev.includes(actionId) 
        ? prev.filter(id => id !== actionId)
        : [...prev, actionId]
    );
  };

  const getFullPrompt = () => {
    const actionPrompts = selectedActions
      .map(id => quickActions.find(a => a.id === id)?.prompt)
      .filter(Boolean)
      .join('. ');
    
    return [actionPrompts, customPrompt].filter(Boolean).join('. ');
  };

  const handleGenerate = async () => {
    const fullPrompt = getFullPrompt();
    if (!fullPrompt.trim()) {
      toast.error('Please select a quick action or enter a custom prompt');
      return;
    }

    setLoading(true);
    setPreview(null);

    try {
      const preferences = {
        duration: selectedActions.includes('short') ? '30-45' : 
                  selectedActions.includes('full') ? '60-90' : '60-90'
      };

      const { data, error } = await supabase.functions.invoke('ai-training-builder', {
        body: { 
          prompt: fullPrompt,
          teamId,
          eventId,
          preferences
        }
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('AI rate limit reached. Please try again in a moment.');
        } else if (data.error.includes('credits')) {
          toast.error('AI credits depleted. Please add credits to continue.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      setPreview(data);
      toast.success('Training session generated!');
    } catch (error) {
      console.error('Error generating session:', error);
      toast.error('Failed to generate training session');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (preview) {
      onApply(preview);
      handleClose();
      toast.success('Training session applied!');
    }
  };

  const handleClose = () => {
    setCustomPrompt('');
    setSelectedActions([]);
    setPreview(null);
    onClose();
  };

  const getTotalDuration = () => {
    if (!preview) return 0;
    return preview.drills.reduce((sum, drill) => sum + drill.duration, 0);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Training Session Builder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div>
            <label className="text-sm font-medium mb-2 block">Quick Actions</label>
            <div className="flex flex-wrap gap-2">
              {quickActions.map(action => (
                <Badge
                  key={action.id}
                  variant={selectedActions.includes(action.id) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => handleQuickAction(action.id)}
                >
                  {action.icon}
                  <span className="ml-1">{action.label}</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div>
            <label className="text-sm font-medium mb-2 block">Custom Instructions (Optional)</label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="E.g., Focus on passing accuracy and fitness, include some fun small-sided games..."
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Session...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Training Session
              </>
            )}
          </Button>

          {/* Preview */}
          {preview && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              <div>
                <h3 className="font-semibold text-lg">{preview.sessionTitle}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Total Duration: {getTotalDuration()} minutes
                </p>
              </div>

              {/* Reasoning */}
              {preview.reasoning && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-sm font-medium mb-1">Session Rationale:</p>
                  <p className="text-sm text-muted-foreground">{preview.reasoning}</p>
                </div>
              )}

              {/* Drills */}
              <div>
                <h4 className="font-medium mb-2">Drills ({preview.drills.length})</h4>
                <div className="space-y-2">
                  {preview.drills.map((drill, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-background">
                      <div className="flex justify-between items-start mb-1">
                        <h5 className="font-medium">{drill.name}</h5>
                        <Badge variant="outline">{drill.duration} min</Badge>
                      </div>
                      {drill.description && (
                        <p className="text-sm text-muted-foreground mb-2">{drill.description}</p>
                      )}
                      {drill.tags && drill.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {drill.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {drill.notes && (
                        <p className="text-xs text-muted-foreground italic">{drill.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              {preview.equipment && preview.equipment.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Equipment Needed</h4>
                  <div className="flex flex-wrap gap-2">
                    {preview.equipment.map((item, index) => (
                      <Badge key={index} variant="outline">
                        {item.name} ({item.quantity})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply Button */}
              <div className="flex gap-2">
                <Button onClick={handleApply} className="flex-1">
                  Apply to Training Plan
                </Button>
                <Button onClick={() => setPreview(null)} variant="outline">
                  Regenerate
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
