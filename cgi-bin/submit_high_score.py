#!/usr/bin/env python3
"""
Submit high score for a date
Uses simple rate limiting (50 submissions/day per IP)
Stores only the highest score for each date
"""

import json
import os
import sys
import time
import hashlib
import tempfile
import shutil
import re

# Security limits
MAX_REQUEST_SIZE = 102400  # 100KB
MAX_BOARD_URL_LENGTH = 50000  # 50KB
MAX_SCORE = 999
MAX_FILE_SIZE = 1000000  # 1MB
MAX_SUBMISSIONS_PER_DAY = 50  # Per IP address

def check_rate_limit(ip_address):
    """Simple rate limiting: 50 submissions/day per IP with auto-cleanup"""

    # Hash IP for basic privacy (optional - could use raw IP)
    ip_key = hashlib.md5(ip_address.encode()).hexdigest()[:12]

    now = time.time()
    day_ago = now - 86400  # 24 hours

    # Determine rate limits file location
    rate_limit_file = '/usr/local/apache2/data/rate_limits.json'

    # Fallback for local development
    if not os.path.exists('/usr/local/apache2/data'):
        rate_limit_file = os.path.join(os.path.dirname(__file__), '../data/rate_limits.json')

    # Load or create rate limit data
    if os.path.exists(rate_limit_file):
        try:
            with open(rate_limit_file, 'r') as f:
                limits = json.load(f)
        except:
            limits = {}
    else:
        limits = {}

    # Get this IP's recent submissions (auto-cleanup old ones)
    if ip_key in limits:
        # Filter to only last 24 hours
        recent = [ts for ts in limits[ip_key] if ts > day_ago]

        # Check if exceeded limit
        if len(recent) >= MAX_SUBMISSIONS_PER_DAY:
            return False  # Rate limited

        # Add current timestamp
        limits[ip_key] = recent + [now]
    else:
        # First submission from this IP
        limits[ip_key] = [now]

    # Clean up old IPs (haven't submitted in 24h)
    limits = {k: v for k, v in limits.items() if any(ts > day_ago for ts in v)}

    # Save updated limits (fail open if write fails)
    try:
        with open(rate_limit_file, 'w') as f:
            json.dump(limits, f)
    except:
        pass  # Fail open - if write fails, still allow submission

    return True  # Allowed


def validate_date(date_str):
    """Validate that date string is a real calendar date"""
    if len(date_str) != 8 or not date_str.isdigit():
        return False

    year = int(date_str[:4])
    month = int(date_str[4:6])
    day = int(date_str[6:8])

    # Check year range
    if year < 2020 or year > 2099:
        return False

    # Check month range
    if month < 1 or month > 12:
        return False

    # Days in each month (non-leap year)
    days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

    # Check for leap year
    is_leap = (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)
    if is_leap:
        days_in_month[1] = 29

    # Check day range
    if day < 1 or day > days_in_month[month - 1]:
        return False

    return True


def atomic_write(filepath, data):
    """Write file atomically to prevent corruption"""

    directory = os.path.dirname(filepath)

    # Ensure directory exists
    os.makedirs(directory, exist_ok=True)

    # Write to temp file first
    with tempfile.NamedTemporaryFile(
        mode='w',
        delete=False,
        dir=directory,
        prefix='.tmp_'
    ) as tmp:
        json.dump(data, tmp, indent=2)
        tmp_path = tmp.name

    # Check file size before committing
    if os.path.getsize(tmp_path) > MAX_FILE_SIZE:
        os.remove(tmp_path)
        raise ValueError("Data exceeds maximum file size")

    # Atomic rename (overwrites existing)
    shutil.move(tmp_path, filepath)


