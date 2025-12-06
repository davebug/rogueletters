#!/bin/bash

echo "=== Fixing Production Letters Container ==="

# SSH into unraid and force update
ssh unraid << 'EOF'
echo "Stopping letters container..."
docker stop letters
docker rm letters

echo "Pulling latest image..."
docker pull davebug/letters:latest

echo "Starting new container..."
docker run -d \
  --name letters \
  --restart unless-stopped \
  -p 85:80 \
  -v /mnt/user/appdata/letters/plays:/usr/local/apache2/data/plays \
  -v /mnt/user/appdata/letters/highscores:/usr/local/apache2/data/highscores \
  --memory="512m" \
  --memory-swap="1g" \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  davebug/letters:latest

echo "Checking if daily_words.txt exists..."
docker exec letters ls -la /usr/local/apache2/data/daily_words.txt

echo "Testing API..."
docker exec letters curl -s "http://localhost/cgi-bin/letters.py?seed=20250927&turn=1" | grep starting_word

EOF

echo "=== Done ==="