import React from 'react';
import { MatchEvent } from '@/types/matchEvent';
import { Trophy, HandHeart, Shield, AlertCircle, AlertTriangle } from 'lucide-react';

interface GameDayTimelineProps {
  matchEvents: MatchEvent[];
  periodDuration: number;
  totalPeriods: number;
}

export const GameDayTimeline: React.FC<GameDayTimelineProps> = ({
  matchEvents,
  periodDuration,
  totalPeriods
}) => {
  const totalMinutes = periodDuration * totalPeriods;

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'goal':
        return <Trophy className="h-3 w-3 text-green-500" />;
      case 'assist':
        return <HandHeart className="h-3 w-3 text-blue-500" />;
      case 'save':
        return <Shield className="h-3 w-3 text-purple-500" />;
      case 'yellow_card':
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
      case 'red_card':
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
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
                <div className={`w-6 h-6 rounded-full ${getEventColor(event.event_type)} flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110`}>
                  {getEventIcon(event.event_type)}
                </div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-popover text-popover-foreground text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap border">
                    <div className="font-semibold">{event.players?.name}</div>
                    <div className="text-muted-foreground">
                      {event.event_type.replace('_', ' ')} - {event.minute}'
                    </div>
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
            <div key={event.id} className="flex items-center gap-2 text-sm">
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
    </div>
  );
};
