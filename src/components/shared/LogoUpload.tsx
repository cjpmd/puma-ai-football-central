
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X } from 'lucide-react';

interface LogoUploadProps {
  currentLogoUrl?: string;
  onLogoChange: (logoUrl: string | null) => void;
  entityType: 'team' | 'club';
  entityId: string;
  entityName: string;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({
  currentLogoUrl,
  onLogoChange,
  entityType,
  entityId,
  entityName
}) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, WebP, or SVG image.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5242880) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Delete old logo if it exists
      if (currentLogoUrl) {
        const oldFileName = currentLogoUrl.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from('logos').remove([`${entityType}s/${oldFileName}`]);
        }
      }

      // Upload new logo
      const fileExt = file.name.split('.').pop();
      const fileName = `${entityId}-${Date.now()}.${fileExt}`;
      const filePath = `${entityType}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      const logoUrl = urlData.publicUrl;

      // Update entity in database
      const tableName = entityType === 'team' ? 'teams' : 'clubs';
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ logo_url: logoUrl })
        .eq('id', entityId);

      if (updateError) throw updateError;

      onLogoChange(logoUrl);
      toast({
        title: 'Logo uploaded',
        description: `${entityName} logo has been updated successfully.`,
      });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentLogoUrl) return;

    setUploading(true);
    try {
      // Delete from storage
      const fileName = currentLogoUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('logos').remove([`${entityType}s/${fileName}`]);
      }

      // Update entity in database
      const tableName = entityType === 'team' ? 'teams' : 'clubs';
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ logo_url: null })
        .eq('id', entityId);

      if (updateError) throw updateError;

      onLogoChange(null);
      toast({
        title: 'Logo removed',
        description: `${entityName} logo has been removed.`,
      });
    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast({
        title: 'Remove failed',
        description: error.message || 'Failed to remove logo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor={`logo-upload-${entityId}`}>Logo</Label>
        {currentLogoUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveLogo}
            disabled={uploading}
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Logo preview */}
        <div className="w-16 h-16 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center bg-muted">
          {currentLogoUrl ? (
            <img 
              src={currentLogoUrl} 
              alt={`${entityName} logo`}
              className="w-14 h-14 object-contain rounded"
            />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        {/* Upload input */}
        <div className="flex-1">
          <Input
            id={`logo-upload-${entityId}`}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={handleFileUpload}
            disabled={uploading}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground mt-1">
            JPEG, PNG, WebP, or SVG. Max 5MB.
          </p>
        </div>
      </div>
    </div>
  );
};
