
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { directCopyRebuilder } from '@/services/stats/directCopyRebuilder';
import { toast } from 'sonner';

export const DirectCopyRebuilder: React.FC = () => {
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildStatus, setRebuildStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleDirectCopyRebuild = async () => {
    setIsRebuilding(true);
    setRebuildStatus('idle');
    
    try {
      console.log('🚀 Starting DIRECT COPY rebuild - zero complexity...');
      toast.info('Starting direct copy rebuild - zero transformations...');
      
      await directCopyRebuilder.rebuildWithDirectCopy();
      
      console.log('✅ Direct copy rebuild completed successfully');
      setRebuildStatus('success');
      toast.success('Direct copy rebuild completed! Positions should now match team selections exactly.');
      
      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error in direct copy rebuild:', error);
      setRebuildStatus('error');
      toast.error('Failed to complete direct copy rebuild. Check console for details.');
    } finally {
      setIsRebuilding(false);
    }
  };

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Copy className="h-5 w-5" />
          Direct Copy Rebuilder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-green-700">
          <p className="font-medium mb-2">Zero Complexity Approach</p>
          <p className="mb-2">
            <strong>Principle:</strong> Direct 1:1 copy with ZERO transformations
          </p>
          <p className="mt-2 font-medium">What this does:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Manually deletes ALL event_player_stats records</li>
            <li>Copies EXACT positions from event_selections.player_positions</li>
            <li>Copies EXACT minutes from team selections</li>
            <li>NO database functions for generation, only for final update</li>
            <li>NO position mapping, NO transformations, NO complexity</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleDirectCopyRebuild}
            disabled={isRebuilding}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            variant="default"
          >
            <Copy className={`h-4 w-4 ${isRebuilding ? 'animate-spin' : ''}`} />
            {isRebuilding ? 'Direct Copying...' : 'Direct Copy Rebuild'}
          </Button>
        </div>

        {rebuildStatus === 'success' && (
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Direct copy completed! Page will refresh shortly.</span>
          </div>
        )}

        {rebuildStatus === 'error' && (
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Direct copy failed. Check console for details.</span>
          </div>
        )}

        <Badge variant="outline" className="text-xs bg-green-100">
          Zero complexity - pure copy operation
        </Badge>
      </CardContent>
    </Card>
  );
};
