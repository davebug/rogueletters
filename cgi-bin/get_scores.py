#!/usr/bin/env python3
"""
Get high scores for a specific date
"""

import json
import os
from datetime import datetime


def main():
    try:
        # Parse query string
        query_string = os.environ.get('QUERY_STRING', '')
        params = {}
        if query_string:
            for param in query_string.split('&'):
                if '=' in param:
                    key, value = param.split('=', 1)
                    params[key] = value

        # Get date parameter or use today
        date = params.get('date', datetime.now().strftime('%Y-%m-%d'))

        # Load scores for the date
        # Use Apache data directory (same as enable.txt location)
        scores_dir = '/usr/local/apache2/data/highscores'

        # Fallback for local development
        if not os.path.exists('/usr/local/apache2/data'):
            scores_dir = os.path.join(os.path.dirname(__file__), '../data/highscores')

        score_file = os.path.join(scores_dir, f'{date}.json')

        if os.path.exists(score_file):
            with open(score_file, 'r') as f:
                scores = json.load(f)
        else:
            # Return empty scores if no file exists
            scores = []

        # Send response
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps({
            'success': True,
            'date': date,
            'scores': scores
        }))

    except Exception as e:
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps({'error': str(e), 'success': False}))

if __name__ == "__main__":
    main()