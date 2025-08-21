import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Upload, 
  File, 
  Video, 
  FileText, 
  X, 
  Download,
  ExternalLink,
  Image
} from 'lucide-react';

interface DrillMedia {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  file_url: string;
}

interface DrillMediaManagerProps {
  drillId?: string;
  existingMedia?: DrillMedia[];
  mediaFiles?: DrillMedia[];
  onMediaChange?: (media: DrillMedia[]) => void;
  disabled?: boolean;
}

export function DrillMediaManager({ 
  drillId, 
  existingMedia = [], 
  mediaFiles = [],
  onMediaChange,
  disabled = false 
}: DrillMediaManagerProps) {
  const [media, setMedia] = useState<DrillMedia[]>(existingMedia.length > 0 ? existingMedia : mediaFiles);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = {
    // Images
    'image/jpeg': '.jpg,.jpeg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    // Documents
    'application/pdf': '.pdf',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    // Videos
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
  };

  const maxFileSize = 50 * 1024 * 1024; // 50MB

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-4 h-4 text-green-500" />;
    } else if (fileType.startsWith('video/')) {
      return <Video className="w-4 h-4" />;
    } else if (fileType.includes('pdf')) {
      return <FileText className="w-4 h-4 text-red-500" />;
    } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
      return <FileText className="w-4 h-4 text-orange-500" />;
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    }
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!Object.keys(acceptedTypes).includes(file.type)) {
      toast.error('Unsupported file type. Please upload images, PDF, PowerPoint, Word documents, or videos.');
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${user.data.user.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('drill-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('drill-media')
        .getPublicUrl(filePath);

      const newMedia: DrillMedia = {
        id: `temp-${Date.now()}`,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: publicUrl
      };

      // If we have a drillId, save to database
      if (drillId) {
        const { data: mediaData, error: mediaError } = await supabase
          .from('drill_media')
          .insert({
            drill_id: drillId,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_url: publicUrl
          })
          .select()
          .single();

        if (mediaError) throw mediaError;
        newMedia.id = mediaData.id;
      }

      const updatedMedia = [...media, newMedia];
      setMedia(updatedMedia);
      onMediaChange?.(updatedMedia);

      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveMedia = async (mediaItem: DrillMedia) => {
    try {
      // If it's in the database, delete from there
      if (drillId && !mediaItem.id.startsWith('temp-')) {
        const { error } = await supabase
          .from('drill_media')
          .delete()
          .eq('id', mediaItem.id);

        if (error) throw error;
      }

      // Extract file path from URL for storage deletion
      const urlParts = mediaItem.file_url.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'drill-media');
      if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
        const filePath = urlParts.slice(bucketIndex + 1).join('/');
        
        await supabase.storage
          .from('drill-media')
          .remove([filePath]);
      }

      const updatedMedia = media.filter(m => m.id !== mediaItem.id);
      setMedia(updatedMedia);
      onMediaChange?.(updatedMedia);

      toast.success('File removed successfully');
    } catch (error) {
      console.error('Error removing file:', error);
      toast.error('Failed to remove file');
    }
  };

  const handleDownload = (mediaItem: DrillMedia) => {
    window.open(mediaItem.file_url, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Media Files</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Uploading...' : 'Add Media'}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={Object.values(acceptedTypes).join(',')}
        onChange={handleFileSelect}
        disabled={disabled}
      />

      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      {media.length > 0 && (
        <div className="space-y-2">
          {media.map((mediaItem) => (
            <div
              key={mediaItem.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1">
                {getFileIcon(mediaItem.file_type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{mediaItem.file_name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">
                      {mediaItem.file_type.split('/')[1]?.toUpperCase()}
                    </Badge>
                    {mediaItem.file_size && (
                      <span>{formatFileSize(mediaItem.file_size)}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(mediaItem)}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMedia(mediaItem)}
                  disabled={disabled}
                >
                  <X className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Supported formats: Images (.jpg, .png, .gif, .webp, .svg), PDF, PowerPoint (.ppt, .pptx), Word (.doc, .docx), Videos (.mp4, .webm, .mov, .avi)
        <br />
        Maximum file size: 50MB
      </div>
    </div>
  );
}