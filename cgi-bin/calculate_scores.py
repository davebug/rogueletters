#!/usr/bin/env python3
"""
Calculate Scores Endpoint - Returns scores for each turn given game data
Used for 45-char URL decoding (no scores stored in URL)
"""

import cgi
import json
import sys
import os

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import scoring functions from validate_word.py
from validate_word import TILE_SCORES, get_multiplier, extract_words_formed, calculate_score
from letters import get_starting_word

def reconstruct_board_and_calculate_scores(tiles, seed):
    """
    Reconstruct board state for each turn and calculate scores

    tiles: list of {row, col, letter, turn}
    seed: date seed (YYYYMMDD) to get starting word
    Returns: {"scores": [turn1, turn2, turn3, turn4, turn5], "total": total_score}
    """
    # Initialize empty 9x9 board
    board = [['' for _ in range(9)] for _ in range(9)]

    # Place starting word on board (centered on row 4)
    starting_word = get_starting_word(seed)
    center_col = 4
    start_col = center_col - len(starting_word) // 2
    for i, letter in enumerate(starting_word):
        board[4][start_col + i] = letter

    # Group tiles by turn
    tiles_by_turn = {}
    for tile in tiles:
        turn = tile['turn']
        if turn not in tiles_by_turn:
            tiles_by_turn[turn] = []
        tiles_by_turn[turn].append(tile)

    # Calculate score for each turn
    turn_scores = []

    for turn in range(1, 6):  # Turns 1-5
        if turn not in tiles_by_turn:
            # No tiles played this turn
            turn_scores.append(0)
            continue

        placed_tiles = tiles_by_turn[turn]

        # Extract words formed by these tiles
        words_formed = extract_words_formed(board, placed_tiles)

        # Calculate score for this turn
        score = calculate_score(board, placed_tiles, words_formed)
        turn_scores.append(score)

        # Update board with placed tiles for next turn
        for tile in placed_tiles:
            board[tile['row']][tile['col']] = tile['letter']

    total_score = sum(turn_scores)

    return {
        'scores': turn_scores,
        'total': total_score
    }

def main():
    # Read POST data
    try:
        content_length = int(os.environ.get('CONTENT_LENGTH', 0))
        if content_length > 0:
            post_data = sys.stdin.read(content_length)
            data = json.loads(post_data)
        else:
            # GET request - return test response
            print("Content-Type: application/json")
            print("Access-Control-Allow-Origin: *")
            print()
            print(json.dumps({
                "error": "POST request required",
                "usage": "POST with JSON: {tiles: [{row, col, letter, turn}, ...]}"
            }))
            return
    except Exception as e:
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps({
            "error": f"Error reading request: {str(e)}"
        }))
        return

    # Validate input
    tiles = data.get('tiles', [])
    seed = data.get('seed', '')

    if not tiles:
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps({"error": "Missing tiles parameter"}))
        return

    if not seed:
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps({"error": "Missing seed parameter"}))
        return

    # Validate each tile has required fields
    for i, tile in enumerate(tiles):
        required_fields = ['row', 'col', 'letter', 'turn']
        for field in required_fields:
            if field not in tile:
                print("Content-Type: application/json")
                print("Access-Control-Allow-Origin: *")
                print()
                print(json.dumps({
                    "error": f"Tile {i} missing required field: {field}"
                }))
                return

    try:
        # Calculate scores
        result = reconstruct_board_and_calculate_scores(tiles, seed)

        # Send response
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps(result))

    except Exception as e:
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
