export const queryKeys = {
  dashboardSnapshot: ["dashboardSnapshot"] as const,
  upcomingDues: ["upcomingDues"] as const,
  netWorth: ["netWorth"] as const,
  assetsWithAllocations: ["assetsWithAllocations"] as const,
  debts: (status: string) => ["debts", status] as const,
  incomes: ["incomes"] as const,
  expenses: ["expenses"] as const,
  timeline: (filters: { range: string; show: string }) =>
    ["timeline", filters.range, filters.show] as const,
  monthDetail: (monthIso: string) => ["monthDetail", monthIso] as const,
  positionDetail: ["positionDetail"] as const,
  maintenancePrompts: ["maintenancePrompts"] as const,
};
