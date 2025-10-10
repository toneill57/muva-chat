#!/usr/bin/env python3
"""
Export code embeddings from Zilliz Cloud to JSONL format
Usage: python scripts/export-zilliz-embeddings.py
"""

from pymilvus import connections, Collection
import json
import os
import sys
from datetime import datetime

# Force unbuffered output
sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', 1)
sys.stderr = os.fdopen(sys.stderr.fileno(), 'w', 1)

def export_embeddings():
    # Leer credenciales de environment
    ZILLIZ_URI = os.getenv("ZILLIZ_CLOUD_URI")
    ZILLIZ_TOKEN = os.getenv("ZILLIZ_CLOUD_TOKEN")

    if not ZILLIZ_URI or not ZILLIZ_TOKEN:
        print("❌ Error: ZILLIZ_CLOUD_URI and ZILLIZ_CLOUD_TOKEN must be set")
        print("Export these from credentials first:")
        print("  export ZILLIZ_CLOUD_URI='...'")
        print("  export ZILLIZ_CLOUD_TOKEN='...'")
        return

    # Conectar a Zilliz
    print("🔌 Connecting to Zilliz Cloud...")
    connections.connect(
        alias="default",
        uri=ZILLIZ_URI,
        token=ZILLIZ_TOKEN
    )

    # Get collection (nombre usado por claude-context)
    collection_name = "hybrid_code_chunks_7cbd9e1a"  # Discovered via list_collections()
    collection = Collection(collection_name)
    collection.load()

    print(f"📊 Collection loaded: {collection_name}")

    # Export usando query iterator (sin límite de offset)
    print("📥 Exporting embeddings using iterator...")
    # Fields discovered via inspect-zilliz-schema.py:
    # - id (PRIMARY KEY)
    # - content
    # - vector (1536 dims - dense embedding)
    # - sparse_vector (hybrid index)
    # - relativePath
    # - startLine
    # - endLine
    # - fileExtension
    # - metadata

    total_entities = collection.num_entities
    print(f"   Total entities: {total_entities}")

    # Strategy: Use multiple small queries with ID filtering to avoid offset limit
    # Zilliz limit: offset + limit <= 16,384
    # Solution: Query in chunks, tracking last_id

    all_results = []
    batch_size = 50  # Small batches to avoid gRPC 4MB limit (each vector ~6-8KB)
    last_id = ""
    batch_num = 0

    while True:
        batch_num += 1

        # Query records with ID > last_id (sorted by ID)
        if last_id == "":
            expr = 'id != ""'  # First batch: get all
        else:
            # Escape single quotes in last_id
            escaped_id = last_id.replace("'", "\\'")
            expr = f'id > "{escaped_id}"'

        print(f"   Fetching batch {batch_num} (after ID: {last_id[:20]}...)", end="")

        try:
            batch = collection.query(
                expr=expr,
                output_fields=["id", "relativePath", "startLine", "endLine", "content", "vector", "fileExtension", "metadata"],
                limit=batch_size
            )
        except Exception as e:
            print(f"\n❌ Error fetching batch {batch_num}: {e}")
            break

        if not batch:
            print(" - No more records")
            break

        all_results.extend(batch)
        last_id = batch[-1]['id']  # Update last_id for next iteration

        print(f" ✓ ({len(batch)} records, {len(all_results)} total)")

        # If we got less than batch_size, we're done
        if len(batch) < batch_size:
            print("   ✅ Reached end of collection")
            break

    results = all_results
    print(f"\n   ✅ Fetched {len(results)} total records")

    # Crear directorio data/ si no existe
    os.makedirs("data", exist_ok=True)

    # Escribir a JSONL
    print("📝 Writing to JSONL...")
    output_file = "data/code-embeddings-export.jsonl"
    with open(output_file, "w") as f:
        for i, row in enumerate(results):
            f.write(json.dumps(row) + "\n")
            if (i + 1) % 5000 == 0:
                print(f"   Written {i + 1}/{len(results)} records...")

    # Stats
    file_size_mb = os.path.getsize(output_file) / 1024 / 1024

    print(f"\n✅ Export complete!")
    print(f"   Embeddings: {len(results)}")
    print(f"   Expected: ~34,655 (collection size)")
    print(f"   Output: {output_file}")
    print(f"   Size: {file_size_mb:.2f} MB")

    # Sample first record to verify structure
    if len(results) > 0:
        sample = results[0]
        print(f"\n📝 Sample record structure:")
        print(f"   Keys: {list(sample.keys())}")
        if 'vector' in sample:
            print(f"   Vector dimension: {len(sample['vector'])}")

    if len(results) < 30000:
        print(f"\n⚠️  Warning: Low count (expected ~34,655, got {len(results)})")

if __name__ == "__main__":
    export_embeddings()
