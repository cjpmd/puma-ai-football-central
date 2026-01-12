
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Player {
  id: string;
  name: string;
  team_id: string;
}

interface KitIssue {
  id: string;
  kit_item_name: string;
  kit_size?: string;
  quantity: number;
  date_issued: string;
  issued_by: string;
}

interface PlayerKitTrackingProps {
  player: Player;
}

export const PlayerKitTracking: React.FC<PlayerKitTrackingProps> = ({ player }) => {
  const [kitIssues, setKitIssues] = useState<KitIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (player?.id) {
      loadPlayerKitIssues();
    }
  }, [player?.id]);

  const loadPlayerKitIssues = async () => {
    try {
      setLoading(true);

      if (!player.team_id) {
        console.error('No team_id provided for player kit tracking');
        setKitIssues([]);
        setLoading(false);
        return;
      }

      const { data: kitIssuesData, error } = await supabase
        .from('team_kit_issues')
        .select('*')
        .eq('team_id', player.team_id)
        .order('date_issued', { ascending: false });

      if (error) throw error;

      // Filter kit issues that include this player
      const playerKitIssues: KitIssue[] = (kitIssuesData || [])
        .filter(issue => {
          const playerIds = Array.isArray(issue.player_ids) ? issue.player_ids as string[] : [];
          return playerIds.includes(player.id);
        })
        .map(issue => ({
          id: issue.id,
          kit_item_name: issue.kit_item_name,
          kit_size: issue.kit_size,
          quantity: issue.quantity,
          date_issued: issue.date_issued,
          issued_by: issue.issued_by || '',
        }));

      setKitIssues(playerKitIssues);
    } catch (error: any) {
      console.error('Error loading player kit issues:', error);
      setKitIssues([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Kit Issued
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading kit history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Kit Issued
        </CardTitle>
        <CardDescription>
          Track of kit items issued to this player
        </CardDescription>
      </CardHeader>
      <CardContent>
        {kitIssues.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No kit has been issued to this player yet.
          </div>
        ) : (
          <div className="space-y-3">
            {kitIssues.map((issue) => (
              <div key={issue.id} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{issue.kit_item_name}</h4>
                    {issue.kit_size && (
                      <Badge variant="outline" className="text-xs">
                        Size: {issue.kit_size}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      Qty: {issue.quantity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Issued: {new Date(issue.date_issued).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
