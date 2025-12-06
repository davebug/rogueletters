#!/bin/bash

echo "Starting Tile Rack Test Server..."
echo "Navigate to: http://localhost:8086/"
echo "Press Ctrl+C to stop the server"
echo ""

# Use Python's built-in HTTP server
python3 -m http.server 8086