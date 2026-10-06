import { Activity, Briefcase, Palette, Settings, UserRound, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  end?: boolean;
  devOnly?: boolean;
}

export interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'nav.groupWork',
    items: [
      { to: '/app', labelKey: 'nav.jobs', icon: Briefcase, end: true },
      { to: '/app/runs', labelKey: 'nav.runs', icon: Activity },
    ],
  },
  {
    labelKey: 'nav.groupAccount',
    items: [
      { to: '/app/profile', labelKey: 'nav.profile', icon: UserRound },
      { to: '/app/settings', labelKey: 'nav.settings', icon: Settings },
      { to: '/app/design', labelKey: 'nav.design', icon: Palette, devOnly: true },
    ],
  },
];

export function visibleGroups(): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.devOnly || import.meta.env.DEV),
  }));
}

export function preloadAppPages(): void {
  void import('@/pages/Jobs');
  void import('@/pages/JobDetail');
  void import('@/pages/Profile');
  void import('@/pages/Settings');
  void import('@/pages/Runs');
}
