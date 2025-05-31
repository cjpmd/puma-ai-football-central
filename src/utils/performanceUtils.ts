
import { supabase } from '@/integrations/supabase/client';

export type PerformanceTrend = 'improving' | 'maintaining' | 'needs-work';

export const calculatePerformanceTrend = async (playerId: string): Promise<PerformanceTrend> => {
  try {
    // Get the most recent attribute history entries (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentHistory, error } = await supabase
      .from('player_attribute_history')
      .select('attribute_name, value, recorded_date')
      .eq('player_id', playerId)
      .gte('recorded_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('recorded_date', { ascending: false });

    if (error || !recentHistory || recentHistory.length === 0) {
      return 'maintaining'; // Default to maintaining if no recent data
    }

    // Group by attribute and get the trend for each
    const attributeTrends = new Map<string, number[]>();
    
    recentHistory.forEach(entry => {
      if (!attributeTrends.has(entry.attribute_name)) {
        attributeTrends.set(entry.attribute_name, []);
      }
      attributeTrends.get(entry.attribute_name)!.push(entry.value);
    });

    // Calculate trend for each attribute (comparing most recent vs older values)
    let improvingCount = 0;
    let decliningCount = 0;
    let maintainingCount = 0;

    attributeTrends.forEach((values, attributeName) => {
      if (values.length < 2) {
        maintainingCount++;
        return;
      }

      // Sort by most recent first, then compare recent average vs older average
      const sortedValues = values.sort((a, b) => b - a);
      const recentValues = sortedValues.slice(0, Math.ceil(sortedValues.length / 2));
      const olderValues = sortedValues.slice(Math.ceil(sortedValues.length / 2));

      const recentAvg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
      const olderAvg = olderValues.reduce((sum, val) => sum + val, 0) / olderValues.length;

      const difference = recentAvg - olderAvg;

      if (difference > 0.5) {
        improvingCount++;
      } else if (difference < -0.5) {
        decliningCount++;
      } else {
        maintainingCount++;
      }
    });

    // Determine overall trend based on majority
    const totalAttributes = improvingCount + decliningCount + maintainingCount;
    
    if (improvingCount / totalAttributes > 0.5) {
      return 'improving';
    } else if (decliningCount / totalAttributes > 0.4) {
      return 'needs-work';
    } else {
      return 'maintaining';
    }

  } catch (error) {
    console.error('Error calculating performance trend:', error);
    return 'maintaining';
  }
};

export const getPerformanceIcon = (trend: PerformanceTrend) => {
  switch (trend) {
    case 'improving':
      return 'arrow-up';
    case 'needs-work':
      return 'arrow-down';
    case 'maintaining':
    default:
      return null; // No icon for maintaining
  }
};

export const getPerformanceColor = (trend: PerformanceTrend) => {
  switch (trend) {
    case 'improving':
      return 'text-green-600';
    case 'needs-work':
      return 'text-red-600';
    case 'maintaining':
    default:
      return 'text-gray-400';
  }
};
