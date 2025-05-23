
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
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PlayerHistoryModalProps {
  player: Player;
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
  
  // Get transfer history
  const { data: transfers = [], isLoading: isTransfersLoading } = useQuery({
    queryKey: ['player-transfers', player.id],
    queryFn: () => playersService.getTransferHistory(player.id),
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
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Player History - {player.name}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="transfers" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
            <TabsTrigger value="attributes">Attributes</TabsTrigger>
          </TabsList>
          
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
        
        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
