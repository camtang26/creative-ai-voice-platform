# Contributing to Creative AI Voice Platform

Thank you for your interest in contributing to the Creative AI Voice Platform! This document provides guidelines and instructions for contributing to the project.

## 🚀 Getting Started

1. **Fork the repository** and clone it locally
2. **Review the project documentation**:
   - [README.md](README.md) - Project overview
   - [MASTER_IMPLEMENTATION_PLAN.md](MASTER_IMPLEMENTATION_PLAN.md) - Detailed implementation guide
   - [Comprehensive_Technical_Architecture.md](creative-ai-platform/Comprehensive_Technical_Architecture.md) - Technical details

3. **Set up your development environment** (see Development Setup below)

## 📋 Development Workflow

### 1. Selecting an Issue

- Browse [open issues](https://github.com/camtang26/creative-ai-voice-platform/issues)
- Look for issues labeled `phase:1` for Phase 1 tasks
- Check the [Project Board](https://github.com/users/camtang26/projects/1) for task status
- Comment on the issue to claim it
- Wait for assignment before starting work

### 2. Task Numbering Reference

Due to the order of issue creation, GitHub issue numbers don't match task numbers exactly. Here's the mapping:

| Task Number | GitHub Issue | Title |
|-------------|--------------|-------|
| 1.1.1.1 | #1 | Fork and Clean Repository |
| 1.1.1.2 | #2 | Initialize Monorepo Structure |
| 1.1.1.3 | #3 | Environment Configuration Setup |
| 1.1.2.1 | #4 | Docker Development Environment |
| 1.1.2.2 | #5 | VS Code Configuration |
| 1.1.3.1 | #7 | GitHub Actions Basic Setup |
| 1.1.3.2 | #6 | Deployment Pipeline Setup |
| 1.2.1.1 | #11 | Audit Current Security Issues |
| 1.2.1.2 | #9 | Fix Package Vulnerabilities |
| 1.2.1.3 | #8 | Implement Input Validation |
| 1.2.1.4 | #10 | Configure CORS Properly |
| 1.2.2.1 | #12 | Implement API Key Management |
| 1.2.2.2 | #14 | Add Bearer Token Validation |
| 1.2.2.3 | #15 | Implement Rate Limiting |
| 1.2.2.4 | #13 | Add Feature Flags |
| 1.3.1.1 | #16 | Sentry Integration |
| 1.3.1.2 | #17 | Alert Configuration |
| 1.3.2.1 | #18 | Structured Logging Enhancement |
| 1.3.2.2 | #19 | Centralized Log Aggregation |
| 1.3.3.1 | #20 | Create Health Check Endpoints |
| 1.3.3.2 | #21 | Backup & Recovery Setup |
| 1.4.1.1 | #22 | MongoDB Atlas Configuration |
| 1.4.1.2 | #23 | Configure Indexes |
| 1.4.2.1 | #24 | Design User Schema |
| 1.4.2.2 | #25 | Enhanced Call Schema |
| 1.5.1.1 | #26 | Supabase Project Setup |
| 1.5.1.2 | #27 | Backend Auth Integration |

### 3. Development Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/issue-number-brief-description
   # Example: git checkout -b feature/1-fork-clean-repository
   ```

2. **Follow the Definition of Done** (included in each issue):
   - [ ] All acceptance criteria met
   - [ ] Code follows project conventions
   - [ ] Tests written and passing
   - [ ] Documentation updated
   - [ ] No hardcoded values or secrets
   - [ ] Error handling implemented
   - [ ] Logging added for debugging
   - [ ] Code reviewed
   - [ ] Deployed to development environment
   - [ ] No console errors or warnings

3. **Commit often** with clear messages:
   ```bash
   git commit -m "feat: add MongoDB connection with retry logic (#22)"
   git commit -m "fix: resolve CORS configuration for production (#10)"
   git commit -m "docs: update environment setup instructions"
   ```

4. **Push your branch** and create a Pull Request

## 🔧 Development Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- MongoDB (via Docker or Atlas)
- Git

### Local Setup

1. **Clone and install dependencies**:
   ```bash
   git clone https://github.com/yourusername/creative-ai-voice-platform.git
   cd creative-ai-voice-platform
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development services**:
   ```bash
   docker-compose up -d
   npm run dev
   ```

## 📝 Code Standards

### JavaScript/TypeScript

- Use ES6+ features
- Prefer async/await over callbacks
- Use meaningful variable names
- Add JSDoc comments for functions
- Follow existing code patterns

### File Structure

```
creative-ai-platform/
├── backend/          # Backend services
├── frontend/         # Next.js frontend
├── shared/          # Shared types and utilities
├── docs/            # Documentation
└── tests/           # Test files
```

### Testing

- Write tests for new features
- Maintain minimum 80% coverage
- Run tests before submitting PR:
  ```bash
  npm test
  npm run test:coverage
  ```

## 🔄 Pull Request Process

1. **Use the PR template** (automatically loaded)
2. **Link the related issue** using "Closes #X"
3. **Ensure all checks pass**:
   - CI/CD pipeline
   - Code review
   - Tests

4. **Request review** from maintainers
5. **Address feedback** promptly
6. **Squash commits** if requested

## 🚨 Important Notes

- **Security**: Never commit secrets or API keys
- **Dependencies**: Discuss before adding new dependencies
- **Breaking Changes**: Clearly document in PR description
- **Database Changes**: Include migration scripts

## 🎯 Priority Guidelines

Focus on issues in this order:
1. 🔴 `high-priority` labeled issues
2. 🟡 Issues blocking other work
3. 🟢 Enhancement issues

## 💬 Communication

- **Questions**: Comment on the issue or PR
- **Discussions**: Use GitHub Discussions
- **Urgent**: Tag @camtang26

## 🙏 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Provide constructive feedback
- Focus on what is best for the project

---

Thank you for contributing to Creative AI Voice Platform! 🚀