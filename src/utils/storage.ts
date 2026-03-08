// src/utils/storage.ts
// Simple localStorage implementation for now, can be replaced with a proper database later

export interface StoredReading {
  id: string;
  question: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  locationName?: string;
  chartData: any;
  conversation: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;
  tags?: string[];
}

class ReadingStorage {
  private readonly STORAGE_KEY = "horary_readings";

  // Save a new reading
  saveReading(reading: Omit<StoredReading, "id">): string {
    const id = this.generateId();
    const storedReading: StoredReading = {
      ...reading,
      id,
    };

    const readings = this.getAllReadings();
    readings.push(storedReading);

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(readings));
      return id;
    } catch (error) {
      console.error("Error saving reading:", error);
      throw new Error("Failed to save reading");
    }
  }

  // Update an existing reading (e.g., add conversation messages)
  updateReading(id: string, updates: Partial<StoredReading>): void {
    const readings = this.getAllReadings();
    const index = readings.findIndex((r) => r.id === id);

    if (index === -1) {
      throw new Error("Reading not found");
    }

    readings[index] = { ...readings[index], ...updates };

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(readings));
    } catch (error) {
      console.error("Error updating reading:", error);
      throw new Error("Failed to update reading");
    }
  }

  // Get all readings
  getAllReadings(): StoredReading[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading readings:", error);
      return [];
    }
  }

  // Get a specific reading by ID
  getReading(id: string): StoredReading | null {
    const readings = this.getAllReadings();
    return readings.find((r) => r.id === id) || null;
  }

  // Delete a reading
  deleteReading(id: string): void {
    const readings = this.getAllReadings();
    const filtered = readings.filter((r) => r.id !== id);

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error("Error deleting reading:", error);
      throw new Error("Failed to delete reading");
    }
  }

  // Search readings by question text
  searchReadings(query: string): StoredReading[] {
    const readings = this.getAllReadings();
    const lowercaseQuery = query.toLowerCase();

    return readings.filter(
      (reading) =>
        reading.question.toLowerCase().includes(lowercaseQuery) ||
        reading.tags?.some((tag) => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Get readings by date range
  getReadingsByDateRange(startDate: Date, endDate: Date): StoredReading[] {
    const readings = this.getAllReadings();

    return readings.filter((reading) => {
      const readingDate = new Date(reading.timestamp);
      return readingDate >= startDate && readingDate <= endDate;
    });
  }

  // Export readings as JSON
  exportReadings(): string {
    const readings = this.getAllReadings();
    return JSON.stringify(readings, null, 2);
  }

  // Import readings from JSON
  importReadings(jsonData: string): void {
    try {
      const importedReadings = JSON.parse(jsonData);
      if (!Array.isArray(importedReadings)) {
        throw new Error("Invalid format");
      }

      // Validate structure (basic check)
      importedReadings.forEach((reading) => {
        if (!reading.id || !reading.question || !reading.timestamp) {
          throw new Error("Invalid reading structure");
        }
      });

      localStorage.setItem(this.STORAGE_KEY, jsonData);
    } catch (error) {
      console.error("Error importing readings:", error);
      throw new Error("Failed to import readings");
    }
  }

  // Import a complete reading (e.g. from a share link), deduplicating by ID
  importReading(reading: StoredReading): void {
    const readings = this.getAllReadings();
    if (!readings.some(r => r.id === reading.id)) {
      readings.unshift(reading);
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(readings));
      } catch (error) {
        console.error("Error importing reading:", error);
      }
    }
  }

  // Generate a unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get storage usage stats
  getStorageStats(): {
    totalReadings: number;
    oldestReading: string | null;
    newestReading: string | null;
    storageSize: number;
  } {
    const readings = this.getAllReadings();
    const storageData = localStorage.getItem(this.STORAGE_KEY) || "";

    return {
      totalReadings: readings.length,
      oldestReading:
        readings.length > 0
          ? readings.reduce((oldest, current) =>
              new Date(current.timestamp) < new Date(oldest.timestamp)
                ? current
                : oldest
            ).timestamp
          : null,
      newestReading:
        readings.length > 0
          ? readings.reduce((newest, current) =>
              new Date(current.timestamp) > new Date(newest.timestamp)
                ? current
                : newest
            ).timestamp
          : null,
      storageSize: new Blob([storageData]).size,
    };
  }
}

// Create and export a singleton instance
export const readingStorage = new ReadingStorage();

// Encode a reading into a shareable URL (gzip + URL-safe base64)
export async function encodeReadingToUrl(reading: StoredReading): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(reading));
  const stream = new ReadableStream({
    start(c) { c.enqueue(bytes); c.close(); },
  });
  const compressed = stream.pipeThrough(new CompressionStream("gzip"));
  const chunks: Uint8Array[] = [];
  const reader = compressed.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  const base64url = btoa(String.fromCodePoint(...out))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const url = new URL(window.location.href);
  url.search = ""; url.hash = "";
  url.searchParams.set("share", base64url);
  return url.toString();
}

// Decode a shared reading from the current URL's ?share= param
export async function decodeReadingFromUrl(): Promise<StoredReading | null> {
  const encoded = new URLSearchParams(window.location.search).get("share");
  if (!encoded) return null;
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/")
      + "==".slice(0, (4 - encoded.length % 4) % 4);
    const bytes = Uint8Array.from(atob(padded), c => c.codePointAt(0)!);
    const stream = new ReadableStream({
      start(c) { c.enqueue(bytes); c.close(); },
    });
    const decompressed = stream.pipeThrough(new DecompressionStream("gzip"));
    const chunks: Uint8Array[] = [];
    const reader = decompressed.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let offset = 0;
    for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder().decode(out)) as StoredReading;
  } catch {
    return null;
  }
}

// Hook for Vue components
export function useReadingStorage() {
  return {
    saveReading: readingStorage.saveReading.bind(readingStorage),
    updateReading: readingStorage.updateReading.bind(readingStorage),
    getAllReadings: readingStorage.getAllReadings.bind(readingStorage),
    getReading: readingStorage.getReading.bind(readingStorage),
    deleteReading: readingStorage.deleteReading.bind(readingStorage),
    searchReadings: readingStorage.searchReadings.bind(readingStorage),
    getReadingsByDateRange:
      readingStorage.getReadingsByDateRange.bind(readingStorage),
    exportReadings: readingStorage.exportReadings.bind(readingStorage),
    importReadings: readingStorage.importReadings.bind(readingStorage),
    importReading: readingStorage.importReading.bind(readingStorage),
    getStorageStats: readingStorage.getStorageStats.bind(readingStorage),
  };
}
