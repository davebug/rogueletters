#!/usr/bin/env python3
"""
Check if player has already played today
"""

import cgi
import json


def main():
    # Parse request parameters
    form = cgi.FieldStorage()
    seed = form.getvalue('seed', '')
    player_id = form.getvalue('player', '')

    # For now, always return that player hasn't played
    response = {
        "has_played": False
    }

    # Send response
    print("Content-Type: application/json")
    print("Access-Control-Allow-Origin: *")
    print()
    print(json.dumps(response))

if __name__ == "__main__":
    main()