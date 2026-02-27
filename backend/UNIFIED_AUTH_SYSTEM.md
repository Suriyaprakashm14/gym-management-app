# Unified Authentication System

This document describes the unified authentication system that consolidates both the legacy Member-based authentication and the new RBAC User-based authentication into a single, cohesive system.

## Overview

The unified authentication system provides:
- **Backward Compatibility**: Supports existing Member model users
- **RBAC Support**: Full Role-Based Access Control with User model
- **Forgot Password**: Email-based OTP password reset functionality
- **Security Features**: Account locking, freezing, and comprehensive audit trails

## API Endpoints

### Primary Authentication Routes (`/api/auth`)

> Note: Public self-signup is intentionally not supported in this system.  
> User creation is admin-driven via role-specific creation endpoints.

#### Public Routes (No Authentication Required)

**Login**
```
POST /api/auth/login
```
- Supports both User (RBAC) and Member (Legacy) models
- Automatically detects user type and applies appropriate security checks
- Returns unified response format

**Create First Admin**
```
POST /api/auth/create-first-admin
```
- Creates the first admin user in the system
- No authentication required (bootstrap endpoint)
- Only works if no admin exists

**Forgot Password**
```
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/verify-otp
POST /api/auth/resend-otp
```
- Email-based OTP password reset
- Works with both User and Member models
- Rate limiting and security checks included

#### Protected Routes (Authentication Required)

**User Profile Management**
```
GET /api/auth/profile
PUT /api/auth/profile
PUT /api/auth/change-password
POST /api/auth/logout
```

**RBAC User Management** (Role-based access)
```
POST /api/auth/create-admin          # Admin only
POST /api/auth/create-gym-owner      # Admin only
POST /api/auth/create-manager        # Gym Owner or Admin
```

### Legacy Routes (Backward Compatibility)

All legacy routes are still available under `/api/legacy/` for backward compatibility.

## Authentication Flow

### Login Process

1. **User Detection**: System first checks User model (RBAC), then Member model (Legacy)
2. **Security Checks**: 
   - Account locking (RBAC users)
   - Account freezing (RBAC users)
   - Role validation (Legacy users)
3. **Password Verification**: Uses appropriate comparison method for each model
4. **Token Generation**: Unified JWT token with user type indicator
5. **Response**: Consistent format regardless of user model

### User Model Priority

The system prioritizes the RBAC User model over the Legacy Member model:

```javascript
// Login flow
1. Check User.findOne({ email, isActive: true })
2. If not found, check Member.findOne({ email })
3. Apply appropriate security and validation
4. Return unified response
```

## Response Format

### Successful Login Response

```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "role": "admin",
    "gymId": "gym_id",
    "gymName": "Gym Name",
    "branchId": "branch_id",
    "branchName": "Branch Name",
    "permissions": [],
    "lastLogin": "2024-01-01T12:00:00.000Z",
    "isLegacy": false
  }
}
```

### Error Responses

