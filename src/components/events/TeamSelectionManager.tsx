
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, Bell, CheckCircle, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlayerSelectionWithAvailability } from './PlayerSelectionWithAvailability';
import { StaffSelectionSection } from './StaffSelectionSection';
import { EventAvailabilityDashboard } from './EventAvailabilityDashboard';
import { availabilityService } from '@/services/availabilityService';
import { DatabaseEvent } from '@/types/event';
import { GameFormat } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TeamSelectionManagerProps {
  event: DatabaseEvent;
  isOpen: boolean;
  onClose: () => void;
}

interface PerformanceCategory {
  id: string;
  name: string;
  description?: string;
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
  const [teamNumber, setTeamNumber] = useState<number>(1);
  const [periodNumber, setPeriodNumber] = useState<number>(1);
  const [selectedPerformanceCategory, setSelectedPerformanceCategory] = useState<string>('none');
  const [performanceCategories, setPerformanceCategories] = useState<PerformanceCategory[]>([]);
  const [availabilityRequested, setAvailabilityRequested] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkIfAvailabilityRequested();
      loadPerformanceCategories();
    }
  }, [isOpen, event.id]);

  const loadPerformanceCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_categories')
        .select('*')
        .eq('team_id', event.team_id)
        .order('name');

      if (error) throw error;
      setPerformanceCategories(data || []);
    } catch (error) {
      console.error('Error loading performance categories:', error);
    }
  };

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Team Selection - {event.title}</DialogTitle>
          <DialogDescription>
            Select your team and request availability confirmation for this event.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="players" className="h-full flex flex-col">
            <div className="shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {availabilityRequested && (
                    <Badge className="bg-green-500 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Notifications Sent
                    </Badge>
                  )}
                </div>
              </div>
              
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="players" className="text-xs sm:text-sm">Players</TabsTrigger>
                <TabsTrigger value="staff" className="text-xs sm:text-sm">Staff</TabsTrigger>
                <TabsTrigger value="availability" className="text-xs sm:text-sm">
                  Availability
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Dashboard</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="players" className="p-4 md:p-6 space-y-6 mt-0">
                {/* Team Configuration Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Settings className="h-4 w-4" />
                      Team Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="team-number">Team Number</Label>
                      <Select value={teamNumber.toString()} onValueChange={(value) => setTeamNumber(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Team 1</SelectItem>
                          <SelectItem value="2">Team 2</SelectItem>
                          <SelectItem value="3">Team 3</SelectItem>
                          <SelectItem value="4">Team 4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="period-number">Period</Label>
                      <Select value={periodNumber.toString()} onValueChange={(value) => setPeriodNumber(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Period 1</SelectItem>
                          <SelectItem value="2">Period 2</SelectItem>
                          <SelectItem value="3">Period 3</SelectItem>
                          <SelectItem value="4">Period 4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="formation">Formation</Label>
                      <Select value={formation} onValueChange={setFormation}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select formation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4-3-3">4-3-3</SelectItem>
                          <SelectItem value="4-4-2">4-4-2</SelectItem>
                          <SelectItem value="3-5-2">3-5-2</SelectItem>
                          <SelectItem value="4-2-3-1">4-2-3-1</SelectItem>
                          <SelectItem value="3-4-3">3-4-3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="performance-category">Performance Category</Label>
                      <Select value={selectedPerformanceCategory} onValueChange={setSelectedPerformanceCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Category</SelectItem>
                          {performanceCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Player Selection */}
                <PlayerSelectionWithAvailability
                  teamId={event.team_id}
                  eventId={event.id}
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
                  teamNumber={teamNumber}
                  periodNumber={periodNumber}
                  showSubstitutesInFormation={true}
                />

                {/* Selection Summary */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-medium">Selection Summary</h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedPlayers.length} players, {substitutePlayers.length} substitutes selected
                        </p>
                      </div>
                      <Button
                        onClick={handleRequestAvailability}
                        disabled={sendingNotifications || availabilityRequested}
                        className="flex items-center gap-2 w-full sm:w-auto"
                      >
                        <Bell className="h-4 w-4" />
                        {sendingNotifications ? 'Sending...' : 
                         availabilityRequested ? 'Notifications Sent' : 
                         'Request Availability'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="staff" className="p-4 md:p-6 mt-0">
                <StaffSelectionSection
                  teamId={event.team_id}
                  selectedStaff={selectedStaff}
                  onStaffChange={setSelectedStaff}
                />

                {/* Staff Summary */}
                <Card className="mt-6">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-medium">Staff Summary</h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedStaff.length} staff members selected
                        </p>
                      </div>
                      <Button
                        onClick={handleRequestAvailability}
                        disabled={sendingNotifications || availabilityRequested}
                        className="flex items-center gap-2 w-full sm:w-auto"
                      >
                        <Bell className="h-4 w-4" />
                        {sendingNotifications ? 'Sending...' : 
                         availabilityRequested ? 'Notifications Sent' : 
                         'Request Availability'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="availability" className="p-4 md:p-6 mt-0">
                <EventAvailabilityDashboard event={event} />
              </TabsContent>

              <TabsContent value="dashboard" className="p-4 md:p-6 space-y-6 mt-0">
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
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
