#!/usr/bin/env python3
"""Simple test server for Azezmen scipy backend."""
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from api.stats import handler

if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 3000), handler)
    print("🚀 Test server running on http://127.0.0.1:3000")
    print("   POST /api/stats to test")
    server.serve_forever()
