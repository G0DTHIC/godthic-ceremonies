import os
import urllib.request

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# Official OpenCV Model Zoo URLs
YUNET_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
SFACE_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"

YUNET_PATH = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")
SFACE_PATH = os.path.join(MODELS_DIR, "face_recognition_sface_2021dec.onnx")


def download_file(url: str, dest_path: str):
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    if not os.path.exists(dest_path) or os.path.getsize(dest_path) == 0:
        print(f"Downloading model from {url} to {dest_path}...")
        urllib.request.urlretrieve(url, dest_path)
        print(f"Model saved to {dest_path} ({os.path.getsize(dest_path)} bytes)")


def ensure_models():
    """Ensure that face detection (YuNet) and face recognition (SFace) models are available."""
    os.makedirs(MODELS_DIR, exist_ok=True)
    download_file(YUNET_URL, YUNET_PATH)
    download_file(SFACE_URL, SFACE_PATH)
    return YUNET_PATH, SFACE_PATH


if __name__ == "__main__":
    ensure_models()
