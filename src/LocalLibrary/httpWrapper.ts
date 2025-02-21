// For Node 18+ (no additional install needed) 
// We can use fetch natively.

export async function postData(url: string, data: any, headers?: Record<string, string>) {
  const defaultHeaders = { 'Content-Type': 'application/json' };
  const mergedHeaders = { ...defaultHeaders, ...headers };
  const response = await fetch(url, {
    method: 'POST',
    headers: mergedHeaders,
    body: JSON.stringify(data),
  });

  // Assuming the response is JSON
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  return response.json();
}


