#!/usr/bin/env python3
"""
Generate a test wordlist for client-side word finding.

Extracts ~10k common words (2-8 letters) from enable.txt for use in
automated testing. This allows the testAPI to find valid moves without
server roundtrips for each candidate word.

Usage:
    python3 cgi-bin/generate_test_wordlist.py

Output:
    data/test-wordlist.json - Array of common words for client-side testing
"""

import json
import os
from collections import defaultdict

# Get the script directory and project root
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
ENABLE_PATH = os.path.join(DATA_DIR, 'enable.txt')
OUTPUT_PATH = os.path.join(DATA_DIR, 'test-wordlist.json')

# Word frequency approximation based on letter distribution
# Common letters (higher frequency) vs rare letters (lower frequency)
LETTER_FREQ = {
    'E': 12.7, 'T': 9.1, 'A': 8.2, 'O': 7.5, 'I': 7.0, 'N': 6.7, 'S': 6.3,
    'H': 6.1, 'R': 6.0, 'D': 4.3, 'L': 4.0, 'C': 2.8, 'U': 2.8, 'M': 2.4,
    'W': 2.4, 'F': 2.2, 'G': 2.0, 'Y': 2.0, 'P': 1.9, 'B': 1.5, 'V': 1.0,
    'K': 0.8, 'J': 0.15, 'X': 0.15, 'Q': 0.10, 'Z': 0.07
}

def calculate_word_score(word):
    """
    Calculate a commonness score for a word based on letter frequency.
    Higher score = more common letters = more likely to be playable.
    """
    if not word:
        return 0
    total = sum(LETTER_FREQ.get(c.upper(), 0.1) for c in word)
    # Normalize by length to avoid favoring long words
    return total / len(word)


def load_enable_words():
    """Load all words from enable.txt."""
    words = []
    with open(ENABLE_PATH, 'r') as f:
        for line in f:
            word = line.strip().upper()
            if word:
                words.append(word)
    return words


def filter_and_score_words(words, min_len=2, max_len=8):
    """
    Filter words by length and calculate commonness scores.
    Returns list of (word, score) tuples sorted by score descending.
    """
    scored = []
    for word in words:
        if min_len <= len(word) <= max_len:
            score = calculate_word_score(word)
            scored.append((word, score))

    # Sort by score descending
    scored.sort(key=lambda x: -x[1])
    return scored


def ensure_coverage(scored_words, target_count=10000):
    """
    Select words ensuring good coverage of different word patterns.

    We want a mix of:
    - 2-letter words (all of them - they're crucial)
    - 3-letter words (many common ones)
    - 4-8 letter words (mix of high-frequency)

    Also ensures we have words starting with each letter.
    """
    selected = set()
    by_length = defaultdict(list)
    by_first_letter = defaultdict(list)

    for word, score in scored_words:
        by_length[len(word)].append((word, score))
        by_first_letter[word[0]].append((word, score))

    # Include ALL 2-letter words (they're essential for Scrabble)
    for word, score in by_length[2]:
        selected.add(word)

    # Include top 3-letter words
    for word, score in by_length[3][:1500]:
        selected.add(word)

    # Include top 4-letter words
    for word, score in by_length[4][:2500]:
        selected.add(word)

    # Include top 5-letter words
    for word, score in by_length[5][:2000]:
        selected.add(word)

    # Include top 6-letter words
    for word, score in by_length[6][:1500]:
        selected.add(word)

    # Include top 7-letter words (bingo potential)
    for word, score in by_length[7][:1500]:
        selected.add(word)

    # Include top 8-letter words
    for word, score in by_length[8][:1000]:
        selected.add(word)

    # Ensure we have at least some words starting with each letter
    # (especially Q, X, Z which are harder)
    for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
        if letter in by_first_letter:
            for word, score in by_first_letter[letter][:50]:
                selected.add(word)

    # If we're still under target, add more high-scoring words
    if len(selected) < target_count:
        for word, score in scored_words:
            if word not in selected:
                selected.add(word)
                if len(selected) >= target_count:
                    break

    return sorted(selected)


def main():
    print(f"Loading words from {ENABLE_PATH}...")
    words = load_enable_words()
    print(f"  Loaded {len(words)} words")

    print("Filtering and scoring words...")
    scored = filter_and_score_words(words)
    print(f"  {len(scored)} words in length range 2-8")

    print("Selecting words for test wordlist...")
    selected = ensure_coverage(scored, target_count=10000)
    print(f"  Selected {len(selected)} words")

    # Show some stats
    by_length = defaultdict(int)
    for word in selected:
        by_length[len(word)] += 1

    print("\nWords by length:")
    for length in sorted(by_length.keys()):
        print(f"  {length} letters: {by_length[length]}")

    # Write output
    print(f"\nWriting to {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(selected, f)

    # Also output size
    file_size = os.path.getsize(OUTPUT_PATH)
    print(f"  File size: {file_size / 1024:.1f} KB")

    print("\nDone!")


if __name__ == '__main__':
    main()
