
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { userInvitationService, UserInvitation } from '@/services/userInvitationService';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export const InvitationResendPanel: React.FC = () => {
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    setIsLoading(true);
    try {
      const data = await userInvitationService.getInvitations();
      setInvitations(data);
    } catch (error) {
      console.error('Error loading invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  };

  const resendInvitation = async (invitation: UserInvitation) => {
    setResendingId(invitation.id);
    try {
      console.log('Resending invitation:', invitation);
      await userInvitationService.sendInvitationEmail(invitation);
      toast.success(`Invitation resent to ${invitation.email}`);
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  const deleteInvitation = async (invitation: UserInvitation) => {
    if (!confirm(`Are you sure you want to delete the invitation for ${invitation.name} (${invitation.email})?`)) {
      return;
    }

    setDeletingId(invitation.id);
    try {
      const { error } = await supabase
        .from('user_invitations')
        .delete()
        .eq('id', invitation.id);

      if (error) throw error;

      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      toast.success(`Invitation for ${invitation.name} deleted successfully`);
    } catch (error) {
      console.error('Error deleting invitation:', error);
      toast.error('Failed to delete invitation');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'accepted': return 'bg-green-500';
      case 'expired': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading invitations...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Invitations</CardTitle>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <p className="text-gray-500">No invitations found</p>
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{invitation.name}</span>
                    <Badge className={getStatusColor(invitation.status)}>
                      {invitation.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    {invitation.email} • {invitation.role}
                  </div>
                  <div className="text-xs text-gray-400">
                    Created: {new Date(invitation.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {invitation.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resendInvitation(invitation)}
                      disabled={resendingId === invitation.id}
                    >
                      {resendingId === invitation.id ? 'Sending...' : 'Resend'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteInvitation(invitation)}
                    disabled={deletingId === invitation.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button 
          onClick={loadInvitations} 
          variant="outline" 
          size="sm" 
          className="mt-4"
        >
          Refresh
        </Button>
      </CardContent>
    </Card>
  );
};
