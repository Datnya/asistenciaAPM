import { describe, expect, it } from "vitest";

import { loginSchema } from "./schemas";
import { assertValidUsername, buildAuthAlias, normalizeUsername } from "./username";

describe("username helpers", () => {
  it("normaliza trim y minúsculas", () => {
    expect(normalizeUsername(" Patricia.Romero ")).toBe("patricia.romero");
  });

  it("construye el alias técnico fuera de la UI", () => {
    expect(buildAuthAlias("Patricia.Romero", "auth.apm.internal")).toBe(
      "patricia.romero@auth.apm.internal",
    );
  });

  it("rechaza espacios y caracteres incompatibles", () => {
    expect(() => assertValidUsername("patricia romero")).toThrow();
  });

  it("reporta un username inválido como error de formulario sin lanzar una excepción", () => {
    expect(() =>
      loginSchema.safeParse({ username: "Usuario inválido", password: "password-de-prueba" }),
    ).not.toThrow();

    const result = loginSchema.safeParse({
      username: "Datnya Monzón",
      password: "password-de-prueba",
    });

    expect(result.success).toBe(false);
  });

  it("normaliza un username válido desde el formulario", () => {
    expect(
      loginSchema.parse({ username: " Usuario.Valido ", password: "password-de-prueba" })
        .username,
    ).toBe("usuario.valido");
  });
});
