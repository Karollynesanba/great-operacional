import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

const CYCLE: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  function handleClick() {
    const current = CYCLE.indexOf((theme as any) ?? 'system');
    const next = CYCLE[(current + 1) % CYCLE.length];
    setTheme(next);
  }

  const icon =
    theme === 'dark' ? (
      <Moon className="h-4 w-4" />
    ) : theme === 'system' ? (
      <Monitor className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    );

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleClick}
      className="text-muted-foreground hover:text-foreground transition-all"
      title={theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Sistema'}
    >
      {icon}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
