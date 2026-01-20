/**
 * Image preprocessing utilities for resizing and compressing images
 * before uploading to Supabase Storage (which has a 5MB limit on player_photos bucket).
 */

export interface ImageProcessingOptions {
  maxDimension?: number;
  quality?: number;
  outputFormat?: 'image/jpeg' | 'image/webp';
}

const DEFAULT_OPTIONS: Required<ImageProcessingOptions> = {
  maxDimension: 1024,
  quality: 0.85,
  outputFormat: 'image/jpeg',
};

/**
 * Checks if a file is a supported image format that can be processed via canvas.
 * HEIC is NOT supported in most browsers without conversion.
 */
export function isSupportedImageFormat(file: File): boolean {
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  return supportedTypes.includes(file.type.toLowerCase());
}

/**
 * Checks if a file might be HEIC/HEIF (not directly supported in canvas).
 */
export function isHeicFormat(file: File): boolean {
  const heicTypes = ['image/heic', 'image/heif'];
  const heicExtensions = ['.heic', '.heif'];
  
  if (heicTypes.includes(file.type.toLowerCase())) return true;
  
  const fileName = file.name.toLowerCase();
  return heicExtensions.some(ext => fileName.endsWith(ext));
}

/**
 * Loads an image file into an HTMLImageElement.
 * Returns a promise that resolves with the loaded image or rejects on error.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    
    img.onerror = (e) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image: ${file.name}. The format may not be supported.`));
    };
    
    img.src = objectUrl;
  });
}

/**
 * Resizes and compresses an image file using Canvas.
 * Returns a Blob ready for upload.
 * 
 * - Resizes to fit within maxDimension (default 1024px) while maintaining aspect ratio
 * - Compresses to specified quality (default 0.85)
 * - Outputs as JPEG by default (smallest file size for photos)
 * 
 * @param file - The original File from input/camera
 * @param options - Optional processing options
 * @returns Promise<Blob> - The processed image as a Blob
 */
export async function prepareImageForUpload(
  file: File,
  options: ImageProcessingOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Check for HEIC format which isn't supported
  if (isHeicFormat(file)) {
    throw new Error(
      'HEIC/HEIF format is not supported. Please convert the image to JPEG or PNG before uploading.'
    );
  }
  
  // Check if format is supported
  if (!isSupportedImageFormat(file)) {
    throw new Error(
      `Unsupported image format: ${file.type || 'unknown'}. Please use JPEG, PNG, or WebP.`
    );
  }
  
  // Load the image
  const img = await loadImage(file);
  
  // Calculate new dimensions maintaining aspect ratio
  let { width, height } = img;
  
  if (width > opts.maxDimension || height > opts.maxDimension) {
    if (width > height) {
      height = Math.round((height / width) * opts.maxDimension);
      width = opts.maxDimension;
    } else {
      width = Math.round((width / height) * opts.maxDimension);
      height = opts.maxDimension;
    }
  }
  
  // Create canvas and draw resized image
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context for image processing.');
  }
  
  // Fill with white background (for JPEG output to avoid transparency turning black)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  
  // Draw the image
  ctx.drawImage(img, 0, 0, width, height);
  
  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          console.log('[imageUtils] Processed image:', {
            originalSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
            newSize: `${(blob.size / 1024 / 1024).toFixed(2)}MB`,
            dimensions: `${width}x${height}`,
            format: opts.outputFormat,
          });
          resolve(blob);
        } else {
          reject(new Error('Failed to compress image. Canvas toBlob returned null.'));
        }
      },
      opts.outputFormat,
      opts.quality
    );
  });
}

/**
 * Prepares an image file for upload and returns it as a File object
 * with a proper filename for storage.
 * 
 * @param file - The original File from input/camera
 * @param playerId - The player ID for generating the filename
 * @param options - Optional processing options
 * @returns Promise<File> - The processed image as a File
 */
export async function prepareImageFileForUpload(
  file: File,
  playerId: string,
  options: ImageProcessingOptions = {}
): Promise<File> {
  const blob = await prepareImageForUpload(file, options);
  
  // Create a new File from the blob with a proper name
  const extension = options.outputFormat === 'image/webp' ? 'webp' : 'jpg';
  const fileName = `${playerId}/${Date.now()}.${extension}`;
  
  return new File([blob], fileName, { type: blob.type });
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
