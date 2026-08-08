import "dotenv/config";
import { execSync } from "child_process";

// Esse arquivo só é para validação manual temporária.
const BASE_URL = "http://localhost:3000/api/auth";

const random = Math.random().toString(36).substring(2, 12);
const user = {
  name: `Test User ${random}`,
  email: `test-${random}@example.com`,
  password: "Senha123!",
};

async function run() {
  console.log("Iniciando teste de fluxo auth...");

  // O servidor precisa estar rodando
  try {
    execSync("curl -I http://localhost:3000", { stdio: "ignore" });
  } catch (err) {
    console.error("Servidor não está rodando em http://localhost:3000. Inicie-o antes.");
    process.exit(1);
  }

  // Registro
  const registerResp = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  if (registerResp.status !== 201) {
    console.error("Falha no register", await registerResp.text());
    process.exit(1);
  }
  console.log("Register OK");

  // Login
  const loginResp = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  const loginData: unknown = await loginResp.json();
  const loginDataObj =
    typeof loginData === "object" && loginData !== null
      ? loginData as { accessToken?: unknown }
      : null;

  if (
    loginResp.status !== 200 ||
    !loginDataObj ||
    typeof loginDataObj.accessToken !== "string"
  ) {
    console.error("Falha no login", loginResp.status, loginData);
    process.exit(1);
  }
  const cookie = loginResp.headers.get("set-cookie");
  if (!cookie || !cookie.includes("refreshToken")) {
    console.error("Cookie de refresh token não retornado");
    process.exit(1);
  }
  console.log("Login OK");

  // Refresh token
  const refreshResp = await fetch(`${BASE_URL}/refresh-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  });
  const refreshData: unknown = await refreshResp.json();
  const refreshDataObj =
    typeof refreshData === "object" && refreshData !== null
      ? refreshData as { accessToken?: unknown }
      : null;

  if (
    refreshResp.status !== 200 ||
    !refreshDataObj ||
    typeof refreshDataObj.accessToken !== "string"
  ) {
    console.error("Falha no refresh", refreshResp.status, refreshData);
    process.exit(1);
  }
  console.log("Refresh OK");

  // Logout
  const logoutResp = await fetch(`${BASE_URL}/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  });
  if (logoutResp.status !== 204) {
    console.error("Falha no logout", logoutResp.status, await logoutResp.text());
    process.exit(1);
  }
  console.log("Logout OK");

  console.log("Fluxo de autenticação validado com sucesso.");
}

run().catch((error) => {
  console.error("Erro no teste:", error);
  process.exit(1);
});
