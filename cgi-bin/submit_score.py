#!/usr/bin/env python3
"""
Submit high score - Arcade style 3-letter names
"""

import json
import sys
import os
from datetime import datetime


def main():
    try:
        # Read POST data
        content_length = int(os.environ.get('CONTENT_LENGTH', 0))
        request_data = sys.stdin.read(content_length) if content_length > 0 else ""
        data = json.loads(request_data) if request_data else {}

        # Extract and validate data
        name = data.get('name', 'AAA')[:3].upper()  # Arcade-style 3-letter name
        score = int(data.get('score', 0))
        date = data.get('date', datetime.now().strftime('%Y-%m-%d'))

        # Ensure name is exactly 3 characters
        if len(name) < 3:
            name = name.ljust(3, 'A')  # Pad with 'A' for arcade style

        # Create scores directory if it doesn't exist
        # Use Apache data directory (same as enable.txt location)
        scores_dir = '/usr/local/apache2/data/highscores'

        # Fallback for local development
        if not os.path.exists('/usr/local/apache2/data'):
            scores_dir = os.path.join(os.path.dirname(__file__), '../data/highscores')

        os.makedirs(scores_dir, exist_ok=True)

        # Load existing scores for the date
        score_file = os.path.join(scores_dir, f'{date}.json')

        if os.path.exists(score_file):
            with open(score_file, 'r') as f:
                scores = json.load(f)
        else:
            scores = []

        # Add new score
        scores.append({
            'name': name,
            'score': score,
            'timestamp': datetime.now().isoformat()
        })

        # Sort by score (highest first) and keep top 10
        scores.sort(key=lambda x: x['score'], reverse=True)
        scores = scores[:10]

        # Save updated scores
        with open(score_file, 'w') as f:
            json.dump(scores, f, indent=2)

        # Find rank of submitted score
        rank = next((i + 1 for i, s in enumerate(scores)
                    if s['score'] == score and s['name'] == name), 0)

        # Send response
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps({
            'success': True,
            'rank': rank,
            'topScores': scores
        }))

    except Exception as e:
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps({'error': str(e), 'success': False}))

if __name__ == "__main__":
    main()