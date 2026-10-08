import { ChevronsUpDown, LogOut, Monitor, Moon, Settings, Sun, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { useAuth } from '@/lib/auth';
import { useTheme, type ThemePreference } from '@/lib/theme';
import { identityOf, type UserIdentity } from '@/lib/user';

export function UserAvatar({
  identity,
  className,
}: {
  identity: UserIdentity;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      {identity.avatarUrl && (
        <AvatarImage src={identity.avatarUrl} alt="" referrerPolicy="no-referrer" />
      )}
      <AvatarFallback className="bg-primary/10 text-xs font-medium text-brand-600 dark:text-primary">
        {identity.initials}
      </AvatarFallback>
    </Avatar>
  );
}

function UserMenuContent({
  identity,
  side = 'bottom',
  align = 'end',
}: {
  identity: UserIdentity;
  side?: 'bottom' | 'right' | 'top';
  align?: 'start' | 'end';
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenuContent className="w-60" side={side} align={align} sideOffset={8}>
      <DropdownMenuLabel className="flex items-center gap-3 py-2 font-normal">
        <UserAvatar identity={identity} className="size-9" />
        <div className="grid min-w-0 text-left">
          <span className="truncate text-sm font-medium">{identity.name}</span>
          <span className="truncate text-xs text-muted-foreground">{identity.email}</span>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem onSelect={() => navigate('/app/profile')}>
          <UserRound />
          {t('nav.profile')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/app/settings')}>
          <Settings />
          {t('nav.settings')}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Sun className="text-muted-foreground" />
            {t('common.theme')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value as ThemePreference)}
            >
              <DropdownMenuRadioItem value="light">
                <Sun />
                {t('ui.theme.light')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon />
                {t('ui.theme.dark')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <Monitor />
                {t('ui.theme.system')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
        <LogOut />
        {t('nav.logout')}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

export function HeaderUserMenu() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const identity = identityOf(session?.user);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label={t('nav.accountMenu')}
      >
        <UserAvatar identity={identity} className="size-8" />
      </DropdownMenuTrigger>
      <UserMenuContent identity={identity} />
    </DropdownMenu>
  );
}

export function SidebarUserMenu() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const identity = identityOf(session?.user);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          aria-label={t('nav.accountMenu')}
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <UserAvatar identity={identity} className="size-8 rounded-lg" />
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{identity.name}</span>
            <span className="truncate text-xs text-muted-foreground">{identity.email}</span>
          </div>
          <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <UserMenuContent identity={identity} side="right" align="end" />
    </DropdownMenu>
  );
}
