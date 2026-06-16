# 분수 던전 (Fraction Dungeon)

초등학교 5학년 **분수의 덧셈과 뺄셈**을 학습하는 디아블로 스타일 RPG 게임.

## 현재 단계: 단일 플레이어 프로토타입 (Phase 1)

- 분수 문제 엔진 (동분모/이분모, 덧셈/뺄셈)
- 몬스터 전투 시스템 (레벨/경험치/HP)
- Firebase 진행도 저장 (익명 인증)

> 멀티플레이(25인 동시) 및 교사 대시보드는 Phase 2에서 추가 예정.

## 폴더 구조

```
diablo/
├── public/                # Firebase Hosting 배포 대상
│   ├── index.html
│   ├── style.css
│   └── js/
│       ├── fractionEngine.js   # 분수 계산/문제 생성 (핵심)
│       ├── monsters.js         # 몬스터 데이터
│       ├── game.js             # 게임 루프/UI
│       └── firebase-config.js  # Firebase 초기화
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
