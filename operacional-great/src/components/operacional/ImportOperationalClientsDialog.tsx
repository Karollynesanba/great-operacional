import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OperationalClient } from '@/hooks/useCRMData';
import {
  ImportExistingClient,
  ImportProfile,
  ImportTeam,
  parseOperationalClientsCsv,
} from '@/lib/operationalClientCsvImport';

interface ImportOperationalClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingClients: OperationalClient[];
  teams: ImportTeam[];
}

export function ImportOperationalClientsDialog({
  open,
  onOpenChange,
  existingClients,
  teams,
}: ImportOperationalClientsDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-operational-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_active')
        .order('full_name');
      if (error) throw error;
      return data as ImportProfile[];
    },
  });

  const existingImportClients = useMemo<ImportExistingClient[]>(
    () =>
      existingClients.map((client) => ({
        id: client.id,
        client_name: client.client_name,
        clinic_name: client.clinic_name,
      })),
    [existingClients],
  );

  const resetState = () => {
    setFileName('');
    setCsvText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setFileName(file.name);
      setCsvText(text);
      toast.success(`Arquivo carregado: ${file.name}`);
    } catch (error) {
      console.error('Error reading CSV file:', error);
      toast.error('Não foi possível ler o arquivo CSV');
      resetState();
    }
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      toast.error('Selecione um arquivo CSV primeiro');
      return;
    }

    if (teams.length === 0) {
      toast.error('Nenhuma equipe disponível para importar');
      return;
    }

    setIsImporting(true);
    try {
      const payload = parseOperationalClientsCsv(csvText, teams, profiles, existingImportClients);

      if (payload.length === 0) {
        toast.error('A planilha não possui linhas válidas');
        return;
      }

      const { error } = await supabase
        .from('operational_clients')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      await queryClient.invalidateQueries({ queryKey: ['operational-clients-simple'] });
      await queryClient.invalidateQueries({ queryKey: ['clients-in-activation'] });
      await queryClient.invalidateQueries({ queryKey: ['operational-clients-criativos'] });
      toast.success(`${payload.length} cliente(s) importado(s) para o CRM operacional`);
      resetState();
      onOpenChange(false);
    } catch (error) {
      console.error('Error importing operational clients:', error);
      toast.error('Erro ao importar a planilha para o Supabase');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar clientes por CSV</DialogTitle>
          <DialogDescription>
            Envie a planilha de clientes para salvar e atualizar os registros em `operational_clients` no Supabase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="operational-clients-csv">Arquivo CSV</Label>
            <div className="flex gap-2">
              <Input
                id="operational-clients-csv"
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
              />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <FileUp className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Arquivo selecionado</p>
            <p>{fileName || 'Nenhum arquivo selecionado ainda'}</p>
            <p className="mt-2">
              Colunas suportadas: cliente, clínica, status, equipe, pacote, plano, datas, responsáveis e demais
              campos operacionais da planilha.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={isImporting || !csvText.trim()}>
            {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Importar para o CRM
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
