# Security Guidelines for ElevenLabs Twilio Project

## Credential Handling

### NEVER store sensitive credentials in the repository

This project requires multiple credentials that MUST NOT be committed to the repository:

- Twilio Account SID and Auth Token
- ElevenLabs API Key
- AWS SES SMTP Username and Password
- Custom API Keys

### Proper Way to Handle Credentials

1. **Use Environment Variables**: All credentials should be stored in a `.env` file that is NOT committed to the repository.

2. **Use `.env.example`**: The repository includes a `.env.example` file with placeholder values. Copy this file to create your own `.env` file:
   ```bash
   cp .env.example .env
   # Then edit .env with your actual credentials
   ```

3. **Verify .gitignore**: The repository's `.gitignore` file explicitly excludes `.env` files from being committed.

4. **Pre-commit Check**: Before committing changes, ensure no sensitive data is included:
   ```bash
   git diff --staged
   ```

## Security Best Practices

1. **API Key Rotation**: Regularly rotate API keys and credentials.

2. **Minimal Permissions**: Use credentials with the minimal permissions necessary.

3. **Environment Isolation**: Use different credentials for development and production environments.

4. **Secure Communications**: Ensure all API communications use HTTPS/TLS.

5. **Logging**: Be careful not to log sensitive information, including credentials.

## If You Find Credentials in the Repository

If you discover actual credentials committed to this repository:

1. **Immediately Invalidate**: Revoke the credentials at their respective services.

2. **Issue Report**: Contact the repository owner.

3. **Repository Cleanup**: Use tools like BFG Repo-Cleaner or git-filter-branch to remove sensitive data from git history.

## Contact

For security concerns, please contact:
- [Insert your name/contact info here] 