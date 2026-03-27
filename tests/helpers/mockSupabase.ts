/**
 * ============================================
 * AgroChain AI — Supabase Mock Helpers
 * ============================================
 * Provides chainable mock builders that mimic the Supabase JS client API.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Build a chainable mock that resolves to { data, error, count } */
export function createMockQueryBuilder(resolvedData: any = null, resolvedError: any = null, resolvedCount: number | null = null) {
  const builder: Record<string, jest.Mock> = {};
  const methods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'like', 'ilike', 'in', 'contains', 'or',
    'order', 'range', 'limit',
    'single', 'maybeSingle',
  ];

  for (const method of methods) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }

  // Terminal methods return the resolved value
  builder.single = jest.fn().mockResolvedValue({
    data: resolvedData,
    error: resolvedError,
    count: resolvedCount,
  });
  builder.maybeSingle = jest.fn().mockResolvedValue({
    data: resolvedData,
    error: resolvedError,
    count: resolvedCount,
  });

  // When no terminal method is called, the builder itself resolves
  builder.then = jest.fn((resolve: (value: any) => any) =>
    resolve({ data: resolvedData ? [resolvedData] : [], error: resolvedError, count: resolvedCount })
  );

  return builder;
}

/** Create a mock Supabase client */
export function createMockSupabaseClient() {
  return {
    from: jest.fn().mockReturnValue(createMockQueryBuilder()),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signUp: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signInWithOtp: jest.fn().mockResolvedValue({ data: {}, error: null }),
      verifyOtp: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      refreshSession: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      admin: {
        createUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        deleteUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
      },
    },
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
}

/**
 * Setup mock for supabaseAdmin.from('table') to return specific data.
 * Returns a reference to the mock for assertion.
 */
export function mockSupabaseFrom(
  mockClient: ReturnType<typeof createMockSupabaseClient>,
  tableName: string,
  data: any = null,
  error: any = null,
  count: number | null = null
) {
  const queryBuilder = createMockQueryBuilder(data, error, count);

  mockClient.from.mockImplementation((table: string) => {
    if (table === tableName) {
      return queryBuilder;
    }
    return createMockQueryBuilder();
  });

  return queryBuilder;
}
