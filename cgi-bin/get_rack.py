#!/usr/bin/env python3
"""
Get Rack Endpoint - Returns rack contents for a specific turn
Used for 45-char URL decoding (rack index format)
"""

import cgi
import json
import sys
import os

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import from letters.py
from letters import get_starting_word, get_all_tiles_for_day

def main():
    form = cgi.FieldStorage()
    seed = form.getvalue('seed', '')
    turn = int(form.getvalue('turn', 1))

    # Get history of previous turns as JSON
    # Format: [[tiles_played_turn1], [tiles_played_turn2], ...]
    # e.g., history=[["O","P"],["A"]] means turn 1 played O,P and turn 2 played A
    history_str = form.getvalue('history', '')

    # Validate seed
    if not seed:
        print("Content-Type: application/json\n")
        print(json.dumps({"error": "Missing seed parameter"}))
        return

    # Validate turn
    if turn < 1 or turn > 5:
        print("Content-Type: application/json\n")
        print(json.dumps({"error": "Invalid turn (must be 1-5)"}))
        return

    try:
        # Get starting word and all tiles for the day
        starting_word = get_starting_word(seed)
        all_tiles = get_all_tiles_for_day(seed, starting_word)

        # Parse history
        history = []
        if history_str:
            try:
                history = json.loads(history_str)
            except:
                pass

        # Calculate rack for this turn by simulating draws and plays
        current_rack = []
        tiles_index = 0  # Index in all_tiles for next tile to draw

        # Simulate turns 1 through current turn
        for t in range(1, turn + 1):
            # Draw tiles to fill rack to 7
            while len(current_rack) < 7 and tiles_index < len(all_tiles):
                current_rack.append(all_tiles[tiles_index])
                tiles_index += 1

            # If this is the turn we want, return the rack
            if t == turn:
                rack = current_rack[:]
                break

            # Otherwise, remove played tiles for this turn
            if t - 1 < len(history):
                tiles_played = history[t - 1]
                for letter in tiles_played:
                    if letter in current_rack:
                        current_rack.remove(letter)
                    else:
                        # Letter not in rack - this shouldn't happen
                        print("Content-Type: application/json\n", file=sys.stderr)
                        print(json.dumps({"error": f"Letter {letter} not in rack for turn {t}"}), file=sys.stderr)

        response = {
            'seed': seed,
            'turn': turn,
            'rack': rack
        }

        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps(response))

    except Exception as e:
        print("Content-Type: application/json\n")
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
