# PowerShell script to test the email API endpoint

# Get API key from .env file
$envContent = Get-Content -Path .\.env -ErrorAction SilentlyContinue
$apiKey = ($envContent | Where-Object { $_ -match "EMAIL_API_KEY=" }) -replace "EMAIL_API_KEY=", ""

if (-not $apiKey) {
    Write-Host "Error: Could not find EMAIL_API_KEY in .env file" -ForegroundColor Red
    exit 1
}

Write-Host "Testing email API endpoint with API key: $apiKey" -ForegroundColor Blue

# Construct the request body
$body = @{
    to_email = "craig@elevenlabs.io"  # Change to your email for testing
    subject = "Email API Test from PowerShell"
    content = @"
<h1>This is a test from PowerShell script</h1>
<p>If you're seeing this, the email API endpoint is working correctly!</p>
<p>This test was run at: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")</p>
"@
    customer_name = "PowerShell Test User"
} | ConvertTo-Json

# Make the API request
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/email/send" `
        -Method Post `
        -Headers @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $apiKey"
        } `
        -Body $body `
        -ErrorAction Stop

    # Output the response
    Write-Host "Email sent successfully!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Green
}
catch {
    # Output error details
    Write-Host "Failed to send email!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Red
    }
} 