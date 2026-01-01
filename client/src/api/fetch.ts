export async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs = 8000
  ) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
  
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (error: any) {
      clearTimeout(id);
      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw error;
    }
  }
  