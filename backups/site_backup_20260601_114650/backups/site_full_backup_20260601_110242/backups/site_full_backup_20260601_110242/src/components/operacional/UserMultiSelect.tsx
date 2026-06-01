import { Check, ChevronDown, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface MultiSelectUser {
  id: string;
  full_name: string;
  email?: string | null;
}

interface UserMultiSelectProps {
  users: MultiSelectUser[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function UserMultiSelect({
  users,
  value,
  onChange,
  placeholder = 'Selecionar responsáveis',
  label = 'Responsáveis',
  className,
  disabled,
}: UserMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedUsers = useMemo(
    () => users.filter((user) => value.includes(user.id)),
    [users, value],
  );

  const toggleUser = (userId: string) => {
    if (disabled) return;
    const next = value.includes(userId)
      ? value.filter((id) => id !== userId)
      : [...value, userId];
    onChange(next);
  };

  const triggerLabel = selectedUsers.length === 0
    ? placeholder
    : selectedUsers.length === 1
      ? selectedUsers[0].full_name
      : `${selectedUsers[0].full_name} +${selectedUsers.length - 1}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-between border-border bg-background text-left', className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{triggerLabel}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] rounded-2xl border-border bg-popover p-3 shadow-xl" align="start">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione uma ou mais pessoas para dividir a tarefa.
          </p>
        </div>

        <ScrollArea className="h-64 pr-3">
          <div className="space-y-1">
            {users.map((user) => {
              const checked = value.includes(user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleUser(user.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors',
                    checked
                      ? 'border-primary/20 bg-primary/5 text-foreground'
                      : 'border-transparent bg-background hover:border-border hover:bg-muted/40',
                  )}
                >
                  <Checkbox checked={checked} className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{user.full_name}</span>
                    {user.email && (
                      <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                    )}
                  </span>
                  {checked && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })}

            {users.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                Nenhuma pessoa disponível.
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
