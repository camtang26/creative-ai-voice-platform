# ElevenLabs-Twilio US-East Deployment Package

This package contains everything needed to deploy the ElevenLabs-Twilio integration server to a US-East region server for significantly reduced latency in voice calls.

## Why US-East Deployment?

The ElevenLabs Conversational AI API is hosted in the US-East region (primarily Virginia). By deploying your server close to this region, you can reduce the round-trip time for audio data, resulting in:

- **Lower latency**: Reduce audio delay by 200-300ms
- **More responsive conversations**: Fewer pauses and interruptions
- **Higher reliability**: Less chance of audio timeouts or connection issues

## Deployment Options

This package includes several deployment options:

1. **AWS EC2 (Recommended)**: Full instructions in `DEPLOYMENT.md`
2. **Heroku**: Simplified deployment but potentially higher cost
3. **Other cloud providers**: Instructions for Google Cloud, DigitalOcean, etc.

## Quick Start (AWS EC2)

1. Launch an EC2 instance in the US-East-1 (N. Virginia) region
2. Connect to your instance via SSH
3. Run the setup script:
   ```bash
   curl -o setup.sh https://raw.githubusercontent.com/yourusername/elevenlabs-twilio-outbound-calling/main/deployment/setup.sh
   chmod +x setup.sh
   ./setup.sh
   ```
4. Upload your code to the server
5. Update your .env file with your credentials
6. Start the server:
   ```bash
   cd elevenlabs-server
   npm install
   pm2 start server.js --name elevenlabs
   pm2 startup
   pm2 save
   ```

## Files Included

- `setup.sh`: Automated setup script for AWS EC2
- `DEPLOYMENT.md`: Detailed deployment instructions
- `package.json`: Production-ready package configuration
- `.github/workflows/deploy.yml`: GitHub Actions workflow for automated deployment

## Setting Up Continuous Deployment

1. Add your repository to GitHub
2. Set up GitHub Actions secrets:
   - `SSH_PRIVATE_KEY`: Your EC2 private key
   - `SSH_USER`: Username for your EC2 instance (usually `ec2-user` or `ubuntu`)
   - `SSH_HOST`: Public DNS of your EC2 instance
   - `KNOWN_HOSTS`: Output of `ssh-keyscan your-ec2-host`

3. Push to main branch to trigger deployment

## Testing the Deployment

After deployment, test your setup:

1. Make sure your Twilio webhook URLs point to your new server
2. Run a test call to check latency:
   ```bash
   node make-call.js +1234567890
   ```
3. Monitor server logs:
   ```bash
   pm2 logs elevenlabs
   ```

## Troubleshooting

If you encounter issues:

1. Check server logs with `pm2 logs elevenlabs`
2. Verify your .env configuration is correct
3. Ensure security groups allow traffic on port 8000
4. Check that your Twilio webhook URL is correctly set

## Support

For further assistance, please contact your system administrator or review the detailed documentation in `DEPLOYMENT.md`.