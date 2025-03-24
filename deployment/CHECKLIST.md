# US-East Server Deployment Checklist

Use this checklist to ensure all steps are completed for your US-East server deployment.

## Pre-Deployment

- [ ] Complete a full backup of your existing application
- [ ] Run the original server locally to confirm it works correctly
- [ ] Prepare your `.env` file with all necessary credentials
- [ ] Decide on your preferred deployment method (EC2, Heroku, etc.)
- [ ] Set up a new domain name (optional but recommended)

## Server Setup

- [ ] Create a new server instance in US-East-1 region
- [ ] Configure security groups/firewall to allow necessary traffic:
  - [ ] SSH (port 22)
  - [ ] HTTP (port 80)
  - [ ] HTTPS (port 443)
  - [ ] Custom TCP (port 8000)
- [ ] Install Node.js v16+ and npm
- [ ] Install PM2 for process management
- [ ] Set up server monitoring (optional)

## Application Deployment

- [ ] Copy application files to server:
  - [ ] Use `prepare-deployment.js` to create a clean package
  - [ ] Copy deployment package to server (SCP, SFTP, or GitHub)
- [ ] Install dependencies with `npm install`
- [ ] Create and configure `.env` file with production settings
- [ ] Start application with PM2: `pm2 start server.js --name elevenlabs`
- [ ] Set up PM2 to start on boot: `pm2 startup && pm2 save`

## Domain and SSL (Optional)

- [ ] Configure DNS settings for your domain to point to server
- [ ] Install and configure Nginx as a reverse proxy
- [ ] Set up SSL with Certbot or similar tool
- [ ] Test HTTPS connectivity

## Twilio Configuration

- [ ] Update Twilio webhook URLs to point to your new server
- [ ] Test with a single outbound call
- [ ] Verify call latency improvement
- [ ] Update all automation scripts with new webhook URLs

## Post-Deployment Checks

- [ ] Verify server logs show no errors
- [ ] Confirm all environment variables are set correctly
- [ ] Test outbound calling functionality
- [ ] Measure latency improvement (should be 200-300ms better)
- [ ] Test Google Sheets integration if used
- [ ] Test email functionality if used

## Monitoring and Maintenance

- [ ] Set up alerts for server issues (optional)
- [ ] Create backup schedule for application data
- [ ] Document deployment details for future reference
- [ ] Create a rollback plan in case of issues

## Additional Notes

**Server Costs**: 
- AWS t2.micro: ~$10/month (free tier eligible for first year)
- Heroku Basic Dynos: $7/month (but sleeps after 30 minutes of inactivity)

**Ongoing Maintenance**:
- Apply security updates regularly
- Monitor server performance 
- Set up log rotation to prevent disk space issues

**Troubleshooting**:
- Most common issues involve incorrect webhook URLs
- Check PM2 logs first: `pm2 logs elevenlabs`
- Use `curl` to test server endpoints directly

Use this checklist with the detailed instructions in DEPLOYMENT.md for a successful migration to US-East servers.