//Sets up mock environment variables before any test runs.

process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.API_VERSION = 'v1';
process.env.CORS_ORIGINS = 'http://localhost:3000';

// Supabase
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long';

// Interswitch
process.env.INTERSWITCH_BASE_URL = 'https://sandbox.interswitchng.com';
process.env.INTERSWITCH_CLIENT_ID = 'test-client-id';
process.env.INTERSWITCH_CLIENT_SECRET = 'test-client-secret';
process.env.INTERSWITCH_MERCHANT_CODE = 'MER123';
process.env.INTERSWITCH_PAYMENT_ITEM_ID = 'ITEM123';
process.env.INTERSWITCH_WEBHOOK_SECRET = 'test-webhook-secret';

// Blockchain
process.env.BASE_SEPOLIA_RPC_URL = 'https://sepolia.base.org';
process.env.BLOCKCHAIN_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
process.env.TRADE_LOGGER_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000001';
process.env.BASE_SEPOLIA_CHAIN_ID = '84532';

// OpenAI
process.env.OPENAI_API_KEY = 'sk-test-key';
process.env.OPENAI_MODEL = 'gpt-4o';
process.env.OPENAI_MAX_TOKENS = '1500';

// FX
process.env.FX_API_BASE_URL = 'https://v6.exchangerate-api.com/v6';
process.env.FX_API_KEY = 'test-fx-key';

// Rate Limiting
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '1000';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '900000';
process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = '100';

// Logging
process.env.LOG_LEVEL = 'silent';
