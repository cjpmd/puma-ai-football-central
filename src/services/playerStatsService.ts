
import { playerMatchStatsService } from './stats/playerMatchStatsService';
import { dataRegenerationService } from './stats/dataRegenerationService';
import { eventPlayerStatsService } from './stats/eventPlayerStatsService';

export const playerStatsService = {
  // Individual player stats update
  updatePlayerStats: playerMatchStatsService.updatePlayerStats,
  
  // Event-based stats updates
  updateEventPlayerStats: playerMatchStatsService.updateEventPlayerStats,
  updateAllCompletedEventsStats: playerMatchStatsService.updateAllCompletedEventsStats,
  
  // Complete data regeneration
  regenerateAllPlayerStats: dataRegenerationService.regenerateAllPlayerStats,
  debugAndRegenerateForPlayer: dataRegenerationService.debugAndRegenerateForPlayer,
  
  // Event completion check
  isEventCompleted: eventPlayerStatsService.isEventCompleted
};
