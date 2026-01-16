import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Download, Shirt, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PlayerKitSizesOverviewProps {
  teamId: string;
  teamName?: string;
}

interface PlayerKitData {
  id: string;
  name: string;
  squadNumber: number | null;
  kitSizes: Record<string, string>;
}

export const PlayerKitSizesOverview: React.FC<PlayerKitSizesOverviewProps> = ({ teamId, teamName }) => {
  const [players, setPlayers] = useState<PlayerKitData[]>([]);
  const [kitItems, setKitItems] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [teamId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load players with their kit sizes
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, squad_number, kit_sizes')
        .eq('team_id', teamId)
        .order('squad_number', { ascending: true, nullsFirst: false });

      if (playersError) throw playersError;

      // Load kit items to determine columns
      const { data: kitItemsData, error: kitError } = await supabase
        .from('team_kit_items')
        .select('name')
        .eq('team_id', teamId)
        .eq('kit_type', 'playing')
        .order('name');

      if (kitError) throw kitError;

      const itemNames = kitItemsData?.map((item: any) => item.name) || [];
      
      // Use default kit items if none configured
      const defaultItems = ['Shirt', 'Shorts', 'Socks'];
      const items = itemNames.length > 0 ? itemNames : defaultItems;

      const transformedPlayers: PlayerKitData[] = (playersData || []).map((player: any) => ({
        id: player.id,
        name: player.name,
        squadNumber: player.squad_number,
        kitSizes: player.kit_sizes || {}
      }));

      setPlayers(transformedPlayers);
      setKitItems(items);
    } catch (error) {
      console.error('Error loading kit sizes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['#', 'Player Name', ...kitItems];
    const rows = filteredPlayers.map(player => [
      player.squadNumber || '-',
      player.name,
      ...kitItems.map(item => player.kitSizes[item] || '-')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${teamName || 'team'}_kit_sizes.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shirt className="h-5 w-5" />
              Player Kit Sizes
            </CardTitle>
            <CardDescription>
              Overview of all player kit sizes for easy ordering
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        {filteredPlayers.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Player</TableHead>
                  {kitItems.map(item => (
                    <TableHead key={item} className="text-center">{item}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-mono text-muted-foreground">
                      {player.squadNumber || '-'}
                    </TableCell>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    {kitItems.map(item => {
                      const size = player.kitSizes[item] || null;
                      return (
                        <TableCell key={item} className="text-center">
                          {size ? (
                            <Badge variant="secondary">{size}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No players found</p>
          </div>
        )}

        {/* Summary */}
        {filteredPlayers.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredPlayers.length} of {players.length} players
          </div>
        )}
      </CardContent>
    </Card>
  );
};
