import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type OperationalClientRow = Database['public']['Tables']['operational_clients']['Row'];

export async function resolveBrandProfileIdForClient(client: OperationalClientRow) {
  const clientName = client.client_name.trim();
  if (!clientName) return null;

  const { data: existingProfiles, error: lookupError } = await supabase
    .from('brand_profiles')
    .select('id')
    .eq('profile_type', 'CLIENT')
    .ilike('display_name', clientName)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (lookupError) throw lookupError;

  const existingProfileId = existingProfiles?.[0]?.id;
  if (existingProfileId) return existingProfileId;

  const { data: createdProfiles, error: createError } = await supabase
    .from('brand_profiles')
    .insert({
      display_name: clientName,
      profile_type: 'CLIENT',
      specialty: client.clinic_name || null,
      notes: 'Sincronizado do CRM operacional',
      is_active: true,
    })
    .select('id')
    .limit(1);

  if (createError) throw createError;

  return createdProfiles?.[0]?.id || null;
}
