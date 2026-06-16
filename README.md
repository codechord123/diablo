# 분수 던전 (Fraction Dungeon)

초등학교 5학년 **분수의 덧셈과 뺄셈**을 학습하는 디아블로 스타일 RPG 게임.

## 현재 단계: Phase 1.5 — Phaser RPG 단일 플레이어

| 모드 | URL | 설명 |
|------|-----|------|
| **RPG** (메인) | `/` (index.html) | 디아블로식 던전 탐험, 클릭 이동, 절차적 맵 |
| Classic | `/classic.html` | DOM 기반 정적 카드 전투 (초기 프로토타입) |

**공통 기능:**
- 분수 문제 엔진 (동분모/이분모, 덧셈/뺄셈, 레벨 자동 적응)
- 진짜 분수 모양 표시 (분자/분모 위아래로 — CSS 컴포넌트)
- Firebase 진행도 저장 (익명 인증, LocalStorage 폴백)

**RPG 모드 추가 기능:**
- Phaser 3 기반 절차적 던전 (방 + 복도 자동 생성)
- A* 길찾기 클릭 이동
- 횃불 조명 + 비네팅 (디아블로 분위기)
- 몬스터 조우 시 분수 전투 모달
- 외부 에셋 0개 — 모든 스프라이트 절차 생성

> 멀티플레이(25인 동시) 및 교사 대시보드는 Phase 2에서 추가 예정.

## 폴더 구조

```
diablo/
├── public/
│   ├── index.html              # RPG 모드 (메인)
│   ├── classic.html            # Classic 모드
│   ├── css/
│   │   ├── fraction.css        # 진짜 분수 모양 (공용)
│   │   ├── classic.css
│   │   └── rpg.css
│   └── js/
│       ├── fractionEngine.js   # 분수 엔진 (공용)
│       ├── monsters.js         # 몬스터 데이터 (공용)
│       ├── firebase-config.js  # Firebase 초기화 (공용)
│       ├── game-classic.js     # Classic 모드 로직
│       └── rpg/
│           ├── main.js         # Phaser 부트스트랩
│           ├── dungeon.js      # 절차적 던전 생성
│           ├── pathfinding.js  # A* 길찾기
│           └── scenes/
│               ├── BootScene.js     # 절차적 텍스처 생성
│               ├── DungeonScene.js  # 맵 탐험
│               └── BattleScene.js   # 분수 전투
├── firebase.json
└── README.md
```

## 로컬 실행

```bash
# 정적 서버 아무거나 OK
npx serve public
# 또는
python3 -m http.server 8080 --directory public
```

## Firebase 배포

1. `public/js/firebase-config.js` 의 `firebaseConfig` 값을 본인 프로젝트 값으로 교체
2. `npm i -g firebase-tools && firebase login`
3. `firebase init hosting` (public 디렉토리 선택)
4. `firebase deploy`

## 학습 곡선

| 레벨 | 학습 내용 |
|------|-----------|
| 1–5  | 동분모 분수 덧셈 |
| 6–10 | 동분모 분수 뺄셈 |
| 11–15| 이분모 분수 덧셈 (통분) |
| 16–20| 이분모 분수 뺄셈 |
| 21+  | 대분수/가분수 변환 포함 |
