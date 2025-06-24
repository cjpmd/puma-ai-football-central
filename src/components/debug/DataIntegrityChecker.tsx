
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, RefreshCw, Search, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { playerStatsService } from '@/services/playerStatsService';

export const DataIntegrityChecker = () => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [debugPlayerId, setDebugPlayerId] = useState('bb4de0de-c98c-485b-85b6-b70dd67736e4'); // Mason's ID as default
  const [debugPlayerName, setDebugPlayerName] = useState('Mason McPherson');
  const [isDebugging, setIsDebugging] = useState(false);
  const { toast } = useToast();

  const handleFullRegeneration = async () => {
    setIsRegenerating(true);
    try {
      console.log('🔄 Starting full data regeneration...');
      await playerStatsService.regenerateAllPlayerStats();
      toast({
        title: 'Success',
        description: 'All player statistics have been regenerated successfully.',
      });
    } catch (error) {
      console.error('Error during regeneration:', error);
      toast({
        title: 'Error',
        description: 'Failed to regenerate player statistics. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDebugPlayer = async () => {
    if (!debugPlayerId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a player ID.',
        variant: 'destructive',
      });
      return;
    }

    setIsDebugging(true);
    try {
      console.log(`🔍 Debugging player: ${debugPlayerName} (${debugPlayerId})`);
      await playerStatsService.debugPlayerPositions(debugPlayerId, debugPlayerName);
      toast({
        title: 'Debug Complete',
        description: `Position debugging complete for ${debugPlayerName}. Check console for details.`,
      });
    } catch (error) {
      console.error('Error during debug:', error);
      toast({
        title: 'Error',
        description: 'Failed to debug player positions. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsDebugging(false);
    }
  };

  const handleDebugAndRegenerate = async () => {
    if (!debugPlayerId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a player ID.',
        variant: 'destructive',
      });
      return;
    }

    setIsDebugging(true);
    try {
      console.log(`🎯 Starting comprehensive debug and regeneration for: ${debugPlayerName}`);
      await playerStatsService.debugAndRegenerateForPlayer(debugPlayerId, debugPlayerName);
      toast({
        title: 'Debug & Regeneration Complete',
        description: `Complete analysis and regeneration finished for ${debugPlayerName}. Check console for detailed logs.`,
      });
    } catch (error) {
      console.error('Error during debug and regeneration:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete debug and regeneration. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsDebugging(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Data Integrity & Debug Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Full Regeneration Section */}
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Database className="h-4 w-4" />
            Full Data Regeneration
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Completely regenerate all player statistics from event selections. This will fix any position mapping issues.
          </p>
          <Button 
            onClick={handleFullRegeneration}
            disabled={isRegenerating}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isRegenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate All Player Stats
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* Player Debug Section */}
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Search className="h-4 w-4" />
            Player Position Debug
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Debug a specific player's position data to identify issues.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <Label htmlFor="playerName">Player Name</Label>
              <Input
                id="playerName"
                value={debugPlayerName}
                onChange={(e) => setDebugPlayerName(e.target.value)}
                placeholder="Enter player name"
              />
            </div>
            <div>
              <Label htmlFor="playerId">Player ID</Label>
              <Input
                id="playerId"
                value={debugPlayerId}
                onChange={(e) => setDebugPlayerId(e.target.value)}
                placeholder="Enter player UUID"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleDebugPlayer}
              disabled={isDebugging}
              variant="outline"
              size="sm"
            >
              {isDebugging ? (
                <>
                  <Search className="mr-2 h-4 w-4 animate-spin" />
                  Debugging...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Debug Positions Only
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleDebugAndRegenerate}
              disabled={isDebugging}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isDebugging ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Debug & Regenerate
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          💡 Tip: Open browser console (F12) to see detailed debug information
        </div>
      </CardContent>
    </Card>
  );
};
