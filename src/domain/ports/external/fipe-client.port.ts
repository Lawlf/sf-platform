import type { Money } from "@/domain/value-objects/money.vo";

export interface FipeBrand {
  code: string;
  name: string;
}

export interface FipeModel {
  code: string;
  name: string;
}

export interface FipeYear {
  code: string;
  name: string;
}

export interface FipeVehicleData {
  /** Composite identifier "{brandCode}/{modelCode}/{yearCode}". */
  fipeCode: string;
  brand: string;
  model: string;
  /** Vehicle year as integer (e.g., 2020). */
  year: number;
  value: Money;
  /** Reference month string from the FIPE API (e.g., "Maio de 2026"). */
  referenceMonth: string;
}

export interface FipeClient {
  listBrands(): Promise<FipeBrand[]>;
  listModels(brandCode: string): Promise<FipeModel[]>;
  listYears(brandCode: string, modelCode: string): Promise<FipeYear[]>;
  getVehicleValue(fipeCode: string): Promise<FipeVehicleData>;
}
