
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Database, Users, FileText } from 'lucide-react';

interface DataIntegrityIssue {
  type: 'orphaned_selection' | 'missing_player' | 'invalid_stats' | 'missing_event';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  eventId?: string;
  playerId?: string;
  selectionId?: string;
  count?: number;
  details?: any;
}

export const ComprehensiveDataIntegrityChecker: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [issues, setIssues] = useState<DataIntegrityIssue[]>([]);
  const [summary, setSummary] = useState<any>(null);
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
      addDebugLog('STARTING COMPREHENSIVE DATA INTEGRITY CHECK');

      // Step 1: Check basic connectivity
      addDebugLog('Testing database connectivity...');
      const { data: testData, error: testError } = await supabase
        .from('players')
        .select('count')
        .limit(1);
      
      if (testError) {
        throw new Error(`Database connectivity test failed: ${testError.message}`);
      }
      addDebugLog('✅ Database connectivity confirmed');

      // Step 2: Get all players
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

      // Step 3: Check event_selections for orphaned player references
      addDebugLog('Checking event_selections for orphaned player references...');
      const { data: selections, error: selectionsError } = await supabase
        .from('event_selections')
        .select('id, event_id, player_positions, team_id');

      if (selectionsError) {
        throw new Error(`Failed to fetch event selections: ${selectionsError.message}`);
      }

      addDebugLog(`📋 Found ${selections?.length || 0} event selections to analyze`);

      const orphanedPlayerRefs = new Set<string>();
      let totalPlayerReferences = 0;
      let orphanedReferences = 0;
      let selectionsProcessed = 0;

      // Check each selection for orphaned references
      selections?.forEach(selection => {
        selectionsProcessed++;
        try {
          const playerPositions = selection.player_positions as any[];
          if (Array.isArray(playerPositions)) {
            playerPositions.forEach((position, index) => {
              try {
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
              } catch (positionError) {
                addDebugLog(`⚠️ Error processing position ${index} in selection ${selection.id}: ${positionError}`);
              }
            });
          }
        } catch (selectionError) {
          addDebugLog(`⚠️ Error processing selection ${selection.id}: ${selectionError}`);
        }
      });

      addDebugLog(`📊 Processed ${selectionsProcessed} selections with ${totalPlayerReferences} player references`);
      addDebugLog(`❌ Found ${orphanedReferences} orphaned player references`);

      // Step 4: Check for players with no stats
      addDebugLog('Checking for players missing from event_player_stats...');
      const { data: statsPlayers, error: statsError } = await supabase
        .from('event_player_stats')
        .select('player_id')
        .not('player_id', 'is', null);

      if (statsError) {
        throw new Error(`Failed to fetch player stats: ${statsError.message}`);
      }

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

      // Step 5: Check for event_player_stats with invalid player references
      addDebugLog('Checking event_player_stats for invalid player references...');
      
      // Get all unique player_ids from event_player_stats
      const { data: allStatsPlayerIds, error: allStatsError } = await supabase
        .from('event_player_stats')
        .select('player_id')
        .not('player_id', 'is', null);

      if (allStatsError) {
        throw new Error(`Failed to fetch stats player IDs: ${allStatsError.message}`);
      }

      const uniqueStatsPlayerIds = [...new Set(allStatsPlayerIds?.map(s => s.player_id) || [])];
      const invalidStatsPlayerIds = uniqueStatsPlayerIds.filter(id => !validPlayerIds.has(id));

      addDebugLog(`Found ${invalidStatsPlayerIds.length} invalid player IDs in event_player_stats`);

      invalidStatsPlayerIds.forEach(playerId => {
        foundIssues.push({
          type: 'invalid_stats',
          severity: 'critical',
          description: `Event player stats references non-existent player: ${playerId}`,
          playerId: playerId
        });
      });

      // Step 6: Summary statistics
      const criticalIssues = foundIssues.filter(i => i.severity === 'critical').length;
      const warningIssues = foundIssues.filter(i => i.severity === 'warning').length;

      const summaryData = {
        totalPlayers: validPlayerIds.size,
        totalPlayerReferences: totalPlayerReferences,
        orphanedReferences: orphanedReferences,
        playersWithoutStats: playersWithoutStats.length,
        invalidStatsPlayers: invalidStatsPlayerIds.length,
        criticalIssues,
        warningIssues,
        totalIssues: foundIssues.length,
        orphanedPlayerIds: Array.from(orphanedPlayerRefs),
        invalidStatsPlayerIds
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

  const fixOrphanedReferences = async () => {
    setIsFixing(true);
    
    try {
      addDebugLog('🔧 STARTING AUTOMATED FIX FOR ORPHANED REFERENCES');
      
      // Clean up orphaned references from event_selections
      const orphanedIssues = issues.filter(i => i.type === 'orphaned_selection');
      addDebugLog(`Found ${orphanedIssues.length} orphaned selection issues to fix`);
      
      for (const issue of orphanedIssues) {
        if (issue.selectionId && issue.playerId) {
          try {
            // Get the selection and clean it
            const { data: selection, error: getError } = await supabase
              .from('event_selections')
              .select('player_positions')
              .eq('id', issue.selectionId)
              .single();

            if (getError) {
              addDebugLog(`Error getting selection ${issue.selectionId}: ${getError.message}`);
              continue;
            }

            // Remove the orphaned player reference
            const playerPositions = selection.player_positions as any[];
            const cleanedPositions = playerPositions.filter(pos => {
              const playerId = pos.playerId || pos.player_id;
              return playerId !== issue.playerId;
            });

            // Update the selection with cleaned positions
            const { error: updateError } = await supabase
              .from('event_selections')
              .update({ player_positions: cleanedPositions })
              .eq('id', issue.selectionId);

            if (updateError) {
              addDebugLog(`Error updating selection ${issue.selectionId}: ${updateError.message}`);
            } else {
              addDebugLog(`✅ Cleaned orphaned player ${issue.playerId} from selection ${issue.selectionId}`);
            }
          } catch (selectionError) {
            addDebugLog(`Error processing selection ${issue.selectionId}: ${selectionError}`);
          }
        }
      }

      // Clean up invalid event_player_stats
      const invalidStats = issues.filter(i => i.type === 'invalid_stats');
      const invalidPlayerIds = [...new Set(invalidStats.map(i => i.playerId).filter(Boolean))];
      
      if (invalidPlayerIds.length > 0) {
        addDebugLog(`Deleting stats for ${invalidPlayerIds.length} invalid player IDs`);
        const { error: deleteError } = await supabase
          .from('event_player_stats')
          .delete()
          .in('player_id', invalidPlayerIds);

        if (deleteError) {
          addDebugLog(`Error deleting invalid stats: ${deleteError.message}`);
        } else {
          addDebugLog(`✅ Deleted invalid stats for ${invalidPlayerIds.length} non-existent players`);
        }
      }

      // Regenerate all stats after cleanup
      addDebugLog('🔄 Regenerating all player stats after cleanup...');
      const { error: regenError } = await supabase.rpc('regenerate_all_event_player_stats');
      
      if (regenError) {
        addDebugLog(`Error regenerating stats: ${regenError.message}`);
      } else {
        addDebugLog('✅ Successfully regenerated all player stats');
      }

      // Update all player match stats
      const { error: updateError } = await supabase.rpc('update_all_completed_events_stats');
      
      if (updateError) {
        addDebugLog(`Error updating match stats: ${updateError.message}`);
      } else {
        addDebugLog('✅ Successfully updated all match stats');
      }

      toast({
        title: 'Fix Complete',
        description: 'Orphaned references cleaned and stats regenerated',
      });

      // Re-run the check to see improvements
      await checkDataIntegrity();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addDebugLog(`❌ FIX ERROR: ${errorMessage}`);
      console.error('❌ Error during fix:', error);
      toast({
        title: 'Fix Failed',
        description: `Failed to fix orphaned references: ${errorMessage}`,
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
            Comprehensive Data Integrity Check
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
              {isChecking ? 'Checking...' : 'Run Full Check'}
            </Button>
            
            {issues.length > 0 && (
              <Button 
                onClick={fixOrphanedReferences} 
                disabled={isFixing}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isFixing ? 'animate-spin' : ''}`} />
                {isFixing ? 'Fixing...' : 'Fix Orphaned References'}
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
            <CardTitle>Data Integrity Summary</CardTitle>
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
                <div className="text-2xl font-bold text-yellow-600">{summary.playersWithoutStats}</div>
                <div className="text-sm text-muted-foreground">Players Without Stats</div>
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

            {summary.invalidStatsPlayerIds?.length > 0 && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Invalid Stats Player IDs Found:</strong>
                  <div className="mt-2 space-y-1">
                    {summary.invalidStatsPlayerIds.slice(0, 5).map((id: string) => (
                      <Badge key={id} variant="destructive" className="mr-2 text-xs">
                        {id.substring(0, 8)}...
                      </Badge>
                    ))}
                    {summary.invalidStatsPlayerIds.length > 5 && (
                      <div className="text-sm text-muted-foreground">
                        ...and {summary.invalidStatsPlayerIds.length - 5} more
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
              {issues.slice(0, 50).map((issue, index) => (
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
              {issues.length > 50 && (
                <div className="text-center text-sm text-muted-foreground">
                  Showing first 50 of {issues.length} issues
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