```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

## User Models

### RBAC User Model (Primary)

- **File**: `models/user.js`
- **Features**: 
  - Role-based access control (admin, gym_owner, manager, member)
  - Account locking and freezing
  - Comprehensive permissions system
  - Audit trails and security features
  - Face recognition and fingerprint support

### Legacy Member Model (Backward Compatibility)

- **File**: `models/member.js`
- **Features**:
  - Simple admin/manager roles
  - Basic authentication
  - Maintained for existing users

## Security Features

### RBAC Users
- **Account Locking**: 5 failed attempts → 2-hour lock
- **Account Freezing**: Can be frozen by admin or gym status
- **Login Attempt Tracking**: Automatic reset on successful login
- **Comprehensive Permissions**: Fine-grained resource access control

### Legacy Users
- **Basic Validation**: Email and password verification
- **Role Restriction**: Only admin and manager roles allowed
- **Simple Security**: No locking or freezing mechanisms

## Forgot Password System

### Features
- **Email OTP**: 6-digit code with 10-minute expiration
- **Rate Limiting**: 2 minutes between requests
- **Attempt Limiting**: Maximum 3 verification attempts
- **Automatic Cleanup**: Expired OTPs removed automatically
- **Professional Templates**: HTML email templates

### Supported Email Services
- Gmail (recommended)
- Outlook/Hotmail
- Yahoo
- Custom SMTP servers

## Migration Strategy

### For Existing Systems
1. **No Breaking Changes**: Legacy endpoints still work
2. **Gradual Migration**: Users can be migrated to RBAC system over time
3. **Unified Login**: Single login endpoint handles both systems
4. **Backward Compatibility**: All existing integrations continue to work

### For New Implementations
1. **Use RBAC**: Create users with the User model
2. **Leverage Features**: Take advantage of advanced security features
3. **Unified Endpoints**: Use `/api/auth` endpoints for all operations

## Configuration

### Environment Variables

```bash
# JWT Configuration
JWTSECRET=your_jwt_secret_key_here

# Email Service (for forgot password)
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

## Middleware

### Authentication Middleware
- **File**: `middleware/authMiddleware.js`
- **Purpose**: Validates JWT tokens and sets req.user

### RBAC Middleware
- **File**: `middleware/rbacMiddleware.js`
- **Functions**:
  - `adminOnly`: Restricts to admin role
  - `gymOwnerOrAdmin`: Allows gym owners and admins
  - `managerOrAbove`: Allows managers, gym owners, and admins

### Token Blacklist
- **File**: `middleware/tokenBlacklist.js`
- **Purpose**: Handles logout token invalidation

## Testing

### Test Login Flow
```bash
# Test RBAC user login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Test forgot password
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com"}'
```

### Debug Endpoints
- `GET /api/auth/debug` - Check system status
- `GET /api/auth/debug-email/:email` - Debug specific email
- `POST /api/auth/test-login` - Test login functionality

## Best Practices

### For Developers
1. **Use Unified Endpoints**: Always use `/api/auth` for new development
2. **Handle User Types**: Check `isLegacy` flag in responses
3. **Implement Proper Error Handling**: Handle both RBAC and legacy error responses
4. **Use RBAC Features**: Leverage permissions and security features for new users

### For Administrators
1. **Migrate Gradually**: Move legacy users to RBAC system over time
2. **Monitor Security**: Use account locking and freezing features
3. **Configure Email**: Set up proper email service for forgot password
4. **Regular Cleanup**: Monitor OTP cleanup and token blacklisting

## Troubleshooting

### Common Issues

**Login Fails for Existing Users**
- Check if user exists in both User and Member models
- Verify email case sensitivity
- Check account status (locked/frozen)

**Forgot Password Not Working**
- Verify email service configuration
- Check OTP expiration (10 minutes)
- Ensure email exists in system
- Check rate limiting (2 minutes between requests)

**Token Issues**
- Verify JWT secret configuration
- Check token expiration (8 hours)
- Ensure proper Authorization header format

### Debug Steps
1. Check server logs for detailed error messages
2. Use debug endpoints to inspect system state
3. Verify database connections and model configurations
4. Test email service configuration separately

## Future Enhancements

### Planned Features
- **Multi-factor Authentication**: SMS and authenticator app support
- **Single Sign-On**: Integration with external identity providers
- **Advanced Permissions**: Resource-specific permission management
- **Audit Logging**: Comprehensive activity tracking
- **Session Management**: Advanced session handling and device tracking

### Migration Tools
- **Bulk User Migration**: Tools to migrate legacy users to RBAC
- **Permission Mapping**: Automatic permission assignment
- **Data Validation**: Ensure data integrity during migration

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Use debug endpoints to inspect system state
3. Verify configuration and environment variables
4. Test with both RBAC and legacy user types

The unified authentication system provides a robust, secure, and backward-compatible solution for your gym management application.

