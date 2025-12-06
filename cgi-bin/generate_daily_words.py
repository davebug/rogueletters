#!/usr/bin/env python3
"""
Generate pre-selected daily words for WikiLetters
Creates a file with 10 words per day (366 days total)
Words are selected from Wikipedia date pages and validated
"""

import json
import os
import re
import time
from datetime import datetime
from collections import Counter
import requests
from bs4 import BeautifulSoup

# Scrabble tile distribution (no blanks)
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
            if word and 6 <= len(word) <= 7:  # Only 6-7 letter words
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

def extract_words_from_wikipedia(month, day):
    """Extract valid words from a Wikipedia date page"""
    months = ['January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December']

    month_name = months[month - 1]
    url = f"https://en.wikipedia.org/wiki/{month_name}_{day}"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # Find all links in the main content
        content = soup.find('div', {'id': 'mw-content-text'})
        if not content:
            return []

        words = set()
        links = content.find_all('a', href=True)

        for link in links:
            text = link.get_text(strip=True)
            if not text:
                continue

            # Split on non-letter characters to extract individual words
            potential_words = re.findall(r'[A-Za-z]+', text)

            for word in potential_words:
                word_clean = word.upper()
                # Check if it's 6-7 letters and valid
                if 6 <= len(word_clean) <= 7 and is_valid_word(word_clean):
                    words.add(word_clean)

        # Also look for bold text and italics
        for elem in content.find_all(['b', 'strong', 'i', 'em']):
            text = elem.get_text(strip=True)
            potential_words = re.findall(r'[A-Za-z]+', text)
            for word in potential_words:
                word_clean = word.upper()
                if 6 <= len(word_clean) <= 7 and is_valid_word(word_clean):
                    words.add(word_clean)

        return list(words)

    except Exception as e:
        print(f"Error fetching {month_name} {day}: {e}")
        return []

def get_fallback_words():
    """Get fallback words if Wikipedia doesn't provide enough"""
    fallback = [
        "SAILOR", "PIRATE", "CASTLE", "GARDEN", "PLANET", "SILVER", "GOLDEN",
        "STREAM", "TRAVEL", "WONDER", "BRIGHT", "FOREST", "MEADOW", "SUNSET",
        "ISLAND", "BRIDGE", "VALLEY", "WINTER", "SPRING", "SUMMER", "AUTUMN",
        "DRAGON", "KNIGHT", "WIZARD", "PORTAL", "CRYSTAL", "TEMPLE", "MARKET",
        "HARBOR", "BEACON", "CANDLE", "LANTERN", "SHADOW", "MIRROR", "WINDOW",
        "THUNDER", "LIGHTNING", "RAINBOW", "SUNRISE", "MOUNTAIN", "DESERT"
    ]
    # Filter to only valid words
    return [w for w in fallback if is_valid_word(w)]

def generate_daily_words():
    """Generate word lists for all 366 days"""
    daily_words = {}
    fallback_words = get_fallback_words()

    # Process each day of the year
    for month in range(1, 13):
        days_in_month = 31
        if month in [4, 6, 9, 11]:
            days_in_month = 30
        elif month == 2:
            days_in_month = 29  # Include Feb 29 for leap years

        for day in range(1, days_in_month + 1):
            date_key = f"{month:02d}-{day:02d}"
            print(f"Processing {date_key}...")

            # Get words from Wikipedia
            wiki_words = extract_words_from_wikipedia(month, day)

            # If we don't have enough words, add fallbacks
            words_for_day = wiki_words[:10]  # Take up to 10 from Wikipedia

            if len(words_for_day) < 10:
                # Add fallback words, avoiding duplicates
                remaining_needed = 10 - len(words_for_day)
                used_fallbacks = set(words_for_day)

                for word in fallback_words:
                    if word not in used_fallbacks:
                        words_for_day.append(word)
                        used_fallbacks.add(word)
                        remaining_needed -= 1
                        if remaining_needed == 0:
                            break

            # Ensure we have exactly 10 words
            if len(words_for_day) < 10:
                print(f"  Warning: Only found {len(words_for_day)} words for {date_key}")
                # Pad with a safe default
                while len(words_for_day) < 10:
                    words_for_day.append("GARDEN")

            daily_words[date_key] = words_for_day[:10]
            print(f"  Found words: {', '.join(words_for_day[:3])}...")

            # Be nice to Wikipedia's servers
            time.sleep(1)

    return daily_words

def main():
    """Generate and save the daily words file"""
    print("Generating daily word lists from Wikipedia...")
    print("This will take several minutes...")

    daily_words = generate_daily_words()

    # Save to JSON file
    output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'daily_words.json')
    with open(output_path, 'w') as f:
        json.dump(daily_words, f, indent=2, sort_keys=True)

    print(f"\nSaved daily words to {output_path}")
    print(f"Total days: {len(daily_words)}")

    # Print some statistics
    total_unique_words = set()
    for words in daily_words.values():
        total_unique_words.update(words)

    print(f"Total unique words: {len(total_unique_words)}")

    # Show a sample
    print("\nSample (January 1):")
    jan1_words = daily_words.get("01-01", [])
    for i, word in enumerate(jan1_words, 1):
        print(f"  {i}. {word}")

if __name__ == "__main__":
    main()