# CONTRIBUTING.md

```markdown
# Production Contribution Guidelines

## Code Quality Standards

### Required for All Pull Requests:
- ✅ 100% test coverage for new code
- ✅ Load-tested endpoints (Locust/K6 results)
- ✅ API documentation updates
- ✅ Security review checklist completed
- ✅ Performance metrics (P99 < 300ms)

## Production Deployment Process

1. **Pre-Flight Checklist**:
   - [ ] Database migrations tested
   - [ ] Rollback procedure documented
   - [ ] Feature flags configured
   - [ ] Monitoring dashboards updated

2. **Approval Chain**:
   - Senior Engineer → Security Lead → DevOps

## Critical Path Development

For these sensitive areas:
- Payment processing
- Order fulfillment
- Authentication flows

**Additional Requirements**:
- Pentest report from security team
- Fraud analysis simulation
- Disaster recovery plan

## Compliance Requirements

- GDPR data handling procedures
- PCI-DSS compliance for payments
- SOC2 Type II controls

## Incident Response

1. Tag PRs with urgency levels:
   - `[SEV-1]`: Production outage
   - `[SEV-2]`: Major functionality broken
   - `[SEV-3]`: Minor defects

2. Hotfix Process:
   ```bash
   git flow hotfix start [ticket]
   # Follow emergency deployment protocol