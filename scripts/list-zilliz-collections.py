#!/usr/bin/env python3
"""
List all collections in Zilliz Cloud
"""

from pymilvus import connections, utility
import os

ZILLIZ_URI = os.getenv("ZILLIZ_CLOUD_URI")
ZILLIZ_TOKEN = os.getenv("ZILLIZ_CLOUD_TOKEN")

if not ZILLIZ_URI or not ZILLIZ_TOKEN:
    print("❌ Error: ZILLIZ_CLOUD_URI and ZILLIZ_CLOUD_TOKEN must be set")
    exit(1)

print("🔌 Connecting to Zilliz Cloud...")
connections.connect(
    alias="default",
    uri=ZILLIZ_URI,
    token=ZILLIZ_TOKEN
)

print("📋 Listing collections...")
collections = utility.list_collections()

print(f"\n✅ Found {len(collections)} collection(s):")
for col in collections:
    print(f"   - {col}")
