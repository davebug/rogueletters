#!/usr/bin/env python3
"""
Daily Letters - Main CGI endpoint
Returns starting word and tiles for the game
"""

import cgi
import json
import random
import hashlib
from datetime import datetime
import sys
import os

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


# Standard tile distribution (including 2 blank tiles)
TILE_DISTRIBUTION = {
    'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3, 'H': 2,
    'I': 9, 'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6, 'O': 8, 'P': 2,
    'Q': 1, 'R': 6, 'S': 4, 'T': 6, 'U': 4, 'V': 2, 'W': 2, 'X': 1,
    'Y': 2, 'Z': 1, '_': 2  # Blank tiles
}

def is_word_possible(word):
    """Check if a word is possible with available tiles"""
    from collections import Counter
    letter_counts = Counter(word.upper())

    for letter, count in letter_counts.items():
        if letter not in TILE_DISTRIBUTION:
            return False  # Invalid letter
        if count > TILE_DISTRIBUTION[letter]:
            return False  # Not enough tiles of this letter

    return True

def is_valid_word(word):
    """Check if word is both possible with tiles AND in ENABLE dictionary"""
    if not is_word_possible(word):
        return False

    # Check if word is in ENABLE dictionary
    # First try to use the loaded dictionary from fetch_date_words
    try:
        from fetch_date_words import ENABLE_WORDS
        if ENABLE_WORDS:
            return word.upper() in ENABLE_WORDS
    except:
        pass

    # Fallback: check enable.txt directly
    try:
        enable_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'enable.txt')
        with open(enable_path, 'r') as f:
            # Check line by line to avoid loading entire file into memory
            word_upper = word.upper()
            for line in f:
                if line.strip().upper() == word_upper:
                    return True
        return False
    except:
        # If we can't check, assume it's valid (Wikipedia already filtered it)
        return True

