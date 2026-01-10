import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PushNotificationSetup } from '@/components/notifications/PushNotificationSetup';
import { MobileImageEditor } from '@/components/players/MobileImageEditor';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserRoleData {
  teamRoles: { role: string; teams: { name: string } | null }[];
  clubRoles: { role: string; clubs: { name: string } | null }[];
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { profile, user, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // User roles state
  const [userRoles, setUserRoles] = useState<UserRoleData>({ teamRoles: [], clubRoles: [] });
  
  // Avatar state
  const [avatarFile, setAvatarFile] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Sync form data when modal opens or profile/user changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: profile?.name || '',
        email: user?.email || profile?.email || '',
        phone: profile?.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      // Reset avatar state
      setAvatarFile(null);
      setAvatarPreview(null);
      setShowImageEditor(false);
      setSelectedImageUrl(null);
      
      // Fetch user roles
      const fetchRoles = async () => {
        if (!profile?.id) return;
        
        const { data: teamRoles } = await supabase
          .from('user_teams')
          .select('role, teams(name)')
          .eq('user_id', profile.id);
          
        const { data: clubRoles } = await supabase
          .from('user_clubs')
          .select('role, clubs(name)')
          .eq('user_id', profile.id);
          
        setUserRoles({ 
          teamRoles: (teamRoles || []) as any, 
          clubRoles: (clubRoles || []) as any 
        });
      };

      fetchRoles();
    }
  }, [isOpen, profile, user]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImageUrl(url);
      setShowImageEditor(true);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveEditedImage = (blob: Blob) => {
    setAvatarFile(blob);
    setAvatarPreview(URL.createObjectURL(blob));
    setShowImageEditor(false);
    setSelectedImageUrl(null);
  };

  const handleCancelImageEdit = () => {
    setShowImageEditor(false);
    if (selectedImageUrl) {
      URL.revokeObjectURL(selectedImageUrl);
    }
    setSelectedImageUrl(null);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let avatarUrl = profile?.avatar_url;

      // Upload avatar if changed
      if (avatarFile && user?.id) {
        const fileName = `${user.id}/${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = urlData.publicUrl;
      }

      // Update profile
      const updateData: Record<string, any> = {};
      if (formData.name !== undefined) updateData.name = formData.name || null;
      if (formData.phone !== undefined) updateData.phone = formData.phone || null;
      if (avatarUrl !== profile?.avatar_url) updateData.avatar_url = avatarUrl;

      if (Object.keys(updateData).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', profile?.id);

        if (profileError) throw profileError;
      }

      // Update email if changed
      const currentEmail = user?.email || profile?.email;
      if (formData.email && formData.email !== currentEmail) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });
        if (emailError) throw emailError;
        
        toast({
          title: 'Email Update',
          description: 'Please check your new email for confirmation'
        });
      }

      // Update password if provided
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('New passwords do not match');
        }
        
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.newPassword
        });
        if (passwordError) throw passwordError;
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      });

      await refreshUserData();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const currentAvatarUrl = avatarPreview || profile?.avatar_url;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Edit Profile
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6">
              <div className="space-y-4 pb-4">
                {/* Avatar Section */}
                <div className="flex flex-col items-center py-4">
                  <div className="relative">
                    <Avatar className="w-24 h-24">
                      {currentAvatarUrl ? (
                        <AvatarImage src={currentAvatarUrl} alt="Profile" />
                      ) : null}
                      <AvatarFallback className="text-2xl bg-muted">
                        {getInitials(formData.name || profile?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Tap to change photo</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>

                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Your full name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your.email@example.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Your phone number"
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Change Password (Optional)</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </div>

                {/* Roles Section - Read Only */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Your Roles</h4>
                  <div className="space-y-3">
                    {/* Team Roles */}
                    {userRoles.teamRoles.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Team Roles</p>
                        <div className="flex flex-wrap gap-2">
                          {userRoles.teamRoles.map((tr, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {formatRole(tr.role)} - {tr.teams?.name || 'Unknown'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Club Roles */}
                    {userRoles.clubRoles.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Club Roles</p>
                        <div className="flex flex-wrap gap-2">
                          {userRoles.clubRoles.map((cr, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {formatRole(cr.role)} - {cr.clubs?.name || 'Unknown'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Profile Roles */}
                    {profile?.roles && profile.roles.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Profile Roles</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.roles.map((role, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {formatRole(role)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {userRoles.teamRoles.length === 0 && userRoles.clubRoles.length === 0 && (!profile?.roles || profile.roles.length === 0) && (
                      <p className="text-sm text-muted-foreground">No roles assigned</p>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      Contact your team or club administrator to modify roles.
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Notifications</h4>
                  <PushNotificationSetup />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 px-6 py-4 border-t bg-background">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Editor Modal */}
      {showImageEditor && selectedImageUrl && (
        <MobileImageEditor
          imageUrl={selectedImageUrl}
          onSave={handleSaveEditedImage}
          onCancel={handleCancelImageEdit}
        />
      )}
    </>
  );
};