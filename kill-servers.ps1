# Kill servers PowerShell script

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "      STOPPING ALL NODE AND NGROK PROCESSES" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "WARNING: Not running as administrator. Some processes might not be killed." -ForegroundColor Yellow
    Write-Host "Consider running this script as administrator for full functionality." -ForegroundColor Yellow
    Write-Host ""
}

# Function to kill process on a specific port
function Kill-ProcessOnPort {
    param (
        [int]$Port
    )
    
    $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
               Where-Object State -eq Listen | 
               Select-Object -ExpandProperty OwningProcess
    
    if ($process) {
        $processInfo = Get-Process -Id $process -ErrorAction SilentlyContinue
        if ($processInfo) {
            $processName = $processInfo.ProcessName
            Write-Host "Killing process '$processName' (PID: $process) on port $Port" -ForegroundColor Green
            Stop-Process -Id $process -Force
            return $true
        }
    }
    Write-Host "No process found running on port $Port" -ForegroundColor Gray
    return $false
}

# Kill processes on specific ports
Write-Host "Checking for processes on server ports..." -ForegroundColor Cyan
$killed8000 = Kill-ProcessOnPort -Port 8000
$killed8001 = Kill-ProcessOnPort -Port 8001

# Kill ngrok processes
$ngrokProcesses = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
if ($ngrokProcesses) {
    Write-Host "Killing ngrok processes..." -ForegroundColor Green
    $ngrokProcesses | ForEach-Object {
        Write-Host "  - Stopping ngrok (PID: $($_.Id))" -ForegroundColor Green
        Stop-Process -Id $_.Id -Force
    }
} else {
    Write-Host "No ngrok processes found" -ForegroundColor Gray
}

# Find and list node.js processes
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "`nNode.js processes currently running:" -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object {
        Write-Host "  - Node.js (PID: $($_.Id), Working Set: $([math]::Round($_.WorkingSet / 1MB, 2)) MB)"
    }
    
    Write-Host "`nDo you want to kill all Node.js processes? (y/n)" -ForegroundColor Yellow
    $killAll = Read-Host
    
    if ($killAll -eq "y" -or $killAll -eq "Y") {
        Write-Host "Killing all Node.js processes..." -ForegroundColor Red
        $nodeProcesses | ForEach-Object {
            Write-Host "  - Stopping Node.js (PID: $($_.Id))" -ForegroundColor Red
            Stop-Process -Id $_.Id -Force
        }
    } else {
        Write-Host "Node.js processes left running." -ForegroundColor Yellow
    }
} else {
    Write-Host "No Node.js processes found" -ForegroundColor Gray
}

Write-Host "`nDone! Server processes have been cleaned up." -ForegroundColor Green
Write-Host "You can now safely use the Railway app without port conflicts." -ForegroundColor Green

Write-Host "`nPress any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")