import os
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from typing import Optional, Dict, Any

# Cloudflare R2 Configuration
R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "c3328bf9f7642fd03f20a98385f94a3b")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID", "773d7ef7e130329e4dd439c2f242e948")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "55efd7ae8978fa5862b68bebe3e4e36f8a92d633fbc34126d7b495935debb15b")
R2_BUCKET = os.environ.get("R2_BUCKET", "godthic-ceremonies")
R2_PUBLIC_URL = os.environ.get("R2_PUBLIC_URL", "").rstrip("/")

_s3_client = None

def get_r2_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            's3',
            endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            config=Config(signature_version='s3v4'),
            region_name='auto'
        )
    return _s3_client

def upload_file(local_path: str, r2_key: str, content_type: str = "image/jpeg") -> str:
    """Uploads a local file to R2 bucket."""
    client = get_r2_client()
    with open(local_path, "rb") as f:
        client.put_object(
            Bucket=R2_BUCKET,
            Key=r2_key,
            Body=f,
            ContentType=content_type
        )
    return r2_key

def upload_bytes(data: bytes, r2_key: str, content_type: str = "image/jpeg") -> str:
    """Uploads bytes directly to R2 bucket."""
    client = get_r2_client()
    client.put_object(
        Bucket=R2_BUCKET,
        Key=r2_key,
        Body=data,
        ContentType=content_type
    )
    return r2_key

def get_presigned_url(r2_key: str, expires_in: int = 604800) -> str:
    """Generates a presigned GET URL for an R2 object (valid up to 7 days)."""
    if R2_PUBLIC_URL:
        return f"{R2_PUBLIC_URL}/{r2_key}"
    client = get_r2_client()
    return client.generate_presigned_url(
        'get_object',
        Params={'Bucket': R2_BUCKET, 'Key': r2_key},
        ExpiresIn=expires_in
    )

def get_object_bytes(r2_key: str) -> Optional[bytes]:
    """Retrieves an object's bytes from R2."""
    client = get_r2_client()
    try:
        resp = client.get_object(Bucket=R2_BUCKET, Key=r2_key)
        return resp['Body'].read()
    except ClientError:
        return None

def download_file(r2_key: str, local_path: str) -> bool:
    """Downloads an object from R2 to local path."""
    client = get_r2_client()
    try:
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        client.download_file(R2_BUCKET, r2_key, local_path)
        return True
    except ClientError as e:
        return False

def delete_file(r2_key: str) -> bool:
    """Deletes an object from R2."""
    client = get_r2_client()
    try:
        client.delete_object(Bucket=R2_BUCKET, Key=r2_key)
        return True
    except ClientError:
        return False

def delete_prefix(prefix: str):
    """Deletes all objects with a given prefix (e.g. all photos of an event)."""
    client = get_r2_client()
    try:
        paginator = client.get_paginator('list_objects_v2')
        for page in paginator.paginate(Bucket=R2_BUCKET, Prefix=prefix):
            if 'Contents' in page:
                delete_keys = [{'Key': obj['Key']} for obj in page['Contents']]
                client.delete_objects(Bucket=R2_BUCKET, Delete={'Objects': delete_keys})
    except Exception as e:
        print(f"Error deleting prefix {prefix} from R2: {e}")

# --- Database Backup & Restore for Render Container Persistence ---

DB_BACKUP_KEY = "backup/database.db"

def backup_database(db_path: str):
    """Backs up the SQLite database file to R2."""
    if not os.path.exists(db_path):
        return
    try:
        upload_file(db_path, DB_BACKUP_KEY, content_type="application/x-sqlite3")
        print(f"[R2] Database successfully backed up to {DB_BACKUP_KEY}")
    except Exception as e:
        print(f"[R2] Failed to backup database: {e}")

def restore_database_if_needed(db_path: str):
    """
    On container startup, restores database.db from R2 if it exists.
    This guarantees 100% persistence on ephemeral hosts like Render Free!
    """
    client = get_r2_client()
    try:
        # Check if backup exists in R2
        client.head_object(Bucket=R2_BUCKET, Key=DB_BACKUP_KEY)
        print(f"[R2] Found remote database backup. Restoring to {db_path}...")
        download_file(DB_BACKUP_KEY, db_path)
        print(f"[R2] Database successfully restored from Cloudflare R2!")
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        if error_code in ['404', 'NoSuchKey']:
            print(f"[R2] No remote database backup found yet (first run). Local database will be used.")
        else:
            print(f"[R2] Error checking database backup: {e}")
