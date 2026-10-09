/** The same rules the API checks (api/src/auth/dto.ts), so most mistakes show before submitting. */

export const DEFAULT_SCHOOL = 'Dumingag Central Elementary School';

export function nameError(v: string) {
  const n = v.trim().length;
  return n < 3 || n > 80 ? 'Ang buong pangalan ay dapat 3 hanggang 80 character' : '';
}

export function schoolError(v: string) {
  const n = v.trim().length;
  return n < 3 || n > 120 ? 'Ang paaralan ay dapat 3 hanggang 120 character' : '';
}

export function sectionError(v: string) {
  return v.trim().length > 60 ? 'Ang seksyon ay hanggang 60 character lamang' : '';
}

export function usernameError(v: string) {
  const u = v.trim();
  if (u.length < 4 || u.length > 30) return 'Ang username ay dapat 4 hanggang 30 character';
  if (!/^[a-z0-9._]+$/.test(u)) return 'Maliliit na letra, numero, tuldok (.) at underscore (_) lamang';
  return '';
}

export function passwordError(v: string) {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(v) ? '' : 'Dapat may 8 o higit pang character, may letra at numero';
}

export function repeatError(password: string, repeat: string) {
  return password === repeat ? '' : 'Hindi magkapareho ang dalawang password';
}

/** Only the fields with a message. */
export function onlyErrors<T extends Record<string, string>>(errors: T): Partial<T> {
  return Object.fromEntries(Object.entries(errors).filter(([, m]) => m)) as Partial<T>;
}
