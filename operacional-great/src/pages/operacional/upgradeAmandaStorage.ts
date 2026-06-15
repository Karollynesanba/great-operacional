import { supabase } from '@/integrations/supabase/client';

export function sanitizeFileName(fileName: string) {
  return fileName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '_');
}

export function buildAssetPath(profileId: string, scope: string, file: File) {
  const safeName = sanitizeFileName(file.name);
  return `${profileId}/${scope}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
}

export async function uploadFileToStorage(bucket: string, path: string, file: File) {
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function getStoragePathFromUrl(bucket: string, url: string) {
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index >= 0) {
      return decodeURIComponent(parsed.pathname.slice(index + marker.length));
    }

    const bucketIndex = parsed.pathname.indexOf(`/${bucket}/`);
    if (bucketIndex >= 0) {
      return decodeURIComponent(parsed.pathname.slice(bucketIndex + bucket.length + 2));
    }
  } catch {
    return '';
  }

  return '';
}
