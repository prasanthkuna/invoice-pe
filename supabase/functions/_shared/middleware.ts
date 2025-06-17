import { logger, LogContext, generateRequestId, extractUserContext } from './logger.ts';

export interface RequestHandler {
  (req: Request, context: LogContext): Promise<Response>;
}

export interface MiddlewareOptions {
  logRequests?: boolean;
  logResponses?: boolean;
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  sensitiveHeaders?: string[];
  sensitiveBodyFields?: string[];
}

const DEFAULT_OPTIONS: MiddlewareOptions = {
  logRequests: true,
  logResponses: true,
  logRequestBody: true,
  logResponseBody: false, // Usually too verbose for responses
  sensitiveHeaders: ['authorization', 'cookie', 'x-api-key'],
  sensitiveBodyFields: ['password', 'otp', 'token', 'secret'],
};

export function withLogging(
  handler: RequestHandler,
  options: MiddlewareOptions = {}
): (req: Request) => Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async (req: Request): Promise<Response> => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // Build initial context
    const context: LogContext = {
      requestId,
      ...extractUserContext(req),
    };

    try {
      // Log incoming request
      if (opts.logRequests) {
        await logRequest(req, context, opts);
      }

      // Execute the handler
      const response = await handler(req, context);
      const duration = Date.now() - startTime;

      // Log response
      if (opts.logResponses) {
        await logResponse(req, response, duration, context, opts);
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error
      logger.error('Request handler failed', {
        ...context,
        duration,
        method: req.method,
        url: req.url,
      }, error as Error);

      // Return generic error response
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          requestId: context.requestId 
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'X-Request-ID': context.requestId || '',
          } 
        }
      );
    }
  };
}

async function logRequest(
  req: Request,
  context: LogContext,
  options: MiddlewareOptions
): Promise<void> {
  const url = new URL(req.url);
  const method = req.method;
  
  // Sanitize headers
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (options.sensitiveHeaders?.includes(key.toLowerCase())) {
      headers[key] = '[REDACTED]';
    } else {
      headers[key] = value;
    }
  });

  let body: any = undefined;
  if (options.logRequestBody && req.body && method !== 'GET') {
    try {
      const clonedReq = req.clone();
      const bodyText = await clonedReq.text();
      if (bodyText) {
        body = JSON.parse(bodyText);
        body = sanitizeObject(body, options.sensitiveBodyFields || []);
      }
    } catch (error) {
      logger.warn('Failed to parse request body for logging', context);
    }
  }

  logger.apiRequest(method, url.pathname, {
    ...context,
    headers,
    query: Object.fromEntries(url.searchParams),
    body,
  });
}

async function logResponse(
  req: Request,
  response: Response,
  duration: number,
  context: LogContext,
  options: MiddlewareOptions
): Promise<void> {
  const url = new URL(req.url);
  const method = req.method;
  const status = response.status;

  let responseBody: any = undefined;
  if (options.logResponseBody) {
    try {
      const clonedResponse = response.clone();
      const bodyText = await clonedResponse.text();
      if (bodyText) {
        responseBody = JSON.parse(bodyText);
        responseBody = sanitizeObject(responseBody, options.sensitiveBodyFields || []);
      }
    } catch (error) {
      logger.warn('Failed to parse response body for logging', context);
    }
  }

  logger.apiResponse(method, url.pathname, status, duration, {
    ...context,
    responseBody,
  });
}

function sanitizeObject(obj: any, sensitiveFields: string[]): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, sensitiveFields));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, sensitiveFields);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Helper function to extract user ID from JWT token
export async function extractUserId(req: Request): Promise<string | undefined> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return undefined;
    }

    const token = authHeader.substring(7);
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub;
  } catch (error) {
    logger.warn('Failed to extract user ID from token', { error: error.message });
    return undefined;
  }
}

// CORS headers utility
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Helper to handle OPTIONS requests
export function handleCORS(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
