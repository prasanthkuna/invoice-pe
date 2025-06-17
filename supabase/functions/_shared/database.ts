import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logger, LogContext } from './logger.ts';

export interface DatabaseConfig {
  url: string;
  serviceRoleKey: string;
  logQueries?: boolean;
  logSlowQueries?: boolean;
  slowQueryThreshold?: number; // milliseconds
}

export class DatabaseClient {
  private client: SupabaseClient;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = {
      logQueries: true,
      logSlowQueries: true,
      slowQueryThreshold: 1000, // 1 second
      ...config,
    };

    this.client = createClient(config.url, config.serviceRoleKey);
  }

  // Wrapper for SELECT queries with logging
  async select(
    table: string,
    options: {
      select?: string;
      eq?: Record<string, any>;
      neq?: Record<string, any>;
      gt?: Record<string, any>;
      gte?: Record<string, any>;
      lt?: Record<string, any>;
      lte?: Record<string, any>;
      like?: Record<string, any>;
      ilike?: Record<string, any>;
      in?: Record<string, any[]>;
      order?: { column: string; ascending?: boolean }[];
      limit?: number;
      offset?: number;
      single?: boolean;
    } = {},
    context?: LogContext
  ) {
    const startTime = Date.now();
    const queryDescription = this.buildQueryDescription('SELECT', table, options);

    try {
      let query = this.client.from(table);

      // Apply select
      if (options.select) {
        query = query.select(options.select);
      } else {
        query = query.select('*');
      }

      // Apply filters
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (options.neq) {
        Object.entries(options.neq).forEach(([key, value]) => {
          query = query.neq(key, value);
        });
      }

      if (options.gt) {
        Object.entries(options.gt).forEach(([key, value]) => {
          query = query.gt(key, value);
        });
      }

      if (options.gte) {
        Object.entries(options.gte).forEach(([key, value]) => {
          query = query.gte(key, value);
        });
      }

      if (options.lt) {
        Object.entries(options.lt).forEach(([key, value]) => {
          query = query.lt(key, value);
        });
      }

      if (options.lte) {
        Object.entries(options.lte).forEach(([key, value]) => {
          query = query.lte(key, value);
        });
      }

      if (options.like) {
        Object.entries(options.like).forEach(([key, value]) => {
          query = query.like(key, value);
        });
      }

      if (options.ilike) {
        Object.entries(options.ilike).forEach(([key, value]) => {
          query = query.ilike(key, value);
        });
      }

      if (options.in) {
        Object.entries(options.in).forEach(([key, values]) => {
          query = query.in(key, values);
        });
      }

      // Apply ordering
      if (options.order) {
        options.order.forEach(({ column, ascending = true }) => {
          query = query.order(column, { ascending });
        });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 1000)) - 1);
      }

      // Execute query
      const result = options.single ? await query.single() : await query;
      const duration = Date.now() - startTime;

      // Log query
      this.logQuery(queryDescription, duration, result.error, context);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logQueryError(queryDescription, error as Error, context);
      throw error;
    }
  }

  // Wrapper for INSERT queries with logging
  async insert(
    table: string,
    data: any | any[],
    options: {
      select?: string;
      onConflict?: string;
      ignoreDuplicates?: boolean;
    } = {},
    context?: LogContext
  ) {
    const startTime = Date.now();
    const queryDescription = `INSERT INTO ${table}`;

    try {
      let query = this.client.from(table).insert(data);

      if (options.onConflict) {
        query = query.onConflict(options.onConflict);
      }

      if (options.ignoreDuplicates) {
        query = query.ignoreDuplicates();
      }

      if (options.select) {
        query = query.select(options.select);
      }

      const result = await query;
      const duration = Date.now() - startTime;

      this.logQuery(queryDescription, duration, result.error, context, {
        recordCount: Array.isArray(data) ? data.length : 1,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logQueryError(queryDescription, error as Error, context);
      throw error;
    }
  }

  // Wrapper for UPDATE queries with logging
  async update(
    table: string,
    data: any,
    filters: Record<string, any>,
    options: {
      select?: string;
    } = {},
    context?: LogContext
  ) {
    const startTime = Date.now();
    const queryDescription = `UPDATE ${table}`;

    try {
      let query = this.client.from(table).update(data);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      if (options.select) {
        query = query.select(options.select);
      }

      const result = await query;
      const duration = Date.now() - startTime;

      this.logQuery(queryDescription, duration, result.error, context, {
        filters,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logQueryError(queryDescription, error as Error, context);
      throw error;
    }
  }

  // Wrapper for DELETE queries with logging
  async delete(
    table: string,
    filters: Record<string, any>,
    context?: LogContext
  ) {
    const startTime = Date.now();
    const queryDescription = `DELETE FROM ${table}`;

    try {
      let query = this.client.from(table).delete();

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const result = await query;
      const duration = Date.now() - startTime;

      this.logQuery(queryDescription, duration, result.error, context, {
        filters,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logQueryError(queryDescription, error as Error, context);
      throw error;
    }
  }

  private buildQueryDescription(operation: string, table: string, options: any): string {
    let description = `${operation} FROM ${table}`;
    
    if (options.select && options.select !== '*') {
      description += ` (${options.select})`;
    }

    if (options.eq) {
      const conditions = Object.entries(options.eq).map(([k, v]) => `${k}=${v}`);
      description += ` WHERE ${conditions.join(' AND ')}`;
    }

    return description;
  }

  private logQuery(
    query: string,
    duration: number,
    error: any,
    context?: LogContext,
    metadata?: any
  ): void {
    if (!this.config.logQueries) return;

    if (error) {
      logger.dbError(query, error, context);
    } else {
      const isSlowQuery = duration >= (this.config.slowQueryThreshold || 1000);
      
      if (isSlowQuery && this.config.logSlowQueries) {
        logger.warn(`Slow query detected: ${query}`, {
          ...context,
          duration,
          ...metadata,
        });
      } else {
        logger.dbQuery(query, duration, {
          ...context,
          ...metadata,
        });
      }
    }
  }

  private logQueryError(query: string, error: Error, context?: LogContext): void {
    logger.dbError(query, error, context);
  }

  // Direct access to Supabase client for complex queries
  get raw(): SupabaseClient {
    return this.client;
  }
}

// Factory function to create database client
export function createDatabaseClient(): DatabaseClient {
  const config: DatabaseConfig = {
    url: Deno.env.get('SUPABASE_URL') ?? '',
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    logQueries: Deno.env.get('LOG_DB_QUERIES') !== 'false',
    logSlowQueries: Deno.env.get('LOG_SLOW_QUERIES') !== 'false',
    slowQueryThreshold: parseInt(Deno.env.get('SLOW_QUERY_THRESHOLD') || '1000'),
  };

  return new DatabaseClient(config);
}
