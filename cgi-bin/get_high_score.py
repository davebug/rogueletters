#!/usr/bin/env python3
"""
Get high score for a specific date
Returns the single highest score and board URL for that date
"""

import json
import os
import cgi

def main():
    try:
        # Parse query string
        form = cgi.FieldStorage()
        date = form.getvalue('date', '')

        # Validate date format (YYYYMMDD)
        if not date or len(date) != 8 or not date.isdigit():
            print("Content-Type: application/json")
            print("Access-Control-Allow-Origin: *")
            print()
            print(json.dumps({
                'success': False,
                'error': 'Invalid date format (expected YYYYMMDD)'
            }))
            return

        # Validate date range (2020-2099)
        year = int(date[:4])
        if year < 2020 or year > 2099:
            print("Content-Type: application/json")
            print("Access-Control-Allow-Origin: *")
            print()
            print(json.dumps({
                'success': False,
                'error': 'Invalid year range'
            }))
            return

        # Determine high scores directory
        scores_dir = '/usr/local/apache2/data/high_scores'

        # Fallback for local development
        if not os.path.exists('/usr/local/apache2/data'):
            scores_dir = os.path.join(os.path.dirname(__file__), '../data/high_scores')

        # Read high score file for this date
        score_file = os.path.join(scores_dir, f'{date}.json')

        if os.path.exists(score_file):
            with open(score_file, 'r') as f:
                data = json.load(f)

            # Return high score data
            print("Content-Type: application/json")
            print("Access-Control-Allow-Origin: *")
            print()
            print(json.dumps({
                'success': True,
                'date': data.get('date'),
                'score': data.get('score'),
                'board_url': data.get('board_url'),
                'timestamp': data.get('timestamp')
            }))
        else:
            # No high score exists for this date yet
            print("Content-Type: application/json")
            print("Access-Control-Allow-Origin: *")
            print()
            print(json.dumps({
                'success': True,
                'date': date,
                'score': None,
                'board_url': None,
                'timestamp': None
            }))

    except Exception as e:
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps({
            'success': False,
            'error': 'Internal server error'
        }))

if __name__ == "__main__":
    main()
