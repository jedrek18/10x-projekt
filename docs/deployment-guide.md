# Deployment Guide - OpenRouter AI Service

## Overview

This guide covers the deployment and configuration of the OpenRouter AI service for the 10x Projekt language learning application.

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- OpenRouter API key
- Vercel account (for deployment)

## Environment Configuration

### 1. Supabase Environment Variables

Add the following environment variables to your Supabase project:

```bash
# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here

# Optional: Override default model
DEFAULT_AI_MODEL=openai/gpt-oss-20b:free

# Optional: Cache configuration
AI_CACHE_TTL=3600
AI_CACHE_MAX_SIZE=100MB

# Optional: Rate limiting
AI_RATE_LIMIT_REQUESTS=10
AI_RATE_LIMIT_WINDOW=60000
```

### 2. Local Development Environment

Create a `.env.local` file in your project root:

```bash
# Supabase Configuration
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# OpenRouter Configuration
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here

# Development Settings
NODE_ENV=development
AI_DEBUG_MODE=true
```

## Database Setup

### 1. Required Tables

The following tables should exist in your Supabase database:

```sql
-- Event logging table (if not exists)
CREATE TABLE IF NOT EXISTS event_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  request_id UUID,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error logging table (optional)
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  context TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_id UUID,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance metrics table (optional)
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operation TEXT NOT NULL,
  response_time INTEGER NOT NULL,
  memory_usage INTEGER,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_id UUID,
  success BOOLEAN NOT NULL,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Row Level Security (RLS)

Enable RLS on the tables:

```sql
-- Enable RLS
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own events" ON event_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events" ON event_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own errors" ON error_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own metrics" ON performance_metrics
  FOR SELECT USING (auth.uid() = user_id);
```

## OpenRouter API Setup

### 1. Get API Key

1. Visit [OpenRouter](https://openrouter.ai/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-or-v1-`)

### 2. Configure Models

The service is configured to use `openai/gpt-oss-20b:free` as the default model. You can change this in:

```typescript
// src/lib/config/models.ts
export const DEFAULT_MODEL = "openai/gpt-oss-20b:free";
```

Available models:

- `openai/gpt-oss-20b:free` - Free, good for basic tasks
- `openai/gpt-4o-mini` - Fast and efficient
- `openai/gpt-4o` - Most capable
- `anthropic/claude-3-haiku` - Fast and cost-effective
- `anthropic/claude-3-sonnet` - Balanced performance
- `google/gemini-flash-1.5` - Very fast and cost-effective

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Test AI Endpoints

Test the AI endpoints locally:

```bash
# Test flashcard generation
curl -X POST http://localhost:4321/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "source_text": "Artificial Intelligence is a branch of computer science.",
    "max_proposals": 5
  }'

# Test translation
curl -X POST http://localhost:4321/api/ai/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world",
    "targetLanguage": "pl"
  }'

# Test grammar correction
curl -X POST http://localhost:4321/api/ai/grammar \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I goes to school"
  }'

# Test vocabulary explanation
curl -X POST http://localhost:4321/api/ai/vocabulary \
  -H "Content-Type: application/json" \
  -d '{
    "word": "serendipity"
  }'
```

## Production Deployment

### 1. Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy the application

### 2. Environment Variables in Vercel

Add the following environment variables in your Vercel project:

```bash
# Supabase
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here

# Production Settings
NODE_ENV=production
AI_DEBUG_MODE=false
```

### 3. Build and Deploy

```bash
# Build the application
npm run build

# Deploy to Vercel
vercel --prod
```

## Monitoring and Health Checks

### 1. Health Check Endpoint

The application includes a health check endpoint:

```bash
curl https://your-domain.vercel.app/api/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "performance": {
    "totalRequests": 150,
    "averageResponseTime": 245,
    "errorRate": 0.02,
    "uptime": 3600
  },
  "memory": {
    "used": 45,
    "total": 512,
    "external": 12
  }
}
```

### 2. Performance Monitoring

The application includes built-in performance monitoring:

- API response times
- Memory usage
- Error rates
- Cache hit rates

Access performance data through the health check endpoint or console logs.

## Testing

### 1. Run Unit Tests

```bash
npm test
```

### 2. Run Integration Tests

```bash
npm run test:integration
```

### 3. Test Coverage

```bash
npm run test:coverage
```

## Troubleshooting

### Common Issues

#### 1. API Key Issues

**Problem**: `Invalid API key` errors
**Solution**:

- Verify your OpenRouter API key is correct
- Ensure the key starts with `sk-or-v1-`
- Check if the key has sufficient credits

#### 2. Rate Limiting

**Problem**: `Rate limit exceeded` errors
**Solution**:

- Check your OpenRouter usage limits
- Implement exponential backoff in your client code
- Consider upgrading your OpenRouter plan

#### 3. Model Unavailable

**Problem**: `Model not available` errors
**Solution**:

- Check if the model is available in your OpenRouter plan
- Switch to a different model in the configuration
- Verify model names are correct

#### 4. Memory Issues

**Problem**: High memory usage
**Solution**:

- Reduce cache size in configuration
- Clear old cache entries
- Monitor memory usage through health checks

### Debug Mode

Enable debug mode for detailed logging:

```bash
AI_DEBUG_MODE=true
```

This will log:

- API requests and responses
- Cache hits and misses
- Performance metrics
- Error details

## Security Considerations

### 1. API Key Security

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Rotate API keys regularly
- Monitor API usage for unusual patterns

### 2. Rate Limiting

- Implement client-side rate limiting
- Use exponential backoff for retries
- Monitor rate limit headers in responses

### 3. Input Validation

- All user inputs are validated server-side
- Implement proper error handling
- Sanitize inputs to prevent injection attacks

### 4. CORS Configuration

The application includes proper CORS configuration for security.

## Performance Optimization

### 1. Caching

- AI responses are cached to reduce API calls
- Cache TTL is configurable
- LRU eviction policy for memory management

### 2. Rate Limiting

- Server-side rate limiting per user
- Configurable limits and windows
- Graceful degradation under load

### 3. Monitoring

- Real-time performance monitoring
- Automatic cleanup of old metrics
- Health check endpoints

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review application logs
3. Check OpenRouter documentation
4. Contact support with detailed error information

## Changelog

### v1.0.0

- Initial release with OpenRouter integration
- Flashcard generation, translation, grammar correction, vocabulary explanation
- Comprehensive error handling and monitoring
- Performance optimization and caching
- Health check endpoints
