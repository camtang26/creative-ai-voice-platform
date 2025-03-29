import fetch from 'node-fetch';

async function getNgrokUrl() {
  try {
    // Fetch the tunnels information from the ngrok API
    const response = await fetch('http://localhost:4040/api/tunnels');
    const data = await response.json();
    
    // Extract the HTTPS URL
    const httpsUrl = data.tunnels.find(tunnel => 
      tunnel.proto === 'https' && tunnel.public_url.startsWith('https://')
    )?.public_url;
    
    if (httpsUrl) {
      console.log(httpsUrl);
      return httpsUrl;
    } else {
      // If no HTTPS URL is found, look for any URL
      const anyUrl = data.tunnels[0]?.public_url;
      if (anyUrl) {
        console.log(anyUrl);
        return anyUrl;
      } else {
        console.error('No ngrok tunnels found');
        console.log('http://localhost:8000');
        return 'http://localhost:8000';
      }
    }
  } catch (error) {
    console.error('Failed to get ngrok URL:', error.message);
    console.log('http://localhost:8000');
    return 'http://localhost:8000';
  }
}

getNgrokUrl();
