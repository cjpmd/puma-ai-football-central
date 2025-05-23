import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Event, EventType, GameFormat } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TeamSelector } from './TeamSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EventFormProps {
  event: Event | null;
  onSubmit: (data: Partial<Event>) => void;
  onCancel: () => void;
  teamId: string;
}

interface Facility {
  id: string;
  name: string;
  description?: string;
}

interface PerformanceCategory {
  id: string;
  name: string;
  description?: string;
}

export const EventForm: React.FC<EventFormProps> = ({
  event,
  onSubmit,
  onCancel,
  teamId
}) => {
  const { teams } = useAuth();
  const [activeTab, setActiveTab] = useState('details');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [performanceCategories, setPerformanceCategories] = useState<PerformanceCategory[]>([]);
  const [formData, setFormData] = useState<Partial<Event>>({
    type: event?.type || 'training',
    teamId: teamId,
    title: event?.title || '',
    date: event?.date || new Date().toISOString().split('T')[0],
    meetingTime: event?.meetingTime || '09:00',
    startTime: event?.startTime || '10:00',
    endTime: event?.endTime || '11:30',
    location: event?.location || '',
    gameFormat: event?.gameFormat || '7-a-side',
    opponent: event?.opponent || '',
    isHome: event?.isHome || true,
    teams: event?.teams || [teamId],
    trainingNotes: event?.trainingNotes || '',
    coachNotes: event?.coachNotes || '',
    staffNotes: event?.staffNotes || '',
    performanceCategoryId: event?.performanceCategoryId || '',
    kitSelection: event?.kitSelection || 'home' // Use event's kitSelection if available, otherwise default to 'home'
  });

  const [selectedFacility, setSelectedFacility] = useState<string>(event?.facilityId || "none");
  
  // No need for a separate state variable for kit selection since it's now part of formData
  // const [selectedKit, setSelectedKit] = useState<string>(event?.kitSelection || "home");

  useEffect(() => {
    loadClubFacilities();
    loadPerformanceCategories();
  }, [teamId]);

  const loadClubFacilities = async () => {
    try {
      // Get the team's club
      const team = teams.find(t => t.id === teamId);
      if (!team?.clubId) return;

      const { data, error } = await supabase
        .from('facilities')
        .select('id, name, description')
        .eq('club_id', team.clubId);

      if (error) {
        console.error('Error loading facilities:', error);
        return;
      }

      setFacilities(data || []);
    } catch (error) {
      console.error('Error in loadClubFacilities:', error);
    }
  };

  const loadPerformanceCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_categories')
        .select('id, name, description')
        .eq('team_id', teamId);

      if (error) {
        console.error('Error loading performance categories:', error);
        return;
      }

      setPerformanceCategories(data || []);
      
      // Set default performance category if one exists and none is already selected
      if (data && data.length > 0 && !formData.performanceCategoryId) {
        const defaultCategory = data.find(cat => cat.name === 'Default') || data[0];
        handleChange('performanceCategoryId', defaultCategory.id);
      }
    } catch (error) {
      console.error('Error in loadPerformanceCategories:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const enhancedData = {
      ...formData,
      facilityId: selectedFacility !== "none" ? selectedFacility : null,
      // No need to add kitSelection separately as it's already in formData
    };

    onSubmit(enhancedData);
  };

  const isMatchType = formData.type === 'fixture' || formData.type === 'friendly' || formData.type === 'tournament' || formData.type === 'festival';
  const hasOpponent = formData.type === 'fixture' || formData.type === 'friendly';
  const currentTeam = teams.find(t => t.id === teamId);

  function handleChange(field: keyof Partial<Event>, value: any) {
    setFormData({
      ...formData,
      [field]: value
    });
  }

  function handleTeamsChange(teams: string[]) {
    setFormData({
      ...formData,
      teams: teams
    });
  }

  return (
    <div className="max-h-[70vh] overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="details">Event Details</TabsTrigger>
            <TabsTrigger value="kit">Kit & Teams</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Event Type</Label>
              <Select 
                value={formData.type}
                onValueChange={(value) => handleChange('type', value as EventType)}
                required
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixture">Fixture</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="tournament">Tournament</SelectItem>
                  <SelectItem value="festival">Festival</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="social">Social Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g. Training Session or vs Arsenal FC"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meetingTime">Meeting Time</Label>
                <Input
                  id="meetingTime"
                  type="time"
                  value={formData.meetingTime}
                  onChange={(e) => handleChange('meetingTime', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gameFormat">Game Format</Label>
                <Select 
                  value={formData.gameFormat}
                  onValueChange={(value) => handleChange('gameFormat', value as GameFormat)}
                  required
                >
                  <SelectTrigger id="gameFormat">
                    <SelectValue placeholder="Select game format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3-a-side">3-a-side</SelectItem>
                    <SelectItem value="4-a-side">4-a-side</SelectItem>
                    <SelectItem value="5-a-side">5-a-side</SelectItem>
                    <SelectItem value="7-a-side">7-a-side</SelectItem>
                    <SelectItem value="9-a-side">9-a-side</SelectItem>
                    <SelectItem value="11-a-side">11-a-side</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="e.g. Training Ground or Stadium Name"
                  required
                />
              </div>
              
              {facilities.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="facility">Club Facility (Optional)</Label>
                  <Select 
                    value={selectedFacility}
                    onValueChange={setSelectedFacility}
                  >
                    <SelectTrigger id="facility">
                      <SelectValue placeholder="Select a facility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No facility</SelectItem>
                      {facilities.map((facility) => (
                        <SelectItem key={facility.id} value={facility.id}>
                          {facility.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {performanceCategories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="performanceCategory">Performance Category</Label>
                <Select 
                  value={formData.performanceCategoryId || ""}
                  onValueChange={(value) => handleChange('performanceCategoryId', value)}
                >
                  <SelectTrigger id="performanceCategory">
                    <SelectValue placeholder="Select performance category" />
                  </SelectTrigger>
                  <SelectContent>
                    {performanceCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {hasOpponent && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="opponent">Opponent</Label>
                  <Input
                    id="opponent"
                    value={formData.opponent}
                    onChange={(e) => handleChange('opponent', e.target.value)}
                    placeholder="e.g. Arsenal FC"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue">Venue</Label>
                  <Select 
                    value={formData.isHome ? 'home' : 'away'}
                    onValueChange={(value) => handleChange('isHome', value === 'home')}
                    required
                  >
                    <SelectTrigger id="venue">
                      <SelectValue placeholder="Select venue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="away">Away</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="kit" className="space-y-4">
            {/* Kit Selection */}
            {isMatchType && (
              <Card>
                <CardHeader>
                  <CardTitle>Kit Selection</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="kit">Select Kit</Label>
                    <Select 
                      value={formData.kitSelection}
                      onValueChange={(value) => handleChange('kitSelection', value)}
                    >
                      <SelectTrigger id="kit">
                        <SelectValue placeholder="Select kit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home">Home Kit</SelectItem>
                        <SelectItem value="away">Away Kit</SelectItem>
                        <SelectItem value="training">Training Kit</SelectItem>
                        <SelectItem value="goalkeeper">Goalkeeper Kit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Team Selection for Match Types */}
            {isMatchType && (
              <Card>
                <CardHeader>
                  <CardTitle>Team Selection</CardTitle>
                </CardHeader>
                <CardContent>
                  <TeamSelector
                    selectedTeams={formData.teams || [teamId]}
                    onTeamsChange={handleTeamsChange}
                    primaryTeamId={teamId}
                    maxTeams={formData.type === 'tournament' || formData.type === 'festival' ? 4 : 2}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            {formData.type === 'training' && (
              <div className="space-y-2">
                <Label htmlFor="trainingNotes">Training Notes</Label>
                <Textarea
                  id="trainingNotes"
                  value={formData.trainingNotes || ''}
                  onChange={(e) => handleChange('trainingNotes', e.target.value)}
                  placeholder="Add training session details, drills, squad information..."
                  rows={4}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="coachNotes">Coach Notes (Visible to coaches only)</Label>
              <Textarea
                id="coachNotes"
                value={formData.coachNotes || ''}
                onChange={(e) => handleChange('coachNotes', e.target.value)}
                placeholder="Add notes for coaches only..."
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="staffNotes">Staff Notes (Visible to staff only)</Label>
              <Textarea
                id="staffNotes"
                value={formData.staffNotes || ''}
                onChange={(e) => handleChange('staffNotes', e.target.value)}
                placeholder="Add notes for staff only..."
                rows={4}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-puma-blue-500 hover:bg-puma-blue-600">
            {event ? 'Update Event' : 'Create Event'}
          </Button>
        </div>
      </form>
    </div>
  );

  function handleChange(field: keyof Partial<Event>, value: any) {
    setFormData({
      ...formData,
      [field]: value
    });
  }

  function handleTeamsChange(teams: string[]) {
    setFormData({
      ...formData,
      teams: teams
    });
  }
};
