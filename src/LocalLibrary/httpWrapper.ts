// For Node 18+ we can use fetch natively.
import Boom from '@hapi/boom'

export async function postRequest<T>(url: string, data: any, headers?: Record<string, string>): Promise<T | Error> {
  try {

    const defaultHeaders = { 'Content-Type': 'application/json' };
    const mergedHeaders = { ...defaultHeaders, ...headers };
    const response = await fetch(url, {
      method: 'POST',
      headers: mergedHeaders,
      body: JSON.stringify(data),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(json));
    }
    console.log('postRequest. Returning apparently successful response');
    return json as T;
  } catch (error) {
    console.log('postRequest. Returning an error', error);
    return error
  }
}


