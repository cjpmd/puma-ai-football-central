
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Database, Users, FileText } from 'lucide-react';

interface DataIntegrityIssue {
  type: 'orphaned_selection' | 'missing_player' | 'invalid_stats' | 'missing_event' | 'position_mismatch' | 'minutes_mismatch' | 'aggregation_error';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  eventId?: string;
  playerId?: string;
  selectionId?: string;
  count?: number;
  details?: any;
}

interface DataSummary {
  totalPlayers: number;
  totalPlayerReferences: number;
  orphanedReferences: number;
  totalEventPlayerStats: number;
  criticalIssues: number;
  warningIssues: number;
  totalIssues: number;
  orphanedPlayerIds: string[];
}

export const ComprehensiveDataIntegrityChecker: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [issues, setIssues] = useState<DataIntegrityIssue[]>([]);
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const { toast } = useToast();

  const addDebugLog = (message: string) => {
    console.log(`🔍 ${message}`);
    setDebugLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const checkDataIntegrity = async () => {
    setIsChecking(true);
    setDebugLogs([]);
    const foundIssues: DataIntegrityIssue[] = [];
    
    try {
      addDebugLog('STARTING DATA INTEGRITY CHECK');

      // Step 1: Get all players
      addDebugLog('Fetching all players...');
      const { data: allPlayers, error: playersError } = await supabase
        .from('players')
        .select('id, name');

      if (playersError) {
        throw new Error(`Failed to fetch players: ${playersError.message}`);
      }

      const validPlayerIds = new Set<string>();
      allPlayers?.forEach(player => validPlayerIds.add(player.id));
      addDebugLog(`✅ Found ${validPlayerIds.size} valid players in database`);

      // Step 2: Check for orphaned references in event_selections
      addDebugLog('Checking event_selections for orphaned player references...');
      
      const { data: selections, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          id, 
          event_id, 
          player_positions, 
          team_id,
          events!inner(id, title, opponent, date)
        `);

      if (selectionsError) {
        throw new Error(`Failed to fetch event selections: ${selectionsError.message}`);
      }

      const orphanedPlayerRefs = new Set<string>();
      let totalPlayerReferences = 0;
      let orphanedReferences = 0;

      selections?.forEach(selection => {
        try {
          const playerPositions = selection.player_positions as any[];
          if (Array.isArray(playerPositions)) {
            playerPositions.forEach((position, index) => {
              const playerId = position.playerId || position.player_id;
              if (playerId) {
                totalPlayerReferences++;
                if (!validPlayerIds.has(playerId)) {
                  orphanedPlayerRefs.add(playerId);
                  orphanedReferences++;
                  foundIssues.push({
                    type: 'orphaned_selection',
                    severity: 'critical',
                    description: `Event selection references non-existent player ID: ${playerId}`,
                    eventId: selection.event_id,
                    playerId: playerId,
                    selectionId: selection.id,
                    details: { 
                      position: position.position, 
                      teamId: selection.team_id,
                      positionIndex: index
                    }
                  });
                }
              }
            });
          }
        } catch (selectionError) {
          addDebugLog(`⚠️ Error processing selection ${selection.id}: ${selectionError}`);
        }
      });

      addDebugLog(`📊 Processed ${selections?.length || 0} selections with ${totalPlayerReferences} player references`);
      addDebugLog(`❌ Found ${orphanedReferences} orphaned player references`);

      // Step 3: Check event_player_stats count
      const { data: statsCount, error: statsError } = await supabase
        .from('event_player_stats')
        .select('id', { count: 'exact' })
        .limit(1);

      if (statsError) {
        addDebugLog(`⚠️ Error checking event_player_stats: ${statsError.message}`);
      }

      const eventPlayerStatsCount = statsCount?.length || 0;
      addDebugLog(`📊 Current event_player_stats count: ${eventPlayerStatsCount}`);

      // Step 4: Check for players with no stats
      addDebugLog('Checking for players missing from event_player_stats...');
      const { data: statsPlayers } = await supabase
        .from('event_player_stats')
        .select('player_id')
        .not('player_id', 'is', null);

      const playersWithStats = new Set(statsPlayers?.map(s => s.player_id) || []);
      const playersWithoutStats = Array.from(validPlayerIds).filter(id => !playersWithStats.has(id));

      playersWithoutStats.forEach(playerId => {
        const player = allPlayers?.find(p => p.id === playerId);
        foundIssues.push({
          type: 'missing_player',
          severity: 'warning',
          description: `Player "${player?.name || 'Unknown'}" has no stats records despite existing in database`,
          playerId: playerId
        });
      });

      addDebugLog(`📊 Found ${playersWithoutStats.length} players with no stats records`);

      // Summary statistics
      const criticalIssues = foundIssues.filter(i => i.severity === 'critical').length;
      const warningIssues = foundIssues.filter(i => i.severity === 'warning').length;

      const summaryData: DataSummary = {
        totalPlayers: validPlayerIds.size,
        totalPlayerReferences: totalPlayerReferences,
        orphanedReferences: orphanedReferences,
        totalEventPlayerStats: eventPlayerStatsCount,
        criticalIssues,
        warningIssues,
        totalIssues: foundIssues.length,
        orphanedPlayerIds: Array.from(orphanedPlayerRefs)
      };

      setSummary(summaryData);
      setIssues(foundIssues);

      addDebugLog('🎯 DATA INTEGRITY CHECK COMPLETE');
      addDebugLog(`Summary: ${JSON.stringify(summaryData, null, 2)}`);

      toast({
        title: 'Data Integrity Check Complete',
        description: `Found ${criticalIssues} critical issues and ${warningIssues} warnings`,
        variant: criticalIssues > 0 ? 'destructive' : 'default'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addDebugLog(`❌ ERROR: ${errorMessage}`);
      console.error('❌ Error during data integrity check:', error);
      toast({
        title: 'Check Failed',
        description: `Failed to complete data integrity check: ${errorMessage}`,
        variant: 'destructive'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const fixDataIntegrityIssues = async () => {
    setIsFixing(true);
    setDebugLogs([]);
    
    try {
      addDebugLog('🔧 STARTING DATA INTEGRITY FIX WITH UPDATED DATABASE FUNCTIONS');
      
      const criticalIssues = issues.filter(i => i.severity === 'critical');
      addDebugLog(`Found ${criticalIssues.length} critical issues to fix`);

      // Step 1: Clean up orphaned references
      const orphanedIssues = issues.filter(i => i.type === 'orphaned_selection');
      if (orphanedIssues.length > 0) {
        addDebugLog(`🧹 Cleaning ${orphanedIssues.length} orphaned selection references...`);
        
        for (const issue of orphanedIssues) {
          if (issue.selectionId && issue.playerId) {
            try {
              const { data: selection, error: getError } = await supabase
                .from('event_selections')
                .select('player_positions')
                .eq('id', issue.selectionId)
                .single();

              if (getError) {
                addDebugLog(`❌ Error getting selection ${issue.selectionId}: ${getError.message}`);
                continue;
              }

              const playerPositions = selection.player_positions as any[];
              const cleanedPositions = playerPositions.filter(pos => {
                const playerId = pos.playerId || pos.player_id;
                return playerId !== issue.playerId;
              });

              const { error: updateError } = await supabase
                .from('event_selections')
                .update({ player_positions: cleanedPositions })
                .eq('id', issue.selectionId);

              if (updateError) {
                addDebugLog(`❌ Error updating selection ${issue.selectionId}: ${updateError.message}`);
              } else {
                addDebugLog(`✅ Cleaned orphaned player ${issue.playerId} from selection ${issue.selectionId}`);
              }
            } catch (selectionError) {
              addDebugLog(`❌ Error processing selection ${issue.selectionId}: ${selectionError}`);
            }
          }
        }
      }

      // Step 2: Use the NEW fixed regeneration function
      addDebugLog('🔄 Regenerating event_player_stats using FIXED database function...');
      const { error: regenError } = await supabase.rpc('regenerate_all_event_player_stats');
      
      if (regenError) {
        addDebugLog(`❌ Error regenerating event_player_stats: ${regenError.message}`);
        throw new Error(`Regeneration failed: ${regenError.message}`);
      } else {
        addDebugLog('✅ Successfully regenerated event_player_stats with fixed function');
      }

      // Step 3: Use the NEW fixed match stats function  
      addDebugLog('📊 Updating all player match statistics using FIXED database function...');
      const { error: updateError } = await supabase.rpc('update_all_completed_events_stats');
      
      if (updateError) {
        addDebugLog(`❌ Error updating match stats: ${updateError.message}`);
        throw new Error(`Match stats update failed: ${updateError.message}`);
      } else {
        addDebugLog('✅ Successfully updated all match stats with fixed function');
      }

      // Step 4: Verify the fixes
      addDebugLog('🔍 Verifying fixes...');
      const { data: newStatsCount } = await supabase
        .from('event_player_stats')
        .select('id', { count: 'exact' })
        .limit(1);
        
      addDebugLog(`📊 New event_player_stats count: ${newStatsCount?.length || 0}`);

      addDebugLog('🎉 DATA INTEGRITY FIX COMPLETE - All database functions have been updated and executed');

      toast({
        title: 'Fix Process Complete',
        description: 'Data integrity issues have been resolved using the updated database functions.',
      });

      // Re-run the check to show improvements
      setTimeout(() => {
        checkDataIntegrity();
      }, 1000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addDebugLog(`❌ CRITICAL FIX ERROR: ${errorMessage}`);
      console.error('❌ Error during fix process:', error);
      toast({
        title: 'Fix Process Failed',
        description: `Failed to complete fixes: ${errorMessage}`,
        variant: 'destructive'
      });
    } finally {
      setIsFixing(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Integrity Check & Fix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={checkDataIntegrity} 
              disabled={isChecking}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Checking...' : 'Run Check'}
            </Button>
            
            {issues.length > 0 && (
              <Button 
                onClick={fixDataIntegrityIssues} 
                disabled={isFixing}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isFixing ? 'animate-spin' : ''}`} />
                {isFixing ? 'Fixing...' : 'Fix All Issues'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Debug Logs */}
      {debugLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 p-4 rounded-lg max-h-64 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap">
                {debugLogs.join('\n')}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Data Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.totalPlayers}</div>
                <div className="text-sm text-muted-foreground">Total Players</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.totalPlayerReferences}</div>
                <div className="text-sm text-muted-foreground">Player References</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.orphanedReferences}</div>
                <div className="text-sm text-muted-foreground">Orphaned References</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{summary.totalEventPlayerStats}</div>
                <div className="text-sm text-muted-foreground">Event Player Stats</div>
              </div>
            </div>
            
            {summary.orphanedPlayerIds?.length > 0 && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Orphaned Player IDs Found:</strong>
                  <div className="mt-2 space-y-1">
                    {summary.orphanedPlayerIds.slice(0, 5).map((id: string) => (
                      <Badge key={id} variant="destructive" className="mr-2 text-xs">
                        {id.substring(0, 8)}...
                      </Badge>
                    ))}
                    {summary.orphanedPlayerIds.length > 5 && (
                      <div className="text-sm text-muted-foreground">
                        ...and {summary.orphanedPlayerIds.length - 5} more
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Issues Found ({issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {issues.slice(0, 20).map((issue, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{issue.description}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {issue.playerId && <span>Player: {issue.playerId.substring(0, 8)}... </span>}
                      {issue.eventId && <span>Event: {issue.eventId.substring(0, 8)}... </span>}
                      {issue.details && <span>Details: {JSON.stringify(issue.details)}</span>}
                    </div>
                  </div>
                  <Badge variant={issue.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {issue.severity}
                  </Badge>
                </div>
              ))}
              {issues.length > 20 && (
                <div className="text-center text-sm text-muted-foreground">
                  Showing first 20 of {issues.length} issues
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
