import { describe, expect, it } from "vitest";

import { getLoginErrorMessage } from "./login";

describe("getLoginErrorMessage", () => {
  it("muestra el error de credenciales solo cuando Supabase lo confirma", () => {
    expect(getLoginErrorMessage({ code: "invalid_credentials" })).toBe(
      "Usuario o contraseña incorrectos.",
    );
  });

  it("no presenta errores de servicio como si fueran una contraseña incorrecta", () => {
    expect(getLoginErrorMessage({ code: "invalid_api_key" })).toBe(
      "No fue posible validar el acceso. Inténtalo nuevamente o contacta a administración.",
    );
  });
});
