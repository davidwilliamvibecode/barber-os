/**
 * Libera cadastro por e-mail/senha apenas no Convex Production do primeiro cliente.
 * Preserva a exigência de convite da função createOrganization no backend.
 * Não registra valores de segredos nem cria usuários/organizações.
 */
import { spawnSync } from "node:child_process";

if (!(process.env.CONVEX_DEPLOY_KEY ?? "").startsWith("prod:clever-squid-863|")) {
  throw new Error("A chave não pertence ao deployment comercial autorizado.");
}

function convex(args, input) {
  const r = spawnSync("bunx", ["convex", ...args], {
    input,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 512 * 1024,
    env: { ...process.env, NO_COLOR: "1" },
  });
  // Never print stdout/stderr: env get and env set can contain secrets.
  if (r.status !== 0) throw new Error("Falha na operação Convex (detalhes ocultos).");
  return (r.stdout ?? "").trim();
}
const get = name => convex(["env", "get", "--prod", name]);
const equals = (name, value) => {
  if (get(name) !== value) throw new Error("Pré-condição inválida: " + name);
};
equals("SITE_URL", "https://barber-os-cliente.pages.dev");
equals("BARBER_AUTH_V2_ENABLED", "true");
equals("BARBER_GOOGLE_AUTH_ENABLED", "false");
equals("BARBER_MVP_GOOGLE_ONLY", "false");
equals("BARBER_BILLING_ENFORCED", "false");
equals("BARBER_EMAIL_PROVIDER", "manual");
const inboxSecret = get("BARBER_MANUAL_INBOX_SECRET");
if (inboxSecret.length < 32 || inboxSecret.length > 255) {
  throw new Error("Canal privado de códigos indisponível.");
}
if (!get("JWT_PRIVATE_KEY") || !get("JWKS")) {
  throw new Error("Chaves de autenticação indisponíveis.");
}
const previous = get("BARBER_AUTH_COMMERCIAL_ENABLED");
if (previous === "true") {
  console.log("PASS: cadastro comercial já estava habilitado; não alterado.");
} else if (previous === "false") {
  convex(["env", "set", "--prod", "BARBER_AUTH_COMMERCIAL_ENABLED"], "true\n");
  if (get("BARBER_AUTH_COMMERCIAL_ENABLED") !== "true") {
    try {
      convex(["env", "set", "--prod", "BARBER_AUTH_COMMERCIAL_ENABLED"], "false\n");
    } catch {
      // No secret values logged.
    }
    throw new Error("A ativação não foi confirmada; tentativa de reversão realizada.");
  }
  console.log("PASS: BARBER_AUTH_COMMERCIAL_ENABLED=true confirmado no Convex Production.");
} else {
  throw new Error("Valor de cadastro comercial ausente ou inesperado.");
}
console.log("Organizações continuam sujeitas a convite individual obrigatório no backend.");
console.log("Nenhuma conta de cliente foi criada; fluxo real de cadastro ainda requer teste com dados fictícios.");
