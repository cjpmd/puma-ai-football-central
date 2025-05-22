
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Player } from "@/types";

interface PlayerListProps {
  players: Partial<Player>[];
}

export function PlayerList({ players }: PlayerListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Squad Players</CardTitle>
        <Button size="sm">Add Player</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {players.map((player) => (
            <div 
              key={player.id} 
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                player.availability === "green" 
                  ? "bg-green-50" 
                  : player.availability === "amber" 
                  ? "bg-amber-50" 
                  : player.availability === "red" 
                  ? "bg-red-50" 
                  : "bg-gray-50"
              }`}
            >
              <div className="flex items-center space-x-4">
                <Avatar className={`h-10 w-10 border-2 ${
                  player.availability === "green" 
                    ? "border-puma-green-500" 
                    : player.availability === "amber" 
                    ? "border-puma-amber" 
                    : player.availability === "red" 
                    ? "border-puma-red" 
                    : "border-gray-200"
                }`}>
                  <AvatarFallback className="text-sm bg-puma-blue-100 text-puma-blue-500">
                    {player.squadNumber || ""}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{player.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {player.type === "goalkeeper" ? "Goalkeeper" : "Outfield"}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {player.subscriptionStatus && (
                  <Badge variant="outline" className={
                    player.subscriptionStatus === "active" 
                      ? "bg-green-100 text-green-800 border-green-200" 
                      : player.subscriptionStatus === "pending" 
                      ? "bg-amber-100 text-amber-800 border-amber-200" 
                      : "bg-red-100 text-red-800 border-red-200"
                  }>
                    {player.subscriptionStatus.charAt(0).toUpperCase() + player.subscriptionStatus.slice(1)}
                  </Badge>
                )}
                <Button variant="ghost" size="sm">View</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
