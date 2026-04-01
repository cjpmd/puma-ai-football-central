
import { logger } from '@/lib/logger';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle, Search } from 'lucide-react';
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
      logger.log('🚀 Starting SAFE database function rebuild...');
      toast.info('Starting safe rebuild using database functions...');
      
      // Use ONLY the safe database function approach
      await playerStatsRebuilder.rebuildAllPlayerStats();
      
      logger.log('✅ Safe rebuild completed successfully');
      setRebuildStatus('success');
      toast.success('Successfully rebuilt all player statistics!');
      
      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      logger.error('Error in safe rebuild:', error);
      setRebuildStatus('error');
      toast.error('Failed to rebuild player statistics. Check console for details.');
    } finally {
      setIsRebuilding(false);
    }
  };

  const handleDebugMasonFerryPositions = async () => {
    try {
      toast.info('Debugging Mason vs Ferry positions...');
      
      logger.log('🔍 DEBUGGING MASON VS FERRY ATHLETIC POSITIONS:');
      
      // Check event_selections for Ferry Athletic matches
      const { data: selections, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          id,
          player_positions,
          duration_minutes,
          team_number,
          period_number,
          events (id, title, opponent, date)
        `)
        .or('events.opponent.ilike.%ferry%,events.title.ilike.%ferry%')
        .order('events(date)', { ascending: false });

      if (selectionsError) {
        logger.error('Error fetching Ferry selections:', selectionsError);
        throw selectionsError;
      }

      logger.log(`Found ${selections?.length || 0} Ferry Athletic event selections`);
      
      selections?.forEach(selection => {
        const event = selection.events;
        logger.log(`\n=== EVENT: ${event?.title} vs ${event?.opponent} (${event?.date}) ===`);
        logger.log(`Selection ID: ${selection.id}`);
        logger.log(`Team Number: ${selection.team_number}, Period: ${selection.period_number}`);
        
        const playerPositions = selection.player_positions as any[];
        logger.log(`Total players in selection: ${playerPositions?.length || 0}`);
        
        // Find Mason in this selection
        const masonData = playerPositions?.find(p => 
          p.playerId === 'bb4de0de-c98c-485b-85b6-b70dd67736e4' || 
          p.player_id === 'bb4de0de-c98c-485b-85b6-b70dd67736e4'
        );
        
        if (masonData) {
          logger.log('🎯 MASON FOUND IN SELECTION:');
          logger.log(`  - Position: "${masonData.position}"`);
          logger.log(`  - Minutes: ${masonData.minutes || selection.duration_minutes}`);
          logger.log(`  - Is Substitute: ${masonData.isSubstitute || false}`);
          logger.log(`  - Raw Data:`, JSON.stringify(masonData, null, 2));
        } else {
          logger.log('❌ Mason NOT found in this selection');
        }
        
        // Show all positions in this selection for context
        logger.log('\nAll positions in this selection:');
        playerPositions?.forEach((player, index) => {
          logger.log(`  ${index + 1}. Player ID: ${player.playerId || player.player_id}, Position: "${player.position}", Minutes: ${player.minutes || selection.duration_minutes}`);
        });
      });

      // Also check what's currently in event_player_stats for Ferry matches
      logger.log('\n🔍 CHECKING EVENT_PLAYER_STATS FOR FERRY MATCHES:');
      const { data: stats, error: statsError } = await supabase
        .from('event_player_stats')
        .select(`
          position,
          minutes_played,
          is_substitute,
          team_number,
          period_number,
          events (title, opponent, date)
        `)
        .eq('player_id', 'bb4de0de-c98c-485b-85b6-b70dd67736e4')
        .or('events.opponent.ilike.%ferry%,events.title.ilike.%ferry%')
        .order('events(date)', { ascending: false });

      if (statsError) {
        logger.error('Error fetching Ferry stats:', statsError);
      } else {
        logger.log(`Found ${stats?.length || 0} Ferry stats records for Mason:`);
        stats?.forEach((stat, index) => {
          const event = stat.events;
          logger.log(`  ${index + 1}. ${event?.title} vs ${event?.opponent}: Position="${stat.position}", Minutes=${stat.minutes_played}, Sub=${stat.is_substitute}, Team=${stat.team_number}, Period=${stat.period_number}`);
        });
      }

      toast.success('Ferry position debug complete - check console for details');
    } catch (error) {
      logger.error('Error debugging Ferry positions:', error);
      toast.error('Ferry debug failed');
    }
  };

  const handleDebugMason = async () => {
    try {
      toast.info('Debugging Mason\'s data...');
      
      // Check event_selections first
      logger.log('🔍 DEBUGGING MASON\'S EVENT SELECTIONS:');
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
        logger.error('Error fetching event selections:', selectionsError);
        throw selectionsError;
      }

      logger.log('Mason\'s Event Selections:');
      selections?.forEach(selection => {
        const event = selection.events;
        const playerPositions = selection.player_positions as any[];
        const masonData = playerPositions?.find(p => 
          p.playerId === 'bb4de0de-c98c-485b-85b6-b70dd67736e4' || 
          p.player_id === 'bb4de0de-c98c-485b-85b6-b70dd67736e4'
        );
        
        if (masonData) {
          logger.log(`  ${event?.title} vs ${event?.opponent}: Position="${masonData.position}", Minutes=${masonData.minutes || selection.duration_minutes}`);
        }
      });

      // Check event_player_stats
      logger.log('🔍 DEBUGGING MASON\'S EVENT PLAYER STATS:');
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
        logger.error('Error fetching event player stats:', statsError);
        throw statsError;
      }

      logger.log('Mason\'s Event Player Stats:');
      stats?.forEach(stat => {
        const event = stat.events;
        logger.log(`  ${event?.title} vs ${event?.opponent}: Position="${stat.position}", Minutes=${stat.minutes_played}`);
      });

      toast.success('Debug complete - check console for details');
    } catch (error) {
      logger.error('Error debugging Mason:', error);
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
          <p className="font-medium mb-2">Simple Position Tracking</p>
          <p>Positions and minutes should exactly match what was selected in Team Selection.</p>
          <p className="mt-2 font-medium">Process:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Uses database function to safely clear and regenerate data</li>
            <li>Copies exact positions from event_selections to event_player_stats</li>
            <li>No position mapping or transformation - direct 1:1 copy</li>
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
            onClick={handleDebugMasonFerryPositions}
            variant="outline"
            className="flex items-center gap-2 border-blue-300 text-blue-700"
          >
            <Search className="h-4 w-4" />
            Debug Ferry Positions
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
          Direct position copy - no transformations
        </Badge>
      </CardContent>
    </Card>
  );
};
