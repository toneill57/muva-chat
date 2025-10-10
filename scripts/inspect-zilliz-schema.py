#!/usr/bin/env python3
"""
Inspect Zilliz collection schema
"""

from pymilvus import connections, Collection
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

collection_name = "hybrid_code_chunks_7cbd9e1a"
collection = Collection(collection_name)

print(f"\n📊 Schema for collection: {collection_name}")
print(f"   Description: {collection.description}")
print(f"   Fields:")

for field in collection.schema.fields:
    print(f"   - {field.name} ({field.dtype})")
    if field.is_primary:
        print(f"     PRIMARY KEY")

# Get count
print(f"\n📈 Stats:")
print(f"   Entities: {collection.num_entities}")
