import { LogOut, Monitor, Moon, Search, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { visibleGroups } from './navigation';

const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform);

export function CommandMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 w-full justify-start gap-2 text-muted-foreground sm:w-64"
        aria-label={t('command.open')}
      >
        <Search className="size-4" />
        <span className="flex-1 text-left font-normal">{t('command.placeholder')}</span>
        <kbd className="pointer-events-none hidden h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t('command.title')}
        description={t('command.description')}
      >
        <CommandInput placeholder={t('command.inputPlaceholder')} />
        <CommandList>
          <CommandEmpty>{t('command.empty')}</CommandEmpty>
          {visibleGroups().map((group) => (
            <CommandGroup key={group.labelKey} heading={t(group.labelKey)}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.to}
                  value={t(item.labelKey)}
                  onSelect={() => run(() => navigate(item.to))}
                >
                  <item.icon />
                  {t(item.labelKey)}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading={t('command.preferences')}>
            <CommandItem value={t('ui.theme.light')} onSelect={() => run(() => setTheme('light'))}>
              <Sun />
              {t('command.themeLight')}
            </CommandItem>
            <CommandItem value={t('ui.theme.dark')} onSelect={() => run(() => setTheme('dark'))}>
              <Moon />
              {t('command.themeDark')}
            </CommandItem>
            <CommandItem
              value={t('ui.theme.system')}
              onSelect={() => run(() => setTheme('system'))}
            >
              <Monitor />
              {t('command.themeSystem')}
            </CommandItem>
            <CommandItem value={t('nav.logout')} onSelect={() => run(() => void signOut())}>
              <LogOut />
              {t('nav.logout')}
              <CommandShortcut />
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
