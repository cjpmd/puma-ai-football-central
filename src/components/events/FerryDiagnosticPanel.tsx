
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { diagnoseFerryAthleticData } from '@/utils/ferryAthleticDiagnostic';

export const FerryDiagnosticPanel: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);

  const handleDiagnostic = async () => {
    setIsRunning(true);
    try {
      console.log('🔍 Starting Ferry Athletic diagnostic...');
      await diagnoseFerryAthleticData();
      toast.success('Ferry Athletic diagnostic completed! Check console for detailed analysis.');
      console.log('🎉 Ferry Athletic diagnostic completed!');
    } catch (error) {
      console.error('Error during Ferry Athletic diagnostic:', error);
      toast.error('Failed to complete Ferry Athletic diagnostic. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Ferry Athletic Data Diagnostic
        </CardTitle>
        <CardDescription className="text-orange-700">
          Compare team selection data with generated player stats for the Ferry Athletic match.
          This will show exactly what's in the team selections vs what's in the player stats.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white p-4 rounded-lg border border-orange-200">
          <h4 className="font-medium text-orange-800 mb-2">This diagnostic will:</h4>
          <ul className="text-sm text-orange-700 space-y-1">
            <li className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Find the Ferry Athletic event and team selections
            </li>
            <li className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              List all players, positions, and minutes from team selections
            </li>
            <li className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Compare with generated event_player_stats data
            </li>
            <li className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Show player match_stats data for Ferry Athletic
            </li>
            <li className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Identify any discrepancies or missing data
            </li>
          </ul>
        </div>
        
        <Button
          onClick={handleDiagnostic}
          disabled={isRunning}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          {isRunning ? (
            <>
              <Search className="h-4 w-4 mr-2 animate-spin" />
              Running Diagnostic...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Run Ferry Athletic Diagnostic
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
