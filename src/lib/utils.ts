
import { type ClassValue, clsx } from "clsx"
import { format, differenceInYears } from "date-fns";
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string, formatString: string = 'PPP'): string {
  // Ensure date is a Date object
  const dateObject = date instanceof Date ? date : new Date(date);
  
  // Check if date is valid
  if (isNaN(dateObject.getTime())) {
    console.error('Invalid date:', date);
    return 'Invalid date';
  }
  
  return format(dateObject, formatString);
}

export function calculateAge(dateOfBirth: Date): number {
  return differenceInYears(new Date(), dateOfBirth);
}
