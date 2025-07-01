import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { Player } from '@/types';

interface SquadManagementProps {
  eventId: string;
  teamId: string;
  onClose: () => void;
}

export const SquadManagement: React.FC<SquadManagementProps> = ({ eventId, teamId, onClose }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlayers();
  }, [teamId, eventId]);

  const loadPlayers = async () => {
    setLoading(true);
    try {
      // Fetch all active players for the team
      const { data: teamPlayers, error: teamPlayersError } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('name');

      if (teamPlayersError) throw teamPlayersError;

      // Fetch players already selected for the event
      const { data: eventSelections, error: eventSelectionsError } = await supabase
        .from('event_selections')
        .select('player_id')
        .eq('event_id', eventId);

      if (eventSelectionsError) throw eventSelectionsError;

      const selectedPlayerIds = eventSelections ? eventSelections.map(es => es.player_id) : [];

      setPlayers(teamPlayers || []);
      setSelectedPlayers(selectedPlayerIds);
    } catch (error: any) {
      console.error("Error loading players:", error);
      toast.error(error.message || "Failed to load players.");
    } finally {
      setLoading(false);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };

  const saveSelections = async () => {
    setLoading(true);
    try {
      // Delete existing selections for the event
      const { error: deleteError } = await supabase
        .from('event_selections')
        .delete()
        .eq('event_id', eventId);

      if (deleteError) throw deleteError;

      // Insert new selections
      const newSelections = selectedPlayers.map(playerId => ({
        event_id: eventId,
        player_id: playerId,
        status: 'pending' // Default status
      }));

      const { error: insertError } = await supabase
        .from('event_selections')
        .insert(newSelections);

      if (insertError) throw insertError;

      toast.success("Squad selections saved successfully!");
      onClose();
    } catch (error: any) {
      console.error("Error saving squad selections:", error);
      toast.error(error.message || "Failed to save squad selections.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Manage Squad</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="text-center py-4">Loading players...</div>
          ) : (
            <div className="space-y-2">
              {players.map(player => (
                <Card key={player.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-puma-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {player.squad_number}
                      </div>
                      <span className="font-medium">{player.name}</span>
                    </div>
                    <Checkbox
                      id={`player-${player.id}`}
                      checked={selectedPlayers.includes(player.id)}
                      onCheckedChange={() => togglePlayerSelection(player.id)}
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <div className="p-4">
        <Button onClick={saveSelections} disabled={loading} className="w-full bg-puma-blue-500 hover:bg-puma-blue-600">
          {loading ? "Saving..." : "Save Selections"}
        </Button>
      </div>
    </div>
  );
};
