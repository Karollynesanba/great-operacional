export type OperationalClientDisplay = {
  id: string;
  client_name: string;
  clinic_name?: string | null;
  updated_at?: string | null;
};

export function normalizeOperationalClientName(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getClientRank(client: OperationalClientDisplay) {
  const updatedAt = client.updated_at ? Date.parse(client.updated_at) : Number.NaN;
  return Number.isFinite(updatedAt) ? updatedAt : 0;
}

export function dedupeOperationalClientsByName<T extends OperationalClientDisplay>(clients: T[]) {
  const deduped = new Map<string, T>();

  for (const client of clients) {
    const key = normalizeOperationalClientName(client.client_name);
    if (!key) continue;

    const current = deduped.get(key);
    if (!current) {
      deduped.set(key, client);
      continue;
    }

    const currentRank = getClientRank(current);
    const candidateRank = getClientRank(client);
    const currentHasClinic = Boolean(current.clinic_name?.trim());
    const candidateHasClinic = Boolean(client.clinic_name?.trim());

    if (candidateHasClinic && !currentHasClinic) {
      deduped.set(key, client);
      continue;
    }

    if (candidateRank > currentRank) {
      deduped.set(key, client);
    }
  }

  return Array.from(deduped.values()).sort((left, right) =>
    left.client_name.localeCompare(right.client_name, 'pt-BR'),
  );
}

export function formatOperationalClientLabel(client: Pick<OperationalClientDisplay, 'client_name' | 'clinic_name'>) {
  const clinicName = client.clinic_name?.trim();
  return clinicName ? `${client.client_name} (${clinicName})` : client.client_name;
}
