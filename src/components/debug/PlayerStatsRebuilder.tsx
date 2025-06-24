
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

  const handleRebuildAllStats = async () => {
    setIsRebuilding(true);
    setRebuildStatus('idle');
    
    try {
      console.log('🚀 Starting complete player stats rebuild...');
      toast.info('Starting complete rebuild of all player statistics...');
      
      // First try the database function approach
      console.log('Attempting database function regeneration...');
      try {
        const { error: regenerateError } = await supabase.rpc('regenerate_all_event_player_stats');
        
        if (regenerateError) {
          console.warn('Database function failed, falling back to TypeScript rebuild:', regenerateError);
          throw regenerateError;
        }
        
        console.log('✅ Database function regeneration successful');
        
      } catch (dbError) {
        console.warn('Database function approach failed, using TypeScript fallback:', dbError);
        
        // Fallback to TypeScript-based rebuild
        console.log('🔄 Using TypeScript-based rebuild as fallback...');
        await playerStatsRebuilder.rebuildAllPlayerStats();
        console.log('✅ TypeScript-based rebuild completed');
      }
      
      // Update all player match stats
      console.log('📊 Updating all player match statistics...');
      const { error: updateError } = await supabase.rpc('update_all_completed_events_stats');
      
      if (updateError) {
        console.error('Error updating match stats:', updateError);
        throw updateError;
      }
      
      console.log('✅ Successfully updated all player match statistics');
      
      // Verify Mason's data specifically
      console.log('🔍 VERIFYING MASON\'S DATA AFTER REBUILD:');
      const { data: masonStats, error: masonError } = await supabase
        .from('event_player_stats')
        .select(`
          position,
          minutes_played,
          events (title, opponent, date)
        `)
        .eq('player_id', 'bb4de0de-c98c-485b-85b6-b70dd67736e4')
        .order('events(date)', { ascending: false })
        .limit(10);

      if (masonError) {
        console.error('Error fetching Mason verification data:', masonError);
      } else {
        console.log(`Found ${masonStats?.length || 0} Mason records after rebuild:`);
        masonStats?.forEach((stat, index) => {
          const event = stat.events;
          console.log(`  ${index + 1}. ${event?.title} vs ${event?.opponent} (${event?.date}): Position="${stat.position}", Minutes=${stat.minutes_played}`);
        });
      }
      
      setRebuildStatus('success');
      toast.success('Successfully rebuilt all player statistics!');
      
      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error rebuilding stats:', error);
      setRebuildStatus('error');
      toast.error('Failed to rebuild player statistics. Check console for details.');
    } finally {
      setIsRebuilding(false);
    }
  };

  const handleDebugMason = async () => {
    try {
      toast.info('Debugging Mason\'s data flow...');
      
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

  const handleTypeScriptRebuild = async () => {
    setIsRebuilding(true);
    setRebuildStatus('idle');
    
    try {
      console.log('🔄 Starting TypeScript-based rebuild...');
      toast.info('Starting TypeScript-based player statistics rebuild...');
      
      await playerStatsRebuilder.rebuildAllPlayerStats();
      
      console.log('✅ TypeScript rebuild completed successfully');
      setRebuildStatus('success');
      toast.success('Successfully rebuilt all player statistics using TypeScript method!');
      
      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error in TypeScript rebuild:', error);
      setRebuildStatus('error');
      toast.error('Failed to rebuild player statistics. Check console for details.');
    } finally {
      setIsRebuilding(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <RefreshCw className="h-5 w-5" />
          Player Statistics Rebuilder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-orange-700">
          <p className="font-medium mb-2">Complete Stats Rebuild Options</p>
          <p>Multiple approaches to rebuild all player statistics with enhanced data accuracy.</p>
          <p className="mt-2 font-medium">Process:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Clear all existing event_player_stats records completely</li>
            <li>Regenerate from event_selections with improved position extraction</li>
            <li>Trim whitespace and validate position data</li>
            <li>Enhanced logging for Mason's data verification</li>
            <li>Update all player match_stats</li>
          </ul>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleRebuildAllStats}
            disabled={isRebuilding}
            className="flex items-center gap-2"
            variant="default"
          >
            <RefreshCw className={`h-4 w-4 ${isRebuilding ? 'animate-spin' : ''}`} />
            {isRebuilding ? 'Rebuilding...' : 'Smart Rebuild (DB + Fallback)'}
          </Button>

          <Button
            onClick={handleTypeScriptRebuild}
            disabled={isRebuilding}
            className="flex items-center gap-2"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 ${isRebuilding ? 'animate-spin' : ''}`} />
            {isRebuilding ? 'Rebuilding...' : 'TypeScript Rebuild'}
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
            <span className="text-sm">Rebuild completed successfully! Page will refresh shortly.</span>
          </div>
        )}

        {rebuildStatus === 'error' && (
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Rebuild failed. Check the console for error details.</span>
          </div>
        )}

        <Badge variant="outline" className="text-xs">
          Improved with database function + TypeScript fallback
        </Badge>
      </CardContent>
    </Card>
  );
};
