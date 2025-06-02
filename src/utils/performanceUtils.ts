export type PerformanceTrend = 'improving' | 'maintaining' | 'needs-work';

interface AttributeChange {
  timestamp: string;
  previousValue: number;
  newValue: number;
  category: string;
}

export async function calculatePerformanceTrend(playerId: string): Promise<PerformanceTrend> {
  try {
    // Get the player's recent attribute changes
    const attributeChanges = await getRecentAttributeChanges(playerId);
    
    if (attributeChanges.length === 0) {
      return 'maintaining';
    }

    // Check if there are any improvements in the last 2 weeks
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const recentImprovements = attributeChanges.filter(change => {
      const changeDate = new Date(change.timestamp);
      return changeDate >= twoWeeksAgo && change.newValue > change.previousValue;
    });

    const recentDeclines = attributeChanges.filter(change => {
      const changeDate = new Date(change.timestamp);
      return changeDate >= twoWeeksAgo && change.newValue < change.previousValue;
    });

    // If there are recent improvements, mark as improving
    if (recentImprovements.length > 0) {
      return 'improving';
    }

    // If there are recent declines, mark as needs work
    if (recentDeclines.length > 0) {
      return 'needs-work';
    }

    // Otherwise, maintaining
    return 'maintaining';
  } catch (error) {
    console.error('Error calculating performance trend:', error);
    return 'maintaining';
  }
}

async function getRecentAttributeChanges(playerId: string): Promise<AttributeChange[]> {
  // In a real implementation, this would fetch from a database
  // For now, we'll simulate recent changes for Oscar Grieve
  if (playerId === 'oscar-grieve-id') {
    const now = new Date();
    return [
      {
        timestamp: now.toISOString(),
        previousValue: 6,
        newValue: 8,
        category: 'Shot Stopping'
      },
      {
        timestamp: now.toISOString(),
        previousValue: 5.0,
        newValue: 5.7,
        category: 'Overall'
      }
    ];
  }
  
  return [];
}

export function getPerformanceIcon(trend: PerformanceTrend): string {
  switch (trend) {
    case 'improving':
      return '📈';
    case 'needs-work':
      return '📉';
    case 'maintaining':
    default:
      return '➡️';
  }
}

export function getPerformanceColor(trend: PerformanceTrend): string {
  switch (trend) {
    case 'improving':
      return 'text-green-600';
    case 'needs-work':
      return 'text-red-600';
    case 'maintaining':
    default:
      return 'text-gray-600';
  }
}
