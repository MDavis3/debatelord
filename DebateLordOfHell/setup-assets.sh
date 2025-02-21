#!/bin/bash

# Create directories
mkdir -p public/fonts
mkdir -p public/images

# Download Pokemon font
curl -L "https://www.dafont.com/download.php?f=pokemon-gb" -o pokemon-font.zip
unzip pokemon-font.zip "*.ttf" -d ./temp
mv ./temp/*.ttf ./public/fonts/pokemon.ttf
rm -rf ./temp pokemon-font.zip

# Create battle background
convert -size 800x600 \
  gradient:rgb(253,230,138)-rgb(251,191,36) \
  -fill white \
  -draw "path 'M 0,0 L 800,0 L 800,600 L 0,600 Z'" \
  -alpha set -channel A -evaluate set 20% \
  public/images/battle-bg.png

echo "Assets setup complete!" 