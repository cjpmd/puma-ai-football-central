import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, MoreVertical, Edit, Trash2, UserPlus } from "lucide-react";
import type { YearGroup } from "@/types/index";

interface YearGroupCardProps {
  yearGroup: YearGroup;
  teamCount?: number;
  playerCount?: number;
  onEdit: (yearGroup: YearGroup) => void;
  onDelete: (yearGroup: YearGroup) => void;
  onManageTeams: (yearGroup: YearGroup) => void;
  onSplitTeam?: (yearGroup: YearGroup) => void;
}

export const YearGroupCard = ({ 
  yearGroup, 
  teamCount = 0, 
  playerCount = 0, 
  onEdit, 
  onDelete, 
  onManageTeams,
  onSplitTeam 
}: YearGroupCardProps) => {
  const getFormatColor = (format?: string) => {
    switch (format) {
      case "5-a-side": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "7-a-side": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "9-a-side": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "11-a-side": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{yearGroup.name}</CardTitle>
            <CardDescription>
              {yearGroup.ageYear && `Born ${yearGroup.ageYear}`}
              {yearGroup.ageYear && yearGroup.description && " • "}
              {yearGroup.description}
            </CardDescription>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(yearGroup)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Year Group
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManageTeams(yearGroup)}>
                <Users className="h-4 w-4 mr-2" />
                Manage Teams
              </DropdownMenuItem>
              {onSplitTeam && teamCount > 0 && (
                <DropdownMenuItem onClick={() => onSplitTeam(yearGroup)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Split Team
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onDelete(yearGroup)} 
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Year Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {yearGroup.playingFormat && (
              <Badge variant="secondary" className={getFormatColor(yearGroup.playingFormat)}>
                {yearGroup.playingFormat}
              </Badge>
            )}
            {yearGroup.softPlayerLimit && (
              <Badge variant="outline">
                Target: {yearGroup.softPlayerLimit} players
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{teamCount} team{teamCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <span>{playerCount} player{playerCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3"
            onClick={() => onManageTeams(yearGroup)}
          >
            <Users className="h-4 w-4 mr-2" />
            Manage Teams
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};