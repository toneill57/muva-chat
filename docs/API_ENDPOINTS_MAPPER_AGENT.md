# API Endpoints Mapper Agent Documentation

## Overview

The api-endpoints-mapper agent is a specialized Claude Code agent designed to analyze, document, and map API endpoints for both internal codebases and external APIs, with particular focus on schema migration and system integration for MUVA's multi-tenant architecture.

## Core Capabilities

### Internal Codebase Analysis
- Express.js and Next.js route discovery
- OpenAPI/Swagger specification parsing
- Framework-specific routing pattern recognition
- Comprehensive endpoint documentation

### External API Analysis 🌐
- **Live API exploration** using WebFetch tool
- **WordPress REST API patterns** (`/wp-json/wp/v2/`, `/wp-json/[plugin]/v1/`)
- **MotoPress Hotel Booking** specialization (`/wp-json/mphb/v1/`)
- Multiple authentication methods (API keys, Basic auth, App passwords)

### Schema Migration Planning 🏗️
- External-to-internal data structure mapping
- Multi-tenant isolation strategy planning
- Matryoshka embeddings architecture integration
- Performance optimization recommendations
- Data transformation requirement analysis

## MotoPress Hotel Booking Specialization 🏨

### Supported Endpoints
- **Core accommodations**: `/wp-json/mphb/v1/accommodations`
- **Booking management**: `/wp-json/mphb/v1/bookings`, `/wp-json/mphb/v1/reservations`
- **Room types and attributes**: amenities, capacity, pricing rules
- **Availability calendar**: date ranges, booking restrictions
- **Media handling**: accommodation photos, virtual tours

### MUVA Integration Features
- **Multi-tenant mapping** to `hotels`, `accommodation_units`, `unit_amenities`, `pricing_rules`
- **Matryoshka tier planning**:
  - Tier 1 (1024 dims): Tourism content
  - Tier 2 (1536 dims): SIRE compliance
  - Tier 3 (3072 dims): Complex property data
- **Performance optimization** with HNSW indexing strategies

## Authentication Patterns

### WordPress Application Passwords
```bash
# Basic auth with app-specific passwords
Authorization: Basic base64(username:app_password)
```

### REST API Keys (WooCommerce-style)
```bash
# Consumer key/secret authentication
?consumer_key=ck_xxx&consumer_secret=cs_xxx
```

### JWT Tokens
```bash
# Bearer token authentication
Authorization: Bearer jwt_token_here
```

## Output Format 📊

### Migration Analysis Report Structure
1. **Executive Summary**
   - Migration feasibility assessment
   - Complexity rating (low/medium/high)
   - Estimated timeline and resources

2. **Endpoint Inventory**
   - Complete endpoint catalog
   - Categorization by function and priority
   - Authentication requirements

3. **Schema Mapping Tables**
   - External API ↔ MUVA Database mapping
   - Data transformation requirements
   - Relationship preservation strategies

4. **Implementation Roadmap**
   - Phased migration approach
   - Dependencies and prerequisites
   - Performance implications

5. **Technical Specifications**
   - Sample requests/responses
   - Data validation rules
   - Error handling patterns

## Usage Examples

### Basic API Analysis
```bash
# Invoke agent for internal codebase analysis
@agent-api-endpoints-mapper "Map all API routes in the src/app/api directory"
```

### External API Migration Planning
```bash
# MotoPress accommodation analysis
@agent-api-endpoints-mapper "Analyze MotoPress accommodations API with credentials:
URL: https://example.com
User: admin
App Password: xxxx xxxx xxxx xxxx"
```

### Schema Migration Focus
```bash
# Focus on specific data migration
@agent-api-endpoints-mapper "Map booking endpoints for migration to MUVA multi-tenant system"
```

## Quality Assurance Process ✅

### Verification Steps
1. **Live API testing** with provided credentials
2. **Data consistency checks** across related endpoints
3. **Security requirement validation**
4. **Performance benchmarking** for large datasets
5. **Cross-reference documentation** with actual responses

### Error Handling
- Alternative endpoint suggestions
- Authentication troubleshooting
- Limitation documentation
- Workaround recommendations

## Integration with MUVA Architecture

### Multi-Tenant Considerations
- **Tenant isolation** strategies
- **Data separation** at schema level
- **Permission system** integration
- **Scalability** planning

### Matryoshka Embeddings Integration
- **Content categorization** for appropriate tiers
- **Search optimization** strategies
- **Index management** recommendations
- **Performance monitoring** integration

### Database Schema Planning
- **Table relationship** mapping
- **Migration script** generation
- **Data validation** strategies
- **Rollback procedures**

## Best Practices

### Before Analysis
1. Gather all authentication credentials
2. Identify specific migration objectives
3. Review MUVA's current schema
4. Determine priority endpoints

### During Analysis
1. Test all authentication methods
2. Document data relationships thoroughly
3. Consider performance implications
4. Plan for error scenarios

### After Analysis
1. Validate findings with stakeholders
2. Create detailed implementation plan
3. Set up monitoring and testing
4. Document lessons learned

## Troubleshooting

### Common Issues
- **Authentication failures**: Verify credentials and permissions
- **Rate limiting**: Implement proper throttling
- **Data inconsistencies**: Cross-validate with multiple sources
- **Missing endpoints**: Check API documentation versions

### Support Resources
- WordPress REST API documentation
- MotoPress Hotel Booking API reference
- MUVA architecture documentation
- Matryoshka embeddings technical guide

## Version History

### v2.0 (September 2025)
- Added external API analysis capabilities
- MotoPress Hotel Booking specialization
- Schema migration planning features
- Matryoshka embeddings integration
- Multi-tenant architecture support

### v1.0 (Initial)
- Basic internal codebase analysis
- Express.js and Next.js support
- OpenAPI specification parsing