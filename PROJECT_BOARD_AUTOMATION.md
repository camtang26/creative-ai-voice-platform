# GitHub Project Board Automation Setup

This guide walks through setting up automation for the Creative AI Voice Platform project board.

## Project Board Configuration

### 1. Workflow Columns

The project board should have these columns:
- **📋 Todo** - New issues land here
- **🏃 In Progress** - Issues being actively worked on
- **👀 Review** - Issues in PR review
- **✅ Done** - Completed issues

### 2. Basic Automation Rules

#### Auto-add to project
1. Go to Project Settings → Workflows
2. Enable "Auto-add to project"
3. Set filter: `is:issue is:open`

#### Column Automation
1. **Todo → In Progress**
   - Trigger: When assignee is set
   - Action: Move to "In Progress"

2. **In Progress → Review**
   - Trigger: When PR is linked
   - Action: Move to "Review"

3. **Review → Done**
   - Trigger: When issue is closed
   - Action: Move to "Done"

### 3. Label Configuration

Create these priority labels:
- `🔴 critical` - Production-breaking issues
- `🟠 high-priority` - Phase 1 essential tasks
- `🟡 medium-priority` - Important but not blocking
- `🟢 low-priority` - Nice to have enhancements

Additional labels:
- `🐛 bug` - Bug fixes
- `✨ enhancement` - New features
- `📚 documentation` - Documentation updates
- `🔧 maintenance` - Technical debt, refactoring
- `🚀 performance` - Performance improvements
- `🔒 security` - Security-related issues

### 4. Milestone Setup

Current milestones:
- **Phase 1: MVP Foundation** - Core platform setup
- **Phase 2: Core Features** - Essential functionality
- **Phase 3: Advanced Features** - Enhanced capabilities

### 5. Issue Templates

Located in `.github/ISSUE_TEMPLATE/`:
- `task.md` - Standard development tasks
- `bug_report.md` - Bug reports
- `feature_request.md` - Feature requests

### 6. GitHub Actions Integration

For CI/CD automation, add these workflows:

`.github/workflows/auto-assign-project.yml`:
```yaml
name: Auto Assign to Project

on:
  issues:
    types: [opened]
  pull_request:
    types: [opened]

jobs:
  add-to-project:
    name: Add to project
    runs-on: ubuntu-latest
    steps:
      - uses: actions/add-to-project@v0.5.0
        with:
          project-url: https://github.com/users/camtang26/projects/1
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### 7. Manual Setup Steps

Until automation is configured:

1. **When creating issues**:
   - Add to project manually
   - Set appropriate labels
   - Assign to Phase 1 milestone

2. **When starting work**:
   - Assign yourself
   - Move to "In Progress" column
   - Create feature branch

3. **When creating PR**:
   - Link to issue with "Closes #X"
   - Request review
   - Move issue to "Review"

4. **When PR is merged**:
   - Issue auto-closes
   - Move to "Done" if not automatic

## Quick Reference

### Issue Workflow
```
Create Issue → Auto-add to Todo → Assign Developer → In Progress → Create PR → Review → Merge → Done
```

### Branch Naming
```
feature/issue-number-brief-description
fix/issue-number-bug-description
docs/issue-number-what-updated
```

### Commit Messages
```
feat: add feature (#issue)
fix: resolve bug (#issue)
docs: update documentation (#issue)
refactor: improve code structure (#issue)
test: add test coverage (#issue)
```