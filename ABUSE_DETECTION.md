# High Score Abuse Detection

## Overview

The `detect_abuse.py` script analyzes all high score submissions to detect potential abuse patterns and calculate an overall abuse probability.

## Usage

### Local Development

```bash
# Run on local test data
python3 detect_abuse.py

# Run on custom directory
python3 detect_abuse.py /path/to/high_scores
```

### Production Server

```bash
# Copy script to server
scp detect_abuse.py unraid:/tmp/

# Run on production data
ssh unraid "docker cp /tmp/detect_abuse.py letters:/tmp/ && \
            docker exec letters python3 /tmp/detect_abuse.py /usr/local/apache2/data/high_scores"
```

### Exit Codes

- `0`: OK - No significant abuse detected (probability < 50%)
- `1`: Warning - Significant suspicious activity (probability 50-74%)
- `2`: Critical - High likelihood of abuse (probability ≥ 75%)

## Detection Patterns

### 1. Temporal Abuse (High Severity)

**Pattern:** Multiple scores for different dates submitted within seconds

```
Evidence: Scores for 20251008 and 20251009 submitted 0.3s apart
```

**Why suspicious:** It's impossible to complete two full games in under 5 seconds

### 2. Rapid Resubmission (Medium Severity)

**Pattern:** Same date resubmitted faster than minimum game duration

```
Evidence: Date 20251009 resubmitted after 45s (< 60s minimum game time)
```

**Why suspicious:** Even the fastest players need at least 60 seconds to complete a game

### 3. Impossible Scores (Critical Severity)

**Pattern:** Scores exceeding theoretical maximum

```
Evidence: Score 500 exceeds maximum realistic score (400)
```

**Why suspicious:** Game mechanics make scores above 400 mathematically impossible

### 4. Suspiciously High Scores (Medium Severity)

**Pattern:** Scores above 300 points

```
Evidence: Score 350 is unusually high (>300)
```

**Why suspicious:** Very few legitimate games exceed 300 points

### 5. Round Number Scores (Low Severity)

**Pattern:** Scores that are perfect multiples of 100

```
Evidence: Score 200 is a suspiciously round number
```

**Why suspicious:** While possible, exact multiples of 100 are statistically rare

### 6. Duplicate Board URLs (High Severity)

**Pattern:** Same board URL submitted for multiple dates

```
Evidence: Same board URL used for dates: 20251008, 20251009, 20251010
```

**Why suspicious:** Each date has a unique starting word, so board URLs should be unique

### 7. Repeated Exact Scores (Low Severity)

**Pattern:** Same score appearing 4+ times across different dates

```
Evidence: Score 150 appears 5 times across different dates
```

**Why suspicious:** While possible, exact score duplication is statistically unlikely

### 8. Test URLs in Production (High Severity)

**Pattern:** Test/debug data in production database

```
Evidence: Test URL found in production data: TEST_BOARD_URL_123
```

**Why suspicious:** Test data should never appear in production

### 9. Suspiciously Short URLs (Medium Severity)

**Pattern:** Board URLs shorter than expected

```
Evidence: Board URL is unusually short (15 chars): test_url_12345
```

**Why suspicious:** Valid compressed board URLs are typically 20+ characters

### 10. Invalid URL Format (Medium Severity)

**Pattern:** Board URLs with non-Base64URL characters

```
Evidence: Board URL contains invalid characters
```

**Why suspicious:** Valid URLs should only contain A-Z, a-z, 0-9, -, _

### 11. Statistical Outliers (Low Severity)

**Pattern:** Scores more than 3 standard deviations from mean

```
Evidence: Score 380 is 3.2 std deviations from mean (142.5)
```

**Why suspicious:** Extreme statistical outliers warrant review

## Abuse Probability Calculation

The script calculates abuse probability using weighted severity:

- **Critical findings**: 50 points each
- **High findings**: 20 points each
- **Medium findings**: 10 points each
- **Low findings**: 5 points each

