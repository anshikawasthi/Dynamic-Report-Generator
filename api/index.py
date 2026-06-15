"""
Vercel Python Serverless entry-point.
Vercel will invoke this file for every /api/* request.
"""
import sys
import os

# Allow 'from app import ...' to find backend/app/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app import create_app  # noqa: E402

app = create_app()
