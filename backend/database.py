import sqlite3
import json
import os
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        event_date TEXT,
        location TEXT,
        cover_photo TEXT,
        passcode TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        event_slug TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        file_path_hd TEXT NOT NULL,
        file_path_web TEXT NOT NULL,
        file_path_thumb TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_slug) REFERENCES events (slug) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS face_embeddings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        photo_id TEXT NOT NULL,
        event_slug TEXT NOT NULL,
        bbox_x INTEGER,
        bbox_y INTEGER,
        bbox_w INTEGER,
        bbox_h INTEGER,
        score REAL,
        embedding_json TEXT NOT NULL,
        FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE
    )
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_photos_event ON photos(event_slug)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_faces_event ON face_embeddings(event_slug)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_faces_photo ON face_embeddings(photo_id)")

    conn.commit()
    conn.close()

# Event helpers
def create_event(slug: str, title: str, event_date: str = "", location: str = "", passcode: str = "") -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO events (slug, title, event_date, location, passcode)
        VALUES (?, ?, ?, ?, ?)
    """, (slug, title, event_date, location, passcode))
    conn.commit()
    conn.close()
    return get_event_by_slug(slug)

def get_events() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.*, COUNT(p.id) as photo_count
        FROM events e
        LEFT JOIN photos p ON e.slug = p.event_slug
        GROUP BY e.id
        ORDER BY e.created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_event_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.*, COUNT(p.id) as photo_count
        FROM events e
        LEFT JOIN photos p ON e.slug = p.event_slug
        WHERE e.slug = ?
        GROUP BY e.id
    """, (slug,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

# Photo helpers
def add_photo(photo_id: str, event_slug: str, original_filename: str, file_path_hd: str, file_path_web: str, file_path_thumb: str, width: int, height: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO photos (id, event_slug, original_filename, file_path_hd, file_path_web, file_path_thumb, width, height)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (photo_id, event_slug, original_filename, file_path_hd, file_path_web, file_path_thumb, width, height))
    conn.commit()
    conn.close()

def get_event_photos(event_slug: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM photos WHERE event_slug = ? ORDER BY created_at DESC", (event_slug,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_photo_by_id(photo_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM photos WHERE id = ?", (photo_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

# Face helpers
def add_face_embedding(photo_id: str, event_slug: str, bbox: List[int], score: float, embedding: List[float]):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO face_embeddings (photo_id, event_slug, bbox_x, bbox_y, bbox_w, bbox_h, score, embedding_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (photo_id, event_slug, bbox[0], bbox[1], bbox[2], bbox[3], score, json.dumps(embedding)))
    conn.commit()
    conn.close()

def get_event_face_embeddings(event_slug: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT photo_id, bbox_x, bbox_y, bbox_w, bbox_h, score, embedding_json
        FROM face_embeddings
        WHERE event_slug = ?
    """, (event_slug,))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "photo_id": r["photo_id"],
            "bbox": [r["bbox_x"], r["bbox_y"], r["bbox_w"], r["bbox_h"]],
            "score": r["score"],
            "embedding": json.loads(r["embedding_json"])
        })
    return results

def delete_photo(photo_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM face_embeddings WHERE photo_id = ?", (photo_id,))
    cursor.execute("DELETE FROM photos WHERE id = ?", (photo_id,))
    conn.commit()
    conn.close()

def delete_event(slug: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM face_embeddings WHERE event_slug = ?", (slug,))
    cursor.execute("DELETE FROM photos WHERE event_slug = ?", (slug,))
    cursor.execute("DELETE FROM events WHERE slug = ?", (slug,))
    conn.commit()
    conn.close()

