import type { User } from '@supabase/supabase-js';

export interface UserIdentity {
  name: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
}

export function identityOf(user: User | null | undefined): UserIdentity {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const email = user?.email ?? '';
  const name =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    email.split('@')[0] ||
    'Utilizador';
  const avatarUrl =
    (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
    (typeof meta.picture === 'string' && meta.picture) ||
    null;
  const initials =
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?';
  return { name, email, avatarUrl, initials };
}
