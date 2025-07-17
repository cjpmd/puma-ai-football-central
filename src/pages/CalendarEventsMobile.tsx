
import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { AvailabilityStatusBadge } from '@/components/events/AvailabilityStatusBadge';

const tabs = [
  { id: 'fixtures', label: 'FIXTURES' },
  { id: 'training', label: 'TRAINING' },
  { id: 'friendlies', label: 'FRIENDLIES' }
];

export default function CalendarEventsMobile() {
  const { teams, user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fixtures');

  const currentTeam = teams?.[0];

  const loadEvents = async () => {
    if (!currentTeam) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('team_id', currentTeam.id)
        .order('date', { ascending: true });

      if (error) throw error;

      setEvents(data || []);
    } catch (error: any) {
      console.error('Error loading events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentTeam]);

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'training': return 'bg-blue-100 text-blue-800';
      case 'match':
      case 'fixture': return 'bg-red-100 text-red-800';
      case 'friendly': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFilteredEvents = () => {
    return events.filter(event => {
      switch (activeTab) {
        case 'fixtures':
          return event.event_type === 'match' || event.event_type === 'fixture';
        case 'training':
          return event.event_type === 'training';
        case 'friendlies':
          return event.event_type === 'friendly';
        default:
          return true;
      }
    });
  };

  const filteredEvents = getFilteredEvents();

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout 
      showTabs={true}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={tabs}
    >
      <div className="space-y-4">
        {/* Month Header */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-600">
            {format(new Date(), 'MMMM yyyy').toUpperCase()}
          </h2>
        </div>

        {/* Events List */}
        {filteredEvents.length > 0 ? (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <Card key={event.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="text-left">
                          <div className="text-xs text-gray-500 uppercase tracking-wide">
                            {format(parseISO(event.date), 'EEE dd MMM')}
                          </div>
                          <div className="text-lg font-semibold">
                            {event.start_time || 'TBD'}
                          </div>
                        </div>
                        
                        {event.event_type !== 'training' && (
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium">
                                {currentTeam?.name?.substring(0, 2) || 'TM'}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">vs</span>
                            <span className="font-medium">{event.opponent || 'TBD'}</span>
                          </div>
                        )}
                        
                        {event.event_type === 'training' && (
                          <div className="flex-1">
                            <span className="font-medium">{event.title || 'Training Session'}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </div>
                        )}
                        {event.game_format && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event.game_format}
                          </div>
                        )}
                        {!event.is_home && event.event_type !== 'training' && (
                          <span className="text-orange-600">• Away</span>
                        )}
                        {event.is_home && event.event_type !== 'training' && (
                          <span className="text-green-600">• Home</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {user && (
                        <AvailabilityStatusBadge 
                          eventId={event.id}
                          userId={user.id}
                        />
                      )}
                      <div className="flex flex-col items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div className="h-4 w-4 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              No {activeTab.toLowerCase()} scheduled
            </p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
