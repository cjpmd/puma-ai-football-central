
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { comprehensiveDataRepair } from '@/utils/comprehensiveDataRepair';
import { useQueryClient } from '@tanstack/react-query';

export const DataRepairPanel: React.FC = () => {
  const [isRepairing, setIsRepairing] = useState(false);
  const queryClient = useQueryClient();

  const handleDataRepair = async () => {
    setIsRepairing(true);
    try {
      console.log('🔧 Starting comprehensive data repair...');
      await comprehensiveDataRepair();
      
      // Invalidate all queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-players'] });
      queryClient.invalidateQueries({ queryKey: ['active-players'] });
      
      toast.success('Data repair completed successfully! All player statistics have been rebuilt from team selections.');
      console.log('🎉 Data repair completed successfully!');
    } catch (error) {
      console.error('Error during data repair:', error);
      toast.error('Failed to complete data repair. Check console for details.');
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Data Repair & Rebuild
        </CardTitle>
        <CardDescription className="text-orange-700">
          Comprehensive system to rebuild all player statistics from team selections. 
          This will fix any data integrity issues including missing players or corrupted statistics.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white p-4 rounded-lg border border-orange-200">
          <h4 className="font-medium text-orange-800 mb-2">What this will do:</h4>
          <ul className="text-sm text-orange-700 space-y-1">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Identify all players referenced in team selections
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Report any missing player records
            </li>
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
              Rebuild all player match statistics
            </li>
          </ul>
        </div>
        
        <Button
          onClick={handleDataRepair}
          disabled={isRepairing}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          {isRepairing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Repairing Data...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Start Comprehensive Data Repair
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
