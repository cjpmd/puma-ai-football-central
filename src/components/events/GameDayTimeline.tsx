import React, { useState } from 'react';
import { MatchEvent } from '@/types/matchEvent';
import { Circle, HandHeart, Shield, Square } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface GameDayTimelineProps {
  matchEvents: MatchEvent[];
  periodDuration: number;
  totalPeriods: number;
  compact?: boolean;
  onEventDelete?: (event: MatchEvent) => void;
}

export const GameDayTimeline: React.FC<GameDayTimelineProps> = ({
  matchEvents,
  periodDuration,
  totalPeriods,
  compact = false,
  onEventDelete
}) => {
  const [eventToDelete, setEventToDelete] = useState<MatchEvent | null>(null);
  const totalMinutes = periodDuration * totalPeriods;

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'goal':
        return <Circle className="h-3 w-3 text-green-500 fill-green-500" />;
      case 'assist':
        return <HandHeart className="h-3 w-3 text-blue-500" />;
      case 'save':
        return <Shield className="h-3 w-3 text-purple-500" />;
      case 'yellow_card':
        return <Square className="h-3 w-3 text-yellow-500 fill-yellow-500" />;
      case 'red_card':
        return <Square className="h-3 w-3 text-red-500 fill-red-500" />;
      default:
        return null;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'goal':
        return 'bg-green-500';
      case 'assist':
        return 'bg-blue-500';
      case 'save':
        return 'bg-purple-500';
      case 'yellow_card':
        return 'bg-yellow-500';
      case 'red_card':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (compact) {
    return (
      <div className="w-full">
        <div className="relative">
          {/* Timeline bar */}
          <div className="h-1 bg-muted rounded-full relative overflow-hidden">
            {/* Period markers */}
            {Array.from({ length: totalPeriods - 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-border"
                style={{ left: `${((i + 1) * periodDuration / totalMinutes) * 100}%` }}
              />
            ))}
          </div>

          {/* Event markers */}
          <div className="relative h-4 mt-0.5">
            {matchEvents.map((event, index) => {
              const minute = event.minute || 0;
              const position = (minute / totalMinutes) * 100;

              return (
                <div
                  key={event.id}
                  className="absolute"
                  style={{
                    left: `${Math.min(Math.max(position, 0), 100)}%`,
                    transform: 'translateX(-50%)',
                    top: '0'
                  }}
                >
                  <div className={`w-3 h-3 rounded-full ${getEventColor(event.event_type)} flex items-center justify-center shadow-sm`}>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-card rounded-lg border">
      <h3 className="text-sm font-semibold mb-3">Match Timeline</h3>
      
      <div className="relative">
        {/* Timeline bar */}
        <div className="h-2 bg-muted rounded-full relative overflow-hidden">
          {/* Period markers */}
          {Array.from({ length: totalPeriods - 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-border"
              style={{ left: `${((i + 1) * periodDuration / totalMinutes) * 100}%` }}
            />
          ))}
        </div>

        {/* Event markers */}
        <div className="relative h-8 mt-1">
          {matchEvents.map((event, index) => {
            const minute = event.minute || 0;
            const position = (minute / totalMinutes) * 100;

            return (
              <div
                key={event.id}
                className="absolute group"
                style={{
                  left: `${Math.min(Math.max(position, 0), 100)}%`,
                  transform: 'translateX(-50%)',
                  top: index % 2 === 0 ? '0' : '16px'
                }}
              >
                <div 
                  className={`w-6 h-6 rounded-full ${getEventColor(event.event_type)} flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110`}
                  onClick={() => onEventDelete && setEventToDelete(event)}
                >
                  {getEventIcon(event.event_type)}
                </div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-popover text-popover-foreground text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap border">
                    <div className="font-semibold">{event.players?.name}</div>
                    <div className="text-muted-foreground">
                      {event.event_type.replace('_', ' ')} - {event.minute}'
                    </div>
                    {onEventDelete && (
                      <div className="text-destructive text-[10px] mt-1">Tap to delete</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Time labels */}
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>0'</span>
          {Array.from({ length: totalPeriods - 1 }).map((_, i) => (
            <span key={i}>{(i + 1) * periodDuration}'</span>
          ))}
          <span>{totalMinutes}'</span>
        </div>
      </div>

      {/* Events list */}
      {matchEvents.length > 0 && (
        <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
          {matchEvents.map((event) => (
            <div 
              key={event.id} 
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 p-1 rounded"
              onClick={() => onEventDelete && setEventToDelete(event)}
            >
              <span className="text-muted-foreground font-mono w-8">{event.minute}'</span>
              <div className="flex items-center gap-1">
                {getEventIcon(event.event_type)}
              </div>
              <span className="font-medium">{event.players?.name}</span>
              <span className="text-muted-foreground capitalize">
                {event.event_type.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {eventToDelete?.event_type.replace('_', ' ')} for {eventToDelete?.players?.name} at {eventToDelete?.minute}'?
              This will recalculate player statistics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (eventToDelete && onEventDelete) {
                  onEventDelete(eventToDelete);
                }
                setEventToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
