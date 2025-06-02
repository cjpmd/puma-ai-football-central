
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
    console.log('File details:', { name: file.name, size: file.size, type: file.type });

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
      // Test storage connection first
      console.log('Testing storage connection...');
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Error accessing storage:', bucketsError);
        throw new Error(`Storage access error: ${bucketsError.message}`);
      }

      console.log('Available storage buckets:', buckets);
      
      const logosBucket = buckets?.find(bucket => bucket.name === 'logos');
      
      if (!logosBucket) {
        console.error('Logos bucket not found in available buckets');
        throw new Error('Logos storage bucket not found. Please contact support.');
      }

      console.log('Logos bucket found:', logosBucket);

      // Delete old logo if it exists and has a valid path
      if (currentLogoUrl && currentLogoUrl.includes('/storage/v1/object/public/logos/')) {
        const urlParts = currentLogoUrl.split('/');
        const oldFileName = urlParts[urlParts.length - 1];
        if (oldFileName && oldFileName !== 'undefined') {
          console.log('Deleting old logo file:', oldFileName);
          const deleteResult = await supabase.storage
            .from('logos')
            .remove([`${entityType}s/${oldFileName}`]);
          
          console.log('Delete result:', deleteResult);
        }
      }

      // Upload new logo with timestamp to ensure uniqueness
      const fileExt = file.name.split('.').pop();
      const fileName = `${entityId}-${Date.now()}.${fileExt}`;
      const filePath = `${entityType}s/${fileName}`;

      console.log('Uploading file to path:', filePath);

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      console.log('Public URL data:', urlData);

      if (!urlData.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      const logoUrl = urlData.publicUrl;
      console.log('Generated logo URL:', logoUrl);

      // Update entity in database
      const tableName = entityType === 'team' ? 'teams' : 'clubs';
      console.log('Updating table:', tableName, 'with logo URL:', logoUrl);
      
      const { error: updateError, data: updateData } = await supabase
        .from(tableName)
        .update({ logo_url: logoUrl })
        .eq('id', entityId)
        .select();

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      console.log('Database update successful:', updateData);

      // Call the callback to update the parent component
      onLogoChange(logoUrl);
      
      toast({
        title: 'Logo uploaded successfully',
        description: `${entityName} logo has been updated successfully.`,
      });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload logo. Please try again.',
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
      // Delete from storage if it's a valid storage URL
      if (currentLogoUrl.includes('/storage/v1/object/public/logos/')) {
        const urlParts = currentLogoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        if (fileName && fileName !== 'undefined') {
          console.log('Removing logo file:', fileName);
          const deleteResult = await supabase.storage
            .from('logos')
            .remove([`${entityType}s/${fileName}`]);
          
          console.log('Remove result:', deleteResult);
        }
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
        {/* Logo preview */}
        <div className="w-20 h-20 border-2 border-dashed border-muted-foreground rounded-xl flex items-center justify-center bg-muted shadow-inner">
          {currentLogoUrl ? (
            <img 
              src={currentLogoUrl} 
              alt={`${entityName} logo`}
              className="w-18 h-18 object-contain rounded-lg"
              onError={(e) => {
                console.log('Logo failed to load:', currentLogoUrl);
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
              onLoad={() => {
                console.log('Logo loaded successfully:', currentLogoUrl);
              }}
            />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          {currentLogoUrl && (
            <div className="hidden flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          )}
        </div>

        {/* Upload input */}
        <div className="flex-1 space-y-2">
          <Input
            id={`logo-upload-${entityId}`}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={handleFileUpload}
            disabled={uploading}
            className="cursor-pointer file:cursor-pointer file:mr-4 file:px-4 file:py-2 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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