# Load starting words from file if available
def load_starting_words():
    """Load starting words from data file"""
    import os
    words = []
    data_path = "/usr/local/apache2/data/starter_words.txt"

    # Fallback for local development
    if not os.path.exists(data_path):
        data_path = os.path.join(os.path.dirname(__file__), "../data/starter_words.txt")

    try:
        with open(data_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    words.append(line.upper())
    except:
        # Fallback words if file not found
        words = [
            "BRAIN", "DREAM", "HEART", "STONE", "WATER",  # 5-letter
            "GARDEN", "PLANET", "SILVER", "STREAM", "TRAVEL",  # 6-letter
            "CANDLES", "GARDENS", "TRADING", "NEUTRAL", "PIRATES"  # 7-letter
        ]

    return words

STARTING_WORDS = load_starting_words()

def get_seed_hash(seed):
    """Generate consistent hash from seed"""
    return int(hashlib.md5(seed.encode()).hexdigest(), 16)

def create_tile_bag():
    """Create a bag of tiles based on standard distribution"""
    bag = []
    for letter, count in TILE_DISTRIBUTION.items():
        bag.extend([letter] * count)
    return bag

def get_starting_word(seed):
    """Get starting word from pre-generated word list

    For YYYYMMDD format seeds (8 digits, valid date): uses date-based lookup for backward compatibility
    For all other seeds (timestamps, UUIDs, etc.): uses hash-based selection
    All words are pre-validated to be in ENABLE and possible with tiles.
    """
    # Load the daily words file
    try:
        # Try .txt first (for production), then .json (for local dev)
        daily_words_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'daily_words.txt')
        if not os.path.exists(daily_words_path):
            daily_words_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'daily_words.json')

        with open(daily_words_path, 'r') as f:
            daily_words = json.load(f)
    except Exception as e:
        # If file doesn't exist or can't be parsed, fall back to default word
        import sys
        print(f"Error loading daily words: {e}", file=sys.stderr)
        return "SAILING"

    # Check if seed is in YYYYMMDD format (8 digits, valid date)
    # This provides backward compatibility with existing share URLs
    seed_str = str(seed)
    if len(seed_str) == 8 and seed_str.isdigit():
        try:
            year = int(seed_str[:4])
            month = int(seed_str[4:6])
            day = int(seed_str[6:8])
            # Validate it's a reasonable date (month 1-12, day 1-31)
            if 1 <= month <= 12 and 1 <= day <= 31:
                date_key = f"{month:02d}-{day:02d}"
                if date_key in daily_words:
                    words_for_day = daily_words[date_key]
                    if words_for_day and len(words_for_day) > 0:
                        word_index = year % 10
                        if word_index >= len(words_for_day):
                            word_index = word_index % len(words_for_day)
                        word = words_for_day[word_index]
                        if is_valid_word(word):
                            return word
        except:
            pass  # Fall through to hash-based selection

    # Hash-based selection for non-date seeds (timestamps, random strings, etc.)
    seed_hash = get_seed_hash(seed_str)

    # Get list of date keys and use hash to pick one
    date_keys = sorted(daily_words.keys())  # Consistent ordering
    date_index = seed_hash % len(date_keys)
    date_key = date_keys[date_index]

    # Get words for this "virtual date"
    words_for_day = daily_words[date_key]
    if words_for_day and len(words_for_day) > 0:
        # Use another portion of hash to select which word
        word_index = (seed_hash // len(date_keys)) % len(words_for_day)
        word = words_for_day[word_index]

        # Double-check it's valid (should already be, but just in case)
        if is_valid_word(word):
            return word

    # Fallback if something goes wrong
    return "SAILING"

def get_all_tiles_for_day(seed, starting_word, purchased_tiles=None):
    """Pre-generate all tiles for the entire day in order

    Returns a list of 35 tiles that will be drawn in order throughout the game.
    The starting word tiles are already removed from the bag.
    Purchased tiles are added to expand the pool.

    Args:
        seed: Daily seed
        starting_word: The starting word (tiles removed from bag)
        purchased_tiles: List of purchased tile letters to add to the pool
    """
    # Create deterministic random based on seed only
    random.seed(get_seed_hash(seed))

    # Create tile bag (100 tiles total)
    bag = create_tile_bag()

    # Add purchased tiles to the bag (pool expansion)
    if purchased_tiles:
        bag.extend(purchased_tiles)

    # Remove starting word tiles from bag
    for letter in starting_word:
        if letter in bag:
            bag.remove(letter)

    # Shuffle the entire bag once for the day
    random.shuffle(bag)

    # Return first 35 tiles (maximum needed for 5 turns)
    # Turn 1: 7 tiles
    # Turns 2-5: up to 7 tiles each = 28 tiles
    # Total: 35 tiles maximum
    return bag[:35]

def get_tiles_for_turn(seed, turn, starting_word=None, rack_tiles=None, tiles_drawn_so_far=0, purchased_tiles=None):
    """Get tiles for a given turn

    Args:
        seed: Daily seed
        turn: Current turn number (1-5)
        starting_word: The starting word (needed to generate tile order)
        rack_tiles: Current tiles on the rack (persist between turns)
        tiles_drawn_so_far: Total number of tiles drawn from bag so far (not including rack)
        purchased_tiles: List of purchased tile letters to add to the pool

    Returns:
        List of tiles for the rack (7 tiles total)
    """
    if turn == 1:
        # First turn: get first 7 tiles from pre-generated list
        all_tiles = get_all_tiles_for_day(seed, starting_word or "", purchased_tiles)
        return all_tiles[:7]
    else:
        # Subsequent turns: keep rack tiles and add new ones to replace placed tiles
        if rack_tiles is None:
            rack_tiles = []

        # Get all tiles for the day
        all_tiles = get_all_tiles_for_day(seed, starting_word or "", purchased_tiles)

        # Calculate how many new tiles we need
        tiles_needed = 7 - len(rack_tiles)

        # Get the next tiles from the pre-generated list
        # tiles_drawn_so_far tells us how many tiles have been drawn total
        # For turn 2 with 4 tiles placed: we drew 7 initially, now need 4 more = start at index 7
        if tiles_drawn_so_far == 0:
            # If not provided, calculate based on turn
            # Turn 2 starts at index 7 (after initial 7 tiles)
            start_index = 7
        else:
            start_index = tiles_drawn_so_far

        if start_index < len(all_tiles):
            new_tiles = all_tiles[start_index:start_index + tiles_needed]
        else:
            new_tiles = []  # No more tiles available

        # Combine rack tiles with new tiles
        return rack_tiles + new_tiles

def main():
    # Parse request parameters
    form = cgi.FieldStorage()
    seed = form.getvalue('seed', '')
    turn = int(form.getvalue('turn', 1))
    is_retry = form.getvalue('retry', 'false').lower() == 'true'

    # Validate seed
    if not seed:
        print("Content-Type: application/json\n")
        print(json.dumps({"error": "Missing seed parameter"}))
        return

    # Get starting word
    starting_word = get_starting_word(seed)

    # Get tiles for the requested turn
    # Parse rack tiles and tiles drawn from request
    rack_tiles_str = form.getvalue('rack_tiles', '')
    rack_tiles = json.loads(rack_tiles_str) if rack_tiles_str else []
    tiles_drawn = int(form.getvalue('tiles_drawn', 0))

    # Parse purchased tiles (shop purchases that expand the tile pool)
    purchased_tiles_str = form.getvalue('purchased_tiles', '')
    purchased_tiles = json.loads(purchased_tiles_str) if purchased_tiles_str else []

    # Validate purchased tiles are valid letters or blanks
    if purchased_tiles:
        valid_tiles = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ_')
        purchased_tiles = [t for t in purchased_tiles if isinstance(t, str) and t in valid_tiles]

    # VALIDATION: Check if all rack tiles are valid letters or blanks
    # This prevents null tiles from corrupted localStorage
    valid_tiles = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ_')
    if not all(isinstance(t, str) and t in valid_tiles for t in rack_tiles):
        # Corrupted data detected - recalculate from scratch
        rack_tiles = []
        tiles_drawn = 7 * (turn - 1)  # Approximate tiles drawn based on turn

    # Validate tiles_drawn is in reasonable range for this turn
    # Maximum possible: 7 tiles per turn (turn 1: 7, turn 2: 14, etc.)
    max_tiles_drawn = 7 * turn
    if tiles_drawn < 7 or tiles_drawn > max_tiles_drawn:
        # Invalid tiles_drawn counter - recalculate
        tiles_drawn = 7 * (turn - 1)

    # Get tiles for the turn
    tiles = get_tiles_for_turn(seed, turn, starting_word, rack_tiles, tiles_drawn, purchased_tiles)

    # Prepare response
    response = {
        "seed": seed,
        "turn": turn,
        "tiles": tiles
    }

    # Include starting word only on first turn
    if turn == 1:
        response["starting_word"] = starting_word

    # Send response
    print("Content-Type: application/json")
    print("Access-Control-Allow-Origin: *")
    print()
    print(json.dumps(response))

if __name__ == "__main__":
    main()