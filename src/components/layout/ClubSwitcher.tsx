import { Check, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useClubContext } from '@/contexts/ClubContext';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

export function ClubSwitcher() {
  const { currentClub, availableClubs, setCurrentClub, isMultiClubUser } = useClubContext();
  const [open, setOpen] = useState(false);

  // Don't render if user only has one club
  if (!isMultiClubUser || availableClubs.length <= 1) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select club"
          className="w-[200px] justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            {currentClub?.logoUrl ? (
              <img 
                src={currentClub.logoUrl} 
                alt={currentClub.name}
                className="h-5 w-5 rounded object-cover"
              />
            ) : (
              <Building2 className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="truncate">{currentClub?.name || 'Select club'}</span>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs">
            {availableClubs.length}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search clubs..." />
          <CommandList>
            <CommandEmpty>No clubs found.</CommandEmpty>
            <CommandGroup heading="Your Clubs">
              {availableClubs.map((club) => (
                <CommandItem
                  key={club.id}
                  onSelect={() => {
                    setCurrentClub(club);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {club.logoUrl ? (
                      <img 
                        src={club.logoUrl} 
                        alt={club.name}
                        className="h-6 w-6 rounded object-cover"
                      />
                    ) : (
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">{club.name}</span>
                      {club.referenceNumber && (
                        <span className="text-xs text-muted-foreground">
                          {club.referenceNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <Check
                    className={cn(
                      'ml-auto h-4 w-4',
                      currentClub?.id === club.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
