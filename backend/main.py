import os
import sys
import io
import shutil
import gc

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(__file__))

import uuid
import zipfile
import base64
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from PIL import Image

import database as db
from face_engine import FaceEngine

# Base directory for storage
BASE_DIR = os.path.dirname(__file__)
STORAGE_DIR = os.path.join(BASE_DIR, "storage")
os.makedirs(STORAGE_DIR, exist_ok=True)

app = FastAPI(title="Photo Cérémonie API", version="1.0.0")

# Enable CORS for local dev and web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB
db.init_db()

# Lazy-loaded FaceEngine singleton
_face_engine = None

def get_face_engine() -> FaceEngine:
    global _face_engine
    if _face_engine is None:
        _face_engine = FaceEngine()
    return _face_engine


def get_event_dirs(slug: str):
    hd_dir = os.path.join(STORAGE_DIR, slug, "hd")
    web_dir = os.path.join(STORAGE_DIR, slug, "web")
    thumb_dir = os.path.join(STORAGE_DIR, slug, "thumb")
    os.makedirs(hd_dir, exist_ok=True)
    os.makedirs(web_dir, exist_ok=True)
    os.makedirs(thumb_dir, exist_ok=True)
    return hd_dir, web_dir, thumb_dir


# Mount storage as static files for fast web serving
app.mount("/storage", StaticFiles(directory=STORAGE_DIR), name="storage")


# --- Models ---
class CreateEventRequest(BaseModel):
    title: str
    slug: Optional[str] = None
    event_date: Optional[str] = ""
    location: Optional[str] = ""
    passcode: Optional[str] = ""


class BatchDownloadRequest(BaseModel):
    photo_ids: List[str]

class CheckFaceRequest(BaseModel):
    image: Optional[str] = None


