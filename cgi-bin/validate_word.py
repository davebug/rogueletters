#!/usr/bin/env python3
"""
Validate word placement and calculate score
"""

import cgi
import json
import sys
import os


# Tile scores (classic word game values)
TILE_SCORES = {
    'A': 1, 'E': 1, 'I': 1, 'O': 1, 'U': 1, 'L': 1, 'N': 1, 'S': 1, 'T': 1, 'R': 1,
    'D': 2, 'G': 2,
    'B': 3, 'C': 3, 'M': 3, 'P': 3,
    'F': 4, 'H': 4, 'V': 4, 'W': 4, 'Y': 4,
    'K': 5,
    'J': 8, 'X': 8,
    'Q': 10, 'Z': 10,
    '_': 0  # Blank tiles score 0 points
}

# Board multiplier positions (9x9 board)
DOUBLE_LETTER = [
    (3,3), (3,5), (5,3), (5,5)
]

TRIPLE_LETTER = [
    (0,4), (2,2), (2,6), (4,0), (4,8), (6,2), (6,6), (8,4)
]

DOUBLE_WORD = [
    (1,1), (1,7), (7,1), (7,7)
]

TRIPLE_WORD = [
    (0,0), (0,8), (8,0), (8,8)
]

def get_multiplier(row, col):
    """Get the multiplier type for a board position"""
    pos = (row, col)
    if pos in DOUBLE_LETTER:
        return 'DL'
    elif pos in TRIPLE_LETTER:
        return 'TL'
    elif pos in DOUBLE_WORD:
        return 'DW'
    elif pos in TRIPLE_WORD:
        return 'TW'
    elif row == 4 and col == 4:  # Center star
        return 'DW'
    return None

# Load ENABLE dictionary
VALID_WORDS = set()
dict_path = "/usr/local/apache2/data/enable.txt"

# Fallback for local development
if not os.path.exists(dict_path):
    dict_path = os.path.join(os.path.dirname(__file__), "../data/enable.txt")

try:
    with open(dict_path, 'r') as f:
        VALID_WORDS = {word.strip().upper() for word in f}
except:
    # If dictionary not found, accept all words (for testing)
    VALID_WORDS = None

def extract_words_formed(board, placed_tiles):
    """Extract all words formed by the placed tiles with their positions"""
    words_formed = []

    # Update board with placed tiles
    temp_board = [row[:] for row in board]  # Deep copy
    for tile in placed_tiles:
        temp_board[tile['row']][tile['col']] = tile['letter']

    # Get the main word (all placed tiles should form one word)
    rows = [t['row'] for t in placed_tiles]
    cols = [t['col'] for t in placed_tiles]

    if len(set(rows)) == 1:  # Horizontal word
        row = rows[0]
        min_col = min(cols)
        max_col = max(cols)

        # Extend to find complete word
        while min_col > 0 and temp_board[row][min_col - 1]:
            min_col -= 1
        while max_col < 8 and temp_board[row][max_col + 1]:
            max_col += 1

        word = ''.join(temp_board[row][c] for c in range(min_col, max_col + 1) if temp_board[row][c])
        if len(word) > 1:  # Only add if it's more than a single letter
            positions = [(row, c) for c in range(min_col, max_col + 1) if temp_board[row][c]]
            words_formed.append({'word': word, 'positions': positions})

        # Check for perpendicular words
        for tile in placed_tiles:
            col = tile['col']
            row_start = row_end = tile['row']

            while row_start > 0 and temp_board[row_start - 1][col]:
                row_start -= 1
            while row_end < 8 and temp_board[row_end + 1][col]:
                row_end += 1

            if row_start != row_end:
                perp_word = ''.join(temp_board[r][col] for r in range(row_start, row_end + 1))
                if len(perp_word) > 1:
                    positions = [(r, col) for r in range(row_start, row_end + 1)]
                    words_formed.append({'word': perp_word, 'positions': positions})

    else:  # Vertical word
        col = cols[0]
        min_row = min(rows)
        max_row = max(rows)

        # Extend to find complete word
        while min_row > 0 and temp_board[min_row - 1][col]:
            min_row -= 1
        while max_row < 8 and temp_board[max_row + 1][col]:
            max_row += 1

        word = ''.join(temp_board[r][col] for r in range(min_row, max_row + 1) if temp_board[r][col])
        if len(word) > 1:  # Only add if it's more than a single letter
            positions = [(r, col) for r in range(min_row, max_row + 1) if temp_board[r][col]]
            words_formed.append({'word': word, 'positions': positions})

        # Check for perpendicular words
        for tile in placed_tiles:
            row = tile['row']
            col_start = col_end = tile['col']

            while col_start > 0 and temp_board[row][col_start - 1]:
                col_start -= 1
            while col_end < 8 and temp_board[row][col_end + 1]:
                col_end += 1

            if col_start != col_end:
                perp_word = ''.join(temp_board[row][c] for c in range(col_start, col_end + 1) if temp_board[row][c])
                if len(perp_word) > 1:
                    positions = [(row, c) for c in range(col_start, col_end + 1) if temp_board[row][c]]
                    words_formed.append({'word': perp_word, 'positions': positions})

    return words_formed

