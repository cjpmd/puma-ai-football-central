import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Calendar, MapPin, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';

interface Event {
  id: string;
  title: string;
  date: string;
  start_time: string;
  location: string;
  opponent: string;
  event_type: string;
  description: string;
}

interface AvailabilityRecord {
  id: string;
  status: string;
  role: string;
  user_id: string;
}

export default function AvailabilityConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useMobileDetection();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [availabilityRecord, setAvailabilityRecord] = useState<AvailabilityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const eventId = searchParams.get('eventId');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!eventId) {
      toast.error('Missing event information');
      navigate('/dashboard');
      return;
    }

    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      setLoading(true);

      // Load event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // If user is logged in, check for existing availability record
      if (user) {
        const { data: availabilityData } = await supabase
          .from('event_availability')
          .select('*')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .single();

        setAvailabilityRecord(availabilityData);
      }
    } catch (error) {
      console.error('Error loading event data:', error);
      toast.error('Failed to load event information');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: 'available' | 'unavailable') => {
    if (!user) {
      toast.error('Please log in to confirm your availability');
      navigate('/auth');
      return;
    }

    try {
      setUpdating(true);

      const updateData = {
        status,
        responded_at: new Date().toISOString()
      };

      if (availabilityRecord) {
        // Update existing record
        const { error } = await supabase
          .from('event_availability')
          .update(updateData)
          .eq('id', availabilityRecord.id);

        if (error) throw error;
      } else {
        // Create new record - determine role based on user's relationship to the team
        const { data: userRoles } = await supabase.rpc('get_user_event_roles', {
          p_event_id: eventId,
          p_user_id: user.id
        });

        const role = userRoles?.[0]?.role || 'player';

        const { error } = await supabase
          .from('event_availability')
          .insert({
            event_id: eventId,
            user_id: user.id,
            role,
            ...updateData
          });

        if (error) throw error;
      }

      toast.success(`Availability confirmed as ${status}`);
      
      // Refresh data
      await loadEventData();
      
      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'match': return 'text-red-600';
      case 'training': return 'text-blue-600';
      case 'friendly': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Event Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The event you're looking for could not be found.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const content = (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Event Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{event.title}</CardTitle>
            <span className={`text-sm font-medium ${getEventTypeColor(event.event_type)}`}>
              {event.event_type?.toUpperCase()}
            </span>
          </div>
          <CardDescription>
            Confirm your availability for this event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{formatDate(event.date)}</span>
            </div>
            
            {event.start_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formatTime(event.start_time)}</span>
              </div>
            )}
            
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{event.location}</span>
              </div>
            )}
            
            {event.opponent && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">vs {event.opponent}</span>
              </div>
            )}
          </div>
          
          {event.description && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">{event.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Availability Status Card */}
      {availabilityRecord && availabilityRecord.status !== 'pending' ? (
        <Card>
          <CardContent className="py-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {availabilityRecord.status === 'available' ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold mb-1">
                Availability Confirmed
              </h3>
              <p className="text-muted-foreground">
                You have confirmed that you are{' '}
                <span className={availabilityRecord.status === 'available' ? 'text-green-600' : 'text-red-600'}>
                  {availabilityRecord.status}
                </span>{' '}
                for this event.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Your Availability</CardTitle>
            <CardDescription>
              Let your team know if you can attend this event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => handleStatusUpdate('available')}
                disabled={updating}
                className="h-16 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                I'm Available
              </Button>
              
              <Button
                onClick={() => handleStatusUpdate('unavailable')}
                disabled={updating}
                variant="destructive"
                className="h-16"
              >
                <XCircle className="h-5 w-5 mr-2" />
                Not Available
              </Button>
            </div>
            
            {updating && (
              <div className="flex items-center justify-center mt-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                <span className="text-sm">Updating availability...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="text-center">
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileLayout headerTitle="Confirm Availability">
        <div className="p-4">
          {content}
        </div>
      </MobileLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        {content}
      </div>
    </MainLayout>
  );
}