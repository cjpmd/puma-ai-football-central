import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Printer, Download, Cloud, Wind, Droplets } from 'lucide-react';
import { DatabaseEvent } from '@/types/event';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { WeatherService } from '@/services/weatherService';

interface EventSelection {
  id: string;
  event_id: string;
  team_id: string;
  team_number: number;
  period_number: number;
  formation: string;
  duration_minutes: number;
  player_positions: any[];
  substitute_players: any[];
  captain_id: string | null;
  performance_category_id: string | null;
}

interface MatchDayPackViewProps {
  event: DatabaseEvent;
  onClose: () => void;
}

export const MatchDayPackView: React.FC<MatchDayPackViewProps> = ({
  event,
  onClose
}) => {
  const [preMatchNotes, setPreMatchNotes] = useState('');
  const [tacticalNotes, setTacticalNotes] = useState({
    generalTactics: '',
    corners: '',
    freeKicks: '',
    defensiveShape: '',
    attackingShape: ''
  });
  const [oppositionNotes, setOppositionNotes] = useState({
    strengths: '',
    weaknesses: '',
    dangerousPlayers: '',
    instructions: '',
    formation: ''
  });
  const [matchRecord, setMatchRecord] = useState({
    finalScore: '',
    goalScorers: '',
    cards: '',
    injuries: '',
    substitutions: '',
    performanceNotes: ''
  });
  const [weather, setWeather] = useState<any>(null);

  // Load event selections
  const { data: eventSelections = [] } = useQuery({
    queryKey: ['event-selections', event.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_selections')
        .select(`
          *,
          performance_categories(name)
        `)
        .eq('event_id', event.id)
        .order('team_number', { ascending: true })
        .order('period_number', { ascending: true });
      
      if (error) throw error;
      
      // Transform the data to ensure proper types
      return (data || []).map(selection => ({
        ...selection,
        player_positions: Array.isArray(selection.player_positions) 
          ? selection.player_positions 
          : JSON.parse(selection.player_positions as string || '[]'),
        substitute_players: Array.isArray(selection.substitute_players)
          ? selection.substitute_players
          : JSON.parse(selection.substitute_players as string || '[]')
      })) as EventSelection[];
    }
  });

  // Load squad players for each team
  const { data: squadPlayers = [] } = useQuery({
    queryKey: ['squad-players', event.team_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', event.team_id)
        .order('squad_number');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Load team data
  const { data: teamData } = useQuery({
    queryKey: ['team-data', event.team_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', event.team_id)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  // Load performance categories
  const { data: performanceCategories = [] } = useQuery({
    queryKey: ['performance-categories', event.team_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_categories')
        .select('*')
        .eq('team_id', event.team_id);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Load weather data
  useEffect(() => {
    const loadWeather = async () => {
      if (event.latitude && event.longitude) {
        try {
          const weatherData = await WeatherService.getWeatherForecast(
            event.latitude,
            event.longitude,
            `${event.date}T${event.start_time || '15:00'}`
          );
          setWeather(weatherData);
        } catch (error) {
          console.error('Failed to load weather:', error);
        }
      }
    };
    
    loadWeather();
  }, [event.latitude, event.longitude, event.date, event.start_time]);

  const handlePrint = () => {
    // Use window.print() which should handle all pages correctly
    window.print();
  };

  const handleDownloadPDF = async () => {
    // For better PDF generation, we'll use the browser's built-in print to PDF
    // This ensures all pages are included
    try {
      // Trigger print dialog with save as PDF option
      if (window.print) {
        window.print();
      } else {
        // Fallback for environments where print is not available
        console.warn('Print functionality not available');
        toast.error('PDF download not available in this environment');
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF');
    }
  };

  // Group selections by team
  const teamSelections = eventSelections.reduce((acc, selection) => {
    const teamNum = selection.team_number || 1;
    if (!acc[teamNum]) acc[teamNum] = [];
    acc[teamNum].push(selection);
    return acc;
  }, {} as Record<number, EventSelection[]>);

  // Calculate game timing for periods
  const calculateGameTiming = (teamSelections: EventSelection[]) => {
    const sortedPeriods = [...teamSelections].sort((a, b) => a.period_number - b.period_number);
    let currentTime = 0;
    
    return sortedPeriods.map(period => {
      const startTime = currentTime;
      const endTime = currentTime + period.duration_minutes;
      currentTime = endTime;
      
      const halfDuration = (event.game_duration || 50) / 2;
      const isFirstHalf = startTime < halfDuration;
      const isSecondHalf = startTime >= halfDuration;
      
      return {
        ...period,
        startTime,
        endTime,
        gameTimeDisplay: `${startTime}-${endTime}m`,
        halfDisplay: isFirstHalf ? 'First Half' : isSecondHalf ? 'Second Half' : 'Extra Time'
      };
    });
  };

  // Calculate playing time summary for each team
  const getPlayingTimeSummary = (teamNumber: number) => {
    const selections = teamSelections[teamNumber] || [];
    const playerMinutes: Record<string, number> = {};
    
    selections.forEach(selection => {
      selection.player_positions.forEach((pos: any) => {
        if (pos.playerId || pos.player_id) {
          const playerId = pos.playerId || pos.player_id;
          const minutes = pos.minutes || selection.duration_minutes || 0;
          playerMinutes[playerId] = (playerMinutes[playerId] || 0) + minutes;
        }
      });
    });
    
    return playerMinutes;
  };

  const getSelectedPlayers = (teamNumber: number) => {
    const selections = teamSelections[teamNumber] || [];
    const selectedPlayerIds = new Set<string>();
    
    selections.forEach(selection => {
      selection.player_positions.forEach((pos: any) => {
        if (pos.playerId || pos.player_id) {
          selectedPlayerIds.add(pos.playerId || pos.player_id);
        }
      });
      
      if (selection.substitute_players) {
        selection.substitute_players.forEach((sub: any) => {
          if (typeof sub === 'string') {
            selectedPlayerIds.add(sub);
          } else if (sub.playerId || sub.player_id) {
            selectedPlayerIds.add(sub.playerId || sub.player_id);
          }
        });
      }
    });
    
    return squadPlayers.filter(player => selectedPlayerIds.has(player.id));
  };

  const getPerformanceCategory = (teamNumber: number) => {
    const selections = teamSelections[teamNumber] || [];
    const selection = selections[0];
    if (!selection?.performance_category_id) return 'No Category';
    
    const category = performanceCategories.find(cat => cat.id === selection.performance_category_id);
    return category?.name || 'No Category';
  };

  // Helper function to get position group color
  const getPositionGroupColor = (position: string) => {
    const pos = position?.toLowerCase() || '';
    
    if (pos.includes('gk') || pos.includes('goalkeeper')) {
      return 'border-yellow-400 bg-yellow-50';
    } else if (pos.includes('cb') || pos.includes('lb') || pos.includes('rb') || 
               pos.includes('wb') || pos.includes('def') || pos.includes('dl') || 
               pos.includes('dr') || pos.includes('dc')) {
      return 'border-blue-400 bg-blue-50';
    } else if (pos.includes('cm') || pos.includes('dm') || pos.includes('am') || 
               pos.includes('mid') || pos.includes('ml') || pos.includes('mr') || 
               pos.includes('mc') || pos.includes('cdm') || pos.includes('cam')) {
      return 'border-green-400 bg-green-50';
    } else {
      // Forwards/Attackers
      return 'border-red-400 bg-red-50';
    }
  };

  // Render formation visualization
  const renderFormation = (selection: EventSelection & { gameTimeDisplay: string; halfDisplay: string }) => {
    const positions = selection.player_positions || [];
    
    // Get substitute players for this period
    const substitutePlayersList = selection.substitute_players || [];
    const substitutePlayersDisplay = substitutePlayersList
      .map((sub: any) => {
        if (typeof sub === 'string') {
          const player = squadPlayers.find(p => p.id === sub);
          return player ? `#${player.squad_number} ${player.name}` : '';
        } else if (sub.playerId || sub.player_id) {
          const playerId = sub.playerId || sub.player_id;
          const player = squadPlayers.find(p => p.id === playerId);
          return player ? `#${player.squad_number} ${player.name}` : '';
        }
        return '';
      })
      .filter(Boolean)
      .join(', ');
    
    return (
      <div className="mb-6 page-break-inside-avoid">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-lg font-bold">
            Period {selection.period_number} - {selection.formation}
          </h4>
          <div className="text-sm text-gray-600">
            <span className="font-medium">{selection.halfDisplay}</span> • 
            <span className="ml-1">{selection.gameTimeDisplay}</span> • 
            <span className="ml-1">{selection.duration_minutes} mins</span>
          </div>
        </div>
        
        <div className="flex gap-6">
          {/* Formation Pitch */}
          <div className="flex-1">
            <div className="relative bg-green-100 rounded-lg p-4 h-64 border">
              {/* Football pitch markings */}
              <div className="absolute inset-0 bg-gradient-to-b from-green-200 to-green-300 rounded-lg opacity-30" />
              
              {/* Center circle and halfway line */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 border-2 border-white rounded-full opacity-50" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white opacity-50" />
              
              {/* Penalty boxes */}
              <div className="absolute top-2 left-1/4 right-1/4 h-8 border-l-2 border-r-2 border-white opacity-50" />
              <div className="absolute bottom-2 left-1/4 right-1/4 h-8 border-l-2 border-r-2 border-white opacity-50" />
              
              {/* Player positions */}
              {positions.map((pos: any, index: number) => {
                const player = squadPlayers.find(p => p.id === (pos.playerId || pos.player_id));
                const isCaptain = (pos.playerId || pos.player_id) === selection.captain_id;
                const positionGroupColor = getPositionGroupColor(pos.position || pos.abbreviation || '');
                
                return (
                  <div
                    key={index}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${pos.x || 50}%`,
                      top: `${pos.y || 50}%`
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <div className={`w-14 h-14 rounded-full border-2 border-dashed ${positionGroupColor} flex flex-col items-center justify-center text-xs font-bold relative shadow-lg`}>
                        {isCaptain && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-black">C</span>
                          </div>
                        )}
                        
                        {/* Position abbreviation above player name */}
                        <div className="text-xs font-bold text-gray-700 mb-0.5">
                          {pos.abbreviation || pos.position?.substring(0, 2) || ''}
                        </div>
                        
                        {/* Player name */}
                        <div className="text-xs font-medium text-center leading-tight">
                          {player?.name || 'Unknown'}
                        </div>
                        
                        {/* Squad number below */}
                        <div className="text-xs font-bold text-gray-600">
                          #{player?.squad_number}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Notes space */}
          <div className="w-48">
            <h5 className="font-medium mb-2 text-sm">Period Notes:</h5>
            <div className="border rounded p-3 h-52 bg-gray-50">
              {/* Substitute players list */}
              {substitutePlayersDisplay && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-700 mb-1">Substitutes:</div>
                  <div className="text-xs text-gray-600 mb-2 leading-tight">
                    {substitutePlayersDisplay}
                  </div>
                </div>
              )}
              
              {/* Space for written notes */}
              <div className="text-xs text-gray-500">
                {substitutePlayersDisplay ? 'Tactical notes and changes:' : 'Space for tactical notes and changes'}
              </div>
              <div className="mt-2 min-h-[100px] border-t pt-2">
                {/* Empty space for handwritten notes */}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="match-day-pack">
      {/* Print/Screen Controls */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print Pack
        </Button>
        <Button onClick={handleDownloadPDF} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Save as PDF
        </Button>
        <Button variant="outline" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Page 1: Cover Page */}
      <div className="page page-break">
        <div className="flex flex-col items-center text-center mb-8">
          {teamData?.logo_url && (
            <img 
              src={teamData.logo_url} 
              alt={teamData.name || 'Club Logo'} 
              className="w-32 h-32 object-contain mb-6"
            />
          )}
          
          <h1 className="text-4xl font-bold mb-4">
            {event.title}
          </h1>
          
          <div className="text-xl mb-6">
            <div className="mb-2">
              <strong>Date:</strong> {new Date(event.date).toLocaleDateString('en-GB')}
            </div>
            {event.start_time && (
              <div className="mb-2">
                <strong>Kick-off:</strong> {event.start_time}
              </div>
            )}
            {event.location && (
              <div className="mb-2">
                <strong>Venue:</strong> {event.location}
              </div>
            )}
          </div>

          {/* Weather Forecast */}
          {weather && (
            <Card className="mb-8 max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Weather Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <img 
                    src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                    alt={weather.description}
                    className="w-16 h-16"
                  />
                  <div className="text-center">
                    <div className="text-3xl font-bold">{Math.round(weather.temp)}°C</div>
                    <div className="text-lg capitalize">{weather.description}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Wind className="h-4 w-4" />
                    <span>{Math.round(weather.windSpeed)} km/h</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4" />
                    <span>{weather.humidity}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pre-match Notes */}
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Pre-Match Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={preMatchNotes}
                onChange={(e) => setPreMatchNotes(e.target.value)}
                placeholder="Coach instructions and focus points..."
                className="min-h-32"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Generate pages for each team */}
      {Object.keys(teamSelections).map(teamNum => {
        const teamNumber = parseInt(teamNum);
        const teamPlayers = getSelectedPlayers(teamNumber);
        const playingTime = getPlayingTimeSummary(teamNumber);
        const performanceCategory = getPerformanceCategory(teamNumber);
        const teamSelectionsForTeam = teamSelections[teamNumber];
        const periodsWithTiming = calculateGameTiming(teamSelectionsForTeam);

        return (
          <React.Fragment key={teamNumber}>
            {/* Page 2: Squad */}
            <div className="page page-break">
              <div className="mb-6">
                <h2 className="text-3xl font-bold mb-2">
                  Team {teamNumber} Squad
                </h2>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {performanceCategory}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {teamPlayers.map(player => (
                  <div key={player.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    {player.photo_url ? (
                      <img 
                        src={player.photo_url} 
                        alt={player.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xl font-bold">#{player.squad_number}</span>
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-lg">{player.name}</div>
                      <div className="text-gray-600">#{player.squad_number}</div>
                      {playingTime[player.id] && (
                        <div className="text-sm text-blue-600">
                          {playingTime[player.id]} minutes
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Page 3: Formation & Selection - All Periods on One Page */}
            <div className="page page-break">
              <h2 className="text-3xl font-bold mb-6">
                Team {teamNumber} Formation & Selection
              </h2>

              {/* All Periods */}
              <div className="space-y-6">
                {periodsWithTiming.map((period) => renderFormation(period))}
              </div>

              {/* Compact Playing Time Summary */}
              <div className="mt-6 page-break-inside-avoid">
                <h3 className="text-lg font-bold mb-3">Playing Time Summary</h3>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  {Object.entries(playingTime).map(([playerId, minutes]) => {
                    const player = squadPlayers.find(p => p.id === playerId);
                    return player ? (
                      <div key={playerId} className="flex justify-between p-2 border rounded text-xs">
                        <span className="truncate">#{player.squad_number} {player.name}</span>
                        <span className="font-bold ml-2">{minutes}m</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>

            {/* Page 4: Tactical Notes */}
            <div className="page page-break">
              <h2 className="text-3xl font-bold mb-6">
                Team {teamNumber} Tactical Notes & Set Pieces
              </h2>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <Label className="text-lg font-bold">General Tactics</Label>
                  <Textarea
                    value={tacticalNotes.generalTactics}
                    onChange={(e) => setTacticalNotes(prev => ({...prev, generalTactics: e.target.value}))}
                    className="min-h-24 mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-lg font-bold">Corners (Attacking)</Label>
                    <Textarea
                      value={tacticalNotes.corners}
                      onChange={(e) => setTacticalNotes(prev => ({...prev, corners: e.target.value}))}
                      className="min-h-20 mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-lg font-bold">Free Kicks</Label>
                    <Textarea
                      value={tacticalNotes.freeKicks}
                      onChange={(e) => setTacticalNotes(prev => ({...prev, freeKicks: e.target.value}))}
                      className="min-h-20 mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-lg font-bold">Defensive Shape</Label>
                    <Textarea
                      value={tacticalNotes.defensiveShape}
                      onChange={(e) => setTacticalNotes(prev => ({...prev, defensiveShape: e.target.value}))}
                      className="min-h-20 mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-lg font-bold">Attacking Shape</Label>
                    <Textarea
                      value={tacticalNotes.attackingShape}
                      onChange={(e) => setTacticalNotes(prev => ({...prev, attackingShape: e.target.value}))}
                      className="min-h-20 mt-2"
                    />
                  </div>
                </div>

                {/* Sketch Areas */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-lg font-bold">Sketch Area 1</Label>
                    <div className="border-2 border-dashed border-gray-300 h-32 mt-2 bg-gray-50 flex items-center justify-center">
                      <span className="text-gray-500">Draw here</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-lg font-bold">Sketch Area 2</Label>
                    <div className="border-2 border-dashed border-gray-300 h-32 mt-2 bg-gray-50 flex items-center justify-center">
                      <span className="text-gray-500">Draw here</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Page 5: Opposition Analysis */}
            <div className="page page-break">
              <h2 className="text-3xl font-bold mb-6">
                Team {teamNumber} Opposition Analysis
              </h2>

              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-lg font-bold">Opposition Strengths</Label>
                    <Textarea
                      value={oppositionNotes.strengths}
                      onChange={(e) => setOppositionNotes(prev => ({...prev, strengths: e.target.value}))}
                      className="min-h-24 mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-lg font-bold">Opposition Weaknesses</Label>
                    <Textarea
                      value={oppositionNotes.weaknesses}
                      onChange={(e) => setOppositionNotes(prev => ({...prev, weaknesses: e.target.value}))}
                      className="min-h-24 mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-lg font-bold">Dangerous Players</Label>
                  <Textarea
                    value={oppositionNotes.dangerousPlayers}
                    onChange={(e) => setOppositionNotes(prev => ({...prev, dangerousPlayers: e.target.value}))}
                    placeholder="Key players to watch, their positions and threats..."
                    className="min-h-20 mt-2"
                  />
                </div>

                <div>
                  <Label className="text-lg font-bold">Tactical Instructions</Label>
                  <Textarea
                    value={oppositionNotes.instructions}
                    onChange={(e) => setOppositionNotes(prev => ({...prev, instructions: e.target.value}))}
                    placeholder="e.g. 'Press #6 early', 'Watch #10 on long balls'..."
                    className="min-h-24 mt-2"
                  />
                </div>

                <div>
                  <Label className="text-lg font-bold">Opposition Formation & Style</Label>
                  <Textarea
                    value={oppositionNotes.formation}
                    onChange={(e) => setOppositionNotes(prev => ({...prev, formation: e.target.value}))}
                    placeholder="Expected formation and typical style of play..."
                    className="min-h-20 mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Page 6: Match Record */}
            <div className="page page-break">
              <h2 className="text-3xl font-bold mb-6">
                Team {teamNumber} Match Record & Debrief
              </h2>

              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-lg font-bold">Final Score</Label>
                    <Input
                      value={matchRecord.finalScore}
                      onChange={(e) => setMatchRecord(prev => ({...prev, finalScore: e.target.value}))}
                      placeholder="e.g. 2-1"
                      className="text-2xl font-bold text-center mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-lg font-bold">Goal Scorers</Label>
                    <Textarea
                      value={matchRecord.goalScorers}
                      onChange={(e) => setMatchRecord(prev => ({...prev, goalScorers: e.target.value}))}
                      placeholder="Player names and minutes..."
                      className="min-h-16 mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <Label className="text-lg font-bold">Cards</Label>
                    <Textarea
                      value={matchRecord.cards}
                      onChange={(e) => setMatchRecord(prev => ({...prev, cards: e.target.value}))}
                      placeholder="Yellow/Red cards..."
                      className="min-h-16 mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-lg font-bold">Injuries</Label>
                    <Textarea
                      value={matchRecord.injuries}
                      onChange={(e) => setMatchRecord(prev => ({...prev, injuries: e.target.value}))}
                      placeholder="Player injuries..."
                      className="min-h-16 mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-lg font-bold">Substitutions</Label>
                    <Textarea
                      value={matchRecord.substitutions}
                      onChange={(e) => setMatchRecord(prev => ({...prev, substitutions: e.target.value}))}
                      placeholder="Subs made..."
                      className="min-h-16 mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-lg font-bold">Player Performance Notes</Label>
                  <Textarea
                    value={matchRecord.performanceNotes}
                    onChange={(e) => setMatchRecord(prev => ({...prev, performanceNotes: e.target.value}))}
                    placeholder="Individual player ratings and notes..."
                    className="min-h-32 mt-2"
                  />
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
