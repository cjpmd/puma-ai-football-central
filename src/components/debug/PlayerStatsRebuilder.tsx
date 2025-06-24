
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { playerStatsRebuilder } from '@/services/stats/playerStatsRebuilder';
import { toast } from 'sonner';

export const PlayerStatsRebuilder: React.FC = () => {
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildStatus, setRebuildStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSafeRebuild = async () => {
    setIsRebuilding(true);
    setRebuildStatus('idle');
    
    try {
      console.log('🚀 Starting SAFE database function rebuild...');
      toast.info('Starting safe rebuild using database functions...');
      
      // Use ONLY the safe database function approach
      await playerStatsRebuilder.rebuildAllPlayerStats();
      
      console.log('✅ Safe rebuild completed successfully');
      setRebuildStatus('success');
      toast.success('Successfully rebuilt all player statistics!');
      
      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error in safe rebuild:', error);
      setRebuildStatus('error');
      toast.error('Failed to rebuild player statistics. Check console for details.');
    } finally {
      setIsRebuilding(false);
    }
  };

  const handleDebugMason = async () => {
    try {
      toast.info('Debugging Mason\'s data...');
      
      // Check event_selections first
      console.log('🔍 DEBUGGING MASON\'S EVENT SELECTIONS:');
      const { data: selections, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          id,
          player_positions,
          duration_minutes,
          events (title, opponent, date)
        `)
        .order('events(date)', { ascending: false })
        .limit(5);

      if (selectionsError) {
        console.error('Error fetching event selections:', selectionsError);
        throw selectionsError;
      }

      console.log('Mason\'s Event Selections:');
      selections?.forEach(selection => {
        const event = selection.events;
        const playerPositions = selection.player_positions as any[];
        const masonData = playerPositions?.find(p => 
          p.playerId === 'bb4de0de-c98c-485b-85b6-b70dd67736e4' || 
          p.player_id === 'bb4de0de-c98c-485b-85b6-b70dd67736e4'
        );
        
        if (masonData) {
          console.log(`  ${event?.title} vs ${event?.opponent}: Position="${masonData.position}", Minutes=${masonData.minutes || selection.duration_minutes}`);
        }
      });

      // Check event_player_stats
      console.log('🔍 DEBUGGING MASON\'S EVENT PLAYER STATS:');
      const { data: stats, error: statsError } = await supabase
        .from('event_player_stats')
        .select(`
          position,
          minutes_played,
          events (title, opponent, date)
        `)
        .eq('player_id', 'bb4de0de-c98c-485b-85b6-b70dd67736e4')
        .order('events(date)', { ascending: false })
        .limit(5);

      if (statsError) {
        console.error('Error fetching event player stats:', statsError);
        throw statsError;
      }

      console.log('Mason\'s Event Player Stats:');
      stats?.forEach(stat => {
        const event = stat.events;
        console.log(`  ${event?.title} vs ${event?.opponent}: Position="${stat.position}", Minutes=${stat.minutes_played}`);
      });

      toast.success('Debug complete - check console for details');
    } catch (error) {
      console.error('Error debugging Mason:', error);
      toast.error('Debug failed');
    }
  };

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <RefreshCw className="h-5 w-5" />
          Safe Player Statistics Rebuilder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-green-700">
          <p className="font-medium mb-2">Safe Database Function Rebuild</p>
          <p>Uses ONLY database functions to safely regenerate all player statistics.</p>
          <p className="mt-2 font-medium">Process:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Uses database function to safely clear and regenerate data</li>
            <li>Enhanced position extraction and validation</li>
            <li>Comprehensive logging for Mason's data verification</li>
            <li>Updates all player match_stats using proven database functions</li>
          </ul>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleSafeRebuild}
            disabled={isRebuilding}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            variant="default"
          >
            <RefreshCw className={`h-4 w-4 ${isRebuilding ? 'animate-spin' : ''}`} />
            {isRebuilding ? 'Rebuilding...' : 'Safe Database Rebuild'}
          </Button>

          <Button
            onClick={handleDebugMason}
            variant="outline"
            className="flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            Debug Mason's Data
          </Button>
        </div>

        {rebuildStatus === 'success' && (
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Safe rebuild completed successfully! Page will refresh shortly.</span>
          </div>
        )}

        {rebuildStatus === 'error' && (
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Rebuild failed. Check the console for error details.</span>
          </div>
        )}

        <Badge variant="outline" className="text-xs bg-green-100">
          Safe approach using only database functions
        </Badge>
      </CardContent>
    </Card>
  );
};
