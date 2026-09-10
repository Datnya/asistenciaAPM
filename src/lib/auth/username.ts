const usernamePattern = /^[a-z0-9][a-z0-9._-]*$/;

export const invalidUsernameMessage =
  "El usuario solo puede contener letras, números, puntos, guiones y guiones bajos.";

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return usernamePattern.test(normalizeUsername(value));
}

export function assertValidUsername(value: string): string {
  const username = normalizeUsername(value);

  if (!isValidUsername(username)) {
    throw new Error(invalidUsernameMessage);
  }

  return username;
}

export function buildAuthAlias(username: string, domain: string): string {
  const normalizedUsername = assertValidUsername(username);
  const normalizedDomain = domain.trim().toLowerCase();

  if (!normalizedDomain) {
    throw new Error("AUTH_USERNAME_DOMAIN debe estar configurado.");
  }

  return `${normalizedUsername}@${normalizedDomain}`;
}
