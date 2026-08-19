// Liveness/health check para monitoramento de uptime (status.toolpad.cloud).
// Liveness (a app responde), sem depender do banco, pra ser rapido e confiavel.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    status: "ok",
    service: "barbearia",
    timestamp: new Date().toISOString(),
  });
}
