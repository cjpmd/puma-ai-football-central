import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Bug } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSmartView } from '@/contexts/SmartViewContext';
import { useAuthorization } from '@/contexts/AuthorizationContext';

export function RoleDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { profile, teams, clubs, connectedPlayers } = useAuth();
  const { currentView, availableViews, primaryRole, isMultiRoleUser } = useSmartView();
  const { isGlobalAdmin, isClubAdmin, isTeamManager } = useAuthorization();

  if (!profile) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Bug className="h-4 w-4" />
            Debug Roles
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <Card className="w-80 max-h-96 overflow-y-auto">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Role Debug Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <h4 className="font-medium mb-2">Profile Info</h4>
                <div className="space-y-1">
                  <p><span className="text-muted-foreground">Email:</span> {profile.email}</p>
                  <p><span className="text-muted-foreground">ID:</span> {profile.id}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile.roles?.map((role) => (
                      <Badge key={role} variant="secondary" className="text-xs">{role}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Smart View Status</h4>
                <div className="space-y-1">
                  <p><span className="text-muted-foreground">Current View:</span> <Badge variant="default">{currentView}</Badge></p>
                  <p><span className="text-muted-foreground">Primary Role:</span> <Badge variant="outline">{primaryRole}</Badge></p>
                  <p><span className="text-muted-foreground">Multi-Role User:</span> {isMultiRoleUser ? '✅' : '❌'}</p>
                  <div>
                    <span className="text-muted-foreground">Available Views:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {availableViews.map((view) => (
                        <Badge key={view} variant="secondary" className="text-xs">{view}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Authorization Status</h4>
                <div className="space-y-1">
                  <p><span className="text-muted-foreground">Global Admin:</span> {isGlobalAdmin ? '✅' : '❌'}</p>
                  <p><span className="text-muted-foreground">Club Admin:</span> {isClubAdmin() ? '✅' : '❌'}</p>
                  <p><span className="text-muted-foreground">Team Manager:</span> {isTeamManager() ? '✅' : '❌'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Data Counts</h4>
                <div className="space-y-1">
                  <p><span className="text-muted-foreground">Teams:</span> {teams?.length || 0}</p>
                  <p><span className="text-muted-foreground">Clubs:</span> {clubs?.length || 0}</p>
                  <p><span className="text-muted-foreground">Connected Players:</span> {connectedPlayers?.length || 0}</p>
                </div>
              </div>

              {teams && teams.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Teams</h4>
                  <div className="space-y-2">
                    {teams.slice(0, 3).map((team) => (
                      <div key={team.id} className="p-2 bg-muted rounded text-xs">
                        <p className="font-medium">{team.name}</p>
                        <p className="text-muted-foreground">Role: {(team as any).userRole}</p>
                        {(team as any).userRoles && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(team as any).userRoles.map((role: string) => (
                              <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {teams.length > 3 && (
                      <p className="text-muted-foreground">... and {teams.length - 3} more</p>
                    )}
                  </div>
                </div>
              )}

              {clubs && clubs.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Clubs</h4>
                  <div className="space-y-1">
                    {clubs.slice(0, 2).map((club) => (
                      <div key={club.id} className="p-2 bg-muted rounded text-xs">
                        <p className="font-medium">{club.name}</p>
                      </div>
                    ))}
                    {clubs.length > 2 && (
                      <p className="text-muted-foreground">... and {clubs.length - 2} more</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}