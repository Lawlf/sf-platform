import type {
  FipeBrand,
  FipeClient,
  FipeModel,
  FipeVehicleData,
  FipeYear,
} from "@/domain/ports/external/fipe-client.port";
import { Money } from "@/domain/value-objects/money.vo";

const BASE_URL = "https://parallelum.com.br/fipe/api/v1";
const TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const RETRY_BACKOFF_MS = 500;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface ParallelumNamedItem {
  codigo: string;
  nome: string;
}

interface ParallelumModelsResponse {
  modelos: ParallelumNamedItem[];
  anos?: ParallelumNamedItem[];
}

interface ParallelumVehicleResponse {
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number | string;
  MesReferencia: string;
}

/**
 * Parses a BRL-formatted currency string into bigint cents.
 *
 * Example: "R$ 1.691,78" -> 169178n.
 */
function parseBRLToCents(brl: string): bigint {
  const cleaned = brl
    .replace(/[Rr]\$\s*/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const value = Number(cleaned);
  if (!Number.isFinite(value)) {
    throw new Error(`Cannot parse FIPE value: ${brl}`);
  }
  return BigInt(Math.round(value * 100));
}

export interface ParallelumFipeClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * HTTP client for the Parallelum FIPE API
 * (https://parallelum.com.br/fipe/api/v1).
 *
 * Adds:
 *  - 5s default timeout via AbortController.
 *  - one retry on network error or HTTP 5xx (500ms backoff).
 *  - 1h in-memory response cache keyed by full URL.
 */
export class ParallelumFipeClient implements FipeClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(options: ParallelumFipeClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? BASE_URL;
    this.timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
    this.cacheTtlMs = options.cacheTtlMs ?? CACHE_TTL_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async listBrands(): Promise<FipeBrand[]> {
    const raw = await this.fetchJson<ParallelumNamedItem[]>("/carros/marcas");
    return raw.map((b) => ({ code: b.codigo, name: b.nome }));
  }

  async listModels(brandCode: string): Promise<FipeModel[]> {
    const raw = await this.fetchJson<ParallelumModelsResponse>(
      `/carros/marcas/${encodeURIComponent(brandCode)}/modelos`,
    );
    return raw.modelos.map((m) => ({ code: m.codigo, name: m.nome }));
  }

  async listYears(brandCode: string, modelCode: string): Promise<FipeYear[]> {
    const raw = await this.fetchJson<ParallelumNamedItem[]>(
      `/carros/marcas/${encodeURIComponent(brandCode)}/modelos/${encodeURIComponent(
        modelCode,
      )}/anos`,
    );
    return raw.map((y) => ({ code: y.codigo, name: y.nome }));
  }

  async getVehicleValue(fipeCode: string): Promise<FipeVehicleData> {
    const parts = fipeCode.split("/");
    if (parts.length !== 3 || parts.some((p) => p.length === 0)) {
      throw new Error(
        `Invalid fipeCode format: ${fipeCode}. Expected "{brandCode}/{modelCode}/{yearCode}".`,
      );
    }
    const [brandCode, modelCode, yearCode] = parts as [string, string, string];
    const raw = await this.fetchJson<ParallelumVehicleResponse>(
      `/carros/marcas/${encodeURIComponent(brandCode)}/modelos/${encodeURIComponent(
        modelCode,
      )}/anos/${encodeURIComponent(yearCode)}`,
    );
    const valueCents = parseBRLToCents(raw.Valor);
    const yearNum =
      typeof raw.AnoModelo === "string" ? Number.parseInt(raw.AnoModelo, 10) : raw.AnoModelo;
    return {
      fipeCode,
      brand: raw.Marca,
      model: raw.Modelo,
      year: Number.isFinite(yearNum) ? (yearNum as number) : 0,
      value: Money.fromCents(valueCents),
      referenceMonth: raw.MesReferencia,
    };
  }

  private getCached<T>(key: string): T | null {
    const hit = this.cache.get(key);
    if (!hit) return null;
    if (hit.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return hit.data as T;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, expiresAt: Date.now() + this.cacheTtlMs });
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const cached = this.getCached<T>(url);
    if (cached) return cached;

    let res: Response;
    try {
      res = await this.fetchWithRetry(url);
    } catch (err) {
      throw new Error(`FIPE network error for ${path}: ${(err as Error).message}`);
    }
    if (!res.ok) {
      throw new Error(`FIPE HTTP ${res.status} for ${path}`);
    }
    const json = (await res.json()) as T;
    this.setCache(url, json);
    return json;
  }

  private fetchOnce(url: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    return this.fetchImpl(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
  }

  private async fetchWithRetry(url: string): Promise<Response> {
    try {
      const res = await this.fetchOnce(url);
      if (res.status >= 500) {
        await delay(RETRY_BACKOFF_MS);
        return this.fetchOnce(url);
      }
      return res;
    } catch {
      await delay(RETRY_BACKOFF_MS);
      return this.fetchOnce(url);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