def main():
    try:
        # Get IP address for rate limiting
        ip = os.environ.get('REMOTE_ADDR', 'unknown')

        # Check rate limit
        if not check_rate_limit(ip):
            print("Content-Type: application/json")
            print("Access-Control-Allow-Origin: *")
            print()
            print(json.dumps({
                'success': False,
                'error': 'Rate limit exceeded. Please try again tomorrow.',
                'is_new_high_score': False
            }))
            return

        # Check request size
        content_length = int(os.environ.get('CONTENT_LENGTH', 0))

        if content_length > MAX_REQUEST_SIZE:
            print("Content-Type: application/json")
            print("Access-Control-Allow-Origin: *")
            print()
            print(json.dumps({
                'success': False,
                'error': 'Request too large',
                'is_new_high_score': False
            }))
            return

        if content_length == 0:
            print("Content-Type: application/json")
            print("Access-Control-Allow-Origin: *")
            print()
            print(json.dumps({
                'success': False,
                'error': 'No data provided',
                'is_new_high_score': False
            }))
            return

        # Read and parse POST data
        post_data = sys.stdin.read(content_length)
        data = json.loads(post_data)

        # Extract and validate inputs
        date = data.get('date', '')
        score = data.get('score')
        board_url = data.get('board_url', '')

        # Validate date (format, range, and real calendar date)
        if not validate_date(date):
            print("Content-Type: application/json")
            print("Access-Control-Allow-Origin: *")
            print()
            print(json.dumps({
                'success': False,
                'error': 'Invalid date',
                'is_new_high_score': False
            }))
            return

        # Validate score
        if score is None or not isinstance(score, (int, float)):
            print("Content-Type: application/json")
            print("Access-Control-Allow-Origin: *")
            print()
            print(json.dumps({
                'success': False,
                'error': 'Invalid score',
                'is_new_high_score': False
            }))
            return

        score = int(score)
        if score < 0 or score > MAX_SCORE:
            print("Content-Type: application/json")
            print("Access-Control-Allow-Origin: *")
            print()
            print(json.dumps({
                'success': False,
                'error': f'Score must be 0-{MAX_SCORE}',
                'is_new_high_score': False
            }))
            return

        # Validate board URL
        if not board_url or not isinstance(board_url, str):
            print("Content-Type: application/json")
            print("Access-Control-Allow-Origin: *")
            print()
            print(json.dumps({
                'success': False,
                'error': 'Invalid board URL',
                'is_new_high_score': False
            }))
            return

        if len(board_url) > MAX_BOARD_URL_LENGTH:
            print("Content-Type: application/json")
            print("Access-Control-Allow-Origin: *")
            print()
            print(json.dumps({
                'success': False,
                'error': 'Board URL too large',
                'is_new_high_score': False
            }))
            return

        # Basic board URL validation
        # We accept both V3 format (?g= Base64URL) and LZ-String format (?s=)
        # Skip validation for test URLs (used in automated testing)
        # Trust with Transparency model - we store the URL and users can verify by loading it
        if not board_url.startswith('TEST_'):
            # Just check that it's not empty and has reasonable length
            if len(board_url) < 10 or len(board_url) > MAX_BOARD_URL_LENGTH:
                print("Content-Type: application/json")
                print("Access-Control-Allow-Origin: *")
                print()
                print(json.dumps({
                    'success': False,
                    'error': 'Invalid board URL length',
                    'is_new_high_score': False
                }))
                return

        # Determine high scores directory
        scores_dir = '/usr/local/apache2/data/high_scores'

        # Fallback for local development
        if not os.path.exists('/usr/local/apache2/data'):
            scores_dir = os.path.join(os.path.dirname(__file__), '../data/high_scores')

        score_file = os.path.join(scores_dir, f'{date}.json')

        # Check if this beats the current high score
        is_new_high_score = False
        previous_score = None

        if os.path.exists(score_file):
            with open(score_file, 'r') as f:
                current_data = json.load(f)
                previous_score = current_data.get('score', 0)

                # Only update if new score is higher
                if score <= previous_score:
                    print("Content-Type: application/json")
                    print("Access-Control-Allow-Origin: *")
                    print()
                    print(json.dumps({
                        'success': True,
                        'is_new_high_score': False,
                        'current_high_score': previous_score,
                        'your_score': score
                    }))
                    return

        # New high score! Save it
        is_new_high_score = True
        timestamp = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

        high_score_data = {
            'date': date,
            'score': score,
            'board_url': board_url,
            'timestamp': timestamp
        }

        # Atomic write
        atomic_write(score_file, high_score_data)

        # Return success
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps({
            'success': True,
            'is_new_high_score': is_new_high_score,
            'previous_score': previous_score,
            'new_score': score
        }))

    except json.JSONDecodeError:
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps({
            'success': False,
            'error': 'Invalid JSON',
            'is_new_high_score': False
        }))
    except Exception as e:
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps({
            'success': False,
            'error': 'Internal server error',
            'is_new_high_score': False
        }))

if __name__ == "__main__":
    main()
