import { describe, expect, it } from 'vitest';
import { translateAuthError } from './auth-errors';
import { formatList, parseList } from './lists';

describe('parseList', () => {
  it('splits on commas and newlines, trims and dedupes case-insensitively', () => {
    expect(parseList('React, react\n  Node.js ,, \nTypeScript')).toEqual([
      'React',
      'Node.js',
      'TypeScript',
    ]);
    expect(parseList('')).toEqual([]);
  });

  it('round-trips with formatList', () => {
    expect(parseList(formatList(['a', 'b']))).toEqual(['a', 'b']);
  });
});

describe('translateAuthError', () => {
  it('maps Supabase messages to pt-BR', () => {
    expect(translateAuthError('Invalid login credentials')).toBe('Email ou senha inválidos.');
    expect(translateAuthError('Email not confirmed')).toContain('Confirme');
    expect(translateAuthError('Database error saving new user')).toContain('desativados');
  });

  it('falls back to a generic message', () => {
    expect(translateAuthError('???')).toContain('inesperado');
    expect(translateAuthError(undefined)).toContain('inesperado');
  });
});
