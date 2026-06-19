export interface MemoryFact {
  category: string;
  value: string;
  confidence: number;
  source: string;
  timestamp: string;
}

export interface CustomerMemory {
  customerId: string;
  facts: MemoryFact[];
  preferences: string[];
  communicationStyle: string;
  favoriteProducts: string[];
  purchaseHabits: string;
  importantEvents: string[];
  summary: string;
  lastUpdated: string;
}
