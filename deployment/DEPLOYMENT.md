# US-East Server Deployment Guide

This guide provides instructions for deploying the ElevenLabs-Twilio integration server to the US-East region for significantly reduced latency.

## Option 1: AWS EC2 Deployment (Recommended)

### Step 1: Set Up an EC2 Instance

1. Log in to the AWS Management Console
2. Select EC2 service
3. Click "Launch Instance"
4. Choose an Amazon Machine Image (AMI):
   - **Amazon Linux 2** or **Ubuntu Server 22.04 LTS**
   - Choose 64-bit (x86) architecture
5. Select an Instance Type:
   - **t2.micro** is sufficient for testing
   - **t2.small** or **t2.medium** for production use
6. Configure instance:
   - **Region**: Select "US East (N. Virginia)" - us-east-1
   - Network: Default VPC
   - Auto-assign Public IP: Enable
7. Add Storage:
   - Default (8 GB) is sufficient
8. Configure Security Group:
   - Create a new security group
   - Add rules:
     - SSH (port 22) - from your IP
     - HTTP (port 80) - from anywhere
     - HTTPS (port 443) - from anywhere
     - Custom TCP (port 8000) - from anywhere
9. Review and Launch
10. Create or select a key pair (download and save the .pem file)

### Step 2: Connect to Your Instance

For Windows:
```
ssh -i /path/to/your-key.pem ec2-user@your-instance-public-dns
```

For Amazon Linux 2, use `ec2-user` as the username.
For Ubuntu, use `ubuntu` as the username.

### Step 3: Install Node.js and Dependencies

For Amazon Linux 2:
```bash
# Update packages
sudo yum update -y

# Install Node.js 16+
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 16

# Install Git
sudo yum install git -y
```

For Ubuntu:
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 16+
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt install git -y
```

### Step 4: Deploy Your Application

1. Clone your repository (or upload files):
   ```bash
   git clone https://github.com/yourusername/elevenlabs-twilio-outbound-calling.git
   cd elevenlabs-twilio-outbound-calling
   ```

2. Or upload directly:
   ```bash
   # From your local machine, use scp to upload
   scp -i /path/to/your-key.pem -r /path/to/local/elevenlabs-outbound-calling ec2-user@your-instance-public-dns:~/
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create .env file:
   ```bash
   nano .env
   ```
   Paste your environment variables, updating the SERVER_URL with your EC2 instance's public DNS or IP.

### Step 5: Setup Domain and SSL (Optional but Recommended)

1. Register a domain or create a subdomain
2. Install Certbot for SSL:
   ```bash
   sudo amazon-linux-extras install epel
   sudo yum install certbot -y
   ```

3. Set up Nginx as a reverse proxy:
   ```bash
   sudo yum install nginx -y
   ```

4. Configure Nginx:
   ```bash
   sudo nano /etc/nginx/conf.d/elevenlabs.conf
   ```

   Add:
   ```
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:8000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. Get SSL certificate:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

### Step 6: Run Your Application

For development:
```bash
npm start
```

For production (using PM2):
```bash
sudo npm install -g pm2
pm2 start server.js
pm2 startup
pm2 save
```

### Step 7: Update Twilio Settings

1. Go to your Twilio account
2. Update your webhook URLs to point to your new server URL:
   ```
   https://your-domain.com/outbound-call-twiml
   ```

## Option 2: Heroku Deployment

Heroku has servers in the US and provides a simpler deployment experience.

### Step 1: Install Heroku CLI

Follow instructions at: https://devcenter.heroku.com/articles/heroku-cli

### Step 2: Login and Create App

```bash
heroku login
heroku create elevenlabs-twilio-app
```

### Step 3: Configure your app

Create a Procfile in your project root:
```
web: node server.js
```

### Step 4: Set Environment Variables

```bash
heroku config:set TWILIO_ACCOUNT_SID=your_twilio_account_sid
heroku config:set TWILIO_AUTH_TOKEN=your_twilio_auth_token
heroku config:set TWILIO_PHONE_NUMBER=your_twilio_phone_number
heroku config:set ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
heroku config:set ELEVENLABS_API_KEY=your_elevenlabs_api_key
heroku config:set SERVER_URL=https://your-app-name.herokuapp.com
```

### Step 5: Deploy to Heroku

```bash
git push heroku main
```

### Step 6: Update Twilio Settings

Update your webhook URLs to point to your Heroku app URL:
```
https://your-app-name.herokuapp.com/outbound-call-twiml
```

## Option 3: Other Cloud Providers

Similar steps can be followed for:
- Google Cloud Run (us-east1 region)
- DigitalOcean Droplets (New York data center)
- Linode (Newark data center)

## Post-Deployment Testing

After deploying to US-East region, test the latency improvement:

1. Make a test call:
   ```bash
   node make-call.js +1234567890
   ```

2. Monitor logs for WebSocket connection times:
   ```bash
   tail -f logs/server.log
   ```

## Expected Results

With a US-East server, you should expect:
- Reduced latency by 200-300ms
- More consistent voice interactions
- Fewer dropped connections

## Troubleshooting

### Connection Issues
- Check security groups/firewall settings
- Verify Twilio webhooks are correctly configured
- Check server logs for errors

### Latency Still High
- Test server ping to elevenlabs.io APIs
- Check server load/CPU usage
- Consider upgrading to a more powerful instance

### SSL Issues
- Verify certificate is valid
- Check Nginx configuration