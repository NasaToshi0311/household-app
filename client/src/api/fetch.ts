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
        // AbortErrorを保持して、呼び出し側で適切に処理できるようにする
        const abortError = new Error(`Request timeout after ${timeoutMs}ms`);
        abortError.name = "AbortError";
        throw abortError;
      }
      throw error;
    }
  }
  