import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UserCheck, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EventSquadPickerProps {
  teamId: string;
  selectedPlayerIds: string[];
  selectedStaffIds: string[];
  onPlayerToggle: (playerId: string) => void;
  onStaffToggle: (staffId: string) => void;
  onSelectAll: (type: 'full_squad' | 'training' | 'trialist' | 'staff') => void;
  onDeselectAll: (type: 'full_squad' | 'training' | 'trialist' | 'staff') => void;
}

export const EventSquadPicker = ({
  teamId,
  selectedPlayerIds,
  selectedStaffIds,
  onPlayerToggle,
  onStaffToggle,
  onSelectAll,
  onDeselectAll
}: EventSquadPickerProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fullSquadOpen, setFullSquadOpen] = useState(true);
  const [trainingOpen, setTrainingOpen] = useState(true);
  const [trialistOpen, setTrialistOpen] = useState(true);
  const [staffOpen, setStaffOpen] = useState(true);

  // Fetch players
  const { data: playersData = [] } = useQuery({
    queryKey: ['team-players-picker', teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<any[]> => {
      // @ts-ignore - Supabase type inference causes excessive depth
      const result: any = await supabase
        .from('players')
        .select('id, name, squad_number, subscription_type')
        .eq('team_id', teamId!)
        .order('squad_number', { ascending: true, nullsFirst: false });
      
      if (result.error) throw result.error;
      return result.data || [];
    }
  });

  // Fetch staff
  const { data: staffData = [] } = useQuery({
    queryKey: ['team-staff-picker', teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<any[]> => {
      // @ts-ignore - Supabase type inference causes excessive depth
      const result: any = await supabase
        .from('team_staff')
        .select('id, name, role')
        .eq('team_id', teamId!)
        .order('name', { ascending: true });
      
      if (result.error) throw result.error;
      return result.data || [];
    }
  });

  const players: any[] = playersData;
  const staff: any[] = staffData;

  // Group players by subscription type
  const playersByType = useMemo(() => {
    const filtered = players.filter(p => {
      const playerName = p.name || '';
      return playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.squad_number?.toString().includes(searchTerm);
    });

    return {
      full_squad: filtered.filter(p => (p.subscription_type || 'full_squad') === 'full_squad'),
      training: filtered.filter(p => p.subscription_type === 'training'),
      trialist: filtered.filter(p => p.subscription_type === 'trialist')
    };
  }, [players, searchTerm]);

  // Filter staff
  const filteredStaff = useMemo(() => 
    staff.filter(s => {
      const staffName = s.name || '';
      return staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.role?.toLowerCase().includes(searchTerm.toLowerCase());
    }),
    [staff, searchTerm]
  );

  const totalSelected = selectedPlayerIds.length + selectedStaffIds.length;
  const totalAvailable = players.length + staff.length;

  const renderPlayerSection = (
    title: string,
    sectionPlayers: any[],
    type: 'full_squad' | 'training' | 'trialist',
    isOpen: boolean,
    setIsOpen: (open: boolean) => void
  ) => {
    const selectedCount = sectionPlayers.filter(p => selectedPlayerIds.includes(p.id)).length;
    const allSelected = sectionPlayers.length > 0 && selectedCount === sectionPlayers.length;

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{title}</CardTitle>
                  <Badge variant="secondary">
                    {selectedCount}/{sectionPlayers.length}
                  </Badge>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {sectionPlayers.length > 0 && (
                <div className="flex gap-2 mb-4">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectAll(type)}
                    disabled={allSelected}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onDeselectAll(type)}
                    disabled={selectedCount === 0}
                  >
                    Deselect All
                  </Button>
                </div>
              )}
              {sectionPlayers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No {title.toLowerCase()} players</p>
              ) : (
                <div className="space-y-2">
                  {sectionPlayers.map(player => (
                    <div
                      key={player.id}
                      className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        id={`player-${player.id}`}
                        checked={selectedPlayerIds.includes(player.id)}
                        onCheckedChange={() => onPlayerToggle(player.id)}
                      />
                      <label
                        htmlFor={`player-${player.id}`}
                        className="flex-1 cursor-pointer flex items-center gap-3"
                      >
                        {player.squad_number && (
                          <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                            {player.squad_number}
                          </Badge>
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{player.name}</p>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with selection count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Select Squad</h3>
        </div>
        <Badge variant="secondary" className="text-base">
          {totalSelected} / {totalAvailable} selected
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search players and staff..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Player Sections */}
      <div className="space-y-3">
        {renderPlayerSection(
          'Full Squad',
          playersByType.full_squad,
          'full_squad',
          fullSquadOpen,
          setFullSquadOpen
        )}
        {renderPlayerSection(
          'Training',
          playersByType.training,
          'training',
          trainingOpen,
          setTrainingOpen
        )}
        {renderPlayerSection(
          'Trialist',
          playersByType.trialist,
          'trialist',
          trialistOpen,
          setTrialistOpen
        )}

        {/* Staff Section */}
        <Collapsible open={staffOpen} onOpenChange={setStaffOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Staff</CardTitle>
                    <Badge variant="secondary">
                      {selectedStaffIds.length}/{filteredStaff.length}
                    </Badge>
                  </div>
                  {staffOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {filteredStaff.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectAll('staff')}
                      disabled={selectedStaffIds.length === filteredStaff.length}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onDeselectAll('staff')}
                      disabled={selectedStaffIds.length === 0}
                    >
                      Deselect All
                    </Button>
                  </div>
                )}
                {filteredStaff.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No staff members</p>
                ) : (
                  <div className="space-y-2">
                    {filteredStaff.map(staffMember => (
                      <div
                        key={staffMember.id}
                        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          id={`staff-${staffMember.id}`}
                          checked={selectedStaffIds.includes(staffMember.id)}
                          onCheckedChange={() => onStaffToggle(staffMember.id)}
                        />
                        <label
                          htmlFor={`staff-${staffMember.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <p className="font-medium">{staffMember.name}</p>
                          {staffMember.role && (
                            <p className="text-sm text-muted-foreground">{staffMember.role}</p>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
};
