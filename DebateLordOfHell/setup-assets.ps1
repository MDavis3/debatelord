# Create directories if they don't exist
New-Item -ItemType Directory -Force -Path "public\fonts"

# Download Pokemon font
$fontUrl = "https://dl.dafont.com/dl/?f=pokemon_gb"
$fontZip = "pokemon-font.zip"
$tempDir = "temp"

# Download the font
Invoke-WebRequest -Uri $fontUrl -OutFile $fontZip

# Extract the font
Expand-Archive -Path $fontZip -DestinationPath $tempDir

# Move the TTF file
Get-ChildItem -Path $tempDir -Filter "*.ttf" | 
    Select-Object -First 1 | 
    Move-Item -Destination "public\fonts\pokemon.ttf" -Force

# Clean up
Remove-Item -Path $fontZip -Force
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Font setup complete!" 