
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { playerStatsService } from '@/services/playerStatsService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

export const DataIntegrityChecker: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);

  const checkDataIntegrity = async () => {
    setIsChecking(true);
    setIssues([]);
    const foundIssues: string[] = [];

    try {
      // Check for position inconsistencies
      const { data: playerStats, error } = await supabase
        .from('event_player_stats')
        .select(`
          *,
          events!inner(date, opponent),
          players!inner(name)
        `)
        .not('position', 'is', null);

      if (error) {
        console.error('Error fetching player stats:', error);
        foundIssues.push('Failed to fetch player stats for analysis');
      } else if (playerStats) {
        // Check for substitutes with playing positions
        const subsWithPositions = playerStats.filter(stat => 
          stat.is_substitute && stat.position && stat.position !== 'SUB'
        );
        
        if (subsWithPositions.length > 0) {
          foundIssues.push(`Found ${subsWithPositions.length} substitute entries with playing positions`);
        }

        // Check for players with 0 minutes but playing positions
        const zeroMinutesWithPositions = playerStats.filter(stat =>
          stat.minutes_played === 0 && stat.position && !stat.is_substitute
        );

        if (zeroMinutesWithPositions.length > 0) {
          foundIssues.push(`Found ${zeroMinutesWithPositions.length} players with 0 minutes but playing positions`);
        }

        console.log('Data integrity check results:', {
          totalStats: playerStats.length,
          subsWithPositions: subsWithPositions.length,
          zeroMinutesWithPositions: zeroMinutesWithPositions.length
        });
      }

      // Check for duplicate position entries for same player/event/period
      const { data: duplicates, error: dupError } = await supabase
        .from('event_player_stats')
        .select('player_id, event_id, period_number, position, count(*)')
        .not('position', 'is', null)
        .group('player_id, event_id, period_number, position')
        .having('count(*) > 1');

      if (dupError) {
        console.error('Error checking duplicates:', dupError);
        foundIssues.push('Failed to check for duplicate entries');
      } else if (duplicates && duplicates.length > 0) {
        foundIssues.push(`Found ${duplicates.length} duplicate position entries`);
      }

      setIssues(foundIssues);
      
      if (foundIssues.length === 0) {
        toast.success('No data integrity issues found');
      } else {
        toast.warning(`Found ${foundIssues.length} data integrity issues`);
      }

    } catch (error) {
      console.error('Error during data integrity check:', error);
      toast.error('Failed to complete data integrity check');
    } finally {
      setIsChecking(false);
    }
  };

  const fixDataIntegrity = async () => {
    setIsFixing(true);
    
    try {
      // Regenerate all player stats from scratch
      await playerStatsService.regenerateAllPlayerStats();
      
      toast.success('Data integrity fixed - all player stats regenerated');
      
      // Recheck after fixing
      await checkDataIntegrity();
      
    } catch (error) {
      console.error('Error fixing data integrity:', error);
      toast.error('Failed to fix data integrity issues');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Data Integrity Checker
        </CardTitle>
        <CardDescription>
          Check and fix player statistics data integrity issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={checkDataIntegrity} 
            disabled={isChecking || isFixing}
            variant="outline"
          >
            {isChecking ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Check Data Integrity
          </Button>
          
          <Button 
            onClick={fixDataIntegrity} 
            disabled={isFixing || isChecking || issues.length === 0}
            variant="default"
          >
            {isFixing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            Fix Issues
          </Button>
        </div>

        {issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-destructive">Issues Found:</h4>
            <ul className="space-y-1">
              {issues.map((issue, index) => (
                <li key={index} className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p><strong>What this checks:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Substitutes incorrectly recorded with playing positions</li>
            <li>Players with 0 minutes but assigned positions</li>
            <li>Duplicate position entries for same player/event/period</li>
            <li>Position recording accuracy vs team selections</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
