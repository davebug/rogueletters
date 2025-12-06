#!/usr/bin/env python3
"""
Check if a word is valid in the ENABLE dictionary
"""

import cgi
import json
import sys
import os

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

def main():
    # Parse request parameters
    form = cgi.FieldStorage()
    words_param = form.getvalue('words', '')

    if not words_param:
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps({"error": "No words provided"}))
        return

    # Parse the JSON array of words
    try:
        words = json.loads(words_param)
    except:
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps({"error": "Invalid JSON format"}))
        return

    # Check each word
    results = {}
    for word in words:
        word_upper = word.upper().replace(' ', '')
        if VALID_WORDS is None:
            # Dictionary not loaded, assume all valid
            results[word] = True
        else:
            results[word] = word_upper in VALID_WORDS

    # Send response
    print("Content-Type: application/json")
    print("Access-Control-Allow-Origin: *")
    print()
    print(json.dumps({"results": results}))

if __name__ == "__main__":
    main()