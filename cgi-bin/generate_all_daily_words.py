#!/usr/bin/env python3
"""
Generate pre-selected daily words for ALL 366 days
Uses a combination of thematic words and fallbacks
"""

import json
import os
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

# Large pool of valid words organized by theme
WORD_POOLS = {
    'nature': [
        "FOREST", "MEADOW", "GARDEN", "SUNSET", "RIVERS", "VALLEY", "DESERT",
        "ISLAND", "JUNGLE", "CANYON", "PRAIRIE", "GLACIER", "LAGOON", "VOLCANO",
        "BAMBOO", "CACTUS", "ORCHID", "WILLOW", "BRANCH", "LEAVES", "PETALS",
        "NATURE", "OCEANS", "BEACHES", "SEASONS", "SPRING", "SUMMER", "AUTUMN", "WINTER"
    ],
    'nautical': [
        "SAILOR", "PIRATE", "ANCHOR", "HARBOR", "VOYAGE", "MARINE", "SAILING",
        "CAPTAIN", "VESSEL", "CRUISE", "GALLEY", "BRIDGE", "BEACON", "CHANNEL",
        "COMPASS", "RIGGING", "RUDDER", "PORTSIDE", "CHARTER", "DINGHY", "MARINA"
    ],
    'adventure': [
        "EXPLORE", "JOURNEY", "TRAVEL", "WANDER", "ROAMING", "QUESTS", "TRAILS",
        "VENTURE", "SAFARI", "HIKING", "CAMPING", "RAFTING", "CYCLING", "GLIDING"
    ],
    'fantasy': [
        "DRAGON", "WIZARD", "CASTLE", "KNIGHT", "PORTAL", "MYSTIC", "SPELLS",
        "MAGICAL", "UNICORN", "PHOENIX", "GOBLIN", "ELFISH", "POTION", "AMULET",
        "CRYSTAL", "SORCERY", "WARLOCK", "ENCHANT", "KINGDOM", "DUNGEON"
    ],
    'light': [
        "BRIGHT", "GOLDEN", "SILVER", "SHINING", "GLEAM", "GLOWING", "RADIANT",
        "CANDLE", "LANTERN", "BEACON", "BLAZING", "BURNING", "SHIMMER", "SPARKLE",
        "LIGHTS", "FLICKER", "GLITTER", "TWINKLE", "REFLECT", "RAINBOW"
    ],
    'time': [
        "MOMENT", "SECOND", "MINUTE", "HOURLY", "MORNING", "EVENING", "TONIGHT",
        "SUNDAY", "MONDAY", "TUESDAY", "WEEKEND", "FOREVER", "ETERNAL", "ANCIENT",
        "MODERN", "FUTURE", "PRESENT", "HISTORY", "CENTURY"
    ],
    'emotion': [
        "JOYFUL", "LOVING", "CARING", "WARMTH", "KINDLY", "GENTLE", "TENDER",
        "HOPING", "WISHES", "DREAMS", "SERENE", "PEACEFUL", "CONTENT", "BLESSED",
        "COURAGE", "STRONG", "TRUSTED", "HONEST", "LOYALTY", "RESPECT"
    ],
    'action': [
        "RUNNING", "JUMPING", "DANCING", "PLAYING", "SINGING", "WRITING", "READING",
        "WORKING", "HELPING", "SHARING", "GIVING", "MAKING", "BUILDING", "GROWING",
        "MOVING", "FLOWING", "FLYING", "SOARING", "CLIMBING", "REACHING"
    ],
    'objects': [
        "WINDOW", "MIRROR", "TEMPLE", "MARKET", "BRIDGE", "TOWERS", "PALACE",
        "GALLERY", "LIBRARY", "MUSEUM", "THEATER", "STADIUM", "SUBWAY", "STATION",
        "FOUNTAIN", "STATUES", "GARDENS", "BENCHES", "STREETS", "CORNERS"
    ],
    'weather': [
        "STORMY", "THUNDER", "CLOUDY", "SNOWING", "RAINING", "WINDY", "BREEZY",
        "FOGGY", "MISTY", "SUNNY", "CLEAR", "FROZEN", "MELTING", "DRIZZLE"
    ],
    'food': [
        "DINNER", "FRUITS", "GRAINS", "BREADS", "CHEESE", "BUTTER", "OLIVES",
        "SPICES", "FLAVORS", "TASTES", "COOKING", "BAKING", "GRILLING", "ROASTED"
    ],
    'colors': [
        "ORANGE", "PURPLE", "INDIGO", "VIOLET", "CRIMSON", "SCARLET", "EMERALD",
        "GOLDEN", "SILVER", "COPPER", "BRONZE"
    ]
}

