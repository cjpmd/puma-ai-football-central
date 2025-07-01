import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Player } from '@/types';
import { Badge } from '@/components/ui/badge';

interface PlayerCardProps {
  player: Player;
  onEdit?: (player: Player) => void;
  onDelete?: (player: Player) => void;
  onViewDetails?: (player: Player) => void;
  showActions?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ 
  player, 
  onEdit, 
  onDelete, 
  onViewDetails,
  showActions = true 
}) => {
  const age = new Date().getFullYear() - new Date(player.date_of_birth).getFullYear();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={player.photo_url || ''} alt={player.name} />
              <AvatarFallback>{player.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{player.name}</CardTitle>
              <div className="flex items-center text-sm text-muted-foreground space-x-2">
                <span>Age: {age}</span>
                <span>•</span>
                <span>#{player.squad_number || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails?.(player)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(player)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete?.(player)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Games</p>
            <p className="font-semibold">{player.match_stats?.totalGames || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Minutes</p>
            <p className="font-semibold">{player.match_stats?.totalMinutes || 0}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant={player.availability === 'green' ? 'default' : 'secondary'}>
            {player.availability || 'Available'}
          </Badge>
          <Badge variant="outline">
            {player.type}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
