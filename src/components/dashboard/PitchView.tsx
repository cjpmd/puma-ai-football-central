
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Formation, GameFormat, Position } from "@/types";

interface PlayerPosition {
  id: string;
  name: string;
  number: number;
  position: Position;
}

interface PitchViewProps {
  gameFormat: GameFormat;
  availablePlayers: {
    id: string;
    name: string;
    number: number;
    availability: "amber" | "green" | "red";
  }[];
}

export function PitchView({ gameFormat, availablePlayers }: PitchViewProps) {
  const [formation, setFormation] = useState<Formation>("1-1-3-1");
  const [playerPositions, setPlayerPositions] = useState<PlayerPosition[]>([]);
  const [substitutes, setSubstitutes] = useState<string[]>([]);

  const formations: { [key in GameFormat]: Formation[] } = {
    "3-a-side": ["custom"],
    "4-a-side": ["custom"],
    "5-a-side": ["custom"],
    "7-a-side": ["1-1-3-1", "2-3-1", "3-2-1", "custom"],
    "9-a-side": ["3-2-3", "2-4-2", "3-3-2", "custom"],
    "11-a-side": ["custom"],
  };

  // Define positions shown for each formation
  const formationPositions: { [key in Formation]: Position[] } = {
    "1-1-3-1": ["GK", "DC", "DM", "AML", "AMC", "AMR", "STC"],
    "2-3-1": ["GK", "DL", "DR", "ML", "MC", "MR", "STC"],
    "3-2-1": ["GK", "DL", "DC", "DR", "MCL", "MCR", "STC"],
    "3-2-3": ["GK", "DL", "DC", "DR", "MCL", "MCR", "AMC", "STL", "STR"],
    "2-4-2": ["GK", "DCL", "DCR", "DM", "ML", "MR", "AMC", "STC"],
    "3-3-2": ["GK", "DL", "DC", "DR", "ML", "MC", "MR", "STL", "STR"],
    "custom": ["GK", "DL", "DCL", "DC", "DCR", "DR", "WBL", "DCML", "DCM", "DCMR", "WBR", "ML", "MCL", "MC", "MCR", "MR", "AML", "AMCL", "AMC", "AMCR", "AMR", "STCL", "STC", "STCR"],
  };

  // Position coordinates on the pitch
  const positionCoordinates: { [key in Position]: { x: number; y: number } } = {
    "GK": { x: 50, y: 90 },
    "SK": { x: 50, y: 85 },
    "DL": { x: 20, y: 75 },
    "DCL": { x: 35, y: 75 },
    "DC": { x: 50, y: 75 },
    "DCR": { x: 65, y: 75 },
    "DR": { x: 80, y: 75 },
    "WBL": { x: 15, y: 65 },
    "DCML": { x: 35, y: 65 },
    "DCM": { x: 50, y: 65 },
    "DCMR": { x: 65, y: 65 },
    "WBR": { x: 85, y: 65 },
    "ML": { x: 20, y: 55 },
    "MCL": { x: 35, y: 55 },
    "MC": { x: 50, y: 55 },
    "MCR": { x: 65, y: 55 },
    "MR": { x: 80, y: 55 },
    "AML": { x: 20, y: 35 },
    "AMCL": { x: 35, y: 35 },
    "AMC": { x: 50, y: 35 },
    "AMCR": { x: 65, y: 35 },
    "AMR": { x: 80, y: 35 },
    "STCL": { x: 35, y: 15 },
    "STC": { x: 50, y: 15 },
    "STCR": { x: 65, y: 15 },
    "STL": { x: 35, y: 15 },
    "STR": { x: 65, y: 15 },
    "DM": { x: 50, y: 65 },
  };

  const handleFormationChange = (value: string) => {
    setFormation(value as Formation);
    // Reset player positions when formation changes
    setPlayerPositions([]);
  };

  const handlePlayerSelect = (playerId: string, position: Position) => {
    const player = availablePlayers.find(p => p.id === playerId);
    if (!player) return;
    
    // Check if player is already assigned
    const existingPosition = playerPositions.find(p => p.id === playerId);
    if (existingPosition) {
      // Update position
      setPlayerPositions(playerPositions.map(p => 
        p.id === playerId ? { ...p, position } : p
      ));
    } else {
      // Add new position
      setPlayerPositions([
        ...playerPositions,
        {
          id: playerId,
          name: player.name,
          number: player.number,
          position,
        }
      ]);
    }

    // Remove from substitutes if present
    if (substitutes.includes(playerId)) {
      setSubstitutes(substitutes.filter(id => id !== playerId));
    }
  };

  const handleAddSubstitute = (playerId: string) => {
    if (!substitutes.includes(playerId)) {
      setSubstitutes([...substitutes, playerId]);
    }
    
    // Remove from positions if present
    setPlayerPositions(playerPositions.filter(p => p.id !== playerId));
  };

  const handleRemovePlayer = (playerId: string) => {
    setPlayerPositions(playerPositions.filter(p => p.id !== playerId));
    setSubstitutes(substitutes.filter(id => id !== playerId));
  };

  const getAvailablePlayersForPosition = (position: Position) => {
    // Filter out players already assigned to other positions
    const assignedPlayerIds = playerPositions
      .filter(p => p.position !== position)
      .map(p => p.id);
      
    return availablePlayers.filter(p => !assignedPlayerIds.includes(p.id));
  };

  const getPlayerAtPosition = (position: Position) => {
    return playerPositions.find(p => p.position === position);
  };

  const getPositionLabel = (position: Position): string => {
    switch (position) {
      case "GK": return "Goalkeeper";
      case "SK": return "Sweeper Keeper";
      case "DL": return "Left Back";
      case "DCL": return "Left Center Back";
      case "DC": return "Center Back";
      case "DCR": return "Right Center Back";
      case "DR": return "Right Back";
      case "WBL": return "Left Wing Back";
      case "DCML": return "Left Defensive Mid";
      case "DCM": return "Defensive Mid";
      case "DCMR": return "Right Defensive Mid";
      case "WBR": return "Right Wing Back";
      case "ML": return "Left Mid";
      case "MCL": return "Left Center Mid";
      case "MC": return "Center Mid";
      case "MCR": return "Right Center Mid";
      case "MR": return "Right Mid";
      case "AML": return "Left Attacking Mid";
      case "AMCL": return "Left Center Attacking Mid";
      case "AMC": return "Center Attacking Mid";
      case "AMCR": return "Right Center Attacking Mid";
      case "AMR": return "Right Attacking Mid";
      case "STCL": return "Left Striker";
      case "STC": return "Striker";
      case "STCR": return "Right Striker";
      case "STL": return "Left Striker";
      case "STR": return "Right Striker";
      case "DM": return "Defensive Mid";
      default: return position;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Team Selection</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={formation} onValueChange={handleFormationChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select formation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Formation</SelectLabel>
                    {formations[gameFormat].map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                Save Formation
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="pitch relative h-[500px] rounded-lg overflow-hidden border">
                <div className="absolute inset-0 bg-green-600 p-1">
                  {/* White markings */}
                  <div className="absolute inset-x-0 top-0 bottom-1/2 border-b-2 border-white/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-2 border-white/50"></div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-16 border-t-2 border-white/50"></div>
                  <div className="absolute inset-x-0 top-0 h-16 border-b-2 border-white/50"></div>
                  
                  {/* Player positions */}
                  {formationPositions[formation].map((pos) => {
                    const coords = positionCoordinates[pos];
                    const player = getPlayerAtPosition(pos);
                    
                    return (
                      <div 
                        key={pos}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{ 
                          left: `${coords.x}%`, 
                          top: `${coords.y}%`,
                          zIndex: player ? 10 : 5,
                        }}
                      >
                        {player ? (
                          <div className="flex flex-col items-center">
                            <Avatar className="h-12 w-12 border-2 border-white bg-puma-blue-500 hover:bg-puma-blue-600 cursor-pointer">
                              <AvatarFallback className="text-white font-bold">
                                {player.number}
                              </AvatarFallback>
                            </Avatar>
                            <div className="mt-1 px-2 py-0.5 bg-white/80 rounded text-xs font-medium">
                              {player.name}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <Select onValueChange={(value) => handlePlayerSelect(value, pos)}>
                              <SelectTrigger className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 border-dashed border-white text-white">
                                <SelectValue placeholder={pos} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>{getPositionLabel(pos)}</SelectLabel>
                                  {getAvailablePlayersForPosition(pos).map((player) => (
                                    <SelectItem key={player.id} value={player.id}>
                                      {player.number} - {player.name}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                            <div className="mt-1 px-2 py-0.5 bg-white/40 rounded text-xs font-medium">
                              {pos}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Available Players</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {availablePlayers
                      .filter(p => !playerPositions.some(pos => pos.id === p.id) && !substitutes.includes(p.id))
                      .map(player => (
                        <Avatar 
                          key={player.id} 
                          className={`h-12 w-12 cursor-pointer transition-all hover:ring-2 hover:ring-puma-blue-300 ${
                            player.availability === "green" 
                              ? "player-availability-green" 
                              : player.availability === "amber" 
                              ? "player-availability-amber" 
                              : "player-availability-red"
                          }`}
                          onClick={() => handleAddSubstitute(player.id)}
                        >
                          <AvatarFallback className="bg-puma-blue-100 text-puma-blue-600 font-bold">
                            {player.number}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Substitutes</h3>
                  <div className="space-y-2">
                    {substitutes.map(subId => {
                      const player = availablePlayers.find(p => p.id === subId);
                      if (!player) return null;
                      
                      return (
                        <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarFallback className="bg-puma-blue-100 text-puma-blue-600 text-xs font-bold">
                                {player.number}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{player.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0"
                              onClick={() => handleRemovePlayer(player.id)}
                            >
                              ✕
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {substitutes.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        No substitutes selected
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Selected Players</h3>
                  <div className="space-y-2">
                    {playerPositions.map(player => (
                      <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarFallback className="bg-puma-blue-100 text-puma-blue-600 text-xs font-bold">
                              {player.number}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-sm font-medium">{player.name}</span>
                            <div className="text-xs text-muted-foreground">{getPositionLabel(player.position)}</div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => handleRemovePlayer(player.id)}
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                    
                    {playerPositions.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        No players selected
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
