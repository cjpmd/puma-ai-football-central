
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { simpleStatsRebuilder } from '@/services/stats/simpleStatsRebuilder';
import { toast } from 'sonner';

export const SimpleStatsRebuilder: React.FC = () => {
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildStatus, setRebuildStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSimpleRebuild = async () => {
    setIsRebuilding(true);
    setRebuildStatus('idle');
    
    try {
      console.log('🚀 Starting SIMPLE stats rebuild...');
      toast.info('Starting simple rebuild - direct copy from team selections...');
      
      await simpleStatsRebuilder.rebuildAllStats();
      
      console.log('✅ Simple rebuild completed successfully');
      setRebuildStatus('success');
      toast.success('Successfully rebuilt all statistics with simple approach!');
      
      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error in simple rebuild:', error);
      setRebuildStatus('error');
      toast.error('Failed to rebuild statistics. Check console for details.');
    } finally {
      setIsRebuilding(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <RefreshCw className="h-5 w-5" />
          Simple Stats Rebuilder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-2">Simple & Direct Approach</p>
          <p className="mb-2">
            <strong>Core Principle:</strong> Team Selection = Stats Report (1:1 copy)
          </p>
          <p className="mt-2 font-medium">What this does:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Clears all existing event_player_stats</li>
            <li>Copies EXACT positions from event_selections</li>
            <li>Copies EXACT minutes from team selections</li>
            <li>No transformations, no mapping, no complexity</li>
            <li>Updates match stats using proven database functions</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSimpleRebuild}
            disabled={isRebuilding}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            variant="default"
          >
            <RefreshCw className={`h-4 w-4 ${isRebuilding ? 'animate-spin' : ''}`} />
            {isRebuilding ? 'Rebuilding...' : 'Simple Direct Rebuild'}
          </Button>
        </div>

        {rebuildStatus === 'success' && (
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Simple rebuild completed! Page will refresh shortly.</span>
          </div>
        )}

        {rebuildStatus === 'error' && (
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Rebuild failed. Check console for details.</span>
          </div>
        )}

        <Badge variant="outline" className="text-xs bg-blue-100">
          Direct 1:1 copy - no transformations
        </Badge>
      </CardContent>
    </Card>
  );
};
