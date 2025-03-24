#!/bin/bash
# ElevenLabs-Twilio Server Setup Script for AWS EC2
# This script should be run on an EC2 instance in US-East region

echo "=========================================================="
echo "    ElevenLabs-Twilio Server Setup (US-East Optimized)    "
echo "=========================================================="

# Update system packages
echo "Updating system packages..."
sudo yum update -y || sudo apt update -y

# Install Node.js
echo "Installing Node.js..."
if command -v apt &> /dev/null; then
    # Ubuntu
    curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    # Amazon Linux
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
    source ~/.nvm/nvm.sh
    nvm install 16
fi

# Install PM2 (process manager)
echo "Installing PM2 process manager..."
sudo npm install -g pm2

# Create directory structure
echo "Creating directory structure..."
mkdir -p ~/elevenlabs-server/logs

# Set up environment file
echo "Setting up environment file..."
cat > ~/elevenlabs-server/.env << EOF
# Twilio credentials
TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER=YOUR_TWILIO_PHONE_NUMBER

# ElevenLabs credentials
ELEVENLABS_AGENT_ID=YOUR_ELEVENLABS_AGENT_ID
ELEVENLABS_API_KEY=YOUR_ELEVENLABS_API_KEY

# Server settings
SERVER_URL=https://YOUR_SERVER_URL

# Optional settings
CALL_DELAY=60000
EOF

echo "=========================================================="
echo "Setup completed! Next steps:"
echo ""
echo "1. Edit your .env file with actual credentials:"
echo "   nano ~/elevenlabs-server/.env"
echo ""
echo "2. Copy your server files to the elevenlabs-server directory"
echo ""
echo "3. Install dependencies:"
echo "   cd ~/elevenlabs-server && npm install"
echo ""
echo "4. Start the server with PM2:"
echo "   cd ~/elevenlabs-server && pm2 start server.js --name elevenlabs"
echo ""
echo "5. Make PM2 start on boot:"
echo "   pm2 startup && pm2 save"
echo "=========================================================="