**Formula:**
```
probability = min(weighted_score / (total_scores * 2), 100) * 100
```

**Thresholds:**
- **0-9%**: ✅ Minimal risk
- **10-24%**: ℹ️ Low risk - minor anomalies
- **25-49%**: ⚠️ Medium risk - some suspicious patterns
- **50-74%**: ⚠️ High risk - significant suspicious activity
- **75-100%**: 🔴 Critical risk - high likelihood of abuse

## Example Output

```
======================================================================
🚨 HIGH SCORE ABUSE DETECTION REPORT
======================================================================

📊 ABUSE PROBABILITY: 67.5%
   ⚠️  HIGH - Significant suspicious activity

📈 STATISTICS:
   Total Scores: 15
   Total Findings: 8
   Critical: 0
   High: 3
   Medium: 4
   Low: 1

🔍 DETAILED FINDINGS:

🟠 HIGH SEVERITY (3 findings):
----------------------------------------------------------------------

1. Rapid Multi Date Submission
   Scores for 20251008 and 20251009 submitted 0.5s apart
   dates: ['20251008', '20251009']
   time_diff: 0.5
   timestamps: ['2025-10-09T14:30:00Z', '2025-10-09T14:30:01Z']

2. Rapid Multi Date Submission
   Scores for 20251009 and 20251010 submitted 1.2s apart
   dates: ['20251009', '20251010']
   time_diff: 1.2
   timestamps: ['2025-10-09T14:30:01Z', '2025-10-09T14:30:02Z']

3. Duplicate Board Url
   Same board URL used for multiple dates: 20251008, 20251009
   board_url: 1PFrKTUKMkjihyYxuhHCjmQ9KdtA
   dates: ['20251008', '20251009']

======================================================================

⚠️  RECOMMENDATIONS:
   1. Review flagged submissions manually
   2. Consider implementing stricter rate limiting
   3. Add CAPTCHA for high score submissions
   4. Validate board URLs can be decoded successfully
   5. Monitor for continued abuse patterns
```

## Automation

### Cron Job (Daily Check)

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * /usr/bin/python3 /path/to/detect_abuse.py /usr/local/apache2/data/high_scores >> /var/log/abuse_detection.log 2>&1
```

### Email Alerts

```bash
# Run and email results if abuse detected
python3 detect_abuse.py /usr/local/apache2/data/high_scores > /tmp/abuse_report.txt
if [ $? -gt 0 ]; then
    mail -s "High Score Abuse Detected" admin@example.com < /tmp/abuse_report.txt
fi
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Check for abuse
  run: |
    python3 detect_abuse.py data/high_scores
    if [ $? -eq 2 ]; then
      echo "::error::Critical abuse detected"
      exit 1
    fi
```

## Manual Review Process

When abuse is detected:

1. **Verify timestamps** - Check if submissions are humanly possible
2. **Decode board URLs** - Verify they decompress to valid game states
3. **Check IP logs** - Look for patterns in rate_limits.json
4. **Test board URLs** - Load them in browser to verify legitimacy
5. **Delete invalid scores** - Remove confirmed abuse from database
6. **Block abusers** - Add IP-based blocking if needed

## Prevention Recommendations

Based on detected patterns, consider:

1. **Stricter rate limiting** - Reduce from 50 to 10 submissions/day
2. **Minimum game duration** - Reject submissions faster than 60 seconds
3. **Board URL validation** - Verify URLs decompress successfully
4. **CAPTCHA** - Add for high score submissions
5. **IP reputation** - Track and block repeat offenders
6. **Score caps** - Hard limit of 400 points
7. **Unique board URLs** - Reject duplicate URLs across dates

## False Positives

Some patterns may trigger false positives:

- **High scores**: Legitimate skilled players may score 300+
- **Round numbers**: Occasionally happen by chance
- **Statistical outliers**: Natural variation in performance
- **Rapid submission** (same date): Player might reload and replay immediately

Always manually review before taking action.

## License

This script is part of the WikiLetters project.
