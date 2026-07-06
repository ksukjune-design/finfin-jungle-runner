# 게임 사양서 (GAME_SPEC)

핀핀 정글 등원 대작전 — 시바견이 FINFIN 밸런스바이크로 호랑이를 피해
10,000m를 달려 유치원에 도착하는 완주형 러닝 게임.
바닐라 JS + Canvas 2D 단일 파일(`game.js`), 외부 라이브러리 0.

## 파일 구조
```
game/
├── index.html   DOM 스크린들(타이틀/HUD/일시정지/부활/이벤트/차고/도전과제/게임오버/엔딩)
├── style.css    UI 스타일 + 가로모드 미디어쿼리
├── game.js      게임 전체 (아래 시스템 전부)
└── assets/
    ├── video/intro.mp4          인트로(원본 홍보 영상)
    └── sprites/                 ASSET_GUIDE.md 참조
```

## 상태 머신 (`ST`)
MENU → INTRO(영상) → COUNT(3-2-1) → RUN ⇄ PAUSE
RUN → CAUGHT(잡힘 연출) → REVIVE(1회 부활 오퍼) → RUN 또는 OVER
RUN → CLEAR(스테이지 폭죽 세리머니) → EVENT(카툰+퍼크 카드) → RUN
RUN → FIN(완주 세리머니) → 엔딩 화면

핵심: **메인 루프 본체는 `frame(dt, skipDraw)`** — rAF 루프와 테스트 훅(`__test.sim`)이
동일 경로를 사용. 새 상태를 추가하면 `frame()`의 update 게이팅에 반드시 등록할 것.
`update(dt)` 첫 줄의 `camTick`, 상태 분기 순서(CLEAR/FIN → REVIVE → CAUGHT → RUN) 유지.

## 좌표/스케일
- `SC` = 화면 스케일 (세로: min(W/420, H/760), 가로: H/560). 모든 게임 수치는 `* SC`.
- `groundY = H * 0.78`. 미터 환산: `42 * SC` px = 1m.
- 회전/리사이즈 시 `rescaleWorld()`가 좌표·속도를 새 스케일로 환산.

## 여정 구조
- `STAGE_LEN = 1000`(m), `TOTAL_M = 10000` — 10 스테이지, 스테이지마다
  배경(`STAGES[i].bg`)·틴트·앰비언트 파티클·장애물 풀(`STAGES[i].set`)·BGM(`MUSIC[i]`)이 다름.
- 스테이지 클리어: 폭죽 페이즈(1.6s) → 퍼크 3장 선택 → 배경 크로스페이드 + 새 BGM.
- 클리어 시 `finfin_stage` 체크포인트 저장 → 타이틀 "이어 등원" 버튼.
- 체크포인트 시작은 자연 속도 보정: `(450 + fromM * 0.8) * SC` (최대 캡) + 250m 웜업 밴드.

## 밸런스 상수 (조정 지점)
| 항목 | 값 | 위치 |
|---|---|---|
| 기본/최대 속도 | 450 / 1045 (*SC) | `resetGame` |
| 가속 램프 | 6.3 *SC/s (+500m마다 +21) | `update` |
| 점프/2단/3단 | -1120 / -980 / -900 (*SC), 중력 2850 | `jumpInput`/`update` |
| 난이도 밴드 | <600 d1, <2200 d2, <4500 d3, <7000 d4, 이후 d5 | `bandFor` |
| 스폰 간격 | speed*(0.48+rand0.40) + 165*SC | `spawnChunk` |
| 피버 게이지 | 뼈 16개(퍼크로 12) | `collect` 로직 |
| 호랑이 | 시작 62, 피격 -26(탱크 -13), 회복 1.5/s | `hitObstacle`/`update` |

## 장애물 (27종) — 스테이지 전용 배치
정적(OBS_DEF, 제네릭 경로): rock, log, plant, cactus, scarecrow, cone, trashcan
커스텀(개별 로직): branch(슬라이드), toucan(급강하), snake(2프레임), boulder(굴림),
bees(사인 상하), mud(감속만), monkey(+coconut 투사체), wisp(지그재그),
crab(옆걸음), frog(폴짝+웅크림 텔레그래프), hedge(빠른 굴림), ball(바운스),
geyser(경고→분출 사이클·스킨3), stomper(그림자 경고 낙하·스킨3), pend(진자 등불),
wall(2단 점프 강제·스킨3), spring(점프 버섯·무해), hole(구덩이=즉사)
- 배치 정의: `CHUNKS[]`(id/d난이도/fn), 스테이지 허용: `STAGES[i].set`
- 히트박스: `obstacleBoxes(o)` — 시각보다 관대하게(공정성)
- 신규 장애물 추가 절차: ① 생성자 ② 이동 로직(update 장애물 루프) ③ `obstacleBoxes`
  ④ draw 분기 ⑤ CHUNKS 항목 ⑥ STAGES.set 배치 ⑦ 봇 분류(slide/jump 목록)

## 로그라이크 요소
- **바이크 5종**(`BIKES`, 도전과제 해금): pink(기본2단), rocket(3단 점프), low(가지·새 자동 통과),
  wing(구덩이 활공), tank(새 튕겨냄+피격 반감·느림). 색상은 `buildTint()`가 스프라이트의
  핑크 프레임 hue만 리매핑(오프스크린 캔버스, 1회).
- **퍼크 9종**(`PERKS`, 스테이지 클리어마다 3장 중 1택, 런 한정): G.perks.* 플래그.

## 연출 시스템
- 카메라: `cam`(속도 비례 와이드, `camPunch` 줌 펀치, cam.y 수직 팔로우) — `applyCam()`이
  월드 렌더에만 적용. 배경은 상단 70SC 오버스캔(에지 노출 방지) 유지할 것.
- 슬로모션: `slowmo(배속, 유지초)` — frame에서 dt 스케일.
- 컷인: `cutIn(이미지키, 문구)` — 피버/부활/완주=시바, 포획=호랑이.
- 히트스톱 `G.hitStop`, 스쿼시&스트레치(p.squash), 고스트 잔상, 스피드라인, 지면 스트릭.
- 호랑이 긴박: HUD 추격 트랙(🐯 아이콘 이동+3단계 색), 심장박동(`G.heartT`),
  발톱 스와이프(`G.swipeT`, 무피해 위협), 릴리프("따돌렸다!!").

## BGM/사운드
- `MUSIC[10]` 칩튠 패턴(스케일/템포/파형) + `BGM` 스케줄러(90ms interval, 16스텝 lookahead).
- 효과음 전부 `sfx.*` WebAudio 합성. `muted`는 `finfin_mute` 저장.

## 테스트 (`?test` 쿼리)
`window.__test`: `go/sim(ms)/warp/from(m)/caught/revive/fever/give(파워업)/chunk(id)/
clearNow/finNow/bike(id)/botRun(반응초)` 등.
- `botRun(0.42)` = 평균 실력 자동 플레이 → `{m, deathBy, hits, byKind, early}` 반환.
  밸런스 기준선: 처음부터 중앙값 1,200~5,000m, 첫 300m 피격 <0.5회.
- 캔버스 캡처: 로컬 서버(`tools/server.js`)의 `POST /__shot?name=x` (개발용).

## 알려진 주의점
- 테스트 모드에서는 visibilitychange 자동 일시정지가 꺼짐(헤드리스 테스트용).
- 스프라이트 재생성 시 초록 계열 오브젝트는 **마젠타 크로마키** 필수(ASSET_GUIDE 참조).
- iOS: 오디오는 첫 제스처에서 `audioInit()`, mp4는 Range 지원 서버 필요.