def validate_placement(board, placed_tiles, debug_mode=False):
    """
    Validate that tiles are placed legally and form valid words
    Returns (is_valid, message, words_formed)
    """
    if not placed_tiles:
        return False, "No tiles placed", []

    # Check if tiles are in a line
    rows = [t['row'] for t in placed_tiles]
    cols = [t['col'] for t in placed_tiles]

    same_row = len(set(rows)) == 1
    same_col = len(set(cols)) == 1

    if not (same_row or same_col):
        return False, "Tiles must be placed in a straight line", []

    # Check for gaps between placed tiles
    if same_row:
        # Horizontal placement - check for gaps
        row = rows[0]
        min_col = min(cols)
        max_col = max(cols)

        # Check all positions between min and max
        for col in range(min_col, max_col + 1):
            # Must either have a placed tile or an existing tile at this position
            has_placed = any(t['row'] == row and t['col'] == col for t in placed_tiles)
            has_existing = board[row][col] and board[row][col] != ' '

            if not (has_placed or has_existing):
                return False, "Tiles must form a continuous word without gaps", []

    else:
        # Vertical placement - check for gaps
        col = cols[0]
        min_row = min(rows)
        max_row = max(rows)

        # Check all positions between min and max
        for row in range(min_row, max_row + 1):
            # Must either have a placed tile or an existing tile at this position
            has_placed = any(t['row'] == row and t['col'] == col for t in placed_tiles)
            has_existing = board[row][col] and board[row][col] != ' '

            if not (has_placed or has_existing):
                return False, "Tiles must form a continuous word without gaps", []

    # Check if connected to existing tiles
    # First check if this is the first move (empty board)
    # Determine board size from the board parameter
    board_size = len(board) if board else 9

    board_has_tiles = any(
        board[r][c] and board[r][c] != ' '
        for r in range(board_size)
        for c in range(board_size)
    )

    if board_has_tiles:
        # Board has tiles, so new tiles must connect
        has_connection = False
        placed_positions = {(t['row'], t['col']) for t in placed_tiles}

        for tile in placed_tiles:
            row, col = tile['row'], tile['col']
            # Check adjacent cells
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                new_row, new_col = row + dr, col + dc
                board_size = len(board)
                if 0 <= new_row < board_size and 0 <= new_col < board_size:
                    # Check if adjacent cell has an existing tile (not one we just placed)
                    if (new_row, new_col) not in placed_positions:
                        if board[new_row][new_col] and board[new_row][new_col] != ' ':
                            has_connection = True
                            break
            if has_connection:
                break

        if not has_connection:
            return False, "Word must connect to existing tiles", []

    # Extract all words formed
    words_formed = extract_words_formed(board, placed_tiles)

    # Validate all words against dictionary (skip if in debug mode)
    if not debug_mode and VALID_WORDS is not None:
        invalid_words = []
        for word_data in words_formed:
            word_clean = word_data['word'].replace(' ', '').upper()
            if word_clean and word_clean not in VALID_WORDS:
                invalid_words.append(word_clean)

        if invalid_words:
            return False, f"Invalid word(s): {', '.join(invalid_words)}", words_formed

    return True, "Valid placement", words_formed

