
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FacilityBooking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  bookedByTeamId?: string;
  eventType?: string;
  teamName?: string;
}

interface FacilityCalendarProps {
  clubId: string;
  facilities: Array<{
    id: string;
    name: string;
  }>;
}

export const FacilityCalendar: React.FC<FacilityCalendarProps> = ({ clubId, facilities }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedFacility, setSelectedFacility] = useState<string>(facilities[0]?.id || '');
  const [bookings, setBookings] = useState<FacilityBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedFacility) {
      loadFacilityBookings();
    }
  }, [selectedFacility, currentDate]);

  const loadFacilityBookings = async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('facility_availability')
        .select(`
          *,
          teams!booked_by_team_id(name)
        `)
        .eq('facility_id', selectedFacility)
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0])
        .order('date')
        .order('start_time');

      if (error) throw error;

      const transformedBookings: FacilityBooking[] = (data || []).map(booking => ({
        id: booking.id,
        date: booking.date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        isAvailable: booking.is_available,
        bookedByTeamId: booking.booked_by_team_id,
        eventType: booking.event_type,
        teamName: booking.teams?.name
      }));

      setBookings(transformedBookings);
    } catch (error: any) {
      console.error('Error loading facility bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load facility bookings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getBookingsForDate = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString().split('T')[0];
    return bookings.filter(booking => booking.date === dateStr);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (facilities.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center h-[300px]">
            <div className="flex flex-col items-center text-muted-foreground">
              <Calendar className="h-12 w-12 mb-2" />
              <h4 className="font-medium">No Facilities Available</h4>
              <p className="text-sm text-center">
                Add facilities to your club to start managing availability.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Facility Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Facility:</label>
        <select
          value={selectedFacility}
          onChange={(e) => setSelectedFacility(e.target.value)}
          className="px-3 py-2 border border-input rounded-md bg-background"
        >
          {facilities.map((facility) => (
            <option key={facility.id} value={facility.id}>
              {facility.name}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading availability...</div>
          ) : (
            <div className="space-y-4">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-1 text-sm font-medium text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth().map((day, index) => {
                  if (!day) {
                    return <div key={index} className="h-20" />;
                  }

                  const dayBookings = getBookingsForDate(day);
                  const hasBookings = dayBookings.length > 0;
                  const isUnavailable = dayBookings.some(b => !b.isAvailable);

                  return (
                    <div
                      key={day}
                      className={`h-20 p-1 border border-border rounded text-xs ${
                        hasBookings ? 'bg-muted/50' : ''
                      }`}
                    >
                      <div className="font-medium mb-1">{day}</div>
                      {dayBookings.slice(0, 2).map((booking, idx) => (
                        <div key={idx} className="mb-1">
                          <Badge
                            variant={booking.isAvailable ? "default" : "destructive"}
                            className="text-[10px] px-1 py-0"
                          >
                            {formatTime(booking.startTime)}
                          </Badge>
                        </div>
                      ))}
                      {dayBookings.length > 2 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{dayBookings.length - 2} more
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Badge variant="default" className="text-[10px]">Available</Badge>
                  <span>Available booking</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="destructive" className="text-[10px]">Booked</Badge>
                  <span>Unavailable/Booked</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
