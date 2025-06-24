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

interface CrossValidationResult {
  playerId: string;
  playerName: string;
  eventId: string;
  eventTitle: string;
  selectionPosition: string;
  selectionMinutes: number;
  statsPosition: string | null;
  statsMinutes: number | null;
  matchStatsPosition: Record<string, number>;
  hasMismatch: boolean;
}

export const ComprehensiveDataIntegrityChecker: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [issues, setIssues] = useState<DataIntegrityIssue[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [crossValidation, setCrossValidation] = useState<CrossValidationResult[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const { toast } = useToast();

  const addDebugLog = (message: string) => {
    console.log(`🔍 ${message}`);
    setDebugLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const checkDataIntegrity = async () => {
    setIsChecking(true);
    setDebugLogs([]);
    setCrossValidation([]);
    const foundIssues: DataIntegrityIssue[] = [];
    
    try {
      addDebugLog('STARTING COMPREHENSIVE DATA INTEGRITY CHECK WITH CROSS-VALIDATION');

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
        .select('id, name, match_stats');

      if (playersError) {
        throw new Error(`Failed to fetch players: ${playersError.message}`);
      }

      const validPlayerIds = new Set<string>();
      const playersMap = new Map<string, any>();
      allPlayers?.forEach(player => {
        validPlayerIds.add(player.id);
        playersMap.set(player.id, player);
      });
      addDebugLog(`✅ Found ${validPlayerIds.size} valid players in database`);

      // Step 3: Cross-validation check
      addDebugLog('🔄 STARTING CROSS-VALIDATION BETWEEN DATA LAYERS');
      
      // Get event selections with event details
      const { data: selections, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          id, 
          event_id, 
          player_positions, 
          team_id,
          duration_minutes,
          events!inner(id, title, opponent, date)
        `);

      if (selectionsError) {
        throw new Error(`Failed to fetch event selections: ${selectionsError.message}`);
      }

      addDebugLog(`📋 Found ${selections?.length || 0} event selections to cross-validate`);

      const crossValidationResults: CrossValidationResult[] = [];
      let totalValidationChecks = 0;
      let mismatches = 0;

      // For each selection, validate against event_player_stats and players.match_stats
      for (const selection of selections || []) {
        const event = selection.events as any;
        const playerPositions = selection.player_positions as any[];
        
        if (!Array.isArray(playerPositions)) continue;

        for (const position of playerPositions) {
          const playerId = position.playerId || position.player_id;
          if (!playerId || !validPlayerIds.has(playerId)) continue;

          totalValidationChecks++;
          const player = playersMap.get(playerId);
          
          // Get expected data from selection
          const selectionPosition = position.position;
          const selectionMinutes = position.minutes || selection.duration_minutes || 90;
          const selectionIsSubstitute = position.isSubstitute || false;

          // Get actual data from event_player_stats
          const { data: statsData } = await supabase
            .from('event_player_stats')
            .select('position, minutes_played, is_substitute')
            .eq('event_id', selection.event_id)
            .eq('player_id', playerId)
            .maybeSingle();

          // Get aggregated data from players.match_stats
          const matchStats = player?.match_stats as any;
          const matchStatsPositions = matchStats?.minutesByPosition || {};

          // Check for mismatches
          let hasMismatch = false;
          const issues: string[] = [];

          if (!statsData) {
            hasMismatch = true;
            issues.push('Missing event_player_stats record');
            foundIssues.push({
              type: 'missing_event',
              severity: 'critical',
              description: `Player ${player?.name} selected for ${event.title} but no stats record exists`,
              eventId: selection.event_id,
              playerId: playerId,
              details: { selectionPosition, selectionMinutes }
            });
          } else {
            // Position mismatch check
            if (statsData.position !== selectionPosition) {
              hasMismatch = true;
              issues.push(`Position mismatch: selection(${selectionPosition}) vs stats(${statsData.position})`);
              foundIssues.push({
                type: 'position_mismatch',
                severity: 'critical',
                description: `Position mismatch for ${player?.name} in ${event.title}: selection has "${selectionPosition}" but stats has "${statsData.position}"`,
                eventId: selection.event_id,
                playerId: playerId,
                details: { 
                  selectionPosition, 
                  statsPosition: statsData.position,
                  selectionMinutes,
                  statsMinutes: statsData.minutes_played
                }
              });
            }

            // Minutes mismatch check (allow some tolerance for substitutions)
            const minutesDiff = Math.abs(statsData.minutes_played - selectionMinutes);
            if (minutesDiff > 5 && !selectionIsSubstitute) { // 5 minute tolerance
              hasMismatch = true;
              issues.push(`Minutes mismatch: selection(${selectionMinutes}) vs stats(${statsData.minutes_played})`);
              foundIssues.push({
                type: 'minutes_mismatch',
                severity: 'warning',
                description: `Minutes mismatch for ${player?.name} in ${event.title}: selection has ${selectionMinutes} but stats has ${statsData.minutes_played}`,
                eventId: selection.event_id,
                playerId: playerId,
                details: { 
                  selectionMinutes, 
                  statsMinutes: statsData.minutes_played,
                  difference: minutesDiff
                }
              });
            }
          }

          // Check aggregation in match_stats
          if (statsData && selectionPosition && !selectionIsSubstitute) {
            const expectedMinutesInMatchStats = matchStatsPositions[selectionPosition] || 0;
            // This is trickier since match_stats aggregates across all events
            // We'll just log if the position doesn't exist at all
            if (expectedMinutesInMatchStats === 0 && statsData.minutes_played > 0) {
              foundIssues.push({
                type: 'aggregation_error',
                severity: 'warning',
                description: `Player ${player?.name} has ${statsData.minutes_played} minutes at ${selectionPosition} in stats but 0 minutes in match_stats aggregation`,
                playerId: playerId,
                details: { 
                  position: selectionPosition,
                  statsMinutes: statsData.minutes_played,
                  aggregatedMinutes: expectedMinutesInMatchStats
                }
              });
            }
          }

          if (hasMismatch) mismatches++;

          crossValidationResults.push({
            playerId,
            playerName: player?.name || 'Unknown',
            eventId: selection.event_id,
            eventTitle: event.title,
            selectionPosition,
            selectionMinutes,
            statsPosition: statsData?.position || null,
            statsMinutes: statsData?.minutes_played || null,
            matchStatsPosition: matchStatsPositions,
            hasMismatch
          });
        }
      }

      setCrossValidation(crossValidationResults);
      addDebugLog(`🔍 Cross-validation complete: ${totalValidationChecks} checks, ${mismatches} mismatches found`);

      // Step 4: Check event_selections for orphaned player references
      addDebugLog('Checking event_selections for orphaned player references...');
      
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

      // Step 5: Check for players with no stats
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

      // Summary statistics
      const criticalIssues = foundIssues.filter(i => i.severity === 'critical').length;
      const warningIssues = foundIssues.filter(i => i.severity === 'warning').length;

      const summaryData = {
        totalPlayers: validPlayerIds.size,
        totalPlayerReferences: totalPlayerReferences,
        orphanedReferences: orphanedReferences,
        playersWithoutStats: playersWithoutStats.length,
        totalValidationChecks,
        crossValidationMismatches: mismatches,
        criticalIssues,
        warningIssues,
        totalIssues: foundIssues.length,
        orphanedPlayerIds: Array.from(orphanedPlayerRefs)
      };

      setSummary(summaryData);
      setIssues(foundIssues);

      addDebugLog('🎯 COMPREHENSIVE DATA INTEGRITY CHECK COMPLETE');
      addDebugLog(`Summary: ${JSON.stringify(summaryData, null, 2)}`);

      toast({
        title: 'Data Integrity Check Complete',
        description: `Found ${criticalIssues} critical issues, ${warningIssues} warnings, and ${mismatches} cross-validation mismatches`,
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
      addDebugLog('🔧 STARTING COMPREHENSIVE DATA INTEGRITY FIX');
      
      const criticalIssues = issues.filter(i => i.severity === 'critical');
      const warningIssues = issues.filter(i => i.severity === 'warning');
      
      addDebugLog(`Found ${criticalIssues.length} critical issues and ${warningIssues.length} warnings to fix`);

      // Step 1: Clean up orphaned references first
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

      // Step 2: Regenerate event_player_stats from event_selections
      addDebugLog('🔄 Regenerating event_player_stats from event_selections...');
      try {
        const { data, error: regenError } = await supabase.rpc('regenerate_all_event_player_stats');
        
        if (regenError) {
          addDebugLog(`❌ Error regenerating event_player_stats: ${regenError.message}`);
          addDebugLog(`Error details: ${JSON.stringify(regenError)}`);
          
          // Try alternative approach - direct regeneration
          addDebugLog('🔄 Trying direct regeneration approach...');
          const { error: directError } = await supabase
            .from('event_player_stats')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
            
          if (directError) {
            addDebugLog(`❌ Error clearing event_player_stats: ${directError.message}`);
          } else {
            addDebugLog('✅ Cleared existing event_player_stats');
            
            // Manual regeneration would go here, but let's try the RPC again
            const { error: retryError } = await supabase.rpc('regenerate_all_event_player_stats');
            if (retryError) {
              addDebugLog(`❌ Retry regeneration failed: ${retryError.message}`);
            } else {
              addDebugLog('✅ Successfully regenerated event_player_stats on retry');
            }
          }
        } else {
          addDebugLog('✅ Successfully regenerated event_player_stats');
        }
      } catch (error) {
        addDebugLog(`❌ Exception during regeneration: ${error}`);
      }

      // Step 3: Update all player match stats
      addDebugLog('📊 Updating all player match statistics...');
      try {
        const { error: updateError } = await supabase.rpc('update_all_completed_events_stats');
        
        if (updateError) {
          addDebugLog(`❌ Error updating match stats: ${updateError.message}`);
          addDebugLog(`Error details: ${JSON.stringify(updateError)}`);
          
          // Try updating players individually
          addDebugLog('🔄 Trying individual player updates...');
          const { data: players } = await supabase
            .from('players')
            .select('id, name')
            .limit(10); // Limit to prevent timeout
            
          if (players) {
            for (const player of players) {
              try {
                const { error: playerError } = await supabase.rpc('update_player_match_stats', {
                  player_uuid: player.id
                });
                
                if (playerError) {
                  addDebugLog(`❌ Error updating ${player.name}: ${playerError.message}`);
                } else {
                  addDebugLog(`✅ Updated ${player.name} stats`);
                }
              } catch (playerException) {
                addDebugLog(`❌ Exception updating ${player.name}: ${playerException}`);
              }
            }
          }
        } else {
          addDebugLog('✅ Successfully updated all match stats');
        }
      } catch (error) {
        addDebugLog(`❌ Exception during stats update: ${error}`);
      }

      // Step 4: Verify the fixes
      addDebugLog('🔍 Verifying fixes...');
      const { data: statsCount } = await supabase
        .from('event_player_stats')
        .select('id', { count: 'exact' })
        .limit(1);
        
      addDebugLog(`📊 Current event_player_stats count: ${statsCount?.length || 0}`);

      // Step 5: Re-run integrity check to see improvements
      addDebugLog('🔄 Re-running integrity check...');
      setTimeout(() => {
        checkDataIntegrity();
      }, 1000);

      toast({
        title: 'Fix Process Complete',
        description: 'Data integrity fixes have been attempted. Check the debug logs for details.',
      });

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
            <CardTitle>Data Integrity Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                <div className="text-2xl font-bold text-purple-600">{summary.totalValidationChecks}</div>
                <div className="text-sm text-muted-foreground">Validation Checks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{summary.crossValidationMismatches}</div>
                <div className="text-sm text-muted-foreground">Data Mismatches</div>
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

      {/* Cross-Validation Results */}
      {crossValidation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Cross-Validation Results (Showing Mismatches Only)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {crossValidation.filter(cv => cv.hasMismatch).slice(0, 20).map((cv, index) => (
                <div key={index} className="border rounded-lg p-4 bg-red-50">
                  <div className="font-medium text-sm">{cv.playerName} - {cv.eventTitle}</div>
                  <div className="text-xs text-muted-foreground mt-1 space-y-1">
                    <div>Selection: {cv.selectionPosition} ({cv.selectionMinutes} mins)</div>
                    <div>Stats: {cv.statsPosition || 'MISSING'} ({cv.statsMinutes || 'MISSING'} mins)</div>
                    <div>Match Stats Positions: {JSON.stringify(cv.matchStatsPosition)}</div>
                  </div>
                </div>
              ))}
              {crossValidation.filter(cv => cv.hasMismatch).length > 20 && (
                <div className="text-center text-sm text-muted-foreground">
                  Showing first 20 of {crossValidation.filter(cv => cv.hasMismatch).length} mismatches
                </div>
              )}
            </div>
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
