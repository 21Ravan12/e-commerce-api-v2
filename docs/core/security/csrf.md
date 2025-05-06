# CSRF Protection Module

## Overview
Provides Cross-Site Request Forgery (CSRF) protection using:
- Cryptographically secure token generation
- Redis-backed token storage
- Multiple token source options (headers/cookies)

## Core Functions

### `generateCSRFToken()`
```javascript
const token = generateCSRFToken();
// Returns: "a1b2c3d4e5f6..."