
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
      return `${firstInitial}.${lastInitial}.`;
    
    default:
      return nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
  }
};
