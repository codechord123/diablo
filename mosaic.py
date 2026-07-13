#!/usr/bin/env python3
"""사진 모자이크(픽셀화) 프로그램.

사용 예:
  # 얼굴을 자동으로 찾아 모자이크 (기본 동작)
  python mosaic.py photo.jpg

  # 결과 파일 이름 지정
  python mosaic.py photo.jpg -o result.jpg

  # 특정 영역만 모자이크 (x y 너비 높이)
  python mosaic.py photo.jpg --rect 100 50 200 200

  # 여러 영역 모자이크
  python mosaic.py photo.jpg --rect 100 50 200 200 --rect 400 300 150 150

  # 사진 전체 모자이크
  python mosaic.py photo.jpg --full

  # 모자이크 강도 조절 (숫자가 클수록 굵은 픽셀, 기본 15)
  python mosaic.py photo.jpg --strength 30

  # 모자이크 대신 블러 처리
  python mosaic.py photo.jpg --blur
"""

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np


def pixelate(region: np.ndarray, strength: int) -> np.ndarray:
    """영역을 작게 줄였다가 다시 키워서 픽셀화한다."""
    h, w = region.shape[:2]
    # strength가 클수록 더 작게 줄여서 픽셀이 굵어진다
    small_w = max(1, w // strength)
    small_h = max(1, h // strength)
    small = cv2.resize(region, (small_w, small_h), interpolation=cv2.INTER_LINEAR)
    return cv2.resize(small, (w, h), interpolation=cv2.INTER_NEAREST)


def blur(region: np.ndarray, strength: int) -> np.ndarray:
    """영역을 가우시안 블러 처리한다."""
    k = max(3, (strength // 2) * 2 + 1)  # 홀수 커널 크기
    return cv2.GaussianBlur(region, (k, k), 0)


def apply_to_rect(image: np.ndarray, x: int, y: int, w: int, h: int,
                  strength: int, use_blur: bool) -> None:
    """이미지의 (x, y, w, h) 영역에 모자이크/블러를 적용한다 (in-place)."""
    ih, iw = image.shape[:2]
    x, y = max(0, x), max(0, y)
    w, h = min(w, iw - x), min(h, ih - y)
    if w <= 0 or h <= 0:
        return
    region = image[y:y + h, x:x + w]
    image[y:y + h, x:x + w] = blur(region, strength) if use_blur else pixelate(region, strength)


YUNET_MODEL = Path(__file__).parent / "models" / "face_detection_yunet_2023mar.onnx"
YUNET_URL = ("https://media.githubusercontent.com/media/opencv/opencv_zoo/main/"
             "models/face_detection_yunet/face_detection_yunet_2023mar.onnx")


def _yunet_model_path() -> Path:
    """YuNet 모델 파일 경로를 반환한다. 없으면 다운로드한다."""
    if YUNET_MODEL.exists():
        return YUNET_MODEL
    cache = Path.home() / ".cache" / "mosaic" / YUNET_MODEL.name
    if not cache.exists():
        print(f"얼굴 감지 모델을 내려받는 중... ({YUNET_URL})")
        cache.parent.mkdir(parents=True, exist_ok=True)
        import urllib.request
        urllib.request.urlretrieve(YUNET_URL, cache)
    return cache


def detect_faces(image: np.ndarray) -> list[tuple[int, int, int, int]]:
    """얼굴을 찾아 (x, y, w, h) 목록을 반환한다.

    OpenCV 4에서는 Haar cascade, OpenCV 5에서는 YuNet(FaceDetectorYN)을 사용한다.
    """
    if hasattr(cv2, "CascadeClassifier"):
        cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
        cascade = cv2.CascadeClassifier(str(cascade_path))
        if not cascade.empty():
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5,
                                             minSize=(30, 30))
            return [tuple(int(v) for v in f) for f in faces]

    h, w = image.shape[:2]
    detector = cv2.FaceDetectorYN_create(str(_yunet_model_path()), "", (w, h),
                                         score_threshold=0.6)
    _, faces = detector.detect(image)
    if faces is None:
        return []
    return [tuple(int(v) for v in f[:4]) for f in faces]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="사진에 모자이크(픽셀화)를 적용합니다. 기본은 얼굴 자동 감지 모드입니다.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("사용 예:")[1] if "사용 예:" in __doc__ else None,
    )
    parser.add_argument("input", help="입력 이미지 파일 경로")
    parser.add_argument("-o", "--output", help="출력 파일 경로 (기본: 입력이름_mosaic.확장자)")
    parser.add_argument("--rect", nargs=4, type=int, action="append", metavar=("X", "Y", "W", "H"),
                        help="모자이크할 영역 (여러 번 지정 가능)")
    parser.add_argument("--full", action="store_true", help="사진 전체를 모자이크")
    parser.add_argument("--strength", type=int, default=15,
                        help="모자이크 강도. 클수록 픽셀이 굵어짐 (기본: 15)")
    parser.add_argument("--blur", action="store_true", help="픽셀화 대신 블러 처리")
    parser.add_argument("--margin", type=float, default=0.1,
                        help="얼굴 감지 시 영역을 확장할 비율 (기본: 0.1 = 10%%)")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"오류: 파일을 찾을 수 없습니다: {input_path}", file=sys.stderr)
        return 1

    image = cv2.imread(str(input_path))
    if image is None:
        print(f"오류: 이미지를 읽을 수 없습니다 (지원하지 않는 형식일 수 있음): {input_path}",
              file=sys.stderr)
        return 1

    if args.full:
        h, w = image.shape[:2]
        apply_to_rect(image, 0, 0, w, h, args.strength, args.blur)
        print("사진 전체에 모자이크를 적용했습니다.")
    elif args.rect:
        for x, y, w, h in args.rect:
            apply_to_rect(image, x, y, w, h, args.strength, args.blur)
        print(f"{len(args.rect)}개 영역에 모자이크를 적용했습니다.")
    else:
        faces = detect_faces(image)
        if not faces:
            print("얼굴을 찾지 못했습니다. --rect 또는 --full 옵션을 사용해 보세요.",
                  file=sys.stderr)
            return 2
        for x, y, w, h in faces:
            # 얼굴 주변까지 조금 넓게 모자이크
            mx, my = int(w * args.margin), int(h * args.margin)
            apply_to_rect(image, x - mx, y - my, w + 2 * mx, h + 2 * my,
                          args.strength, args.blur)
        print(f"얼굴 {len(faces)}개를 찾아 모자이크를 적용했습니다.")

    if args.output:
        output_path = Path(args.output)
    else:
        output_path = input_path.with_name(f"{input_path.stem}_mosaic{input_path.suffix}")

    if not cv2.imwrite(str(output_path), image):
        print(f"오류: 결과를 저장하지 못했습니다: {output_path}", file=sys.stderr)
        return 1
    print(f"저장 완료: {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
