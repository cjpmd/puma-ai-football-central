
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
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
      
      await playerStatsRebuilder.rebuildAllPlayerStats();
      
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
      await playerStatsRebuilder.debugPlayerDataFlow('bb4de0de-c98c-485b-85b6-b70dd67736e4', 'Mason McPherson');
      toast.success('Debug complete - check console for details');
    } catch (error) {
      console.error('Error debugging Mason:', error);
      toast.error('Debug failed');
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
          <p className="font-medium mb-2">Complete Stats Rebuild</p>
          <p>This will completely rebuild all player statistics from scratch using the raw event selection data.</p>
          <p className="mt-2 font-medium">Process:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Clear all existing event_player_stats records</li>
            <li>Regenerate from event_selections with detailed logging</li>
            <li>Rebuild each player's match_stats individually</li>
            <li>Verify position data accuracy</li>
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
            {isRebuilding ? 'Rebuilding...' : 'Rebuild All Stats'}
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
          Manual rebuild with enhanced debugging
        </Badge>
      </CardContent>
    </Card>
  );
};
