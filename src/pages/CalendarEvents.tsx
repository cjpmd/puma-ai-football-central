
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { PlusCircle, Calendar, MapPin, Clock, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EventForm } from '@/components/events/EventForm';
import { Event } from '@/types';
import { useToast } from '@/hooks/use-toast';

const CalendarEvents = () => {
  const { teams } = useAuth();
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const { toast } = useToast();

  // Mock events data - in real app this would come from database
  const mockEvents: Event[] = [
    {
      id: "1",
      type: "training",
      teamId: teams[0]?.id || '',
      title: "Weekly Training Session",
      date: "2024-01-15",
      meetingTime: "09:00",
      startTime: "09:30",
      endTime: "11:00",
      location: "Training Ground A",
      gameFormat: "7-a-side",
      teams: [teams[0]?.id || ''],
      periods: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "2",
      type: "fixture",
      teamId: teams[0]?.id || '',
      title: "vs Arsenal FC",
      date: "2024-01-20",
      meetingTime: "13:00",
      startTime: "14:00",
      endTime: "15:30",
      location: "Home Stadium",
      gameFormat: "7-a-side",
      opponent: "Arsenal FC",
      isHome: true,
      teams: [teams[0]?.id || ''],
      periods: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const handleCreateEvent = async (eventData: Partial<Event>) => {
    try {
      // In real app, this would create event in database
      console.log('Creating event:', eventData);
      setIsEventDialogOpen(false);
      toast({
        title: 'Event Created',
        description: `${eventData.title} has been successfully created.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to create event',
        variant: 'destructive',
      });
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'fixture': return 'bg-red-500';
      case 'friendly': return 'bg-blue-500';
      case 'training': return 'bg-green-500';
      case 'tournament': return 'bg-purple-500';
      case 'festival': return 'bg-yellow-500';
      case 'social': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendar & Events</h1>
            <p className="text-muted-foreground">
              Manage team events, fixtures, and training sessions
            </p>
          </div>
          {teams.length > 0 && (
            <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    setSelectedEvent(null);
                    setSelectedTeamId(teams[0]?.id || '');
                  }} 
                  className="bg-puma-blue-500 hover:bg-puma-blue-600"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                  <DialogDescription>
                    Create a new training session, fixture, or other team event.
                  </DialogDescription>
                </DialogHeader>
                <EventForm 
                  event={selectedEvent} 
                  teamId={selectedTeamId}
                  onSubmit={handleCreateEvent} 
                  onCancel={() => setIsEventDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {teams.length === 0 ? (
          <Card className="border-dashed border-2 border-muted">
            <CardContent className="py-8 flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No Teams Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                You need to create a team first before you can manage events.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {teams.map((team) => (
              <div key={team.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{team.name} Events</h2>
                  <Badge variant="outline">{team.gameFormat}</Badge>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {mockEvents
                    .filter(event => event.teamId === team.id)
                    .map((event) => (
                    <Card key={event.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          <Badge className={`text-white ${getEventTypeColor(event.type)}`}>
                            {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                          </Badge>
                        </div>
                        <CardDescription>
                          {formatDate(event.date)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {formatTime(event.startTime)} - {formatTime(event.endTime)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{event.location}</span>
                          </div>
                          {event.opponent && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>vs {event.opponent}</span>
                              <Badge variant={event.isHome ? 'default' : 'secondary'} className="ml-auto">
                                {event.isHome ? 'Home' : 'Away'}
                              </Badge>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Format:</span>
                            <span className="font-medium">{event.gameFormat}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Add Event Card */}
                  <Card className="border-dashed border-2 border-muted hover:border-puma-blue-300 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedEvent(null);
                          setSelectedTeamId(team.id);
                          setIsEventDialogOpen(true);
                        }}>
                    <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                      <PlusCircle className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Create Event</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CalendarEvents;
