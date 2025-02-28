// For Node 18+ we can use fetch natively.
// import Boom from '@hapi/boom'

export async function postRequest<T>(url: string, data: any, headers?: Record<string, string>): Promise<T> {
  try {

    const defaultHeaders = { 'Content-Type': 'application/json' };
    const mergedHeaders = { ...defaultHeaders, ...headers };
    const response = await fetch(url, {
      method: 'POST',
      headers: mergedHeaders,
      body: JSON.stringify(data),
    });

    // Assuming the response is JSON
    // const statusCode = response.status
    // if (!response.ok) {
    //   console.log('Error (statusText, status):', response.statusText, statusCode)
    //   throw new Boom.Boom(response.statusText, { statusCode })
    // }
    return response.json() as T;
  } catch (error) {
    return error
  }
}


