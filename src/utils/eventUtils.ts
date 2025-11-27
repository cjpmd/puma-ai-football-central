import { DatabaseEvent } from '@/types/event';

/**
 * Determines if an event is past based on its date and times
 * - If event is on a different day, use date comparison
 * - If event is today, use end_time if available
 * - If no end_time, use start_time + 3 hours
 * - If no times set, consider not past yet if same day
 */
export const isEventPast = (event: DatabaseEvent): boolean => {
  const now = new Date();
  const eventDate = new Date(event.date);
  
  // If different day, use date comparison
  if (eventDate.toDateString() !== now.toDateString()) {
    return eventDate < now;
  }
  
  // Same day - check times
  if (event.end_time) {
    const endDateTime = new Date(`${event.date}T${event.end_time}`);
    return now > endDateTime;
  } else if (event.start_time) {
    // No end time - use start_time + 3 hours
    const startDateTime = new Date(`${event.date}T${event.start_time}`);
    const estimatedEnd = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000);
    return now > estimatedEnd;
  }
  
  // No times set - consider not past yet if same day
  return false;
};

/**
 * Formats time string to display without seconds (h:mm a format)
 */
export const formatTime = (time: string | undefined | null): string => {
  if (!time) return '';
  
  try {
    // Parse the time string and format without seconds
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return time;
  }
};
