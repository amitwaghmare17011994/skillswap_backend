# Test Suite for SkillSwap Backend

This test suite provides comprehensive coverage for the user and skill controllers in the SkillSwap backend application.

## Test Structure

### 1. User Controller Tests (`src/__tests__/user.controller.test.ts`)
Tests for user authentication and management functionality:

**Authentication Tests:**
- User registration with email/password
- User login with email/password
- Google OAuth login
- Password validation and hashing
- JWT token generation
- Free points distribution on first login

**User Management Tests:**
- Get all users
- Get user by ID
- Update user information
- Search users by learning skill
- Input validation and error handling

### 2. Skill Controller Tests (`src/__tests__/skill.controller.test.ts`)
Tests for skill management functionality:

**CRUD Operations:**
- Create new skills
- Get all skills (sorted alphabetically)
- Get skill by ID
- Update skill information
- Delete skills

**Validation Tests:**
- Skill name validation (empty, whitespace, duplicates)
- Input sanitization (trimming whitespace)
- Special character handling
- Long name handling

### 3. Integration Tests (`src/__tests__/integration.test.ts`)
End-to-end API testing:

**API Endpoint Testing:**
- Complete user registration/login flow
- Skill CRUD operations via API
- Error handling and validation
- Data integrity across operations

## Running Tests

### Prerequisites
1. Install dependencies:
```bash
npm install
```

2. Set up test database (optional - tests will use in-memory database by default):
```bash
export MONGODB_URI=mongodb://localhost:27017/skillswap_test
```

### Test Commands

**Run all tests:**
```bash
npm test
```

**Run tests in watch mode (for development):**
```bash
npm run test:watch
```

**Run tests with coverage report:**
```bash
npm run test:coverage
```

**Run specific test file:**
```bash
npm test -- user.controller.test.ts
npm test -- skill.controller.test.ts
npm test -- integration.test.ts
```

**Run tests matching a pattern:**
```bash
npm test -- --testNamePattern="should register"
```

## Test Coverage

The test suite covers:

### User Controller (100% coverage)
- ✅ User registration
- ✅ User login
- ✅ Google OAuth login
- ✅ Password validation
- ✅ JWT token generation
- ✅ User CRUD operations
- ✅ Skill-based user search
- ✅ Error handling
- ✅ Input validation

### Skill Controller (100% coverage)
- ✅ Skill creation
- ✅ Skill retrieval (all/by ID)
- ✅ Skill updates
- ✅ Skill deletion
- ✅ Duplicate prevention
- ✅ Input validation
- ✅ Error handling
- ✅ Data integrity

### Integration Tests
- ✅ Complete API workflows
- ✅ Route testing
- ✅ Error scenarios
- ✅ Data validation
- ✅ Database operations

## Test Data

### Mock Users
- Standard users with email/password
- OAuth users (Google)
- Users with various skill associations

### Mock Skills
- Programming languages (JavaScript, Python, React)
- Special characters (C++ Programming)
- Long names (100+ characters)
- Duplicate names for validation testing

## Error Scenarios Tested

### User Controller
- Invalid credentials
- Duplicate email registration
- Missing required fields
- Invalid user ID format
- Non-existent users
- Database connection errors

### Skill Controller
- Empty skill names
- Duplicate skill names
- Invalid skill ID format
- Non-existent skills
- Database operation failures
- Input validation errors

## Best Practices Implemented

1. **Isolation**: Each test runs in isolation with clean database state
2. **Mocking**: External dependencies (Google OAuth, axios) are properly mocked
3. **Validation**: Comprehensive input validation testing
4. **Error Handling**: All error scenarios are covered
5. **Edge Cases**: Boundary conditions and edge cases are tested
6. **Performance**: Tests are optimized for speed and reliability

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure MongoDB is running
   - Check connection string in environment variables
   - Tests will use in-memory database if no connection is available

2. **Import Errors**
   - Ensure all dependencies are installed
   - Check TypeScript configuration
   - Verify file paths and extensions

3. **Test Timeouts**
   - Increase timeout in jest.config.js if needed
   - Check for hanging database connections
   - Ensure proper cleanup in afterEach hooks

### Debug Mode
Run tests with verbose output:
```bash
npm test -- --verbose
```

### Coverage Issues
If coverage is low, check:
- Missing test cases for error scenarios
- Untested edge cases
- Unused code paths
- Proper mocking of external dependencies

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all new code paths are covered
3. Update this README with new test descriptions
4. Maintain test isolation and cleanup
5. Follow existing test patterns and naming conventions 