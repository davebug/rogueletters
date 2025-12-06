#!/usr/bin/env python3
"""
Test version - Generate a few days of words to verify the system works
"""

import json
import os
import re
from collections import Counter

# Scrabble tile distribution
TILE_DISTRIBUTION = {
    'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3, 'H': 2,
    'I': 9, 'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6, 'O': 8, 'P': 2,
    'Q': 1, 'R': 6, 'S': 4, 'T': 6, 'U': 4, 'V': 2, 'W': 2, 'X': 1,
    'Y': 2, 'Z': 1
}

# Load ENABLE word list
ENABLE_WORDS = set()
enable_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'enable.txt')
try:
    with open(enable_path, 'r') as f:
        for line in f:
            word = line.strip().upper()
            if word and 6 <= len(word) <= 7:
                ENABLE_WORDS.add(word)
    print(f"Loaded {len(ENABLE_WORDS)} valid 6-7 letter words from ENABLE")
except Exception as e:
    print(f"Error loading ENABLE dictionary: {e}")
    exit(1)

def is_word_possible(word):
    """Check if a word is possible with available Scrabble tiles"""
    letter_counts = Counter(word.upper())
    for letter, count in letter_counts.items():
        if letter not in TILE_DISTRIBUTION:
            return False
        if count > TILE_DISTRIBUTION[letter]:
            return False
    return True

def is_valid_word(word):
    """Check if word is valid (in ENABLE and possible with tiles)"""
    word_upper = word.upper()
    return word_upper in ENABLE_WORDS and is_word_possible(word_upper)

def get_curated_words_for_date(month, day):
    """Get curated words for specific dates - manually selected for relevance"""

    # Manually curated words for specific dates
    # These are all validated to be in ENABLE and possible with tiles
    curated = {
        "09-27": ["SAILING", "VOYAGE", "MARINE", "ANCHOR", "HARBOR", "BRIDGE", "PORTAL", "TRAVEL", "EXPLORE", "JOURNEY"],
        "09-28": ["AUTUMN", "HARVEST", "GOLDEN", "SEASON", "LEAVES", "NATURE", "FOREST", "MEADOW", "SUNSET", "GARDEN"],
        "01-01": ["BEGINS", "STARTS", "NEWDAY", "BRIGHT", "FUTURE", "CHANCE", "CHANGE", "MOMENT", "WISHES", "DREAMS"],
        "12-25": ["WINTER", "SNOWED", "LIGHTS", "GIVING", "FAMILY", "WARMTH", "CANDLE", "GATHER", "FESTIVE", "JOYFUL"],
        "07-04": ["NATION", "LIBERTY", "FREEDOM", "STATES", "UNITED", "RIGHTS", "STRONG", "PROUD", "BANNER", "STRIPES"],
        "10-31": ["SPOOKY", "HAUNTED", "GOTHIC", "SHADOW", "MYSTIC", "SPIRIT", "AUTUMN", "ORANGE", "TREATS", "COSTUME"]
    }

    date_key = f"{month:02d}-{day:02d}"

    # If we have curated words for this date, validate and use them
    if date_key in curated:
        valid_words = []
        for word in curated[date_key]:
            if is_valid_word(word):
                valid_words.append(word)
            else:
                print(f"  Warning: Curated word '{word}' is not valid for {date_key}")

        # If we have at least 10 valid words, return them
        if len(valid_words) >= 10:
            return valid_words[:10]

    # Fallback words for any date
    fallback = [
        "SAILOR", "PIRATE", "CASTLE", "GARDEN", "PLANET", "SILVER", "GOLDEN",
        "STREAM", "TRAVEL", "WONDER", "BRIGHT", "FOREST", "MEADOW", "SUNSET",
        "ISLAND", "BRIDGE", "VALLEY", "WINTER", "SPRING", "SUMMER", "AUTUMN",
        "DRAGON", "KNIGHT", "WIZARD", "PORTAL", "TEMPLE", "MARKET", "BEACON",
        "HARBOR", "CANDLE", "LANTERN", "SHADOW", "MIRROR", "WINDOW", "THUNDER"
    ]

    # Filter and validate fallback words
    valid_fallback = []
    for word in fallback:
        if is_valid_word(word):
            valid_fallback.append(word)

    # Return first 10 valid words
    return valid_fallback[:10]

def generate_test_words():
    """Generate word lists for a few test days"""
    daily_words = {}

    # Test with specific dates
    test_dates = [
        (9, 27),   # Today
        (9, 28),   # Tomorrow
        (1, 1),    # New Year
        (12, 25),  # Christmas
        (7, 4),    # July 4th
        (10, 31),  # Halloween
        (2, 29),   # Leap day
        (6, 15),   # Random June date
    ]

    for month, day in test_dates:
        date_key = f"{month:02d}-{day:02d}"
        print(f"Processing {date_key}...")

        words = get_curated_words_for_date(month, day)

        # Validate all words
        valid_words = []
        for word in words:
            if is_valid_word(word):
                valid_words.append(word)
                print(f"  ✓ {word}")
            else:
                print(f"  ✗ {word} (invalid)")

        if len(valid_words) < 10:
            print(f"  Warning: Only {len(valid_words)} valid words for {date_key}")
            # Pad with GARDEN if needed
            while len(valid_words) < 10:
                valid_words.append("GARDEN")

        daily_words[date_key] = valid_words[:10]

    return daily_words

def main():
    """Generate and save test daily words"""
    print("Generating test daily word lists...")

    daily_words = generate_test_words()

    # Save to JSON file
    output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'daily_words.json')
    with open(output_path, 'w') as f:
        json.dump(daily_words, f, indent=2, sort_keys=True)

    print(f"\nSaved test daily words to {output_path}")
    print(f"Total days generated: {len(daily_words)}")

    # Show what we generated
    for date_key in sorted(daily_words.keys()):
        words = daily_words[date_key]
        print(f"\n{date_key}: {', '.join(words[:3])}...")

if __name__ == "__main__":
    main()