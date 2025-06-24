
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, CheckCircle, Database } from 'lucide-react';
import { toast } from 'sonner';
import { comprehensiveStatsRebuild } from '@/utils/comprehensiveStatsRebuild';
import { useQueryClient } from '@tanstack/react-query';

export const StatsRebuildPanel: React.FC = () => {
  const [isRebuilding, setIsRebuilding] = useState(false);
  const queryClient = useQueryClient();

  const handleStatsRebuild = async () => {
    setIsRebuilding(true);
    try {
      console.log('🔧 Starting comprehensive stats rebuild...');
      await comprehensiveStatsRebuild();
      
      // Invalidate all queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-players'] });
      queryClient.invalidateQueries({ queryKey: ['active-players'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      
      toast.success('Stats rebuild completed! All player statistics now reflect team selections.');
      console.log('🎉 Stats rebuild completed successfully!');
    } catch (error) {
      console.error('Error during stats rebuild:', error);
      toast.error('Failed to complete stats rebuild. Check console for details.');
    } finally {
      setIsRebuilding(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Database className="h-5 w-5" />
          Statistics Rebuild
        </CardTitle>
        <CardDescription className="text-blue-700">
          Rebuild all player statistics from team selections to ensure data accuracy.
          This will clear and regenerate all stats based on actual team selection data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2">This will:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Clear all existing event_player_stats
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Regenerate stats from team selections
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Reset all player match statistics
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Rebuild accurate position and performance data
            </li>
          </ul>
        </div>
        
        <Button
          onClick={handleStatsRebuild}
          disabled={isRebuilding}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isRebuilding ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Rebuilding Statistics...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Rebuild All Statistics from Team Selections
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