# Special dates with thematic words
SPECIAL_DATES = {
    "01-01": ["BEGINS", "STARTS", "RENEWS", "FRESH", "HOPEFUL", "PROMISE", "RESOLVE", "WISHES", "DREAMS", "FUTURE"],
    "02-14": ["LOVING", "HEARTS", "ROMANCE", "CARING", "TENDER", "PASSION", "DEVOTED", "CHERISH", "ADORING", "COUPLES"],
    "03-17": ["IRISH", "CLOVER", "GREEN", "LUCKY", "FORTUNE", "RAINBOW", "GOLDEN", "CELTIC", "DUBLIN", "EMERALD"],
    "07-04": ["NATION", "FREEDOM", "LIBERTY", "STATES", "UNITED", "RIGHTS", "PROUD", "BANNER", "STRIPES", "COUNTRY"],
    "10-31": ["SPOOKY", "HAUNTED", "GOTHIC", "SHADOW", "MYSTIC", "SPIRIT", "GHOSTS", "ORANGE", "TREATS", "COSTUME"],
    "12-25": ["WINTER", "SNOWED", "LIGHTS", "GIVING", "FAMILY", "WARMTH", "CANDLE", "GATHER", "FESTIVE", "JOYFUL"],
}

def get_words_for_date(month, day):
    """Get 10 valid words for a specific date"""
    date_key = f"{month:02d}-{day:02d}"

    # Check if it's a special date
    if date_key in SPECIAL_DATES:
        special_words = [w for w in SPECIAL_DATES[date_key] if is_valid_word(w)]
        if len(special_words) >= 10:
            return special_words[:10]

    # Build a diverse word list from different themes
    all_words = []
    themes = list(WORD_POOLS.keys())

    # Rotate through themes based on day
    theme_offset = (month * 31 + day) % len(themes)

    # Collect words from different themes
    for i in range(len(themes)):
        theme_idx = (theme_offset + i) % len(themes)
        theme = themes[theme_idx]
        theme_words = [w for w in WORD_POOLS[theme] if is_valid_word(w)]

        # Add 1-2 words from each theme for diversity
        if theme_words:
            # Use day and month as seed for consistent selection
            import random
            random.seed(month * 1000 + day)
            random.shuffle(theme_words)
            all_words.extend(theme_words[:2])

    # Remove duplicates while preserving order
    seen = set()
    unique_words = []
    for word in all_words:
        if word not in seen:
            seen.add(word)
            unique_words.append(word)

    # Ensure we have at least 10 words
    if len(unique_words) < 10:
        # Add more fallback words
        fallback = ["GARDEN", "BRIDGE", "TRAVEL", "GOLDEN", "BRIGHT", "FOREST", "CASTLE", "SILVER", "WONDER", "STREAM"]
        for word in fallback:
            if word not in seen and is_valid_word(word):
                unique_words.append(word)
                if len(unique_words) >= 10:
                    break

    return unique_words[:10]

def generate_all_daily_words():
    """Generate word lists for all 366 days"""
    daily_words = {}

    # Process each day of the year
    for month in range(1, 13):
        days_in_month = 31
        if month in [4, 6, 9, 11]:
            days_in_month = 30
        elif month == 2:
            days_in_month = 29  # Include Feb 29 for leap years

        for day in range(1, days_in_month + 1):
            date_key = f"{month:02d}-{day:02d}"
            words = get_words_for_date(month, day)

            # Validate we have 10 words
            if len(words) < 10:
                print(f"Warning: Only {len(words)} words for {date_key}")
                # Pad with GARDEN if needed
                while len(words) < 10:
                    words.append("GARDEN")

            daily_words[date_key] = words[:10]

            # Show progress
            if day == 1:
                months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                print(f"Generated {months[month]}: {words[0]}, {words[1]}, {words[2]}...")

    return daily_words

def main():
    """Generate and save the complete daily words file"""
    print("Generating daily word lists for all 366 days...")

    daily_words = generate_all_daily_words()

    # Save to JSON file
    output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'daily_words.json')
    with open(output_path, 'w') as f:
        json.dump(daily_words, f, indent=2, sort_keys=True)

    # Also save as .txt for production
    output_txt = os.path.join(os.path.dirname(__file__), '..', 'data', 'daily_words.txt')
    with open(output_txt, 'w') as f:
        json.dump(daily_words, f, indent=2, sort_keys=True)

    print(f"\nSaved daily words to {output_path}")
    print(f"Total days: {len(daily_words)}")

    # Show some samples
    print("\nSample dates:")
    sample_dates = ["01-01", "02-14", "07-04", "09-24", "09-25", "09-27", "10-31", "12-25"]
    for date_key in sample_dates:
        if date_key in daily_words:
            words = daily_words[date_key]
            print(f"  {date_key}: {', '.join(words[:3])}...")

if __name__ == "__main__":
    main()