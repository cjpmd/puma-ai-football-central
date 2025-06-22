
import { eventPlayerStatsService } from './eventPlayerStatsService';
import { playerMatchStatsService } from './playerMatchStatsService';
import { debugPlayerPositions } from '@/utils/debugPlayerPositions';

export const dataRegenerationService = {
  async regenerateAllPlayerStats(): Promise<void> {
    try {
      console.log('=== STARTING COMPLETE DATA REGENERATION ===');
      
      // Step 1: Clear all existing event_player_stats
      await eventPlayerStatsService.clearAllEventPlayerStats();

      // Step 2: Regenerate event_player_stats from event_selections
      console.log('Step 2: Regenerating event_player_stats from event_selections...');
      await eventPlayerStatsService.regenerateFromSelections();

      // Step 3: Update all player match stats
      console.log('Step 3: Updating all player match stats...');
      await playerMatchStatsService.updateAllCompletedEventsStats();
      
      console.log('=== COMPLETE DATA REGENERATION FINISHED ===');
    } catch (error) {
      console.error('Error regenerating player stats:', error);
      throw error;
    }
  },

  async debugAndRegenerateForPlayer(playerId: string, playerName: string): Promise<void> {
    try {
      console.log(`🎯 STARTING MANUAL DATA REGENERATION FOR ${playerName}`);
      
      // Debug current player positions before regeneration
      await debugPlayerPositions(playerId, playerName);
      
      // Use the regeneration service
      await this.regenerateAllPlayerStats();
      
      // Debug positions after regeneration
      console.log('🎯 POST-REGENERATION DEBUG:');
      await debugPlayerPositions(playerId, playerName);
      
    } catch (error) {
      console.error('Error in debug and regeneration:', error);
      throw error;
    }
  }
};
