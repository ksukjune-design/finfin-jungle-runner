# 커뮤니티 앱 통합 가이드 (INTEGRATION)

이 게임은 **의존성 없는 순수 정적 파일**(HTML+CSS+JS+에셋)입니다.
`game/` 폴더를 커뮤니티 앱의 정적 리소스 경로 어디에 두어도 동작합니다
(모든 경로가 상대 경로, 서버·DB·빌드 도구 불필요).

## 1. 임베드 방법

### A. iframe (권장)
```html
<iframe src="/minigames/finfin/index.html"
        style="border:0;width:100%;height:100%"
        allow="autoplay; vibration"></iframe>
```
- 게임 이벤트가 `window.parent.postMessage(payload, '*')` 로 전달됩니다.
- **운영 시 origin 검증 필수**: 수신 측에서 `event.origin` 확인 후 처리하세요.

### B. 직접 임베드 (같은 문서)
게임 div를 페이지에 직접 넣는 경우 `window.addEventListener('finfin:이벤트명', ...)` 으로 구독합니다.

## 2. 게임 이벤트 브리지

`game.js`의 `Bridge` 객체가 아래 이벤트를 발행합니다.
발행 채널 3종(모두 동일 payload): ① `CustomEvent('finfin:<type>')` ② `parent.postMessage`
③ `window.FinFinGameCallback(payload)` 콜백(정의되어 있으면 호출).

| type | 시점 | payload 주요 필드 |
|---|---|---|
| `start` | 카운트다운 종료·주행 시작 | `from`(시작 m), `stage`, `bike` |
| `stageclear` | 1,000m 스테이지 클리어 | `stage`(1~9), `distance`, `bones` |
| `gameover` | 호랑이에게 잡힘 | `distance`, `bones`, `comboMax`, `fevers`, `stage`, `best`, `isRecord`, `reason`('tiger'\|'hole') |
| `finish` | 10,000m 완주 | `distance`(10000), `bones`, `comboMax`, `fevers`, `best` |
| `achievement` | 도전과제 달성 순간 | `id`, `name` |

공통 필드: `game:'finfin-runner'`, `type`, `ts`(epoch ms).

### 수신 예시 (postMessage)
```js
window.addEventListener('message', (e) => {
  // TODO: e.origin 화이트리스트 검증
  const d = e.data;
  if (!d || d.game !== 'finfin-runner') return;
  if (d.type === 'gameover' || d.type === 'finish') {
    api.submitGameResult({ userId, distance: d.distance, bones: d.bones, finished: d.type === 'finish' });
  }
});
```

## 3. 로그인 연동 포인트

- `window.FinFinGame.config.user` 에 유저 컨텍스트를 주입할 수 있습니다(게임은 현재 이 값을 읽지 않음 — 후속 개발용 슬롯).
- `window.FinFinGame.getState()` → `{state, distance, stage, bones, best}` 현재 상태 폴링.
- 게임 진행 저장(localStorage) 키를 유저별로 분리하려면 `game.js` 상단 `store` 객체의
  키 접두어에 유저 id를 붙이는 방식을 권장.

### localStorage 키 목록 (모두 이 게임 전용)
| 키 | 내용 |
|---|---|
| `finfin_best` | 최고 거리(m, number) |
| `finfin_stage` | 도달한 최고 스테이지 인덱스(체크포인트, 0~9) |
| `finfin_ach` | 도전과제 상태 `{id: true}` |
| `finfin_tot` | 누적 통계 `{runs, bones, slides}` |
| `finfin_bike` | 선택한 바이크 id |
| `finfin_mute` | 음소거 여부 |

## 4. 보상 연동 주의

- 결과값은 **클라이언트 산출**입니다. 고가치 보상이라면 서버에서
  상한선 검증(예: distance ≤ 10000, 물리적으로 불가능한 시간 대비 거리 필터)을 두세요.
- `?test` 쿼리로 열면 개발용 치트 훅(`window.__test`)이 활성화됩니다.
  **운영 빌드에서 해당 블록 제거를 권장** — `game.js`에서
  `location.search.indexOf('test')` 블록(파일 하단)을 삭제하면 됩니다.

## 5. FINFIN 브랜드 하이라이팅 포인트 (예정 작업용 지도)

현재 브랜드 노출 위치와, 광고 하이라이팅으로 확장하기 좋은 코드 지점:

| 위치 | 파일/함수 | 비고 |
|---|---|---|
| 바이크 프레임 "FINFIN" 로고 | 스프라이트 자체(`assets/sprites/shiba_*.png`) | 색상 리매핑은 `buildTint()` — 로고 영역 하이라이트 효과 추가 가능 |
| 타이틀 배지 "FINFIN 밸런스바이크 PRO V2" | `index.html` `.badge` | 링크/버튼화 가능 |
| 중간 표지판("유치원 →") | `game.js` `drawSigns()` | **광고판으로 교체 최적** — 텍스트/이미지를 브랜드 배너로 바꾸면 500m마다 노출 |
| 파워업 아이콘 | `drawPows()` | 헬멧(⛑️=안전 메시지)에 브랜드 컬러/로고 적용 여지 |
| 스테이지 클리어 카드 | `startEvent()`의 `#clearHead` | 스폰서 문구 삽입 지점 |
| 엔딩 화면 | `index.html` `#ending` | 구매 링크 CTA 최적 위치 |

## 6. 사운드/BGM

모든 효과음·BGM은 **WebAudio 실시간 합성**(외부 음원 0개, 저작권 프리).
교체 시 `sfx` 객체와 `MUSIC`/`BGM` 스케줄러를 참고. 모바일 autoplay 정책상
첫 사용자 제스처(시작 버튼)에서 `audioInit()`이 호출되는 구조를 유지하세요.

## 7. 화면/입력

- 세로·가로 모두 지원, 회전 시 `rescaleWorld()`가 진행 중 월드를 재계산.
- 입력: 화면 좌측 38% 홀드=슬라이드, 우측 탭=점프. `pointerdown` 기반 — 임베드 컨테이너에서
  `touch-action: none` 유지 필요 (스크롤 제스처 충돌 방지).
