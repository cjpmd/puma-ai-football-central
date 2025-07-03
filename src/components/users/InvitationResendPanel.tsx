
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { userInvitationService, UserInvitation } from '@/services/userInvitationService';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

const DELETED_INVITATIONS_KEY = 'deletedInvitations';

export const InvitationResendPanel: React.FC = () => {
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const getDeletedInvitations = (): Set<string> => {
    try {
      const deleted = localStorage.getItem(DELETED_INVITATIONS_KEY);
      return deleted ? new Set(JSON.parse(deleted)) : new Set();
    } catch {
      return new Set();
    }
  };

  const addToDeletedInvitations = (id: string) => {
    try {
      const deletedIds = getDeletedInvitations();
      deletedIds.add(id);
      localStorage.setItem(DELETED_INVITATIONS_KEY, JSON.stringify(Array.from(deletedIds)));
    } catch (error) {
      console.error('Error saving deleted invitation ID:', error);
    }
  };

  const loadInvitations = async () => {
    setIsLoading(true);
    try {
      const data = await userInvitationService.getInvitations();
      // Filter out any invitations that were deleted
      const deletedIds = getDeletedInvitations();
      const filteredData = data.filter(inv => !deletedIds.has(inv.id));
      setInvitations(filteredData);
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
    if (!window.confirm(`Are you sure you want to permanently delete the invitation for ${invitation.email}? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(invitation.id);
    try {
      // Delete from database - this will be permanent
      const { error } = await supabase
        .from('user_invitations')
        .delete()
        .eq('id', invitation.id);

      if (error) throw error;

      // Add to localStorage to prevent it from showing up again in case of cache issues
      addToDeletedInvitations(invitation.id);
      
      // Remove from local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      
      // Clear from browser storage to ensure clean state
      window.dispatchEvent(new CustomEvent('invitationDeleted', { 
        detail: { invitationId: invitation.id, email: invitation.email }
      }));
      
      toast.success(`Invitation for ${invitation.email} permanently deleted`);
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
                        disabled={resendingId === invitation.id || deletingId === invitation.id}
                      >
                        {resendingId === invitation.id ? 'Sending...' : 'Resend'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteInvitation(invitation)}
                      disabled={deletingId === invitation.id || resendingId === invitation.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title={invitation.status === 'accepted' ? 'Delete accepted invitation' : 'Delete invitation'}
                    >
                      {deletingId === invitation.id ? (
                        'Deleting...'
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
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
