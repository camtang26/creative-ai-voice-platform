# Step-by-Step Guide for US-East Deployment

Now that we fixed the email integration issue by including the required email-tools directory, let's deploy again:

1. Make sure you're in the railway-package directory:
```
cd deployment/railway-package
```

2. All necessary files are now included:
   - server.js
   - outbound.js
   - email-tools/api-email-service.js
   - email-tools/aws-ses-email.js

3. Deploy the service again:
```
railway up
```

This should deploy successfully now that all the required files are included. After deployment completes:

1. Get the domain for your deployed service:
```
railway domain
```

2. Set the SERVER_URL environment variable:
```
railway variables --set "SERVER_URL=https://your-domain-from-previous-command"
```

3. Redeploy to apply the SERVER_URL:
```
railway up
```

Your service should now be running in US-East with full email functionality!

To test the deployment:
```
node make-call.js +1234567890 "Default prompt" "Default message" https://your-railway-app-domain
```

Update your Twilio webhook URLs to point to your new domain to complete the setup.
