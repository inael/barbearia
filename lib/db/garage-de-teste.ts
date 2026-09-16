// Sobe um Garage de verdade em container para os testes da mídia da TV.
//
// Por que Garage e não MinIO no teste: é o Garage que roda na VPS do Rodrigo. Testar
// contra outro servidor S3 provaria que a nossa assinatura V4 está certa, mas não que
// ela conversa com o servidor que de fato vai receber os arquivos dele.
//
// O Garage não nasce usável: precisa de layout aplicado, bucket criado, chave criada e
// permissão dada. Isso é feito aqui uma vez, e o teste recebe a ConfigBucket pronta.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { GenericContainer, Wait, type StartedTestContainer } from "testcontainers";
import type { ConfigBucket } from "../midia-tv-bucket";

const IMAGEM = "dxflrs/garage:v1.0.1";
const BUCKET = "midia-tv";
const REGIAO = "garage";

const CONFIG = [
  'metadata_dir = "/var/lib/garage/meta"',
  'data_dir = "/var/lib/garage/data"',
  'db_engine = "sqlite"',
  "replication_factor = 1",
  'rpc_bind_addr = "[::]:3901"',
  'rpc_public_addr = "127.0.0.1:3901"',
  'rpc_secret = "1799bccfd7411eddcf9ebd316bc1f5287ad12a68094e1c6ac6abde7e6feae1ec"',
  "",
  "[s3_api]",
  `s3_region = "${REGIAO}"`,
  'api_bind_addr = "[::]:3900"',
  'root_domain = ".s3.garage"',
  "",
  "[admin]",
  'api_bind_addr = "[::]:3903"',
  'admin_token = "token-de-teste"',
  "",
].join("\n");

// Config assada na imagem em vez de montada de fora: a imagem do Garage nao tem shell
// nem /etc, e montar arquivo solto no Docker Desktop nao e confiavel. O COPY cria o
// caminho, e a imagem fica em cache entre rodadas.
const DOCKERFILE = [`FROM ${IMAGEM}`, "COPY garage.toml /etc/garage.toml", ""].join("\n");

export interface GarageDeTeste {
  cfg: ConfigBucket;
  container: StartedTestContainer;
  /** Diz se o objeto existe de verdade NO BUCKET (não no banco). */
  existeNoBucket(objeto: string): Promise<boolean>;
}

async function rodar(c: StartedTestContainer, args: string[]): Promise<string> {
  const r = await c.exec(["/garage", ...args]);
  if (r.exitCode !== 0) {
    throw new Error(`garage ${args.join(" ")} falhou (${r.exitCode}): ${r.output}`);
  }
  return r.output;
}

export async function subirGarage(): Promise<GarageDeTeste> {
  const pasta = mkdtempSync(path.join(tmpdir(), "garage-teste-"));
  writeFileSync(path.join(pasta, "garage.toml"), CONFIG);
  writeFileSync(path.join(pasta, "Dockerfile"), DOCKERFILE);

  const imagem = await GenericContainer.fromDockerfile(pasta).build("barbearia-garage-teste:1", {
    deleteOnExit: false,
  });

  const container = await imagem
    .withExposedPorts(3900, 3903)
    // Esperar pelo LOG, nao pela porta: a espera padrao do testcontainers checa a
    // porta de DENTRO do container usando shell, e esta imagem nao tem shell. O
    // container subia bem e a espera estourava sozinha em 60s, escondendo isso
    // atras de um "Port 3900/tcp not bound" que parecia problema de rede.
    .withWaitStrategy(Wait.forLogMessage(/S3 API server listening/))
    .withStartupTimeout(120_000)
    .start();

  // 1. layout: sem isso o Garage aceita conexao mas nao guarda nada
  const id = (await rodar(container, ["node", "id", "-q"])).trim().split("@")[0];
  await rodar(container, ["layout", "assign", "-z", "dc1", "-c", "1G", id]);
  await rodar(container, ["layout", "apply", "--version", "1"]);

  // 2. bucket + chave + permissao
  await rodar(container, ["bucket", "create", BUCKET]);
  const saidaChave = await rodar(container, ["key", "create", "chave-de-teste"]);
  const chaveId = saidaChave.match(/GK[0-9a-f]{24,}/i)?.[0];
  const chaveSecreta = saidaChave.match(/Secret key:\s*([0-9a-f]{64})/i)?.[1];
  if (!chaveId || !chaveSecreta) throw new Error(`nao consegui ler a chave criada:\n${saidaChave}`);
  await rodar(container, ["bucket", "allow", "--read", "--write", BUCKET, "--key", chaveId]);

  const cfg: ConfigBucket = {
    endpoint: `http://${container.getHost()}:${container.getMappedPort(3900)}`,
    regiao: REGIAO,
    bucket: BUCKET,
    chaveId,
    chaveSecreta,
    basePublica: "/midia",
    // A suite de integracao sobe dezenas de containers ao mesmo tempo. Os prazos de
    // producao (20s/60s) sao folgados para app e Garage na mesma VPS, mas apertam
    // nesta maquina e o teste falharia por disputa de CPU, nao por defeito.
    //
    // O envio fica em 90s, nao mais: MTV-007 depende do cancelamento ACONTECER
    // (chave errada faz o Garage pendurar), e precisa caber no tempo do teste.
    prazoLeituraMs: 120_000,
    prazoEnvioMs: 90_000,
  };

  return {
    cfg,
    container,
    async existeNoBucket(objeto: string) {
      const { baixarDoBucket } = await import("../midia-tv-bucket");
      const resp = await baixarDoBucket(cfg, objeto);
      return resp.ok;
    },
  };
}
