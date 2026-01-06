import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Player, PlayerTransfer, AttributeHistory } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { playersService } from '@/services/playersService';
import { formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { getPlayerMatchHistory } from '@/utils/performanceUtils';

interface PlayerHistoryModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerHistoryModal: React.FC<PlayerHistoryModalProps> = ({
  player,
  isOpen,
  onClose
}) => {
  const { teams } = useAuth();
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  
  // Don't render the modal if there's no player
  if (!player) {
    return null;
  }
  
  // Get transfer history
  const { data: transfers = [], isLoading: isTransfersLoading } = useQuery({
    queryKey: ['player-transfers', player.id],
    queryFn: () => playersService.getTransferHistory(player.id),
    enabled: isOpen,
  });

  // Get corrected match history
  const { data: matchHistory = [], isLoading: isMatchHistoryLoading } = useQuery({
    queryKey: ['player-match-history', player.id],
    queryFn: () => getPlayerMatchHistory(player.id),
    enabled: isOpen,
  });

  // Get attribute history for a sample attribute
  const { data: attributeHistory = [], isLoading: isAttributeHistoryLoading } = useQuery({
    queryKey: ['player-attribute-history', player.id],
    queryFn: async () => {
      // For demonstration, just get history for first attribute
      const sample = player.attributes[0]?.name || 'Pace';
      return playersService.getAttributeHistory(player.id, sample);
    },
    enabled: isOpen && player.attributes.length > 0,
  });

  // Load team names for transfers
  useEffect(() => {
    const loadTeamNames = async () => {
      // First check if we already have the team names from context
      const teamIds = new Set([
        ...transfers.map(t => t.fromTeamId),
        ...transfers.map(t => t.toTeamId)
      ].filter(Boolean));
      
      // Filter out teams we already know about
      const unknownTeamIds = Array.from(teamIds).filter(id => 
        id && !teams.some(team => team.id === id));
      
      if (unknownTeamIds.length === 0) {
        // All team names are already known
        const nameMap: Record<string, string> = {};
        teams.forEach(team => {
          nameMap[team.id] = team.name;
        });
        setTeamNames(nameMap);
        return;
      }
      
      // Load unknown team names
      try {
        const { data } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', unknownTeamIds);
          
        if (data) {
          const nameMap: Record<string, string> = {};
          teams.forEach(team => {
            nameMap[team.id] = team.name;
          });
          
          data.forEach(team => {
            nameMap[team.id] = team.name;
          });
          
          setTeamNames(nameMap);
        }
      } catch (error) {
        console.error('Error loading team names:', error);
      }
    };
    
    if (isOpen && transfers.length > 0) {
      loadTeamNames();
    }
  }, [isOpen, transfers, teams]);

  const renderPositionsPlayed = (minutesByPosition: Record<string, number>) => {
    if (!minutesByPosition || Object.keys(minutesByPosition).length === 0) {
      return <span className="text-muted-foreground">No position data</span>;
    }

    const sortedPositions = Object.entries(minutesByPosition)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    return (
      <div className="flex flex-wrap gap-1">
        {sortedPositions.map(([position, minutes]) => (
          <Badge key={position} variant="outline" className="text-xs">
            {position}: {minutes}m
          </Badge>
        ))}
      </div>
    );
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Player History - {player.name}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="matches" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="matches">Match History</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
            <TabsTrigger value="attributes">Attributes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="matches" className="space-y-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Match History</CardTitle>
              </CardHeader>
              <CardContent>
                {isMatchHistoryLoading ? (
                  <div className="text-center py-4">Loading match history...</div>
                ) : matchHistory.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No match history available for this player.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Opponent</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Minutes</TableHead>
                        <TableHead>Positions</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matchHistory.map((match) => (
                        <TableRow key={match.uniqueKey || match.id}>
                          <TableCell>{formatDate(match.date, 'PP')}</TableCell>
                          <TableCell>{match.opponent || 'Training'}</TableCell>
                          <TableCell>
                            {match.performanceCategory && (
                              <Badge variant="outline">{match.performanceCategory}</Badge>
                            )}
                          </TableCell>
                          <TableCell>{match.totalMinutes}</TableCell>
                          <TableCell>
                            {renderPositionsPlayed(match.minutesByPosition)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {match.captain && (
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
                                    <span className="text-[6px] font-bold text-white">C</span>
                                  </div>
                                  <span className="text-xs">Captain</span>
                                </div>
                              )}
                              {match.playerOfTheMatch && (
                                <div className="flex items-center gap-1">
                                  <Trophy className="h-3 w-3 text-gold-500" />
                                  <span className="text-xs">POTM</span>
                                </div>
                              )}
                              {match.wasSubstitute && (
                                <Badge variant="secondary" className="text-xs">Sub</Badge>
                              )}
                              {match.teams?.length > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  Teams: {match.teams.join(', ')}
                                </Badge>
                              )}
                              {match.periods?.length > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  Periods: {match.periods.join(', ')}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="transfers" className="space-y-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transfer History</CardTitle>
              </CardHeader>
              <CardContent>
                {isTransfersLoading ? (
                  <div className="text-center py-4">Loading transfer history...</div>
                ) : transfers.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No transfer history available for this player.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead></TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => (
                        <TableRow key={transfer.id}>
                          <TableCell>{formatDate(transfer.transferDate, 'PP')}</TableCell>
                          <TableCell>
                            {transfer.fromTeamId ? teamNames[transfer.fromTeamId] || '-' : 'New Player'}
                          </TableCell>
                          <TableCell className="text-center">
                            <ArrowRight className="h-4 w-4" />
                          </TableCell>
                          <TableCell>
                            {transfer.toTeamId ? teamNames[transfer.toTeamId] || '-' : '-'}
                          </TableCell>
                          <TableCell>
                            <span className={
                              transfer.status === 'accepted' ? 'text-green-600' : 
                              transfer.status === 'pending' ? 'text-yellow-600' : 
                              'text-red-600'
                            }>
                              {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="attributes" className="space-y-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Attribute History</CardTitle>
              </CardHeader>
              <CardContent>
                {player.attributes.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No attributes have been set for this player.
                  </div>
                ) : isAttributeHistoryLoading ? (
                  <div className="text-center py-4">Loading attribute history...</div>
                ) : attributeHistory.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No attribute history available for this player.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      {/* This would be replaced with an actual chart component */}
                      Charts showing attribute history trends will appear here.
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Attribute</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Recorded By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attributeHistory.map((history) => (
                          <TableRow key={history.id}>
                            <TableCell>{formatDate(history.recordedDate, 'PP')}</TableCell>
                            <TableCell>{history.attributeName}</TableCell>
                            <TableCell>{history.value}</TableCell>
                            <TableCell>{history.recordedBy}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
      </DialogContent>
    </Dialog>
  );
};
