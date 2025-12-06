# Starting Words Database Specification

## Overview

The starting word system provides 100 years of unique daily puzzles by maintaining 100 different starting words for each calendar day, themed around historical events, birthdays, and cultural moments from that date.

## Database Architecture

### Storage Format
```json
{
  "metadata": {
    "version": "1.0.0",
    "lastUpdated": "2024-03-15",
    "totalWords": 36600,
    "yearsOfContent": 100
  },
  "days": {
    "01-01": {
      "theme": "New Year's Day",
      "words": [
        {
          "year": 2024,
          "word": "FRESH",
          "reason": "New Year - Fresh Start",
          "source": "cultural",
          "wikiEvent": null
        },
        {
          "year": 2025,
          "word": "BEGIN",
          "reason": "New Beginnings",
          "source": "cultural",
          "wikiEvent": null
        },
        {
          "year": 2026,
          "word": "HAITI",
          "reason": "Haitian Independence Day (1804)",
          "source": "wikipedia",
          "wikiEvent": "Haiti gains independence from France"
        }
        // ... 97 more entries
      ]
    },
    // ... 365 more days
  }
}
```

## Wikipedia Data Extraction Plan

### Data Sources
1. **Wikipedia "On This Day" Pages**
   - Events: Historical events for each date
   - Births: Notable people born on this date
   - Deaths: Notable people who died on this date
   - Holidays: Cultural and religious observances

2. **Data Extraction Process**
```python
def extract_wikipedia_data(month, day):
    """Extract relevant data from Wikipedia for word generation"""

    # Wikipedia API endpoints
    events = get_wikipedia_events(month, day)
    births = get_wikipedia_births(month, day)
    deaths = get_wikipedia_deaths(month, day)
    holidays = get_wikipedia_holidays(month, day)

    # Extract keywords from events
    keywords = []
    for event in events:
        keywords.extend(extract_keywords(event['description']))
        keywords.extend(extract_keywords(event['location']))
        keywords.extend(extract_person_names(event['people']))

    return filter_valid_game_words(keywords)
```

### Word Generation Algorithm
```python
def generate_starting_words(date_data):
    """Generate 100 thematic words for a specific date"""

    candidates = []

    # Priority 1: Direct word matches (5-7 letters)
    for keyword in date_data['keywords']:
        if 5 <= len(keyword) <= 7:
            candidates.append({
                'word': keyword.upper(),
                'reason': date_data['context'],
                'priority': 1
            })

    # Priority 2: Related words
    for keyword in date_data['keywords']:
        related = get_related_words(keyword)  # thesaurus lookup
        for word in related:
            if 5 <= len(word) <= 7:
                candidates.append({
                    'word': word.upper(),
                    'reason': f"Related to {keyword} - {date_data['context']}",
                    'priority': 2
                })

    # Priority 3: Name-based words
    for person in date_data['people']:
        first_name = person.split()[0].upper()
        last_name = person.split()[-1].upper()

        if 5 <= len(first_name) <= 7:
            candidates.append({
                'word': first_name,
                'reason': f"{person} - {date_data['context']}",
                'priority': 3
            })

    # Sort by priority and relevance
    candidates.sort(key=lambda x: (x['priority'], x['relevance_score']))

    return candidates[:100]  # Top 100 words
```

## Thematic Categories

### Category Distribution Per Day
Each day's 100 words should ideally include:
- 20-30 **Historical Events** (battles, treaties, discoveries)
- 20-30 **Famous People** (births, deaths, achievements)
- 10-20 **Cultural/Holiday** (celebrations, observances)
- 10-20 **Geographic** (places where events occurred)
- 10-20 **General/Seasonal** (weather, seasons, universal themes)

### Example Themed Words by Date

#### January 1st (New Year's Day)
```json
{
  "historical": ["JANUS", "ROMAN", "CAESAR"],
  "cultural": ["FRESH", "BEGIN", "START", "FIRST", "PARTY"],
  "geographic": ["HAITI", "SAMOA", "ELLIS"],
  "people": ["REVERE", "HOOVER", "SALIH"],
  "seasonal": ["WINTER", "COLD", "SNOW"]
}
```

#### July 4th (US Independence Day)
```json
{
  "historical": ["REBEL", "COLONY", "KING", "GEORGE", "RIGHTS"],
  "cultural": ["FREEDOM", "LIBERTY", "NATION", "PROUD"],
  "geographic": ["PHILLY", "BOSTON", "VALLEY"],
  "people": ["ADAMS", "CALVIN", "FOSTER"],
  "seasonal": ["SUMMER", "PICNIC", "GRILL"]
}
```

#### October 31st (Halloween)
```json
{
  "historical": ["LUTHER", "REFORM", "THESIS"],
  "cultural": ["SPOOKY", "GHOST", "WITCH", "CANDY", "TREAT"],
  "geographic": ["SALEM", "NEVADA"],
  "people": ["KEATS", "PIPER", "RIVER"],
  "seasonal": ["AUTUMN", "LEAVES", "CHILL"]
}
```

## Word Validation Criteria

