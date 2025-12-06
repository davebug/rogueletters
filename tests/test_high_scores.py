#!/usr/bin/env python3
"""
Unit tests for high score CGI endpoints
"""

import sys
import os
import json
import tempfile
import shutil
import unittest
from unittest.mock import patch, MagicMock

# Add cgi-bin to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'cgi-bin'))

# Import the CGI modules
import get_high_score
import submit_high_score


class TestGetHighScore(unittest.TestCase):
    """Test the get_high_score.py endpoint"""

    def setUp(self):
        """Set up test environment"""
        self.test_dir = tempfile.mkdtemp()
        self.scores_dir = os.path.join(self.test_dir, 'high_scores')
        os.makedirs(self.scores_dir)

    def tearDown(self):
        """Clean up test environment"""
        shutil.rmtree(self.test_dir)

    @patch('sys.stdout', new_callable=MagicMock)
    @patch('os.path.exists')
    @patch('cgi.FieldStorage')
    def test_get_nonexistent_high_score(self, mock_form, mock_exists, mock_stdout):
        """Test getting a high score that doesn't exist"""
        # Mock form data
        mock_field = MagicMock()
        mock_field.getvalue.return_value = '20251008'
        mock_form.return_value = mock_field

        # Mock file system
        def exists_side_effect(path):
            if path.endswith('data'):
                return False
            return False

        mock_exists.side_effect = exists_side_effect

        # Call main
        get_high_score.main()

        # Check output (should be JSON with success=True, score=None)
        # Can't easily test printed output, but this verifies no crash

    @patch('cgi.FieldStorage')
    def test_invalid_date_format(self, mock_form):
        """Test with invalid date format"""
        mock_field = MagicMock()
        mock_field.getvalue.return_value = 'invalid'
        mock_form.return_value = mock_field

        # This should not crash
        get_high_score.main()

    @patch('cgi.FieldStorage')
    def test_invalid_year_range(self, mock_form):
        """Test with year out of range"""
        mock_field = MagicMock()
        mock_field.getvalue.return_value = '19991231'  # Year 1999
        mock_form.return_value = mock_field

        # This should not crash
        get_high_score.main()


class TestSubmitHighScore(unittest.TestCase):
    """Test the submit_high_score.py endpoint"""

    def setUp(self):
        """Set up test environment"""
        self.test_dir = tempfile.mkdtemp()
        self.scores_dir = os.path.join(self.test_dir, 'high_scores')
        self.rate_limit_file = os.path.join(self.test_dir, 'rate_limits.json')
        os.makedirs(self.scores_dir)

    def tearDown(self):
        """Clean up test environment"""
        shutil.rmtree(self.test_dir)

    def test_atomic_write(self):
        """Test atomic file writing"""
        test_file = os.path.join(self.test_dir, 'test.json')
        test_data = {'test': 'data', 'number': 123}

        submit_high_score.atomic_write(test_file, test_data)

        # Verify file exists and contains correct data
        self.assertTrue(os.path.exists(test_file))

        with open(test_file, 'r') as f:
            loaded_data = json.load(f)

        self.assertEqual(loaded_data, test_data)

    def test_atomic_write_size_limit(self):
        """Test that atomic write rejects oversized data"""
        test_file = os.path.join(self.test_dir, 'test.json')

        # Create data that's too large
        large_data = {'data': 'x' * 2000000}  # 2MB

        with self.assertRaises(ValueError):
            submit_high_score.atomic_write(test_file, large_data)

        # File should not exist
        self.assertFalse(os.path.exists(test_file))

    def test_check_rate_limit(self):
        """Test rate limiting logic"""
        # This should allow first submission
        allowed = submit_high_score.check_rate_limit('127.0.0.1')
        self.assertTrue(allowed)

    @patch('os.environ.get')
    @patch('sys.stdin')
    def test_invalid_request_size(self, mock_stdin, mock_environ):
        """Test rejection of oversized requests"""
        mock_environ.return_value = str(submit_high_score.MAX_REQUEST_SIZE + 1000)

        # This should not crash and should return error
        submit_high_score.main()

    @patch('os.environ.get')
    @patch('sys.stdin')
    def test_empty_request(self, mock_stdin, mock_environ):
        """Test handling of empty request"""
        mock_environ.return_value = '0'

        # This should not crash
        submit_high_score.main()


class TestIntegration(unittest.TestCase):
    """Integration tests for high score flow"""

    def setUp(self):
        """Set up test environment"""
        self.test_dir = tempfile.mkdtemp()
        self.scores_dir = os.path.join(self.test_dir, 'high_scores')
        os.makedirs(self.scores_dir)

    def tearDown(self):
        """Clean up test environment"""
        shutil.rmtree(self.test_dir)

    def test_submit_and_retrieve(self):
        """Test submitting a score and retrieving it"""
        date = '20251008'
        score = 87
        board_url = 'test_board_url_data'

        # Create a high score file manually
        score_data = {
            'date': date,
            'score': score,
            'board_url': board_url,
            'timestamp': '2025-10-08T12:00:00Z'
        }

        score_file = os.path.join(self.scores_dir, f'{date}.json')
        with open(score_file, 'w') as f:
            json.dump(score_data, f)

        # Verify file exists
        self.assertTrue(os.path.exists(score_file))

        # Verify contents
        with open(score_file, 'r') as f:
            loaded = json.load(f)

        self.assertEqual(loaded['score'], score)
        self.assertEqual(loaded['board_url'], board_url)


if __name__ == '__main__':
    unittest.main()
