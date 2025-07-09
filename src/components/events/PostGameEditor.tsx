
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface PostGameEditorProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface EventData {
  id: string;
  title: string;
  date: string;
  start_time: string;
  opponent?: string;
  scores?: any;
  player_of_match_id?: string;
  coach_notes?: string;
  staff_notes?: string;
}

interface Player {
  id: string;
  name: string;
}

interface PerformanceCategory {
  id: string;
  name: string;
}

interface Scores {
  [key: string]: string;
  home?: string;
  away?: string;
}

export const PostGameEditor: React.FC<PostGameEditorProps> = ({ eventId, isOpen, onClose }) => {
  const [event, setEvent] = useState<EventData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [performanceCategories, setPerformanceCategories] = useState<PerformanceCategory[]>([]);
  const [playerOfMatchId, setPlayerOfMatchId] = useState<string | null>(null);
  const [scores, setScores] = useState<Scores>({});
  const [coachNotes, setCoachNotes] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (eventId && isOpen) {
      loadEventData();
      loadPlayers();
    }
  }, [eventId, isOpen]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      console.log('Loading event data for:', eventId);
      
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, title, date, start_time, opponent, scores, player_of_match_id, coach_notes, staff_notes')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('Error loading event:', eventError);
        throw eventError;
      }
      
      console.log('Event data loaded:', eventData);
      setEvent(eventData);
      
      // Safely handle the scores data from the database
      const scoresData = eventData?.scores as Scores | null;
      console.log('Scores data:', scoresData);
      setScores(scoresData || {});
      setPlayerOfMatchId(eventData?.player_of_match_id || null);
      setCoachNotes(eventData?.coach_notes || '');
      setStaffNotes(eventData?.staff_notes || '');
    } catch (error: any) {
      console.error('Error loading event data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load event data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPlayers = async () => {
    try {
      console.log('Loading players for event:', eventId);
      
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('team_id')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('Error loading event for team_id:', eventError);
        throw eventError;
      }

      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name')
        .eq('team_id', eventData.team_id)
        .eq('status', 'active');

      if (playersError) {
        console.error('Error loading players:', playersError);
        throw playersError;
      }

      console.log('Players loaded:', playersData);
      setPlayers(playersData || []);

      // Load performance categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('performance_categories')
        .select('*')
        .eq('team_id', eventData.team_id);

      if (categoriesError) {
        console.error('Error loading performance categories:', categoriesError);
        throw categoriesError;
      }
      
      console.log('Performance categories loaded:', categoriesData);
      setPerformanceCategories(categoriesData || []);
    } catch (error: any) {
      console.error('Error loading players:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load players',
        variant: 'destructive',
      });
    }
  };

  const handleScoreChange = (field: string, value: string) => {
    setScores(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('Saving scores:', scores);

      const { error } = await supabase
        .from('events')
        .update({
          scores: scores,
          player_of_match_id: playerOfMatchId,
          coach_notes: coachNotes,
          staff_notes: staffNotes,
        })
        .eq('id', eventId);

      if (error) {
        console.error('Error saving:', error);
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Post-game report saved successfully!',
      });
      onClose();
    } catch (error: any) {
      console.error('Error saving post-game report:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save post-game report',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-gray-600">Event not found</p>
          <Button variant="outline" onClick={onClose} className="mt-4">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold">{event.title}</h3>
        <p className="text-sm text-gray-600">
          {event.date && format(new Date(event.date), 'PPP')} • {event.start_time}
        </p>
        {event.opponent && (
          <p className="text-sm text-gray-600">vs {event.opponent}</p>
        )}
      </div>

      {/* Player of the Match */}
      {players.length > 0 && (
        <div>
          <Label>Player of the Match</Label>
          <Select value={playerOfMatchId || ''} onValueChange={setPlayerOfMatchId}>
            <SelectTrigger>
              <SelectValue placeholder="Select player of the match" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Scores Section */}
      <div>
        <Label className="text-base font-semibold">Match Scores</Label>
        
        {performanceCategories.length > 1 ? (
          // Multiple teams/categories - show performance category names
          <div className="space-y-4 mt-3">
            {performanceCategories.map((category, index) => (
              <div key={category.id} className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">{category.name}</h4>
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="text-center">
                    <Label className="text-sm text-gray-600">Our Score</Label>
                    <Input
                      type="number"
                      min="0"
                      value={scores[`team_${index + 1}`] || ''}
                      onChange={(e) => handleScoreChange(`team_${index + 1}`, e.target.value)}
                      className="text-center text-lg font-bold h-12 mt-1"
                    />
                  </div>
                  <div className="text-center text-gray-400 text-lg font-bold">
                    vs
                  </div>
                  <div className="text-center">
                    <Label className="text-sm text-gray-600">Their Score</Label>
                    <Input
                      type="number"
                      min="0"
                      value={scores[`opponent_${index + 1}`] || ''}
                      onChange={(e) => handleScoreChange(`opponent_${index + 1}`, e.target.value)}
                      className="text-center text-lg font-bold h-12 mt-1"
                    />
                  </div>
                </div>
                
                {/* Outcome indicator */}
                {scores[`team_${index + 1}`] !== undefined && scores[`opponent_${index + 1}`] !== undefined && (
                  <div className="text-center mt-3">
                    <Badge 
                      variant={
                        Number(scores[`team_${index + 1}`]) > Number(scores[`opponent_${index + 1}`]) 
                          ? 'default' 
                          : Number(scores[`team_${index + 1}`]) < Number(scores[`opponent_${index + 1}`])
                          ? 'destructive' 
                          : 'secondary'
                      }
                    >
                      {Number(scores[`team_${index + 1}`]) > Number(scores[`opponent_${index + 1}`]) 
                        ? 'WIN' 
                        : Number(scores[`team_${index + 1}`]) < Number(scores[`opponent_${index + 1}`])
                        ? 'LOSS' 
                        : 'DRAW'
                      }
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Single team
          <div className="mt-3">
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-center">
                <Label className="text-sm text-gray-600">Our Score</Label>
                <Input
                  type="number"
                  min="0"
                  value={scores.home || ''}
                  onChange={(e) => handleScoreChange('home', e.target.value)}
                  className="text-center text-lg font-bold h-12 mt-1"
                />
              </div>
              <div className="text-center text-gray-400 text-lg font-bold">
                vs
              </div>
              <div className="text-center">
                <Label className="text-sm text-gray-600">Their Score</Label>
                <Input
                  type="number"
                  min="0"
                  value={scores.away || ''}
                  onChange={(e) => handleScoreChange('away', e.target.value)}
                  className="text-center text-lg font-bold h-12 mt-1"
                />
              </div>
            </div>
            
            {/* Outcome indicator */}
            {scores.home !== undefined && scores.away !== undefined && (
              <div className="text-center mt-3">
                <Badge 
                  variant={
                    Number(scores.home) > Number(scores.away) 
                      ? 'default' 
                      : Number(scores.home) < Number(scores.away)
                      ? 'destructive' 
                      : 'secondary'
                  }
                >
                  {Number(scores.home) > Number(scores.away) 
                    ? 'WIN' 
                    : Number(scores.home) < Number(scores.away)
                    ? 'LOSS' 
                    : 'DRAW'
                  }
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="coachNotes">Coach Notes</Label>
        <Textarea
          id="coachNotes"
          value={coachNotes}
          onChange={(e) => setCoachNotes(e.target.value)}
          placeholder="Add any notes about the match performance..."
          className="mt-1"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="staffNotes">Staff Notes</Label>
        <Textarea
          id="staffNotes"
          value={staffNotes}
          onChange={(e) => setStaffNotes(e.target.value)}
          placeholder="Add any staff observations..."
          className="mt-1"
          rows={3}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? 'Saving...' : 'Save Report'}
        </Button>
      </div>
    </div>
  );
};
