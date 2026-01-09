import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { eventsService } from '@/services/eventsService';
import { useToast } from '@/hooks/use-toast';
import { Users, UserCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventAvailabilitySectionProps {
  eventId: string;
  teamId: string;
  canEdit: boolean;
}

interface InvitationStats {
  playerCount: number;
  staffCount: number;
  availableCount: number;
  unavailableCount: number;
  pendingCount: number;
}

export const EventAvailabilitySection: React.FC<EventAvailabilitySectionProps> = ({
  eventId,
  teamId,
  canEdit
}) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [inviteType, setInviteType] = useState<'everyone' | 'players_only' | 'staff_only' | 'pick_squad'>('everyone');
  const [showSquadPicker, setShowSquadPicker] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [stats, setStats] = useState<InvitationStats>({
    playerCount: 0,
    staffCount: 0,
    availableCount: 0,
    unavailableCount: 0,
    pendingCount: 0
  });
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalInviteType, setOriginalInviteType] = useState<'everyone' | 'players_only' | 'staff_only' | 'pick_squad'>('everyone');

  // Load existing invitations and stats
  useEffect(() => {
    const loadData = async () => {
      if (!eventId || !teamId) return;

      try {
        // Load players and staff for the team
        const [playersResult, staffResult, invitationsResult, availabilityResult] = await Promise.all([
          supabase
            .from('players')
            .select('id, name')
            .eq('team_id', teamId)
            .order('name'),
          supabase
            .from('team_staff')
            .select('id, name')
            .eq('team_id', teamId)
            .order('name'),
          supabase
            .from('event_invitations')
            .select('id, player_id, staff_id, invitee_type')
            .eq('event_id', eventId),
          supabase
            .from('event_availability')
            .select('status')
            .eq('event_id', eventId)
        ]);

        if (playersResult.data) setPlayers(playersResult.data);
        if (staffResult.data) setStaff(staffResult.data);

        // Determine current invitation type based on existing invitations
        const invitations = invitationsResult.data || [];
        const allPlayerIds = playersResult.data?.map(p => p.id) || [];
        const allStaffIds = staffResult.data?.map(s => s.id) || [];
        
        const invitedPlayerIds = invitations.filter(i => i.player_id).map(i => i.player_id!);
        const invitedStaffIds = invitations.filter(i => i.staff_id).map(i => i.staff_id!);

        // Determine invite type based on current invitations
        let detectedType: 'everyone' | 'players_only' | 'staff_only' | 'pick_squad' = 'everyone';
        
        if (invitedPlayerIds.length === 0 && invitedStaffIds.length === 0) {
          detectedType = 'everyone';
        } else if (invitedStaffIds.length === 0 && invitedPlayerIds.length === allPlayerIds.length) {
          detectedType = 'players_only';
        } else if (invitedPlayerIds.length === 0 && invitedStaffIds.length === allStaffIds.length) {
          detectedType = 'staff_only';
        } else if (invitedPlayerIds.length === allPlayerIds.length && invitedStaffIds.length === allStaffIds.length) {
          detectedType = 'everyone';
        } else {
          detectedType = 'pick_squad';
        }

        setInviteType(detectedType);
        setOriginalInviteType(detectedType);
        setSelectedPlayerIds(invitedPlayerIds);
        setSelectedStaffIds(invitedStaffIds);

        // Calculate stats
        const availability = availabilityResult.data || [];
        setStats({
          playerCount: invitedPlayerIds.length || allPlayerIds.length,
          staffCount: invitedStaffIds.length || allStaffIds.length,
          availableCount: availability.filter(a => a.status === 'available').length,
          unavailableCount: availability.filter(a => a.status === 'unavailable').length,
          pendingCount: availability.filter(a => a.status === 'pending').length
        });
      } catch (error) {
        console.error('Error loading availability data:', error);
      }
    };

    loadData();
  }, [eventId, teamId]);

  const handleInviteTypeChange = async (newType: 'everyone' | 'players_only' | 'staff_only' | 'pick_squad') => {
    if (newType === 'pick_squad') {
      setShowSquadPicker(true);
    }
    setInviteType(newType);
    setHasChanges(newType !== originalInviteType);
  };

  const handleSaveInvitations = async () => {
    if (!canEdit) return;

    setLoading(true);
    try {
      // Build invitations object
      let invitations: any;
      
      if (inviteType === 'everyone') {
        invitations = { type: 'everyone' as const };
      } else if (inviteType === 'pick_squad') {
        invitations = {
          type: 'pick_squad' as const,
          selectedPlayerIds,
          selectedStaffIds
        };
      } else if (inviteType === 'players_only') {
        invitations = {
          type: 'pick_squad' as const,
          selectedPlayerIds: players.map(p => p.id),
          selectedStaffIds: []
        };
      } else if (inviteType === 'staff_only') {
        invitations = {
          type: 'pick_squad' as const,
          selectedPlayerIds: [],
          selectedStaffIds: staff.map(s => s.id)
        };
      }

      // Clear existing invitations first
      await supabase
        .from('event_invitations')
        .delete()
        .eq('event_id', eventId);

      // Create new invitations
      await eventsService.createEventInvitations(eventId, teamId, invitations);

      toast({
        title: 'Availability requests updated',
        description: 'Team members will be notified',
      });

      setHasChanges(false);
      setOriginalInviteType(inviteType);
    } catch (error: any) {
      console.error('Error updating invitations:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update invitations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalInvited = stats.playerCount + stats.staffCount;
  const totalResponded = stats.availableCount + stats.unavailableCount;

  return (
    <div className="space-y-3">
      {/* Header - Always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h4 className="font-medium flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          Availability
        </h4>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">
            {totalResponded}/{totalInvited} responded
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Summary badges - Always visible */}
      <div className="flex flex-wrap gap-1.5">
        {stats.availableCount > 0 && (
          <Badge variant="default" className="bg-green-500 text-xs">
            {stats.availableCount} available
          </Badge>
        )}
        {stats.unavailableCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {stats.unavailableCount} unavailable
          </Badge>
        )}
        {stats.pendingCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {stats.pendingCount} pending
          </Badge>
        )}
      </div>

      {/* Expanded Controls - Only for editors */}
      {isExpanded && canEdit && (
        <div className="space-y-3 pt-2 border-t">
          <p className="text-xs text-muted-foreground">Request availability from:</p>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleInviteTypeChange('everyone')}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                inviteType === 'everyone' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted border border-border"
              )}
            >
              Everyone
            </button>
            <button
              type="button"
              onClick={() => handleInviteTypeChange('players_only')}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                inviteType === 'players_only' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted border border-border"
              )}
            >
              Players Only
            </button>
            <button
              type="button"
              onClick={() => handleInviteTypeChange('staff_only')}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                inviteType === 'staff_only' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted border border-border"
              )}
            >
              Staff Only
            </button>
            <button
              type="button"
              onClick={() => handleInviteTypeChange('pick_squad')}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                inviteType === 'pick_squad' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted border border-border"
              )}
            >
              Pick Squad
            </button>
          </div>

          {inviteType === 'pick_squad' && (selectedPlayerIds.length > 0 || selectedStaffIds.length > 0) && (
            <p className="text-xs text-muted-foreground">
              {selectedPlayerIds.length} players, {selectedStaffIds.length} staff selected
            </p>
          )}

          {hasChanges && (
            <Button 
              onClick={handleSaveInvitations} 
              disabled={loading} 
              size="sm" 
              className="w-full"
            >
              {loading ? 'Saving...' : 'Update Availability Requests'}
            </Button>
          )}
        </div>
      )}

      {/* Squad Picker Sheet */}
      <Sheet open={showSquadPicker} onOpenChange={setShowSquadPicker}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle>Select Squad</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-80px)] pr-4">
            {/* Players Section */}
            {players.length > 0 && (
              <div className="space-y-2 py-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Players ({players.length})</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (selectedPlayerIds.length === players.length) {
                        setSelectedPlayerIds([]);
                      } else {
                        setSelectedPlayerIds(players.map(p => p.id));
                      }
                      setHasChanges(true);
                    }}
                    className="text-xs h-7"
                  >
                    {selectedPlayerIds.length === players.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                {players.map(player => (
                  <label 
                    key={player.id} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <Checkbox 
                      checked={selectedPlayerIds.includes(player.id)}
                      onCheckedChange={() => {
                        setSelectedPlayerIds(prev => 
                          prev.includes(player.id) 
                            ? prev.filter(id => id !== player.id)
                            : [...prev, player.id]
                        );
                        setHasChanges(true);
                      }}
                    />
                    <span className="text-sm">{player.name}</span>
                  </label>
                ))}
              </div>
            )}
            
            {/* Staff Section */}
            {staff.length > 0 && (
              <div className="space-y-2 py-4 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Staff ({staff.length})</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (selectedStaffIds.length === staff.length) {
                        setSelectedStaffIds([]);
                      } else {
                        setSelectedStaffIds(staff.map(s => s.id));
                      }
                      setHasChanges(true);
                    }}
                    className="text-xs h-7"
                  >
                    {selectedStaffIds.length === staff.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                {staff.map(member => (
                  <label 
                    key={member.id} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <Checkbox 
                      checked={selectedStaffIds.includes(member.id)}
                      onCheckedChange={() => {
                        setSelectedStaffIds(prev => 
                          prev.includes(member.id) 
                            ? prev.filter(id => id !== member.id)
                            : [...prev, member.id]
                        );
                        setHasChanges(true);
                      }}
                    />
                    <span className="text-sm">{member.name}</span>
                  </label>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="sticky bottom-0 pt-4 border-t bg-background">
            <Button 
              onClick={() => {
                setShowSquadPicker(false);
                setHasChanges(true);
              }} 
              className="w-full"
            >
              Done ({selectedPlayerIds.length + selectedStaffIds.length} selected)
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
