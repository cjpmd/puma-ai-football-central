import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, Trophy, Settings, Crown, AlertCircle, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AvailabilityDrivenSquadManagement } from './AvailabilityDrivenSquadManagement';
import { EnhancedFormationView } from './EnhancedFormationView';
import { FormationSelector } from './FormationSelector';
import { toast } from 'sonner';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { availabilityService } from '@/services/availabilityService';
import { GameFormat } from '@/types';

interface EventTeamsTableProps {
  eventId: string;
  primaryTeamId: string;
  gameFormat: string;
}

export const EventTeamsTable: React.FC<EventTeamsTableProps> = ({
  eventId,
  primaryTeamId,
  gameFormat
}) => {
  const { teams } = useAuth();
  const isMobile = useMobileDetection();
  const [selectedTeam, setSelectedTeam] = useState<string>(primaryTeamId);
  const [eventData, setEventData] = useState<any>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [squadPlayers, setSquadPlayers] = useState<any[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [substitutePlayers, setSubstitutePlayers] = useState<string[]>([]);
  const [globalCaptainId, setGlobalCaptainId] = useState<string>('');
  const [availabilityCount, setAvailabilityCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const currentTeam = teams.find(t => t.id === selectedTeam);

  useEffect(() => {
    loadEventData();
    loadAvailabilityCount();
  }, [eventId, selectedTeam]);

  const loadEventData = async () => {
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEventData(event);
    } catch (error) {
      console.error('Error loading event:', error);
      toast.error('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailabilityCount = async () => {
    try {
      const availability = await availabilityService.getEventAvailability(eventId);
      setAvailabilityCount(availability.length);
    } catch (error) {
      console.error('Error loading availability count:', error);
    }
  };

  const handleSendNotifications = async () => {
    try {
      await availabilityService.sendAvailabilityNotifications(eventId);
      toast.success('Availability notifications sent successfully');
      setIsNotificationModalOpen(false);
      loadAvailabilityCount();
    } catch (error: any) {
      console.error('Error sending notifications:', error);
      toast.error(error.message || 'Failed to send notifications');
    }
  };

  const handleSquadChange = (newSquadPlayers: any[]) => {
    setSquadPlayers(newSquadPlayers);
    // Convert squad players to selected players format
    const playerIds = newSquadPlayers.map(p => p.id);
    setSelectedPlayers(playerIds);
  };

  const handleCaptainChange = (captainId: string) => {
    setGlobalCaptainId(captainId);
  };

  const handlePositionChange = (position: string, playerId: string | null) => {
    // Handle position changes in formation
    console.log('Position change:', position, playerId);
  };

  const handlePlayerRemove = (playerId: string) => {
    // Handle player removal from formation
    setSelectedPlayers(prev => prev.filter(id => id !== playerId));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading event data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${isMobile ? 'space-y-3' : 'space-y-6'}`}>
      {/* Event Header */}
      <Card>
        <CardHeader className={isMobile ? 'px-3 pt-3 pb-2' : ''}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
              <div>
                <CardTitle className={isMobile ? 'text-sm' : 'text-lg'}>{eventData?.title}</CardTitle>
                <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {eventData?.date} • {eventData?.location}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={isMobile ? 'text-xs' : ''}>
                {availabilityCount} responses
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNotificationModalOpen(true)}
                className={isMobile ? 'h-7 px-2' : ''}
              >
                <Bell className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
                {isMobile ? 'Notify' : 'Send Notifications'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Team Selection */}
      {teams.length > 1 && (
        <Card>
          <CardHeader className={isMobile ? 'px-3 pt-3 pb-2' : ''}>
            <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
              <Trophy className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              Team Selection
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? 'px-3 pb-3' : ''}>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className={isMobile ? 'h-8 text-sm' : ''}>
                <SelectValue placeholder="Select team..." />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="squad" className="w-full">
        <TabsList className={`grid w-full grid-cols-2 ${isMobile ? 'h-8' : ''}`}>
          <TabsTrigger value="squad" className={isMobile ? 'text-xs' : ''}>
            <Users className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
            Squad Management
          </TabsTrigger>
          <TabsTrigger value="formation" className={isMobile ? 'text-xs' : ''}>
            <Settings className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
            Formation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="squad" className="space-y-4">
          <AvailabilityDrivenSquadManagement
            teamId={selectedTeam}
            eventId={eventId}
            globalCaptainId={globalCaptainId}
            onSquadChange={handleSquadChange}
            onCaptainChange={handleCaptainChange}
          />
        </TabsContent>

        <TabsContent value="formation" className="space-y-4">
          {squadPlayers.length > 0 ? (
            <div className="space-y-4">
              <FormationSelector
                gameFormat={gameFormat as GameFormat}
                selectedFormation="4-3-3"
                onFormationChange={(formation) => console.log('Formation changed:', formation)}
              />
              <EnhancedFormationView
                formation="4-3-3"
                gameFormat={gameFormat as GameFormat}
                selectedPlayers={selectedPlayers}
                substitutePlayers={substitutePlayers}
                captainId={globalCaptainId}
                allPlayers={squadPlayers}
                onPositionChange={handlePositionChange}
                onCaptainChange={handleCaptainChange}
                onPlayerRemove={handlePlayerRemove}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Add players to your squad to configure formations
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Send Notifications Modal */}
      <Dialog open={isNotificationModalOpen} onOpenChange={setIsNotificationModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Availability Notifications</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will send availability notifications to all selected players and staff for this event.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsNotificationModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSendNotifications}>
                Send Notifications
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
