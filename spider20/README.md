# Spider20 — 20분 맨몸 카운터

철봉 · 팔굽혀펴기 · 스쿼트를 세트(5·10·15)로 세고, 톰 홀랜드 기록(20분 28세트)을 100%로 한
**스파이더맨 지수**와 **스파이더맨 랭킹**으로 친구들과 겨루는 단일 페이지 앱.

- 호스팅: **Vercel** (정적 파일, 빌드 없음)
- 데이터: **Firebase** — Auth(Google 로그인 필수) / Firestore(기록 · 랭킹)
- 로그인 전에는 로그인 화면만 보입니다. 카카오톡 등 인앱 브라우저는 Google이 로그인을 막으므로 Chrome/Safari로 열어야 합니다.

## 파일

| 위치 | 내용 |
|---|---|
| `public/spider20/index.html` | 앱 전체 (HTML/CSS/JS 한 파일) |
| `public/spider20/bgm*.mp3` | 타이머가 도는 동안 차례로 반복 재생되는 배경음악 3곡 |
| `spider20/firestore.rules` | Firestore 보안 규칙 전문 |

## 배포

디아블로와 같은 Vercel 프로젝트가 `public/`을 배포하므로, 푸시하면 **`<디아블로 주소>/spider20/`** 에 바로 올라갑니다.
따로 Vercel 프로젝트를 만들 필요가 없습니다.

## Firebase 설정 (to-do-cal-6e835 콘솔에서 1회)

1. **Authentication → 로그인 방법**: `Google` 사용 설정
2. **Authentication → 설정 → 승인된 도메인**: Vercel 도메인 추가 (예: `diablo-xxx.vercel.app`)
3. **Firestore → 규칙**: `spider20/firestore.rules` 내용으로 교체하되, `[to-do-cal]` 자리에 기존 규칙의 match 블록을 옮겨 넣고 게시

## Firestore 구조

```
users/{uid}/workouts/{id}   date, pull, push, squat, rounds[], seconds   (본인만)
board/{uid}                 spiders, bestPct, sessions, reps, tomSets, nick, updatedAt   (모두 읽기)
```

스파이더맨 1회 = 한 번의 운동에서 철봉 140 · 팔굽혀펴기 280 · 스쿼트 420회 이상 (지수 100%).
