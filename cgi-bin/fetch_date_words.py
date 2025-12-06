#!/usr/bin/env python3
"""
Fetch words from Wikipedia date pages for Daily Letters
Following WikiDates approach - direct Wikipedia HTML fetching
"""

import re
import hashlib
import urllib.request
from datetime import datetime
import os

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False

# Load ENABLE dictionary for word validation
ENABLE_WORDS = set()
def load_enable_dictionary():
    """Load the ENABLE dictionary for word validation"""
    global ENABLE_WORDS
    enable_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'enable.txt')
    try:
        with open(enable_path, 'r') as f:
            ENABLE_WORDS = set(word.strip().upper() for word in f.readlines())
    except Exception as e:
        # If we can't load the dictionary, use a minimal set of known valid words
        ENABLE_WORDS = {
            'WORLD', 'PEACE', 'MUSIC', 'DANCE', 'SPACE', 'TRAIN', 'OCEAN',
            'RIVER', 'MOUNT', 'LIGHT', 'STORM', 'DREAM', 'PLANT', 'EARTH',
            'WATER', 'FIRE', 'STONE', 'BRIDGE', 'CASTLE', 'FOREST', 'GARDEN',
            'PLANET', 'SILVER', 'GOLDEN', 'TRAVEL', 'WINTER', 'SUMMER', 'SPRING'
        }

load_enable_dictionary()

def fetch_wikipedia_events_html(month, day):
    """Fetch Wikipedia date page HTML - following WikiDates approach"""
    months = ['January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December']

    month_name = months[month - 1]
    url = f"https://en.wikipedia.org/wiki/{month_name}_{day}"

    # Use same user agent as WikiDates
    headers = {'User-Agent': 'DailyLetters/1.0'}
    req = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            return html
    except:
        return None

def extract_events_text(html):
    """Extract events text from Wikipedia HTML"""
    if not html:
        return []

    events = []

    if HAS_BS4:
        # Use BeautifulSoup if available (like WikiDates)
        soup = BeautifulSoup(html, 'html.parser')

        # Find Events section
        events_header = soup.find('h2', id="Events")
        if events_header:
            # Get parent div
            events_div = events_header.find_parent('div')
            if events_div:
                # Find all list items in Events section
                current = events_div.find_next_sibling()
                while current:
                    if current.name == 'div' and current.find('h2'):
                        break  # Next section
                    if current.name == 'ul':
                        for li in current.find_all('li'):
                            text = li.get_text().strip()
                            if text:
                                events.append(text)
                    current = current.find_next_sibling()
    else:
        # Fallback: regex extraction without BeautifulSoup
        # Find content between Events and next h2
        events_match = re.search(r'<h2[^>]*id="Events"[^>]*>.*?(?=<h2|$)', html, re.DOTALL)
        if events_match:
            events_html = events_match.group(0)
            # Extract text from list items
            li_matches = re.findall(r'<li[^>]*>(.*?)</li>', events_html, re.DOTALL)
            for li_content in li_matches:
                # Remove HTML tags
                text = re.sub(r'<[^>]+>', '', li_content).strip()
                if text:
                    events.append(text)

    return events

def extract_date_words(events_list, target_lengths=[5, 6, 7]):
    """Extract suitable words from Wikipedia events

    Priority:
    1. Proper nouns (places, people, events)
    2. Significant common nouns
    3. Action verbs from historical events
    """
    if not events_list:
        return []

    word_entries = {}  # Use dict to avoid duplicates

    # Common words to skip (too boring or too common for a word game)
    skip_words = {
        'the', 'this', 'that', 'these', 'those', 'there', 'where',
        'what', 'when', 'which', 'while', 'after', 'before', 'during',
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december',
        'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh',
        'eighth', 'ninth', 'tenth', 'about', 'their', 'would', 'could',
        'should', 'become', 'becomes', 'became', 'begin', 'begins', 'began',
        'against', 'between', 'through', 'without', 'within', 'around',
        'under', 'until', 'since', 'being', 'other', 'another', 'every'
    }

    for event_text in events_list:
        # Extract ALL words (not just capitalized) and validate against ENABLE
        all_words = re.findall(r'\b[a-zA-Z]+\b', event_text)

        for word in all_words:
            word_clean = re.sub(r'[^\w]', '', word)  # Remove punctuation
            word_upper = word_clean.upper()
            word_lower = word_clean.lower()

            if (len(word_clean) in target_lengths and
                word_lower not in skip_words and
                word_upper not in word_entries and
                word_clean.isalpha() and
                word_upper in ENABLE_WORDS):  # Only use words in ENABLE dictionary

                word_entries[word_upper] = {
                    'word': word_upper,
                    'context': event_text[:200],  # First 200 chars of event
                    'original': word_clean
                }

    return list(word_entries.values())

def get_date_words_for_seed(seed):
    """Get words for a specific date seed (YYYYMMDD format)"""
    try:
        year = int(seed[0:4])
        month = int(seed[4:6])
        day = int(seed[6:8])
    except:
        return None

    # Fetch Wikipedia HTML (like WikiDates)
    html = fetch_wikipedia_events_html(month, day)
    if not html:
        return None

    # Extract events text
    events = extract_events_text(html)
    if not events:
        return None

    # Extract words with their contexts
    word_entries = extract_date_words(events)

    # Sort by relevance (longer words, proper nouns first)
    word_entries.sort(key=lambda x: len(x['word']), reverse=True)

    # Return top candidates with their contexts
    return word_entries[:20]  # Top 20 candidates

def select_daily_word(word_entries, seed):
    """Deterministically select a word based on seed"""
    if not word_entries:
        return None

    # Use seed to consistently pick the same word
    seed_hash = int(hashlib.md5(seed.encode()).hexdigest(), 16)
    index = seed_hash % len(word_entries)

    return word_entries[index]

if __name__ == "__main__":
    # Test with a specific date
    import sys

    if len(sys.argv) > 1:
        seed = sys.argv[1]
    else:
        # Use today's date
        today = datetime.now()
        seed = today.strftime('%Y%m%d')

    print(f"Fetching words for date: {seed}")

    word_entries = get_date_words_for_seed(seed)
    if word_entries:
        print(f"\nFound {len(word_entries)} suitable words:")
        for entry in word_entries[:10]:
            print(f"- {entry['word']}: {entry['context'][:100]}...")

        selected = select_daily_word(word_entries, seed)
        print(f"\nSelected word for {seed}: {selected['word']}")
        print(f"Context: {selected['context']}")
    else:
        print("No suitable words found")