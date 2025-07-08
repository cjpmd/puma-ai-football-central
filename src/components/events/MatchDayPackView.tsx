
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Printer, Download, Cloud, Wind, Droplets } from 'lucide-react';
import { DatabaseEvent } from '@/types/event';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { WeatherService } from '@/services/weatherService';
import { format } from 'date-fns';

interface MatchDayPackViewProps {
  event: DatabaseEvent;
  onClose: () => void;
}

interface EventSelection {
  id: string;
  team_id: string;
  team_number: number;
  period_number: number;
  formation: string;
  player_positions: any[];
  substitute_players: any[];
  captain_id: string | null;
  staff_selection: any[];
  duration_minutes: number;
  performance_category_id: string | null;
  performance_categories?: { name: string };
}

interface Player {
  id: string;
  name: string;
  squad_number: number;
  photo_url: string | null;
}

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

export const MatchDayPackView: React.FC<MatchDayPackViewProps> = ({ event, onClose }) => {
  const { teams } = useAuth();
  const [selections, setSelections] = useState<EventSelection[]>([]);
  const [players, setPlayers] = useState<{ [teamId: string]: Player[] }>({});
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Editable notes states
  const [preMatchNotes, setPreMatchNotes] = useState('');
  const [tacticalNotes, setTacticalNotes] = useState('');
  const [cornerNotes, setCornerNotes] = useState('');
  const [freeKickNotes, setFreeKickNotes] = useState('');
  const [oppositionNotes, setOppositionNotes] = useState('');
  const [matchRecord, setMatchRecord] = useState('');

  useEffect(() => {
    loadEventData();
  }, [event.id]);

  const loadEventData = async () => {
    try {
      // Load event selections
      const { data: selectionsData, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          *,
          performance_categories(name)
        `)
        .eq('event_id', event.id);

      if (selectionsError) throw selectionsError;
      setSelections(selectionsData || []);

      // Load players for each team
      const teamIds = [...new Set(selectionsData?.map(s => s.team_id) || [])];
      const playersData: { [teamId: string]: Player[] } = {};

      for (const teamId of teamIds) {
        const { data: teamPlayers, error: playersError } = await supabase
          .from('players')
          .select('id, name, squad_number, photo_url')
          .eq('team_id', teamId)
          .order('squad_number');

        if (playersError) throw playersError;
        playersData[teamId] = teamPlayers || [];
      }

      setPlayers(playersData);

      // Load weather data if coordinates are available
      if (event.latitude && event.longitude) {
        const weatherData = await WeatherService.getWeatherForecast(
          event.latitude,
          event.longitude,
          event.date
        );
        if (weatherData) {
          setWeather({
            temp: weatherData.temp,
            description: weatherData.description,
            icon: weatherData.icon,
            humidity: weatherData.humidity || 0,
            windSpeed: weatherData.windSpeed || 0
          });
        }
      }
    } catch (error) {
      console.error('Error loading event data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Trigger browser's print dialog with PDF option
    window.print();
  };

  const getEventTeam = () => {
    return teams.find(t => t.id === event.team_id);
  };

  const getPlayersBySelection = (selection: EventSelection) => {
    const selectedPlayerIds = selection.player_positions.map(p => p.playerId || p.player_id);
    const teamPlayers = players[selection.team_id] || [];
    return teamPlayers.filter(player => selectedPlayerIds.includes(player.id));
  };

  const calculatePlayingTime = (selection: EventSelection) => {
    const playerMinutes: { [playerId: string]: number } = {};
    
    selection.player_positions.forEach(pos => {
      const playerId = pos.playerId || pos.player_id;
      if (playerId) {
        playerMinutes[playerId] = (playerMinutes[playerId] || 0) + (pos.minutes || selection.duration_minutes || 90);
      }
    });

    return playerMinutes;
  };

  const eventTeam = getEventTeam();
  const uniqueTeams = [...new Set(selections.map(s => s.team_id))];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading Match Day Pack...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      {/* Print/Action Bar - Hidden in print */}
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center print:hidden z-10">
        <h1 className="text-xl font-bold">Match Day Pack - {event.title}</h1>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print Pack
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={onClose} variant="outline">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Page 1: Cover Page */}
      <div className="page-break min-h-screen p-8 flex flex-col">
        <div className="text-center mb-8">
          {eventTeam?.logo_url && (
            <img 
              src={eventTeam.logo_url} 
              alt="Club Logo" 
              className="h-24 w-24 mx-auto mb-6 object-contain"
            />
          )}
          <h1 className="text-4xl font-bold mb-4">{event.title}</h1>
          <div className="text-xl text-gray-600 space-y-2">
            <p>{format(new Date(event.date), 'EEEE, MMMM do, yyyy')}</p>
            {event.start_time && <p>Kick-off: {event.start_time}</p>}
            {event.location && <p>Venue: {event.location}</p>}
          </div>
        </div>

        {/* Weather Forecast */}
        {weather && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Weather Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <img 
                    src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                    alt={weather.description}
                    className="w-16 h-16 mx-auto"
                  />
                  <p className="text-2xl font-bold">{Math.round(weather.temp)}°C</p>
                  <p className="text-gray-600 capitalize">{weather.description}</p>
                </div>
                <div className="text-left space-y-2">
                  <div className="flex items-center gap-2">
                    <Wind className="h-4 w-4" />
                    <span>{weather.windSpeed} km/h</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4" />
                    <span>{weather.humidity}% humidity</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pre-Match Notes */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Pre-Match Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={preMatchNotes}
              onChange={(e) => setPreMatchNotes(e.target.value)}
              placeholder="Add coach instructions, focus points, or key reminders for the team..."
              className="min-h-48 text-base print:border-none print:shadow-none"
            />
          </CardContent>
        </Card>
      </div>

      {/* Pages 2-6 for each team */}
      {uniqueTeams.map((teamId, teamIndex) => {
        const teamSelections = selections.filter(s => s.team_id === teamId);
        const teamPlayers = players[teamId] || [];
        const performanceCategory = teamSelections[0]?.performance_categories?.name;

        return (
          <React.Fragment key={teamId}>
            {/* Page 2: Squad */}
            <div className="page-break min-h-screen p-8">
              <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Squad</h1>
                {performanceCategory && (
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {performanceCategory}
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {teamPlayers.map((player) => (
                  <Card key={player.id} className="text-center">
                    <CardContent className="p-4">
                      {player.photo_url ? (
                        <img 
                          src={player.photo_url} 
                          alt={player.name}
                          className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 mx-auto mb-2 flex items-center justify-center">
                          <span className="text-2xl font-bold">{player.squad_number}</span>
                        </div>
                      )}
                      <p className="font-semibold">{player.name}</p>
                      <p className="text-sm text-gray-600">#{player.squad_number}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Page 3: Formation & Selection */}
            <div className="page-break min-h-screen p-8">
              <h1 className="text-3xl font-bold mb-6">Formation & Selection</h1>
              
              {teamSelections.map((selection, index) => (
                <div key={selection.id} className="mb-8 border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">
                      Period {selection.period_number} - {selection.formation}
                    </h2>
                    <Badge>{selection.duration_minutes} minutes</Badge>
                  </div>
                  
                  {/* Formation Display */}
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4 min-h-48">
                    <div className="grid grid-cols-4 gap-2 h-full">
                      {selection.player_positions.map((pos, posIndex) => {
                        const player = teamPlayers.find(p => p.id === (pos.playerId || pos.player_id));
                        return (
                          <div key={posIndex} className="text-center p-2 bg-white rounded border">
                            <div className="font-semibold text-sm">{pos.position}</div>
                            <div className="text-xs">{player?.name || 'TBC'}</div>
                            <div className="text-xs text-gray-500">#{player?.squad_number}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Space for handwritten changes */}
                  <div className="border-2 border-dashed border-gray-300 rounded p-4 min-h-24">
                    <p className="text-sm text-gray-500 mb-2">Handwritten changes:</p>
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="border-b border-gray-200 h-6"></div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* Playing Time Summary */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Playing Time Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {teamPlayers.map((player) => {
                      const totalMinutes = teamSelections.reduce((total, selection) => {
                        const playerPos = selection.player_positions.find(p => 
                          (p.playerId || p.player_id) === player.id
                        );
                        return total + (playerPos?.minutes || selection.duration_minutes || 0);
                      }, 0);
                      
                      return (
                        <div key={player.id} className="flex justify-between border-b pb-1">
                          <span>{player.name}</span>
                          <span className="font-semibold">{totalMinutes} min</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Page 4: Tactical Notes */}
            <div className="page-break min-h-screen p-8">
              <h1 className="text-3xl font-bold mb-6">Tactical Notes & Set Pieces</h1>
              
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>General Tactics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={tacticalNotes}
                      onChange={(e) => setTacticalNotes(e.target.value)}
                      placeholder="Formation, style of play, key tactical instructions..."
                      className="min-h-32 print:border-none"
                    />
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Corners</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={cornerNotes}
                        onChange={(e) => setCornerNotes(e.target.value)}
                        placeholder="Attacking and defensive corner routines..."
                        className="min-h-24 print:border-none"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Free Kicks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={freeKickNotes}
                        onChange={(e) => setFreeKickNotes(e.target.value)}
                        placeholder="Free kick routines and defensive wall setup..."
                        className="min-h-24 print:border-none"
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Sketch Area */}
                <Card>
                  <CardHeader>
                    <CardTitle>Tactical Sketches</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-gray-300 rounded p-4 min-h-48">
                      <p className="text-sm text-gray-500 mb-4">Use this space for tactical diagrams and sketches</p>
                      <div className="grid grid-cols-8 gap-1 opacity-20">
                        {Array.from({ length: 64 }).map((_, i) => (
                          <div key={i} className="aspect-square border border-gray-300"></div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Page 5: Opposition Analysis */}
            <div className="page-break min-h-screen p-8">
              <h1 className="text-3xl font-bold mb-6">Opposition Analysis</h1>
              
              <Card>
                <CardHeader>
                  <CardTitle>Opposition: {event.opponent || 'TBC'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Strengths & Weaknesses</h3>
                    <Textarea
                      value={oppositionNotes}
                      onChange={(e) => setOppositionNotes(e.target.value)}
                      placeholder="Key players to watch, formation, style of play, recent results..."
                      className="min-h-32 print:border-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Key Instructions</h3>
                      <div className="border-2 border-dashed border-gray-300 rounded p-4 min-h-24">
                        <div className="space-y-2">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className="border-b border-gray-200 h-6"></div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Danger Players</h3>
                      <div className="border-2 border-dashed border-gray-300 rounded p-4 min-h-24">
                        <div className="space-y-2">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className="border-b border-gray-200 h-6"></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Page 6: Match Record */}
            <div className="page-break min-h-screen p-8">
              <h1 className="text-3xl font-bold mb-6">Match Record & Debrief</h1>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Match Result</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-4 border rounded">
                        <div className="text-sm text-gray-600">Home</div>
                        <div className="text-3xl font-bold border-b-2 border-gray-300 min-h-12 flex items-center justify-center">
                          {/* Space for score */}
                        </div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-sm text-gray-600">Away</div>
                        <div className="text-3xl font-bold border-b-2 border-gray-300 min-h-12 flex items-center justify-center">
                          {/* Space for score */}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Goal Scorers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className="flex justify-between border-b border-gray-200 pb-2">
                            <div className="border-b border-gray-300 flex-1 mr-4 min-h-6"></div>
                            <div className="border-b border-gray-300 w-12 min-h-6"></div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Cards & Substitutions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className="border-b border-gray-200 h-6"></div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={matchRecord}
                      onChange={(e) => setMatchRecord(e.target.value)}
                      placeholder="Player ratings, key moments, areas for improvement, positives from the match..."
                      className="min-h-32 print:border-none"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
