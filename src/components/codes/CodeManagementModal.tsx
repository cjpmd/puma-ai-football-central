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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Code Management</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="team" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="team">Team Code</TabsTrigger>
              <TabsTrigger value="players">Player Codes</TabsTrigger>
              <TabsTrigger value="usage">Usage History</TabsTrigger>
            </TabsList>

            <TabsContent value="team" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team Join Code
                  </CardTitle>
                  <CardDescription>
                    Share this code with players, parents, and staff to join your team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-3 py-2 rounded font-mono text-lg flex-1">
                      {teamCode}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(teamCode, 'Team')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={regenerateTeamCode}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Expires: {formatDate(teamCodeExpiry)}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="players" className="space-y-4">
              <div className="grid gap-4">
                {players.map((player) => (
                  <Card key={player.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        {player.photo_url ? (
                          <img 
                            src={player.photo_url} 
                            alt={player.name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                            {player.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-lg">{player.name}</CardTitle>
                          <CardDescription>#{player.squad_number}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            <User className="w-3 h-3 mr-1" />
                            Player Code
                          </Badge>
                          <code className="bg-muted px-2 py-1 rounded text-sm flex-1">
                            {player.linking_code}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(player.linking_code, 'Player')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => regeneratePlayerCode(player.id, 'player')}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            <Users className="w-3 h-3 mr-1" />
                            Parent Code
                          </Badge>
                          <code className="bg-muted px-2 py-1 rounded text-sm flex-1">
                            {player.parent_linking_code}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(player.parent_linking_code, 'Parent')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => regeneratePlayerCode(player.id, 'parent')}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="usage" className="space-y-4">
              <div className="space-y-3">
                {codeUsage.map((usage) => (
                  <Card key={usage.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Code: {usage.code_used}</p>
                          <p className="text-sm text-muted-foreground">
                            Joined as {usage.role_joined} on {formatDate(usage.joined_at)}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {usage.role_joined}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {codeUsage.length === 0 && (
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-center text-muted-foreground">
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