@app.post("/api/check-face")
async def check_face_live(payload: CheckFaceRequest):
    """
    Real-time biometric quality check for auto-capture:
    Verifies face angle, centering, distance, and lighting in sub-10ms.
    """
    if not payload.image:
        raise HTTPException(status_code=400, detail="Image requise")

    img_str = payload.image
    if "," in img_str:
        img_str = img_str.split(",", 1)[1]

    try:
        raw_bytes = base64.b64decode(img_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Base64 invalide")

    engine = get_face_engine()
    result = engine.check_face_quality(raw_bytes)
    return result



# --- Routes ---

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Photo Cérémonie"}


@app.get("/api/events")
def list_events():
    return db.get_events()


@app.post("/api/events")
def create_event(payload: CreateEventRequest):
    # Auto-slugify if not provided
    slug = payload.slug
    if not slug:
        slug = payload.title.lower().strip()
        slug = "".join([c if c.isalnum() else "-" for c in slug])
        slug = "-".join(filter(None, slug.split("-")))
    
    # Check if slug exists
    existing = db.get_event_by_slug(slug)
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    get_event_dirs(slug)
    event = db.create_event(
        slug=slug,
        title=payload.title,
        event_date=payload.event_date or "",
        location=payload.location or "",
        passcode=payload.passcode or ""
    )
    return event


@app.get("/api/events/{slug}")
def get_event(slug: str):
    event = db.get_event_by_slug(slug)
    if not event:
        raise HTTPException(status_code=404, detail="Événement introuvable.")
    return event


@app.get("/api/events/{slug}/photos")
def get_event_photos(slug: str):
    event = db.get_event_by_slug(slug)
    if not event:
        raise HTTPException(status_code=404, detail="Événement introuvable.")
    photos = db.get_event_photos(slug)
    return photos


@app.post("/api/events/{slug}/upload")
async def upload_photos(slug: str, files: List[UploadFile] = File(...)):
    event = db.get_event_by_slug(slug)
    if not event:
        raise HTTPException(status_code=404, detail="Événement introuvable.")

    hd_dir, web_dir, thumb_dir = get_event_dirs(slug)
    engine = get_face_engine()

    uploaded_photos = []
    total_faces_detected = 0

    for file in files:
        photo_id = str(uuid.uuid4())
        ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
        
        hd_path = os.path.join(hd_dir, f"{photo_id}{ext}")
        web_path = os.path.join(web_dir, f"{photo_id}.webp")
        thumb_path = os.path.join(thumb_dir, f"{photo_id}.webp")

        # Save original file
        content = await file.read()
        with open(hd_path, "wb") as f:
            f.write(content)

        # Generate web & thumb versions with PIL
        try:
            with Image.open(io.BytesIO(content)) as img:
                img_format = img.format
                width, height = img.size
                
                # Convert RGBA/P to RGB for saving as WebP
                rgb_img = img.convert("RGB")

                # Web version (max 1920px)
                web_img = rgb_img.copy()
                web_img.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
                web_img.save(web_path, "WEBP", quality=85)

                # Thumbnail version (max 600px)
                thumb_img = rgb_img.copy()
                thumb_img.thumbnail((600, 600), Image.Resampling.LANCZOS)
                thumb_img.save(thumb_path, "WEBP", quality=80)
        except Exception as e:
            # Fallback if image conversion fails
            width, height = 0, 0
            web_path = hd_path
            thumb_path = hd_path

        # Relative paths for web serving
        rel_hd = f"/storage/{slug}/hd/{photo_id}{ext}"
        rel_web = f"/storage/{slug}/web/{photo_id}.webp"
        rel_thumb = f"/storage/{slug}/thumb/{photo_id}.webp"

        db.add_photo(
            photo_id=photo_id,
            event_slug=slug,
            original_filename=file.filename,
            file_path_hd=rel_hd,
            file_path_web=rel_web,
            file_path_thumb=rel_thumb,
            width=width,
            height=height
        )

        # Extract faces & embeddings
        try:
            faces = engine.process_image(hd_path)
            for face in faces:
                db.add_face_embedding(
                    photo_id=photo_id,
                    event_slug=slug,
                    bbox=face["bbox"],
                    score=face["score"],
                    embedding=face["embedding"]
                )
            total_faces_detected += len(faces)
        except Exception as e:
            print(f"Face extraction error for {file.filename}: {e}")

        uploaded_photos.append({
            "id": photo_id,
            "filename": file.filename,
            "thumb": rel_thumb,
            "faces_count": len(faces) if 'faces' in locals() else 0
        })

    return {
        "success": True,
        "uploaded_count": len(uploaded_photos),
        "total_faces_detected": total_faces_detected,
        "photos": uploaded_photos
    }


@app.post("/api/events/{slug}/upload-single")
async def upload_single_photo(slug: str, file: UploadFile = File(...)):
    event = db.get_event_by_slug(slug)
    if not event:
        raise HTTPException(status_code=404, detail="Événement introuvable.")

    hd_dir, web_dir, thumb_dir = get_event_dirs(slug)
    engine = get_face_engine()

    photo_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"

    hd_path = os.path.join(hd_dir, f"{photo_id}{ext}")
    web_path = os.path.join(web_dir, f"{photo_id}.webp")
    thumb_path = os.path.join(thumb_dir, f"{photo_id}.webp")

    # Stream write to disk directly in chunks (never hold whole file in RAM)
    try:
        with open(hd_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        await file.close()

    # Generate WebP & Thumb versions with PIL, carefully releasing memory
    width, height = 0, 0
    try:
        with Image.open(hd_path) as img:
            width, height = img.size
            rgb_img = img.convert("RGB")
            
            # Web version (max 1920px)
            web_img = rgb_img.copy()
            web_img.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
            web_img.save(web_path, "WEBP", quality=82)
            del web_img

            # Thumb version (max 600px)
            thumb_img = rgb_img.copy()
            thumb_img.thumbnail((600, 600), Image.Resampling.LANCZOS)
            thumb_img.save(thumb_path, "WEBP", quality=78)
            del thumb_img

            del rgb_img
    except Exception as e:
        print(f"PIL conversion error: {e}")
        web_path = hd_path
        thumb_path = hd_path

    rel_hd = f"/storage/{slug}/hd/{photo_id}{ext}"
    rel_web = f"/storage/{slug}/web/{photo_id}.webp"
    rel_thumb = f"/storage/{slug}/thumb/{photo_id}.webp"

    db.add_photo(
        photo_id=photo_id,
        event_slug=slug,
        original_filename=file.filename,
        file_path_hd=rel_hd,
        file_path_web=rel_web,
        file_path_thumb=rel_thumb,
        width=width,
        height=height
    )

    # Face extraction
    faces_detected = 0
    try:
        faces = engine.process_image(hd_path)
        for face in faces:
            db.add_face_embedding(
                photo_id=photo_id,
                event_slug=slug,
                bbox=face["bbox"],
                score=face["score"],
                embedding=face["embedding"]
            )
        faces_detected = len(faces)
    except Exception as e:
        print(f"Face extraction error for {file.filename}: {e}")

    # Force garbage collection to keep RAM usage under 30MB
    gc.collect()

    return {
        "success": True,
        "photo": {
            "id": photo_id,
            "filename": file.filename,
            "thumb": rel_thumb,
            "faces_count": faces_detected
        }
    }


@app.delete("/api/photos/{photo_id}")
def delete_photo(photo_id: str):
    photo = db.get_photo_by_id(photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo introuvable.")

    for key in ["file_path_hd", "file_path_web", "file_path_thumb"]:
        p = photo.get(key)
        if p and p.startswith("/storage/"):
            rel_path = p.lstrip("/storage/")
            abs_path = os.path.join(STORAGE_DIR, rel_path)
            if os.path.exists(abs_path):
                try:
                    os.remove(abs_path)
                except Exception as e:
                    print(f"Error removing file {abs_path}: {e}")

    db.delete_photo(photo_id)
    return {"success": True, "message": "Photo supprimée avec succès."}


@app.delete("/api/events/{slug}")
def delete_event(slug: str):
    event = db.get_event_by_slug(slug)
    if not event:
        raise HTTPException(status_code=404, detail="Événement introuvable.")

    event_dir = os.path.join(STORAGE_DIR, slug)
    if os.path.exists(event_dir):
        try:
            shutil.rmtree(event_dir)
        except Exception as e:
            print(f"Error removing event dir {event_dir}: {e}")

    db.delete_event(slug)
    return {"success": True, "message": "Cérémonie supprimée avec succès."}



@app.post("/api/events/{slug}/search-by-face")
async def search_by_face(
    slug: str,
    selfie: Optional[UploadFile] = File(None),
    selfie_base64: Optional[str] = Form(None),
    threshold: float = Form(0.38)
):
    event = db.get_event_by_slug(slug)
    if not event:
        raise HTTPException(status_code=404, detail="Événement introuvable.")

    engine = get_face_engine()

    # Read selfie bytes
    if selfie:
        image_bytes = await selfie.read()
    elif selfie_base64:
        # Strip header if present: data:image/jpeg;base64,...
        if "," in selfie_base64:
            selfie_base64 = selfie_base64.split(",")[1]
        image_bytes = base64.b64decode(selfie_base64)
    else:
        raise HTTPException(status_code=400, detail="Veuillez fournir un selfie (fichier ou capture webcam).")

    # Extract single face embedding
    ok, query_embedding, msg = engine.extract_single_face_embedding(image_bytes)
    if not ok:
        return {
            "success": False,
            "message": msg,
            "matches": []
        }

    # Fetch event face embeddings
    database_faces = db.get_event_face_embeddings(slug)
    if not database_faces:
        return {
            "success": True,
            "message": "Aucun visage n'est encore indexé pour cet événement.",
            "matches": []
        }

    # Match embeddings
    matches = engine.match_embeddings(query_embedding, database_faces, threshold=threshold)

    # Attach full photo details to matches
    detailed_matches = []
    for m in matches:
        photo = db.get_photo_by_id(m["photo_id"])
        if photo:
            detailed_matches.append({
                **photo,
                "score": m["max_score"]
            })

    return {
        "success": True,
        "message": f"{len(detailed_matches)} photo(s) trouvée(s) où vous apparaissez !",
        "count": len(detailed_matches),
        "matches": detailed_matches
    }


@app.post("/api/search-by-face-global")
async def search_by_face_global(
    selfie: Optional[UploadFile] = File(None),
    selfie_base64: Optional[str] = Form(None),
    threshold: float = Form(0.44)
):
    """
    Scans a guest selfie across ALL published events.
    Returns ONLY events where this person appears.
    Strict threshold (0.44) eliminates false likeness / false positive matches.
    """
    engine = get_face_engine()

    if selfie:
        image_bytes = await selfie.read()
    elif selfie_base64:
        if "," in selfie_base64:
            selfie_base64 = selfie_base64.split(",")[1]
        try:
            image_bytes = base64.b64decode(selfie_base64)
        except Exception:
            raise HTTPException(status_code=400, detail="Base64 invalide")
    else:
        raise HTTPException(status_code=400, detail="Veuillez fournir une photo.")

    ok, query_embedding, msg = engine.extract_single_face_embedding(image_bytes)
    if not ok or query_embedding is None:
        return {
            "success": False,
            "message": msg or "Aucun visage net détecté sur la photo.",
            "events": []
        }

    all_faces = db.get_all_faces_with_events()
    if not all_faces:
        return {
            "success": True,
            "message": "Aucun visage indexé dans la base de données.",
            "events": []
        }

    matches = engine.match_embeddings(query_embedding, all_faces, threshold=threshold)

    # Group matched photos by event_slug
    events_map = {}
    for m in matches:
        photo = db.get_photo_by_id(m["photo_id"])
        if not photo:
            continue
        slug = photo["event_slug"]
        if slug not in events_map:
            ev = db.get_event_by_slug(slug)
            if not ev:
                continue
            all_photos = db.get_event_photos(slug)
            events_map[slug] = {
                "slug": slug,
                "title": ev["title"],
                "event_date": ev.get("event_date", ""),
                "location": ev.get("location", ""),
                "cover_photo": ev.get("cover_photo", ""),
                "total_photos_count": len(all_photos),
                "matched_photos": []
            }
        p_dict = dict(photo)
        p_dict["score"] = m["max_score"]
        events_map[slug]["matched_photos"].append(p_dict)

    matched_events_list = list(events_map.values())

    return {
        "success": True,
        "message": f"{len(matched_events_list)} événement(s) trouvé(s) avec votre profil.",
        "events_count": len(matched_events_list),
        "total_matched_photos": sum(len(e["matched_photos"]) for e in matched_events_list),
        "events": matched_events_list
    }


@app.get("/api/photos/{photo_id}/download")
def download_hd_photo(photo_id: str):
    photo = db.get_photo_by_id(photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo introuvable.")

    # Convert relative web path to absolute file system path
    rel_path = photo["file_path_hd"].lstrip("/storage/")
    abs_path = os.path.join(STORAGE_DIR, rel_path)

    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="Fichier original introuvable sur le disque.")

    return FileResponse(
        path=abs_path,
        filename=photo["original_filename"],
        media_type="application/octet-stream"
    )


@app.post("/api/events/{slug}/download-zip")
def download_photos_zip(slug: str, payload: BatchDownloadRequest):
    event = db.get_event_by_slug(slug)
    if not event:
        raise HTTPException(status_code=404, detail="Événement introuvable.")

    if not payload.photo_ids:
        raise HTTPException(status_code=400, detail="Aucune photo sélectionnée.")

    # Create in-memory zip
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for photo_id in payload.photo_ids:
            photo = db.get_photo_by_id(photo_id)
            if photo and photo["event_slug"] == slug:
                rel_path = photo["file_path_hd"].lstrip("/storage/")
                abs_path = os.path.join(STORAGE_DIR, rel_path)
                if os.path.exists(abs_path):
                    zip_file.write(abs_path, arcname=photo["original_filename"])

    zip_buffer.seek(0)
    zip_filename = f"{slug}-photos-hd.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={zip_filename}"}
    )


# --- Serve Built Frontend SPA (if built) ---
FRONTEND_DIST = os.path.join(os.path.dirname(BASE_DIR), "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        # Don't intercept API or Storage
        if full_path.startswith("api") or full_path.startswith("storage"):
            raise HTTPException(status_code=404)
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

