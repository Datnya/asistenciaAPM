export function getLoginErrorMessage(error: { code?: string }): string {
  if (error.code === "invalid_credentials") {
    return "Usuario o contraseña incorrectos.";
  }

  return "No fue posible validar el acceso. Inténtalo nuevamente o contacta a administración.";
}
