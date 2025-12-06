#!/usr/bin/env python3
"""
Migrate high score board_url from encoded format to full URL format
All existing high scores use legacy ?g= format (before v10.27)
"""

import json
import os
import glob

def migrate_high_scores():
    """Update all high score files to use full URLs"""

    scores_dir = 'data/high_scores'

    if not os.path.exists(scores_dir):
        print(f"❌ Directory not found: {scores_dir}")
        return

    # Find all JSON files
    score_files = glob.glob(os.path.join(scores_dir, '*.json'))

    if not score_files:
        print("No high score files found")
        return

    print(f"Found {len(score_files)} high score files to migrate\n")

    migrated = 0
    skipped = 0

    for score_file in sorted(score_files):
        filename = os.path.basename(score_file)

        try:
            # Read current data
            with open(score_file, 'r') as f:
                data = json.load(f)

            board_url = data.get('board_url', '')

            # Skip if already migrated (contains https://)
            if board_url.startswith('https://') or board_url.startswith('http://'):
                print(f"⏭️  {filename}: Already migrated")
                skipped += 1
                continue

            # Migrate to full URL with ?g= parameter (legacy format)
            # All existing high scores were created before v10.27 (?w= format)
            new_board_url = f"https://letters.wiki/?g={board_url}"

            # Update data
            data['board_url'] = new_board_url

            # Write back
            with open(score_file, 'w') as f:
                json.dump(data, f, indent=2)

            print(f"✅ {filename}: {board_url[:20]}... → ?g= URL")
            migrated += 1

        except Exception as e:
            print(f"❌ {filename}: Error - {e}")

    print(f"\n📊 Migration complete:")
    print(f"   Migrated: {migrated}")
    print(f"   Skipped:  {skipped}")
    print(f"   Total:    {len(score_files)}")

if __name__ == "__main__":
    migrate_high_scores()
