import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Send, Users, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { enhancedNotificationService } from '@/services/enhancedNotificationService';

interface ManualReminderPanelProps {
  eventId: string;
  eventTitle: string;
  onClose?: () => void;
}

interface User {
  id: string;
  name: string;
  role: string;
  hasRSVP: boolean;
  rsvpStatus?: string;
}

export const ManualReminderPanel: React.FC<ManualReminderPanelProps> = ({
  eventId,
  eventTitle,
  onClose
}) => {
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAvailableUsers();
  }, [eventId]);

  const loadAvailableUsers = async () => {
    try {
      setLoadingUsers(true);
      
      // Get event details to determine team
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('team_id, title')
        .eq('id', eventId)
        .single();

      if (eventError) {
        throw eventError;
      }

      // Get all users associated with this team (players, parents, staff)
      const { data: teamUsers, error: usersError } = await supabase
        .from('user_teams')
        .select(`
          user_id,
          role,
          profiles!inner (
            id
          )
        `)
        .eq('team_id', event.team_id);

      if (usersError) {
        throw usersError;
      }

      // Get players and their parents
      const { data: playerUsers, error: playerError } = await supabase
        .from('user_players')
        .select(`
          user_id,
          relationship,
          players!inner (
            id,
            name,
            team_id
          )
        `)
        .eq('players.team_id', event.team_id);

      if (playerError) {
        console.error('Error loading player users:', playerError);
      }

      // Get staff users
      const { data: staffUsers, error: staffError } = await supabase
        .from('user_staff')
        .select(`
          user_id,
          team_staff!inner (
            id,
            name,
            role,
            team_id
          )
        `)
        .eq('team_staff.team_id', event.team_id);

      if (staffError) {
        console.error('Error loading staff users:', staffError);
      }

      // Get existing RSVP statuses
      const { data: rsvpData, error: rsvpError } = await supabase
        .from('event_availability')
        .select('user_id, status')
        .eq('event_id', eventId);

      if (rsvpError) {
        console.error('Error loading RSVP data:', rsvpError);
      }

      // Combine all users
      const allUsers: User[] = [];
      const rsvpMap = new Map(rsvpData?.map(r => [r.user_id, r.status]) || []);

      // Add team users
      teamUsers?.forEach(tu => {
        if (tu.profiles) {
          allUsers.push({
            id: tu.user_id,
            name: `Team Member ${tu.user_id.slice(0, 8)}`,
            role: `Team ${tu.role}`,
            hasRSVP: rsvpMap.has(tu.user_id),
            rsvpStatus: rsvpMap.get(tu.user_id)
          });
        }
      });

      // Add player users (parents/guardians)
      playerUsers?.forEach(pu => {
        if (pu.players) {
          allUsers.push({
            id: pu.user_id,
            name: `${pu.relationship} of ${pu.players.name}`,
            role: `${pu.relationship}`,
            hasRSVP: rsvpMap.has(pu.user_id),
            rsvpStatus: rsvpMap.get(pu.user_id)
          });
        }
      });

      // Add staff users
      staffUsers?.forEach(su => {
        if (su.team_staff) {
          allUsers.push({
            id: su.user_id,
            name: su.team_staff.name,
            role: `Staff - ${su.team_staff.role}`,
            hasRSVP: rsvpMap.has(su.user_id),
            rsvpStatus: rsvpMap.get(su.user_id)
          });
        }
      });

      // Remove duplicates and sort
      const uniqueUsers = allUsers.filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
      ).sort((a, b) => a.name.localeCompare(b.name));

      setAvailableUsers(uniqueUsers);
      
      // Pre-select users who haven't RSVP'd
      const usersWithoutRSVP = uniqueUsers
        .filter(user => !user.hasRSVP)
        .map(user => user.id);
      setSelectedUserIds(usersWithoutRSVP);

      // Set default message
      setMessage(`Please confirm your attendance for ${event.title}.`);
      setTitle(`Reminder: ${event.title}`);

    } catch (error) {
      console.error('Error loading available users:', error);
      toast({
        title: "Error",
        description: "Failed to load available users",
        variant: "destructive"
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUserIds(prev => [...prev, userId]);
    } else {
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = () => {
    setSelectedUserIds(availableUsers.map(user => user.id));
  };

  const handleSelectNone = () => {
    setSelectedUserIds([]);
  };

  const handleSelectNoRSVP = () => {
    const usersWithoutRSVP = availableUsers
      .filter(user => !user.hasRSVP)
      .map(user => user.id);
    setSelectedUserIds(usersWithoutRSVP);
  };

  const handleSendReminder = async () => {
    if (selectedUserIds.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please select at least one user to send the reminder to",
        variant: "destructive"
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Empty Message",
        description: "Please enter a reminder message",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      await enhancedNotificationService.sendManualReminder({
        eventId,
        selectedUserIds,
        message: message.trim(),
        title: title.trim() || undefined
      });

      toast({
        title: "Reminder Sent",
        description: `Manual reminder sent to ${selectedUserIds.length} users`,
      });

      // Reset form
      setMessage('');
      setTitle('');
      setSelectedUserIds([]);
      
      if (onClose) {
        onClose();
      }

    } catch (error) {
      console.error('Error sending manual reminder:', error);
      toast({
        title: "Error",
        description: "Failed to send manual reminder",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRSVPBadgeVariant = (status?: string) => {
    switch (status) {
      case 'yes': return 'default';
      case 'no': return 'destructive';
      case 'maybe': return 'secondary';
      default: return 'outline';
    }
  };

  const getRSVPBadgeText = (hasRSVP: boolean, status?: string) => {
    if (!hasRSVP) return 'No RSVP';
    switch (status) {
      case 'yes': return 'Attending';
      case 'no': return 'Not Attending';
      case 'maybe': return 'Maybe';
      default: return 'Unknown';
    }
  };

  if (loadingUsers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Manual Reminder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="text-muted-foreground">Loading available users...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Send Manual Reminder
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Send a custom reminder to selected users for "{eventTitle}"
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Message Settings */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="reminder-title">Title (optional)</Label>
            <Input
              id="reminder-title"
              placeholder="Custom reminder title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="reminder-message">Message</Label>
            <Textarea
              id="reminder-message"
              placeholder="Enter your reminder message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <Separator />

        {/* User Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base">Recipients ({selectedUserIds.length} selected)</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleSelectNoRSVP}>
                Select No RSVP
              </Button>
              <Button variant="outline" size="sm" onClick={handleSelectNone}>
                Select None
              </Button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-3">
            {availableUsers.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                No users found for this event
              </div>
            ) : (
              availableUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 hover:bg-muted/50 rounded"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={(checked) => 
                        handleUserSelection(user.id, checked as boolean)
                      }
                    />
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.role}</div>
                    </div>
                  </div>
                  <Badge variant={getRSVPBadgeVariant(user.rsvpStatus)}>
                    {getRSVPBadgeText(user.hasRSVP, user.rsvpStatus)}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {selectedUserIds.length} recipient{selectedUserIds.length !== 1 ? 's' : ''} selected
          </div>
          
          <div className="flex gap-2">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleSendReminder}
              disabled={loading || selectedUserIds.length === 0 || !message.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Sending...' : 'Send Reminder'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};