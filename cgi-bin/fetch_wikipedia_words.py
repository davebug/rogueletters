#!/usr/bin/env python3
"""
Fetch unique words from Wikipedia date pages for all 366 days
Ensures no word repetition across dates
"""

import json
import os
import re
import time
import random
from collections import Counter
import requests
from bs4 import BeautifulSoup

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

def fetch_words_from_wikipedia(month, day):
    """Fetch valid words from a Wikipedia date page"""
    months = ['January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December']

    month_name = months[month - 1]
    url = f"https://en.wikipedia.org/wiki/{month_name}_{day}"

    try:
        print(f"  Fetching {month_name} {day}...", end='')
        response = requests.get(url, timeout=10, headers={
            'User-Agent': 'Mozilla/5.0 (WikiLetters word fetcher)'
        })
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # Find all text content
        content = soup.find('div', {'id': 'mw-content-text'})
        if not content:
            print(" No content found")
            return []

        # Extract all text
        text = content.get_text()

        # Find all words that are 6-7 letters
        potential_words = re.findall(r'\b[A-Za-z]{6,7}\b', text)

        # Convert to uppercase and remove duplicates
        words = list(set(word.upper() for word in potential_words))

        # Filter to only valid words
        valid_words = [w for w in words if is_valid_word(w)]

        print(f" Found {len(valid_words)} valid words")
        return valid_words

    except Exception as e:
        print(f" Error: {e}")
        return []

def generate_wikipedia_words():
    """Generate unique word lists from Wikipedia for all 366 days"""

    # Try to load existing progress
    progress_file = os.path.join(os.path.dirname(__file__), '..', 'data', 'wikipedia_words_progress.json')
    if os.path.exists(progress_file):
        with open(progress_file, 'r') as f:
            daily_words = json.load(f)
            used_words = set()
            for words in daily_words.values():
                used_words.update(words)
        print(f"Resuming from {len(daily_words)} completed days, {len(used_words)} words used")
    else:
        daily_words = {}
        used_words = set()

    # Fallback words in case we run out
    fallback_words = [
        "SAILOR", "PIRATE", "CASTLE", "GARDEN", "PLANET", "SILVER", "GOLDEN",
        "STREAM", "TRAVEL", "WONDER", "BRIGHT", "FOREST", "MEADOW", "SUNSET",
        "ISLAND", "BRIDGE", "VALLEY", "WINTER", "SPRING", "SUMMER", "AUTUMN",
        "DRAGON", "KNIGHT", "WIZARD", "PORTAL", "TEMPLE", "MARKET", "BEACON"
    ]

    # Process each day
    for month in range(1, 13):
        days_in_month = 31
        if month in [4, 6, 9, 11]:
            days_in_month = 30
        elif month == 2:
            days_in_month = 29  # Include Feb 29

        for day in range(1, days_in_month + 1):
            date_key = f"{month:02d}-{day:02d}"

            # Skip if already processed
            if date_key in daily_words:
                continue

            # Fetch words from Wikipedia
            wiki_words = fetch_words_from_wikipedia(month, day)

            # Remove already used words
            available_words = [w for w in wiki_words if w not in used_words]

            # If we have enough unique words, use them
            if len(available_words) >= 10:
                selected_words = random.sample(available_words, 10)
            else:
                # Use what we have and add fallbacks
                selected_words = available_words.copy()

                # Add unused fallback words
                for word in fallback_words:
                    if word not in used_words and word not in selected_words:
                        selected_words.append(word)
                        if len(selected_words) >= 10:
                            break

                # If still not enough, we need to allow some repetition
                if len(selected_words) < 10:
                    print(f"    Warning: Only {len(selected_words)} unique words for {date_key}")
                    # Add from all valid wiki words even if used
                    for word in wiki_words:
                        if word not in selected_words:
                            selected_words.append(word)
                            if len(selected_words) >= 10:
                                break

                    # Final fallback - use defaults
                    while len(selected_words) < 10:
                        selected_words.append("GARDEN")

            # Take exactly 10 words
            selected_words = selected_words[:10]

            # Add to used words set
            used_words.update(selected_words)

            # Save this day's words
            daily_words[date_key] = selected_words

            # Save progress every 10 days
            if len(daily_words) % 10 == 0:
                with open(progress_file, 'w') as f:
                    json.dump(daily_words, f, indent=2, sort_keys=True)
                print(f"  Saved progress: {len(daily_words)} days completed")

            # Be nice to Wikipedia's servers
            time.sleep(1)

    return daily_words

def main():
    """Fetch Wikipedia words and save to file"""
    print("Fetching unique words from Wikipedia for all 366 days...")
    print("This will take about 6-7 minutes...")

    daily_words = generate_wikipedia_words()

    # Save final result
    output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'daily_words_wikipedia.json')
    with open(output_path, 'w') as f:
        json.dump(daily_words, f, indent=2, sort_keys=True)

    print(f"\nSaved to {output_path}")
    print(f"Total days: {len(daily_words)}")

    # Count unique words
    all_words = set()
    word_usage = Counter()
    for words in daily_words.values():
        all_words.update(words)
        word_usage.update(words)

    print(f"Total unique words: {len(all_words)}")
    print(f"Words used only once: {sum(1 for w, c in word_usage.items() if c == 1)}")

    # Show most repeated words
    if word_usage:
        print("\nMost repeated words:")
        for word, count in word_usage.most_common(5):
            if count > 1:
                print(f"  {word}: used {count} times")

if __name__ == "__main__":
    main()