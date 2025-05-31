
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, Bell, CheckCircle } from 'lucide-react';
import { PlayerSelectionPanel } from './PlayerSelectionPanel';
import { StaffSelectionSection } from './StaffSelectionSection';
import { EventAvailabilityDashboard } from './EventAvailabilityDashboard';
import { availabilityService } from '@/services/availabilityService';
import { DatabaseEvent } from '@/types/event';
import { GameFormat } from '@/types';
import { toast } from 'sonner';

interface TeamSelectionManagerProps {
  event: DatabaseEvent;
  isOpen: boolean;
  onClose: () => void;
}

export const TeamSelectionManager: React.FC<TeamSelectionManagerProps> = ({
  event,
  isOpen,
  onClose
}) => {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [substitutePlayers, setSubstitutePlayers] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [formation, setFormation] = useState<string>('4-3-3');
  const [availabilityRequested, setAvailabilityRequested] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkIfAvailabilityRequested();
    }
  }, [isOpen, event.id]);

  const checkIfAvailabilityRequested = async () => {
    try {
      const availabilities = await availabilityService.getEventAvailability(event.id);
      setAvailabilityRequested(availabilities.length > 0);
    } catch (error) {
      console.error('Error checking availability status:', error);
    }
  };

  const handleRequestAvailability = async () => {
    if (selectedPlayers.length === 0 && selectedStaff.length === 0) {
      toast.error('Please select players or staff before requesting availability');
      return;
    }

    try {
      setSendingNotifications(true);
      
      // First, save the selections (you would implement this based on your existing logic)
      // This would save to event_selections table
      
      // Then send availability notifications
      await availabilityService.sendAvailabilityNotifications(event.id);
      
      toast.success('Availability notifications sent successfully!');
      setAvailabilityRequested(true);
    } catch (error) {
      console.error('Error sending availability requests:', error);
      toast.error('Failed to send availability requests');
    } finally {
      setSendingNotifications(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Team Selection - {event.title}</h2>
              <p className="text-muted-foreground">
                Select your team and request availability confirmation
              </p>
            </div>
            <div className="flex items-center gap-2">
              {availabilityRequested && (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Notifications Sent
                </Badge>
              )}
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          <Tabs defaultValue="selection" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="selection">Team Selection</TabsTrigger>
              <TabsTrigger value="availability">
                Availability ({availabilityRequested ? 'Sent' : 'Pending'})
              </TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            </TabsList>

            <TabsContent value="selection" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PlayerSelectionPanel
                  teamId={event.team_id}
                  selectedPlayers={selectedPlayers}
                  substitutePlayers={substitutePlayers}
                  captainId={captainId}
                  onPlayersChange={setSelectedPlayers}
                  onSubstitutesChange={setSubstitutePlayers}
                  onCaptainChange={setCaptainId}
                  eventType={event.event_type}
                  showFormationView={true}
                  formation={formation}
                  onFormationChange={setFormation}
                  gameFormat={event.game_format as GameFormat}
                  eventId={event.id}
                  teamNumber={1}
                  periodNumber={1}
                  showSubstitutesInFormation={true}
                />

                <StaffSelectionSection
                  teamId={event.team_id}
                  selectedStaff={selectedStaff}
                  onStaffChange={setSelectedStaff}
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Selection Summary</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedPlayers.length} players, {substitutePlayers.length} substitutes, {selectedStaff.length} staff selected
                    </p>
                  </div>
                  <Button
                    onClick={handleRequestAvailability}
                    disabled={sendingNotifications || availabilityRequested}
                    className="flex items-center gap-2"
                  >
                    <Bell className="h-4 w-4" />
                    {sendingNotifications ? 'Sending...' : 
                     availabilityRequested ? 'Notifications Sent' : 
                     'Request Availability'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="availability">
              <EventAvailabilityDashboard event={event} />
            </TabsContent>

            <TabsContent value="dashboard">
              <div className="space-y-6">
                <EventAvailabilityDashboard event={event} />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      onClick={handleRequestAvailability}
                      disabled={sendingNotifications}
                      variant="outline"
                      className="w-full"
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      {sendingNotifications ? 'Sending...' : 'Resend Availability Requests'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
