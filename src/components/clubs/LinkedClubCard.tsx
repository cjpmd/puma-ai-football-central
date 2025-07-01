import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Link2Off } from "lucide-react";
import { Club } from "@/types";
import { Badge } from "@/components/ui/badge";

interface LinkedClubCardProps {
  club: Club;
  onUnlink: (clubId: string) => void;
  isReadOnly?: boolean;
}

export const LinkedClubCard = ({ club, onUnlink, isReadOnly = false }: LinkedClubCardProps) => {
  const handleUnlink = () => {
    if (confirm(`Are you sure you want to unlink from ${club.name}?`)) {
      onUnlink(club.id);
    }
  };

  return (
    <Card className="p-4 border-l-4 border-l-blue-500">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
            {club.logo_url ? (
              <img 
                src={club.logo_url} 
                alt={`${club.name} logo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-6 h-6 text-gray-400" />
            )}
          </div>
          
          <div>
            <h3 className="font-semibold text-lg">{club.name}</h3>
            {club.reference_number && (
              <p className="text-sm text-gray-600">
                Ref: {club.reference_number}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {(club as any).userRole || 'Member'}
              </Badge>
              {club.subscription_type && (
                <Badge variant="secondary" className="text-xs">
                  {club.subscription_type.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div>
          {!isReadOnly && (
            <Button variant="destructive" size="sm" onClick={handleUnlink}>
              <Link2Off className="h-4 w-4 mr-2" />
              Unlink
            </Button>
          )}
        </div>
      </div>

      <CardContent className="mt-4">
        <p className="text-sm text-gray-700">
          Manage your club settings, team assignments, and subscription details.
        </p>
      </CardContent>
    </Card>
  );
};
