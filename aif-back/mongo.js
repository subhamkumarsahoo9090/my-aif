import dns from "node:dns";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appPackage = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "aif", "package.json");
const { MongoClient } = createRequire(appPackage)("mongodb");

const databaseName = process.env.MONGODB_DB || "aif_wealthdiscovery";

const globalStore = globalThis;

function uri() {
  const value = process.env.MONGODB_URI;
  if (!value) {
    throw new Error("MONGODB_URI is missing. Add it to server/.env.");
  }
  return value;
}

async function allowSrvLookup(connectionString) {
  if (!connectionString.startsWith("mongodb+srv://")) return;
  const host = connectionString.split("@").pop()?.split("/")[0]?.split("?")[0];
  if (!host) return;
  try {
    await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
  } catch (error) {
    const code = error && typeof error === "object" ? error.code : "";
    if (code === "ECONNREFUSED" || code === "ESERVFAIL" || code === "ETIMEOUT") {
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
    }
  }
}

export async function getDb() {
  if (!globalStore.__aifMongo) {
    const connectionString = uri();
    await allowSrvLookup(connectionString);
    const client = new MongoClient(connectionString);
    globalStore.__aifMongo = client.connect();
  }
  const client = await globalStore.__aifMongo;
  return client.db(databaseName);
}
