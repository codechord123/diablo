# 20분 맨몸 카운터 (Spider20)

철봉 · 팔굽혀펴기 · 스쿼트를 20분 동안 세트(5·10·15)로 세고, 톰 홀랜드 기록(20분 28세트)을 100%로 한
**스파이더맨 지수**와 **랭킹**으로 친구들과 겨루는 단일 페이지 웹앱.

- 호스팅: **Vercel** (정적 파일, 빌드 없음) — 이 `spiderman` 브랜치의 루트를 그대로 배포
- 데이터: **Firebase** (to-do-cal-6e835) — Auth(Google 로그인) / Firestore(기록 · 랭킹)
- 홈 화면에 추가하면 앱처럼 실행 (PWA manifest)

## 파일

| 파일 | 내용 |
|---|---|
| `index.html` | 앱 전체 (HTML/CSS/JS 한 파일) |
| `bgm.mp3`, `bgm2.mp3`, `bgm3.mp3` | 배경음악 플레이리스트 |
| `manifest.webmanifest`, `icons/` | 홈 화면 앱 설정과 아이콘 |
| `firestore.rules` | Firestore 보안 규칙 전문 (콘솔에 붙여 넣기) |
| `vercel.json` | 캐시 헤더 |

## Vercel 설정

- Project → Settings → **Git → Production Branch: `spiderman`**
- Settings → Build and Deployment → **Root Directory: 비움(`./`)**, Framework Preset `Other`, Build Command 비움

## Firebase 설정

1. Authentication → 로그인 방법: `Google`
2. Authentication → 설정 → 승인된 도메인: Vercel 도메인 추가
3. Firestore → 규칙: `firestore.rules` 내용 게시 (`[to-do-cal]` 자리에 기존 앱 규칙 유지)

## Firestore 구조

```
users/{uid}/workouts/{id}   date, pull, push, squat, rounds[], seconds        (본인만)
board/{uid}                 spiders, bestPct, sessions, reps, tomSets, nick, stats, week, updatedAt   (로그인한 누구나 읽기)
```

스파이더맨 지수 = 세 종목 중 가장 낮은 비율 (철봉 ÷ 140, 팔굽혀펴기 ÷ 280, 스쿼트 ÷ 420).
100%를 한 번 찍을 때마다 1 스파이더맨.