def calculate_score(board, placed_tiles, words_formed, existing_blank_positions=None):
    """Calculate score for all words formed"""
    total_score = 0

    # Create a temporary board with placed tiles
    temp_board = [row[:] for row in board]  # Deep copy
    for tile in placed_tiles:
        temp_board[tile['row']][tile['col']] = tile['letter']

    # Convert placed tiles to set for quick lookup
    placed_positions = {(t['row'], t['col']) for t in placed_tiles}

    # Track blank tile positions (blanks score 0 regardless of letter)
    # Include both blanks placed this turn AND blanks from previous turns
    blank_positions = {(t['row'], t['col']) for t in placed_tiles if t.get('isBlank', False)}

    # Add blanks from previous turns
    if existing_blank_positions:
        for blank in existing_blank_positions:
            blank_positions.add((blank['row'], blank['col']))

    # Score each word formed
    for word_data in words_formed:
        word_score = 0
        word_multiplier = 1

        # Score each letter in the word
        for row, col in word_data['positions']:
            letter = temp_board[row][col]

            # Blank tiles score 0 points
            if (row, col) in blank_positions:
                letter_score = 0
            else:
                letter_score = TILE_SCORES.get(letter.upper(), 0)

            # Apply multipliers ONLY if this is a newly placed tile
            if (row, col) in placed_positions:
                cell_type = get_multiplier(row, col)
                if cell_type == 'DL':
                    letter_score *= 2
                elif cell_type == 'TL':
                    letter_score *= 3
                elif cell_type == 'DW':
                    word_multiplier *= 2
                elif cell_type == 'TW':
                    word_multiplier *= 3

            word_score += letter_score

        word_score *= word_multiplier
        total_score += word_score

    # Add bingo bonus if all 7 tiles used
    if len(placed_tiles) == 7:
        total_score += 50

    return total_score

def main():
    # Read POST data
    try:
        content_length = int(os.environ.get('CONTENT_LENGTH', 0))
        if content_length > 0:
            post_data = sys.stdin.read(content_length)
            data = json.loads(post_data)
        else:
            # GET request for testing
            print("Content-Type: application/json")
            print("Access-Control-Allow-Origin: *")
            print()
            print(json.dumps({
                "valid": True,
                "score": 10,
                "message": "Test mode - dictionary loaded",
                "dictionary_size": len(VALID_WORDS) if VALID_WORDS else 0
            }))
            return
    except Exception as e:
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps({
            "valid": False,
            "message": f"Error reading request: {str(e)}"
        }))
        return

    board = data.get('board', [])
    placed_tiles = data.get('placed_tiles', [])
    blank_positions = data.get('blank_positions', [])  # Blanks from previous turns
    debug_mode = data.get('debug_mode', False)

    # Validate placement and words
    is_valid, message, words_formed = validate_placement(board, placed_tiles, debug_mode)

    response = {
        "valid": is_valid,
        "message": message,
        "words_formed": [w['word'] for w in words_formed] if words_formed else []
    }

    if is_valid:
        response["score"] = calculate_score(board, placed_tiles, words_formed, blank_positions)

    # Send response
    print("Content-Type: application/json")
    print("Access-Control-Allow-Origin: *")
    print()
    print(json.dumps(response))

if __name__ == "__main__":
    import os
    main()