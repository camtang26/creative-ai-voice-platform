# PowerShell script to move redundant files to backup directory

# Make sure backup directory exists
if (-not (Test-Path "backup-files\email-tools")) {
    New-Item -ItemType Directory -Path "backup-files\email-tools" -Force
}

# Files to keep
$filesToKeep = @(
    "aws-ses-email.js",
    "email-tool-definition.json",
    "README.md",
    "urgent-message-for-craig.md"
)

# Get all files in email-tools directory
$allFiles = Get-ChildItem -Path "email-tools" -File

# Move files that are not in the keep list
foreach ($file in $allFiles) {
    if ($filesToKeep -notcontains $file.Name) {
        Write-Host "Moving $($file.Name) to backup..."
        Move-Item -Path $file.FullName -Destination "backup-files\email-tools" -Force
    } else {
        Write-Host "Keeping $($file.Name)..."
    }
}

# Files to move from root directory
$rootFilesToMove = @(
    "verify-smtp-alt.js",
    "verify-all-ports.js",
    "verify-password-variants.js"
)

# Move files from root directory
foreach ($fileName in $rootFilesToMove) {
    if (Test-Path $fileName) {
        Write-Host "Moving $fileName to backup..."
        Move-Item -Path $fileName -Destination "backup-files" -Force
    }
}

Write-Host "Cleanup complete!" 