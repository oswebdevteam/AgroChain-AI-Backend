import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment variable schema — validates ALL required configuration at startup.
 * The application will fail fast with descriptive errors if any required variable is missing.
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  API_VERSION: z.string().default('v1'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_JWT_SECRET: z.string().min(1, 'SUPABASE_JWT_SECRET is required'),

  // Interswitch
  INTERSWITCH_BASE_URL: z.string().url().default('https://sandbox.interswitchng.com'),
  INTERSWITCH_CLIENT_ID: z.string().min(1, 'INTERSWITCH_CLIENT_ID is required'),
  INTERSWITCH_CLIENT_SECRET: z.string().min(1, 'INTERSWITCH_CLIENT_SECRET is required'),
  INTERSWITCH_MERCHANT_CODE: z.string().min(1, 'INTERSWITCH_MERCHANT_CODE is required'),
  INTERSWITCH_PAYMENT_ITEM_ID: z.string().min(1, 'INTERSWITCH_PAYMENT_ITEM_ID is required'),
  INTERSWITCH_WEBHOOK_SECRET: z.string().min(1, 'INTERSWITCH_WEBHOOK_SECRET is required'),

  // Blockchain (Base Sepolia)
  BASE_SEPOLIA_RPC_URL: z.string().url().default('https://sepolia.base.org'),
  BLOCKCHAIN_PRIVATE_KEY: z.string().min(1, 'BLOCKCHAIN_PRIVATE_KEY is required'),
  TRADE_LOGGER_CONTRACT_ADDRESS: z.string().min(1, 'TRADE_LOGGER_CONTRACT_ADDRESS is required'),
  BASE_SEPOLIA_CHAIN_ID: z.string().default('84532').transform(Number),

  // Gemini
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  GEMINI_MAX_TOKENS: z.string().default('1500').transform(Number),

  // FX API
  FX_API_BASE_URL: z.string().url().default('https://v6.exchangerate-api.com/v6'),
  FX_API_KEY: z.string().min(1, 'FX_API_KEY is required'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  AUTH_RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.string().default('20').transform(Number),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validated environment configuration singleton.
 * Parses and validates all environment variables at import time.
 * Throws a descriptive ZodError if any variable fails validation.
 */
function loadConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ✗ ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`\n Environment validation failed:\n${formatted}\n`);
    process.exit(1);
  }

  return result.data;
}

/** Singleton config — validated at startup */
export const config: EnvConfig = loadConfig();
