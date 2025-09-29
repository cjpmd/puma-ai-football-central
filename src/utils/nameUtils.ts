import { NameDisplayOption } from '@/types/team';

export const formatPlayerName = (fullName: string, displayOption: NameDisplayOption = 'surname'): string => {
  if (!fullName || fullName.trim() === '') return 'Unknown Player';
  
  const nameParts = fullName.trim().split(' ');
  
  switch (displayOption) {
    case 'firstName':
      return nameParts[0] || 'Unknown';
    
    case 'surname':
      return nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
    
    case 'fullName':
      return fullName;
    
    case 'initials':
      if (nameParts.length === 1) {
        return nameParts[0].charAt(0).toUpperCase() + '.';
      }
      const firstInitial = nameParts[0].charAt(0).toUpperCase();
      const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
      return `${firstInitial}${lastInitial}`;
    
    default:
      return nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
  }
};

/**
 * Utility function to get the first name from a full name
 * @param fullName - The complete name string
 * @returns The first name only
 */
export const getFirstName = (fullName: string): string => {
  if (!fullName) return '';
  
  const nameParts = fullName.trim().split(' ');
  return nameParts[0] || '';
};

/**
 * Get a personalized greeting for the user
 * @param profile - User profile containing name
 * @param userEmail - Fallback email if name is not available
 * @param defaultGreeting - Default greeting if neither name nor email is available
 * @returns Personalized greeting string
 */
export const getPersonalizedGreeting = (
  profile: { name?: string } | null, 
  userEmail?: string, 
  defaultGreeting: string = 'there'
): string => {
  if (profile?.name) {
    const firstName = getFirstName(profile.name);
    return firstName || defaultGreeting;
  }
  
  if (userEmail) {
    // Extract name from email if no profile name (e.g., "john.doe@email.com" -> "John")
    const emailName = userEmail.split('@')[0];
    const firstName = emailName.split('.')[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  }
  
  return defaultGreeting;
};