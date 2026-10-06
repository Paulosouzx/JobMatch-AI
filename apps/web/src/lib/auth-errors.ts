const RULES: [RegExp, string][] = [
  [
    /provider is not enabled|unsupported provider/i,
    'O login com este provider não está ativo no Supabase.',
  ],
  [/invalid login credentials/i, 'Email ou senha inválidos.'],
  [/email not confirmed/i, 'Confirme o seu email antes de entrar. Verifique a caixa de entrada.'],
  [/user already registered|already been registered/i, 'Já existe uma conta com este email.'],
  [
    /password should be at least|weak password/i,
    'A senha é muito fraca. Use pelo menos 8 caracteres.',
  ],
  [
    /rate limit|too many requests|over_email_send_rate_limit/i,
    'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  ],
  [
    /database error saving new user|signups are disabled|signups not allowed/i,
    'Os registos estão desativados nesta instância.',
  ],
  [/unable to validate email|invalid email/i, 'Email inválido.'],
  [/same password|different from the old/i, 'A nova senha deve ser diferente da atual.'],
  [/failed to fetch|network/i, 'Sem ligação ao servidor. Verifique a sua internet.'],
  [/expired|invalid.*(token|link|otp)|otp/i, 'O código expirou ou é inválido. Peça um novo.'],
  [
    /for security purposes|only request this after/i,
    'Aguarde alguns segundos antes de pedir outro código.',
  ],
];

export function translateAuthError(message: string | undefined): string {
  if (!message) return 'Ocorreu um erro inesperado. Tente novamente.';
  for (const [pattern, text] of RULES) {
    if (pattern.test(message)) return text;
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}