### Requirements for Starting Words
```python
STARTING_WORD_CRITERIA = {
    "length": (5, 7),  # 5-7 letters
    "valid_in_dictionary": True,  # Must be in ENABLE
    "difficulty": "common",  # Preference for common words
    "profanity_check": True,  # Must pass profanity filter
    "letter_distribution": {
        "min_vowels": 2,  # At least 2 vowels
        "max_same_letter": 2,  # No more than 2 of same letter
        "avoid_all_high_value": True  # Not all Q, X, Z, J
    }
}
```

### Filtering Process
```python
def validate_starting_word(word, context):
    """Validate a word for use as a starting word"""

    # Length check
    if not 5 <= len(word) <= 7:
        return False

    # Dictionary check
    if word.upper() not in ENABLE_DICTIONARY:
        return False

    # Profanity check
    if word.upper() in PROFANITY_LIST:
        return False

    # Letter distribution check
    letter_counts = Counter(word.upper())

    # At least 2 vowels
    vowel_count = sum(letter_counts[v] for v in 'AEIOU')
    if vowel_count < 2:
        return False

    # No more than 2 of the same letter
    if max(letter_counts.values()) > 2:
        return False

    # Not all high-value letters
    high_value_count = sum(letter_counts[l] for l in 'QXZJ')
    if high_value_count >= len(word) - 1:
        return False

    return True
```

## Manual Curation Process

### Curation Workflow
1. **Automated Generation**: Script generates 200 candidates per day
2. **Validation**: Filter through criteria to get 150 valid words
3. **Manual Review**: Human curator reviews and selects best 100
4. **Quality Check**: Ensure variety and appropriateness
5. **Final Assignment**: Assign to years 2024-2123

### Curation Guidelines
- **Variety**: Mix of different word types and difficulties
- **Appropriateness**: Family-friendly, culturally sensitive
- **Interest**: Words that spark curiosity or recognition
- **Balance**: Not too many similar words in sequence
- **Memorability**: Words that make sense for the date

## Implementation Timeline

### Phase 1: Initial Launch (Week 1)
```python
# Simple random selection from curated list
STARTER_WORDS = [
    "WORLD", "LIGHT", "STONE", "PAPER", "HOUSE",
    "WATER", "BEACH", "CLOUD", "DREAM", "EARTH",
    "FIELD", "GRAPE", "HAPPY", "JUMPY", "KNIFE",
    # ... 200 common 5-7 letter words
]

def get_starting_word(date):
    seed = hash(date.isoformat())
    random.seed(seed)
    return random.choice(STARTER_WORDS)
```

### Phase 2: Wikipedia Integration (Week 3-4)
- Set up Wikipedia API access
- Create extraction scripts
- Generate candidate words for all 366 days
- Store in temporary database

### Phase 3: Curation (Week 5-6)
- Manual review of generated words
- Fill gaps with themed words
- Create final database of 36,600 words
- Test year cycling logic

### Phase 4: Production (Week 7+)
- Deploy full database
- Add word reason display (optional)
- Create admin interface for updates

## Storage and Performance

### Database Size
- **JSON Format**: ~3-4 MB uncompressed
- **Compressed**: ~800 KB gzipped
- **Loading Strategy**: Load once at server start
- **Caching**: Cache current month in memory

### Access Pattern
```python
class StartingWordManager:
    def __init__(self):
        self.words = self.load_database()
        self.cache = {}

    def get_word_for_date(self, date):
        """Get starting word for specific date"""
        cache_key = date.isoformat()

        if cache_key in self.cache:
            return self.cache[cache_key]

        month_day = date.strftime("%m-%d")
        year_index = (date.year - 2024) % 100

        word_data = self.words['days'][month_day]['words'][year_index]
        self.cache[cache_key] = word_data['word']

        return word_data['word']

    def get_word_with_context(self, date):
        """Get word with its thematic context"""
        month_day = date.strftime("%m-%d")
        year_index = (date.year - 2024) % 100

        return self.words['days'][month_day]['words'][year_index]
```

## Future Enhancements

### Planned Features
1. **Word History Display**: Show why today's word was chosen
2. **Anniversary Highlighting**: Special words for 10th, 25th, 50th anniversaries
3. **User Submissions**: Allow community to suggest themed words
4. **Multiple Languages**: Expand to other language dictionaries
5. **Difficulty Modes**: Different word pools for easy/hard modes

### API Endpoints
```python
# /api/starting-word
GET /api/starting-word?date=2024-03-15
Response: {
    "word": "IDES",
    "reason": "Ides of March - Julius Caesar",
    "difficulty": "medium",
    "theme": "historical"
}

# /api/word-calendar
GET /api/word-calendar?month=3&year=2024
Response: {
    "days": {
        "01": {"word": "SPRING", "theme": "seasonal"},
        "02": {"word": "TEXAS", "theme": "geographic"},
        // ... rest of month
    }
}
```

## Special Date Handling

### Recurring Special Dates
```json
{
  "recurring_special": {
    "01-01": "New Year's Day",
    "02-14": "Valentine's Day",
    "03-17": "St. Patrick's Day",
    "04-01": "April Fools' Day",
    "07-04": "Independence Day (US)",
    "10-31": "Halloween",
    "12-25": "Christmas",
    "12-31": "New Year's Eve"
  }
}
```

### Leap Year Handling
- February 29th has its own set of 100 words
- Words themed around leap year events
- Falls back to February 28th words if needed

### Time Zone Considerations
- All dates based on UTC midnight
- Starting word changes at 00:00 UTC
- Client displays local date but uses UTC for word selection