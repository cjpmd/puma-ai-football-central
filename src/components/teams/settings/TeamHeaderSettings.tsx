import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Team, HeaderDisplayType } from '@/types/team';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TeamHeaderSettingsProps {
  team: Team;
  onUpdate: (data: Partial<Team>) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const TeamHeaderSettings: React.FC<TeamHeaderSettingsProps> = ({
  team,
  onUpdate,
  onSave,
  isSaving
}) => {
  const { teams } = useAuth();
  const hasMultipleTeams = teams && teams.length > 1;
  
  const [formData, setFormData] = useState({
    headerDisplayType: (team as any).headerDisplayType || 'logo_and_name',
    headerImageUrl: (team as any).headerImageUrl || ''
  });

  const handleDisplayTypeChange = (value: HeaderDisplayType) => {
    const updatedData = { ...formData, headerDisplayType: value };
    setFormData(updatedData);
    onUpdate(updatedData);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${team.id}-header-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file);

      if (uploadError) {
        toast.error('Failed to upload header image');
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      const updatedData = { ...formData, headerImageUrl: publicUrl };
      setFormData(updatedData);
      onUpdate(updatedData);
      
      toast.success('Header image uploaded successfully');
    } catch (error) {
      console.error('Error uploading header image:', error);
      toast.error('Failed to upload header image');
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({
          header_display_type: formData.headerDisplayType,
          header_image_url: formData.headerImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', team.id);

      if (error) {
        console.error('Error saving header settings:', error);
        toast.error('Failed to save header settings');
        return;
      }

      toast.success('Header settings saved successfully');
      onSave();
    } catch (error) {
      console.error('Error saving header settings:', error);
      toast.error('Failed to save header settings');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mobile Header Display</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base font-medium">Display Options</Label>
            <RadioGroup 
              value={formData.headerDisplayType} 
              onValueChange={handleDisplayTypeChange}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="logo_and_name" id="logo_and_name" />
                <Label htmlFor="logo_and_name" className="font-normal">
                  Show Team Logo and Name
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="logo_only" id="logo_only" />
                <Label htmlFor="logo_only" className="font-normal">
                  Show Team Logo Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="font-normal">
                  No Team Logo or Name
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom_image" id="custom_image" disabled={hasMultipleTeams} />
                <Label htmlFor="custom_image" className={`font-normal ${hasMultipleTeams ? 'text-muted-foreground' : ''}`}>
                  Upload Custom Image {hasMultipleTeams && '(Not available with multiple teams)'}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {formData.headerDisplayType === 'custom_image' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="header-image" className="text-sm font-medium">
                  Custom Header Image
                </Label>
                <div className="mt-2 flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="relative overflow-hidden"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Image
                    <input
                      id="header-image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </Button>
                  {formData.headerImageUrl && (
                    <div className="flex items-center gap-2">
                      <img
                        src={formData.headerImageUrl}
                        alt="Header preview"
                        className="h-10 w-20 object-cover rounded"
                      />
                      <span className="text-sm text-green-600">✓ Image uploaded</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended size: 320x56 pixels for best mobile display
                </p>
              </div>
            </div>
          )}

          <div className="rounded-lg border p-4 bg-muted/50">
            <h4 className="font-medium mb-2">Preview</h4>
            <div className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white p-3 rounded-lg">
              <div className="flex items-center gap-2">
                {formData.headerDisplayType === 'logo_and_name' && (
                  <>
                    {team.logoUrl ? (
                      <img 
                        src={team.logoUrl} 
                        alt={team.name}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                        {team.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                    )}
                    <span className="text-sm font-medium text-white">{team.name}</span>
                  </>
                )}
                {formData.headerDisplayType === 'logo_only' && (
                  <>
                    {team.logoUrl ? (
                      <img 
                        src={team.logoUrl} 
                        alt={team.name}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                        {team.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                    )}
                  </>
                )}
                {formData.headerDisplayType === 'none' && (
                  <span className="text-sm font-medium text-white">Team Manager</span>
                )}
                {formData.headerDisplayType === 'custom_image' && formData.headerImageUrl && (
                  <img 
                    src={formData.headerImageUrl} 
                    alt="Custom header"
                    className="h-6 max-w-40 object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};