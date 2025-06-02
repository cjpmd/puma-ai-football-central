
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, AlertCircle } from 'lucide-react';

interface LogoUploadProps {
  currentLogoUrl?: string | null;
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

    console.log('Starting logo upload for:', entityType, entityId, entityName);

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
      if (currentLogoUrl && currentLogoUrl.includes('/storage/v1/object/public/logos/')) {
        const urlParts = currentLogoUrl.split('/');
        const oldFileName = urlParts[urlParts.length - 1];
        if (oldFileName && oldFileName !== 'undefined') {
          await supabase.storage
            .from('logos')
            .remove([`${entityType}s/${oldFileName}`]);
        }
      }

      // Upload new logo
      const fileExt = file.name.split('.').pop();
      const fileName = `${entityId}-${Date.now()}.${fileExt}`;
      const filePath = `${entityType}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

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

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      onLogoChange(logoUrl);
      
      toast({
        title: 'Logo uploaded successfully',
        description: `${entityName} logo has been updated.`,
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
      event.target.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentLogoUrl) return;

    setUploading(true);
    try {
      // Delete from storage
      if (currentLogoUrl.includes('/storage/v1/object/public/logos/')) {
        const urlParts = currentLogoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        if (fileName && fileName !== 'undefined') {
          await supabase.storage
            .from('logos')
            .remove([`${entityType}s/${fileName}`]);
        }
      }

      // Update database
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label htmlFor={`logo-upload-${entityId}`} className="text-base font-semibold">
          {entityType === 'team' ? 'Team' : 'Club'} Logo
        </Label>
        {currentLogoUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveLogo}
            disabled={uploading}
            className="text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="w-20 h-20 border-2 border-dashed border-muted-foreground rounded-xl flex items-center justify-center bg-muted shadow-inner">
          {currentLogoUrl ? (
            <img 
              src={currentLogoUrl} 
              alt={`${entityName} logo`}
              className="w-18 h-18 object-contain rounded-lg"
            />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 space-y-2">
          <Input
            id={`logo-upload-${entityId}`}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={handleFileUpload}
            disabled={uploading}
            className="cursor-pointer"
          />
          <p className="text-sm text-muted-foreground">
            Upload JPEG, PNG, WebP, or SVG. Maximum 5MB.
            {uploading && <span className="text-blue-600 font-medium"> Uploading...</span>}
          </p>
        </div>
      </div>
    </div>
  );
};
