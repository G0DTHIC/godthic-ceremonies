import os
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple
from models_loader import ensure_models

class FaceEngine:
    def __init__(self, score_threshold: float = 0.6, nms_threshold: float = 0.3):
        self.yunet_path, self.sface_path = ensure_models()
        self.score_threshold = score_threshold
        self.nms_threshold = nms_threshold
        self.recognizer = cv2.FaceRecognizerSF.create(self.sface_path, "")

    def _get_detector(self, width: int, height: int):
        return cv2.FaceDetectorYN.create(
            self.yunet_path,
            "",
            (width, height),
            score_threshold=self.score_threshold,
            nms_threshold=self.nms_threshold,
            top_k=5000
        )

    def process_image(self, image_path: str, max_detect_dim: int = 1600) -> List[Dict[str, Any]]:
        """
        Detects all faces in an image and extracts a 128-dimensional embedding for each.
        Returns a list of dicts:
        [
            {
                "bbox": [x, y, w, h],
                "score": float,
                "landmarks": [[x, y], ...],
                "embedding": [float, ...] # 128-dim list
            },
            ...
        ]
        """
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image at {image_path}")

        h, w = img.shape[:2]
        
        # Scale down for face detection if image is huge (e.g. 24-48 MP RAW/JPG)
        scale = 1.0
        if max(h, w) > max_detect_dim:
            scale = max_detect_dim / max(h, w)
            detect_w = int(w * scale)
            detect_h = int(h * scale)
            detect_img = cv2.resize(img, (detect_w, detect_h), interpolation=cv2.INTER_AREA)
        else:
            detect_img = img
            detect_w, detect_h = w, h

        detector = self._get_detector(detect_w, detect_h)
        _, faces = detector.detect(detect_img)

        results = []
        if faces is not None:
            for face in faces:
                # face contains: x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rc, y_rc, x_lc, y_lc, score
                # If image was scaled, map coordinates back to full image
                face_orig = face.copy()
                if scale != 1.0:
                    face_orig[0:14] /= scale

                # Align and crop face from original image
                aligned_face = self.recognizer.alignCrop(img, face_orig)
                # Extract 128-D feature vector
                feature = self.recognizer.feature(aligned_face)
                # Feature is shape (1, 128), L2 normalized
                embedding = feature.flatten().tolist()

                bbox = [int(face_orig[0]), int(face_orig[1]), int(face_orig[2]), int(face_orig[3])]
                score = float(face_orig[14])

                results.append({
                    "bbox": bbox,
                    "score": round(score, 4),
                    "embedding": embedding
                })

        return results

    def extract_single_face_embedding(self, image_bytes: bytes) -> Tuple[bool, Any, str]:
        """
        Processes a selfie (from bytes) and extracts the prominent face embedding.
        Returns: (success, embedding_or_None, message)
        """
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return False, None, "Format d'image non reconnu ou corrompu."

        h, w = img.shape[:2]
        # For selfies, max dim 1024 is plenty
        scale = 1.0
        if max(h, w) > 1024:
            scale = 1024 / max(h, w)
            detect_w = int(w * scale)
            detect_h = int(h * scale)
            detect_img = cv2.resize(img, (detect_w, detect_h), interpolation=cv2.INTER_AREA)
        else:
            detect_img = img
            detect_w, detect_h = w, h

        detector = self._get_detector(detect_w, detect_h)
        _, faces = detector.detect(detect_img)

        if faces is None or len(faces) == 0:
            return False, None, "Aucun visage détecté. Assurez-vous d'avoir un visage bien éclairé et de face."

        # Pick the largest face (the selfie taker)
        best_face = max(faces, key=lambda f: f[2] * f[3])
        if scale != 1.0:
            best_face[0:14] /= scale

        aligned_face = self.recognizer.alignCrop(img, best_face)
        feature = self.recognizer.feature(aligned_face)
        embedding = feature.flatten().tolist()

        return True, embedding, "Visage détecté avec succès"

    @staticmethod
    def match_embeddings(
        query_embedding: List[float],
        database_faces: List[Dict[str, Any]],
        threshold: float = 0.38
    ) -> List[Dict[str, Any]]:
        """
        Calculates cosine similarity between the query embedding and each face in database_faces.
        database_faces is a list of dicts:
        [
            {"photo_id": "...", "embedding": [128 floats], ...}
        ]
        Returns matches grouped by photo_id with max similarity score, sorted descending.
        """
        if not database_faces or not query_embedding:
            return []

        q_vec = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm > 0:
            q_vec = q_vec / q_norm

        photo_matches: Dict[str, Dict[str, Any]] = {}

        for item in database_faces:
            photo_id = item["photo_id"]
            db_vec = np.array(item["embedding"], dtype=np.float32)
            db_norm = np.linalg.norm(db_vec)
            if db_norm > 0:
                db_vec = db_vec / db_norm

            # Cosine similarity
            cos_sim = float(np.dot(q_vec, db_vec))

            # SFace cosine similarity match threshold is usually ~0.36 to 0.40
            if cos_sim >= threshold:
                if photo_id not in photo_matches or cos_sim > photo_matches[photo_id]["max_score"]:
                    photo_matches[photo_id] = {
                        "photo_id": photo_id,
                        "max_score": round(cos_sim, 4),
                        "matched_box": item.get("bbox", [])
                    }

        sorted_matches = sorted(photo_matches.values(), key=lambda x: x["max_score"], reverse=True)
        return sorted_matches
