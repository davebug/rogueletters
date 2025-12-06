#!/usr/bin/env python3
"""Test fetching words from a few Wikipedia dates"""

from fetch_wikipedia_words import fetch_words_from_wikipedia, is_valid_word

# Test a few dates
test_dates = [
    (9, 27),  # September 27
    (12, 25), # December 25
    (7, 4),   # July 4
    (1, 1),   # January 1
]

all_words = set()

for month, day in test_dates:
    print(f"\nTesting {month:02d}-{day:02d}:")
    words = fetch_words_from_wikipedia(month, day)

    if words:
        print(f"  Sample words: {', '.join(words[:10])}")
        print(f"  Total valid words: {len(words)}")

        # Check for duplicates
        duplicates = all_words.intersection(words)
        if duplicates:
            print(f"  Duplicates with previous dates: {len(duplicates)} words")

        all_words.update(words)
    else:
        print("  No words found")

print(f"\nTotal unique words across {len(test_dates)} dates: {len(all_words)}")