#!/usr/bin/env python3
"""
High Score Abuse Detection Script

Scans all high score submissions and calculates abuse probability
based on temporal patterns, score anomalies, and board URL patterns.
"""

import json
import os
import sys
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Tuple
import re

# Configuration
HIGH_SCORES_DIR = 'data/high_scores'
SUSPICIOUS_SCORE_THRESHOLD = 300  # Scores above this are suspicious
MAX_REALISTIC_SCORE = 400  # Theoretical max (very generous)
MIN_GAME_DURATION_SECONDS = 60  # Minimum realistic game completion time


class AbuseDetector:
    def __init__(self, scores_dir: str):
        self.scores_dir = scores_dir
        self.scores = []
        self.abuse_findings = []

    def load_scores(self):
        """Load all high score files"""
        if not os.path.exists(self.scores_dir):
            print(f"❌ High scores directory not found: {self.scores_dir}")
            return False

        for filename in os.listdir(self.scores_dir):
            if not filename.endswith('.json'):
                continue

            filepath = os.path.join(self.scores_dir, filename)
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    # Parse timestamp
                    timestamp = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
                    data['parsed_timestamp'] = timestamp
                    data['filename'] = filename
                    self.scores.append(data)
            except Exception as e:
                print(f"⚠️  Warning: Could not parse {filename}: {e}")

        # Sort by timestamp
        self.scores.sort(key=lambda x: x['parsed_timestamp'])
        print(f"📊 Loaded {len(self.scores)} high scores")
        return True

    def detect_temporal_abuse(self) -> List[Dict]:
        """Detect suspiciously close submission times"""
        findings = []

        for i in range(len(self.scores) - 1):
            curr = self.scores[i]
            next_score = self.scores[i + 1]

            time_diff = (next_score['parsed_timestamp'] - curr['parsed_timestamp']).total_seconds()

            # Different dates submitted within seconds
            if curr['date'] != next_score['date'] and time_diff < 5:
                findings.append({
                    'type': 'rapid_multi_date_submission',
                    'severity': 'high',
                    'evidence': f"Scores for {curr['date']} and {next_score['date']} submitted {time_diff:.1f}s apart",
                    'dates': [curr['date'], next_score['date']],
                    'time_diff': time_diff,
                    'timestamps': [str(curr['parsed_timestamp']), str(next_score['parsed_timestamp'])]
                })

            # Same date resubmitted very quickly (possible automation)
            elif curr['date'] == next_score['date'] and time_diff < MIN_GAME_DURATION_SECONDS:
                findings.append({
                    'type': 'rapid_resubmission',
                    'severity': 'medium',
                    'evidence': f"Date {curr['date']} resubmitted after {time_diff:.1f}s (< {MIN_GAME_DURATION_SECONDS}s minimum game time)",
                    'date': curr['date'],
                    'time_diff': time_diff,
                    'old_score': curr['score'],
                    'new_score': next_score['score']
                })

        return findings

    def detect_score_anomalies(self) -> List[Dict]:
        """Detect suspicious score patterns"""
        findings = []

        for score_entry in self.scores:
            score = score_entry['score']
            date = score_entry['date']

            # Impossibly high scores
            if score > MAX_REALISTIC_SCORE:
                findings.append({
                    'type': 'impossible_score',
                    'severity': 'critical',
                    'evidence': f"Score {score} exceeds maximum realistic score ({MAX_REALISTIC_SCORE})",
                    'date': date,
                    'score': score
                })

            # Suspiciously high scores
            elif score > SUSPICIOUS_SCORE_THRESHOLD:
                findings.append({
                    'type': 'suspicious_high_score',
                    'severity': 'medium',
                    'evidence': f"Score {score} is unusually high (>{SUSPICIOUS_SCORE_THRESHOLD})",
                    'date': date,
                    'score': score
                })

            # Suspiciously round scores (multiples of 100)
            if score > 0 and score % 100 == 0:
                findings.append({
                    'type': 'round_score',
                    'severity': 'low',
                    'evidence': f"Score {score} is a suspiciously round number",
                    'date': date,
                    'score': score
                })

        return findings

    def detect_duplicate_patterns(self) -> List[Dict]:
        """Detect duplicate scores and board URLs"""
        findings = []

        # Check for duplicate board URLs
        board_urls = defaultdict(list)
        for score_entry in self.scores:
            url = score_entry['board_url']
            board_urls[url].append(score_entry['date'])

        for url, dates in board_urls.items():
            if len(dates) > 1:
                findings.append({
                    'type': 'duplicate_board_url',
                    'severity': 'high',
                    'evidence': f"Same board URL used for multiple dates: {', '.join(dates)}",
                    'board_url': url[:50] + '...' if len(url) > 50 else url,
                    'dates': dates
                })

        # Check for exact duplicate scores across dates
        score_values = defaultdict(list)
        for score_entry in self.scores:
            score = score_entry['score']
            score_values[score].append(score_entry['date'])

        for score, dates in score_values.items():
            if len(dates) > 3:  # Same score 4+ times is suspicious
                findings.append({
                    'type': 'repeated_exact_score',
                    'severity': 'low',
                    'evidence': f"Score {score} appears {len(dates)} times across different dates",
                    'score': score,
                    'dates': dates,
                    'count': len(dates)
                })

        return findings

    def detect_board_url_anomalies(self) -> List[Dict]:
        """Detect suspicious board URL patterns"""
        findings = []

        for score_entry in self.scores:
            url = score_entry['board_url']
            date = score_entry['date']

            # Check if it's a test URL (should not be in production)
            if url.startswith('TEST_'):
                findings.append({
                    'type': 'test_url_in_production',
                    'severity': 'high',
                    'evidence': f"Test URL found in production data: {url}",
                    'date': date,
                    'board_url': url
                })

            # Check for suspiciously short URLs (may be invalid)
            elif len(url) < 20:
                findings.append({
                    'type': 'suspiciously_short_url',
                    'severity': 'medium',
                    'evidence': f"Board URL is unusually short ({len(url)} chars): {url}",
                    'date': date,
                    'board_url': url
                })

            # Check for invalid Base64URL characters
            elif not re.match(r'^[A-Za-z0-9_-]+$', url) and not url.startswith('TEST_'):
                findings.append({
                    'type': 'invalid_board_url_format',
                    'severity': 'medium',
                    'evidence': f"Board URL contains invalid characters",
                    'date': date,
                    'board_url': url[:50] + '...' if len(url) > 50 else url
                })

        return findings

    def detect_statistical_anomalies(self) -> List[Dict]:
        """Detect statistical outliers"""
        findings = []

        if len(self.scores) < 3:
            return findings

        # Calculate score statistics
        scores = [s['score'] for s in self.scores]
        avg_score = sum(scores) / len(scores)

        # Standard deviation
        variance = sum((s - avg_score) ** 2 for s in scores) / len(scores)
        std_dev = variance ** 0.5

        # Find outliers (>3 standard deviations)
        for score_entry in self.scores:
            score = score_entry['score']
            z_score = (score - avg_score) / std_dev if std_dev > 0 else 0

            if abs(z_score) > 3:
                findings.append({
                    'type': 'statistical_outlier',
                    'severity': 'low',
                    'evidence': f"Score {score} is {z_score:.1f} std deviations from mean ({avg_score:.1f})",
                    'date': score_entry['date'],
                    'score': score,
                    'z_score': z_score,
                    'mean': avg_score,
                    'std_dev': std_dev
                })

        return findings

    def calculate_abuse_probability(self) -> Tuple[float, Dict]:
        """Calculate overall abuse probability based on findings"""

        severity_weights = {
            'critical': 50,
            'high': 20,
            'medium': 10,
            'low': 5
        }

        # Count findings by severity
        severity_counts = defaultdict(int)
        for finding in self.abuse_findings:
            severity_counts[finding['severity']] += 1

        # Calculate weighted score
        weighted_score = sum(
            count * severity_weights[severity]
            for severity, count in severity_counts.items()
        )

        # Convert to percentage (cap at 100%)
        # Formula: min(weighted_score / (number_of_scores * 2), 100)
        # This means roughly 1 high-severity issue per 2 scores = 100% abuse probability
        max_possible = max(len(self.scores) * 2, 1)
        probability = min((weighted_score / max_possible) * 100, 100)

        stats = {
            'total_scores': len(self.scores),
            'total_findings': len(self.abuse_findings),
            'critical_findings': severity_counts['critical'],
            'high_findings': severity_counts['high'],
            'medium_findings': severity_counts['medium'],
            'low_findings': severity_counts['low'],
            'weighted_score': weighted_score,
            'probability': probability
        }

        return probability, stats

    def run_analysis(self) -> Dict:
        """Run all abuse detection checks"""
        print("\n🔍 Running abuse detection analysis...\n")

        # Load scores
        if not self.load_scores():
            return None

        if len(self.scores) == 0:
            print("ℹ️  No high scores found. Nothing to analyze.")
            return {
                'probability': 0,
                'stats': {'total_scores': 0, 'total_findings': 0},
                'findings': []
            }

        # Run all detection methods
        print("⏱️  Checking temporal patterns...")
        self.abuse_findings.extend(self.detect_temporal_abuse())

        print("📊 Checking score anomalies...")
        self.abuse_findings.extend(self.detect_score_anomalies())

        print("🔗 Checking for duplicate patterns...")
        self.abuse_findings.extend(self.detect_duplicate_patterns())

        print("🌐 Checking board URL anomalies...")
        self.abuse_findings.extend(self.detect_board_url_anomalies())

        print("📈 Checking statistical outliers...")
        self.abuse_findings.extend(self.detect_statistical_anomalies())

        # Calculate abuse probability
        probability, stats = self.calculate_abuse_probability()

        return {
            'probability': probability,
            'stats': stats,
            'findings': self.abuse_findings
        }

    def print_report(self, results: Dict):
        """Print formatted abuse detection report"""
        if not results:
            return

        prob = results['probability']
        stats = results['stats']
        findings = results['findings']

        print("\n" + "="*70)
        print("🚨 HIGH SCORE ABUSE DETECTION REPORT")
        print("="*70)

        # Overall assessment
        print(f"\n📊 ABUSE PROBABILITY: {prob:.1f}%")

        if prob >= 75:
            print("   ⚠️  CRITICAL - High likelihood of abuse detected")
        elif prob >= 50:
            print("   ⚠️  HIGH - Significant suspicious activity")
        elif prob >= 25:
            print("   ⚠️  MEDIUM - Some suspicious patterns detected")
        elif prob >= 10:
            print("   ℹ️  LOW - Minor anomalies detected")
        else:
            print("   ✅ MINIMAL - No significant abuse detected")

        # Statistics
        print(f"\n📈 STATISTICS:")
        print(f"   Total Scores: {stats['total_scores']}")
        print(f"   Total Findings: {stats['total_findings']}")
        print(f"   Critical: {stats['critical_findings']}")
        print(f"   High: {stats['high_findings']}")
        print(f"   Medium: {stats['medium_findings']}")
        print(f"   Low: {stats['low_findings']}")

        # Detailed findings by severity
        if findings:
            print("\n🔍 DETAILED FINDINGS:\n")

            # Group by severity
            by_severity = defaultdict(list)
            for finding in findings:
                by_severity[finding['severity']].append(finding)

            # Print in order: critical, high, medium, low
            for severity in ['critical', 'high', 'medium', 'low']:
                severity_findings = by_severity[severity]
                if not severity_findings:
                    continue

                icon = {
                    'critical': '🔴',
                    'high': '🟠',
                    'medium': '🟡',
                    'low': '🟢'
                }[severity]

                print(f"{icon} {severity.upper()} SEVERITY ({len(severity_findings)} findings):")
                print("-" * 70)

                for i, finding in enumerate(severity_findings, 1):
                    print(f"\n{i}. {finding['type'].replace('_', ' ').title()}")
                    print(f"   {finding['evidence']}")

                    # Print additional details
                    for key, value in finding.items():
                        if key not in ['type', 'severity', 'evidence']:
                            if isinstance(value, list) and len(value) > 5:
                                print(f"   {key}: {value[:5]} ... ({len(value)} total)")
                            else:
                                print(f"   {key}: {value}")

                print()
        else:
            print("\n✅ No suspicious patterns detected!")

        print("="*70)

        # Recommendations
        if prob >= 50:
            print("\n⚠️  RECOMMENDATIONS:")
            print("   1. Review flagged submissions manually")
            print("   2. Consider implementing stricter rate limiting")
            print("   3. Add CAPTCHA for high score submissions")
            print("   4. Validate board URLs can be decoded successfully")
            print("   5. Monitor for continued abuse patterns")
            print()


def main():
    """Main entry point"""
    # Check for custom directory argument
    scores_dir = HIGH_SCORES_DIR
    if len(sys.argv) > 1:
        scores_dir = sys.argv[1]

    print(f"📁 High scores directory: {scores_dir}")

    detector = AbuseDetector(scores_dir)
    results = detector.run_analysis()

    if results:
        detector.print_report(results)

        # Exit with code based on severity
        if results['probability'] >= 75:
            sys.exit(2)  # Critical
        elif results['probability'] >= 50:
            sys.exit(1)  # Warning
        else:
            sys.exit(0)  # OK


if __name__ == "__main__":
    main()
