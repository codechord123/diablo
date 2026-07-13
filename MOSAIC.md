# 사진 모자이크 프로그램 (mosaic.py)

사진에 모자이크(픽셀화) 또는 블러를 적용하는 파이썬 CLI 도구입니다.

## 설치

```bash
pip install -r requirements.txt
```

## 사용법

```bash
# 얼굴을 자동으로 찾아 모자이크 (기본 동작)
python mosaic.py photo.jpg

# 결과 파일 이름 지정 (기본은 photo_mosaic.jpg 처럼 자동 생성)
python mosaic.py photo.jpg -o result.jpg

# 특정 영역만 모자이크 (x y 너비 높이)
python mosaic.py photo.jpg --rect 100 50 200 200

# 여러 영역을 한 번에 모자이크
python mosaic.py photo.jpg --rect 100 50 200 200 --rect 400 300 150 150

# 사진 전체 모자이크
python mosaic.py photo.jpg --full

# 모자이크 강도 조절 (숫자가 클수록 픽셀이 굵어짐, 기본 15)
python mosaic.py photo.jpg --strength 30

# 픽셀화 대신 블러 처리
python mosaic.py photo.jpg --blur
```

## 옵션 정리

| 옵션 | 설명 |
|------|------|
| `-o, --output` | 출력 파일 경로 (기본: `입력이름_mosaic.확장자`) |
| `--rect X Y W H` | 지정한 영역만 모자이크. 여러 번 사용 가능 |
| `--full` | 사진 전체를 모자이크 |
| `--strength N` | 모자이크 강도 (기본 15) |
| `--blur` | 픽셀화 대신 가우시안 블러 적용 |
| `--margin N` | 얼굴 감지 시 영역을 확장하는 비율 (기본 0.1 = 10%) |

## 얼굴 감지 방식

- OpenCV 4.x: 내장 Haar cascade 사용
- OpenCV 5.x: YuNet 딥러닝 모델 사용 (`models/face_detection_yunet_2023mar.onnx` 포함,
  없으면 첫 실행 시 자동 다운로드)

얼굴을 찾지 못하면 종료 코드 2와 함께 안내 메시지를 출력하니,
그 경우 `--rect`나 `--full` 옵션을 사용하세요.
