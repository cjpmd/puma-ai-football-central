import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { teamCodeService } from "@/services/teamCodeService";
import { playerCodeService } from "@/services/playerCodeService";
import { Copy, RefreshCw, Users, User, Clock, Loader2 } from "lucide-react";

interface CodeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
}

export function CodeManagementModal({ isOpen, onClose, teamId }: CodeManagementModalProps) {
  const [teamCode, setTeamCode] = useState<string>("");
  const [teamCodeExpiry, setTeamCodeExpiry] = useState<string>("");
  const [players, setPlayers] = useState<any[]>([]);
  const [codeUsage, setCodeUsage] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadCodeData();
    }
  }, [isOpen, teamId]);

  const loadCodeData = async () => {
    setIsLoading(true);
    try {
      // Load team code
      const teams = await teamCodeService.getTeamsWithCodes();
      const currentTeam = teams.find(t => t.id === teamId);
      if (currentTeam) {
        setTeamCode(currentTeam.team_join_code);
        setTeamCodeExpiry(currentTeam.team_join_code_expires_at);
      }

      // Load players with codes
      const playersWithCodes = await playerCodeService.getPlayersWithCodesForTeam(teamId);
      setPlayers(playersWithCodes);

      // Load code usage
      const usage = await teamCodeService.getCodeUsageForTeam(teamId);
      setCodeUsage(usage);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load code data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${type} code copied to clipboard`,
    });
  };

  const regenerateTeamCode = async () => {
    try {
      const newCode = await teamCodeService.regenerateTeamJoinCode(teamId);
      setTeamCode(newCode);
      setTeamCodeExpiry(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString());
      toast({
        title: "Success",
        description: "Team join code regenerated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate team code",
        variant: "destructive"
      });
    }
  };

  const regeneratePlayerCode = async (playerId: string, type: 'player' | 'parent') => {
    try {
      let newCode;
      if (type === 'player') {
        newCode = await playerCodeService.regeneratePlayerLinkingCode(playerId);
      } else {
        newCode = await playerCodeService.regenerateParentLinkingCode(playerId);
      }
      
      // Update local state
      setPlayers(prev => prev.map(p => 
        p.id === playerId 
          ? { ...p, [type === 'player' ? 'linking_code' : 'parent_linking_code']: newCode }
          : p
      ));
      
      toast({
        title: "Success",
        description: `${type} code regenerated successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to regenerate ${type} code`,
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg">Code Management</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="team" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="team" className="text-xs sm:text-sm py-2 px-1">Team Code</TabsTrigger>
              <TabsTrigger value="players" className="text-xs sm:text-sm py-2 px-1">Player Codes</TabsTrigger>
              <TabsTrigger value="usage" className="text-xs sm:text-sm py-2 px-1">Usage</TabsTrigger>
            </TabsList>

            <TabsContent value="team" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                    Team Join Code
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Share this code with players, parents, and staff to join your team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <code className="bg-muted px-3 py-2 rounded font-mono text-base sm:text-lg flex-1 text-center sm:text-left">
                      {teamCode}
                    </code>
                    <div className="flex gap-2 justify-center sm:justify-start">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(teamCode, 'Team')}
                        className="flex-1 sm:flex-none"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        <span className="sm:hidden">Copy</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={regenerateTeamCode}
                        className="flex-1 sm:flex-none"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        <span className="sm:hidden">New</span>
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground justify-center sm:justify-start">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    Expires: {formatDate(teamCodeExpiry)}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="players" className="space-y-4 mt-4">
              <div className="grid gap-4">
                {players.map((player) => (
                  <Card key={player.id}>
                    <CardHeader className="pb-3 px-3 sm:px-6">
                      <div className="flex items-center gap-3">
                        {player.photo_url ? (
                          <img 
                            src={player.photo_url} 
                            alt={player.name}
                            className="w-10 h-10 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {player.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <CardTitle className="text-base sm:text-lg truncate">{player.name}</CardTitle>
                          <CardDescription className="text-xs">#{player.squad_number}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 px-3 sm:px-6">
                      {/* Player Code */}
                      <div className="space-y-2">
                        <div className="flex flex-col gap-2">
                          <Badge variant="secondary" className="self-start text-xs">
                            <User className="w-3 h-3 mr-1" />
                            Player Code
                          </Badge>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-xs sm:text-sm flex-1 truncate">
                              {player.linking_code}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(player.linking_code, 'Player')}
                              className="flex-shrink-0 h-8 w-8 p-0"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => regeneratePlayerCode(player.id, 'player')}
                              className="flex-shrink-0 h-8 w-8 p-0"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Parent Code */}
                        <div className="flex flex-col gap-2">
                          <Badge variant="secondary" className="self-start text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            Parent Code
                          </Badge>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-xs sm:text-sm flex-1 truncate">
                              {player.parent_linking_code}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(player.parent_linking_code, 'Parent')}
                              className="flex-shrink-0 h-8 w-8 p-0"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => regeneratePlayerCode(player.id, 'parent')}
                              className="flex-shrink-0 h-8 w-8 p-0"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {players.length === 0 && (
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-center text-muted-foreground text-sm">
                        No players found
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="usage" className="space-y-4 mt-4">
              <div className="space-y-3">
                {codeUsage.map((usage) => (
                  <Card key={usage.id}>
                    <CardContent className="pt-4 px-3 sm:px-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">Code: {usage.code_used}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Joined as {usage.role_joined} on {formatDate(usage.joined_at)}
                          </p>
                        </div>
                        <Badge variant="outline" className="self-start sm:self-center text-xs">
                          {usage.role_joined}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {codeUsage.length === 0 && (
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-center text-muted-foreground text-sm">
                        No code usage history yet
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
