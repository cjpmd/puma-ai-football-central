import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export type PhotoPickSource = 'camera' | 'photos' | 'prompt';

function base64ToFile(base64String: string, filename: string): File {
  const byteCharacters = atob(base64String);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  return new File([byteArray], filename, { type: 'image/jpeg' });
}

/**
 * Pick a photo using the native Capacitor Camera plugin on iOS/Android.
 * Returns null on web — callers should fall back to a hidden <input type="file">.
 *
 * Handles the returned base64 string and converts it to a plain File so the
 * existing image-processing pipeline (prepareImageForUpload) works unchanged.
 */
export async function pickPhoto(source: PhotoPickSource = 'prompt'): Promise<File | null> {
  if (!Capacitor.isNativePlatform()) return null;

  const sourceMap: Record<PhotoPickSource, CameraSource> = {
    camera: CameraSource.Camera,
    photos: CameraSource.Photos,
    prompt: CameraSource.Prompt,
  };

  const photo = await Camera.getPhoto({
    quality: 90,
    resultType: CameraResultType.Base64,
    source: sourceMap[source],
    correctOrientation: true,
    saveToGallery: false,
  });

  if (!photo.base64String) return null;
  return base64ToFile(photo.base64String, `photo_${Date.now()}.jpg`);
}

export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();
