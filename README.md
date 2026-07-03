# 🚲 핀핀 정글 등원 대작전

핀핀(FINFIN) 밸런스바이크 PRO V2 홍보 동영상을 인트로로 사용하는 **모바일 원버튼 러닝 게임** (세로·가로 화면 모두 지원, 플레이 중 회전 가능).
"등원은 재밌쟁" 머리띠를 한 시바견이 페달 없는 핑크 핀핀 밸런스바이크를 타고,
정글 속에서 호랑이에게 쫓기며 유치원까지 달립니다.

## 🎮 지금 플레이

**https://ksukjune-design.github.io/finfin-jungle-runner/**

정적 파일만으로 동작하는 인스턴스형 서비스입니다 (서버·DB 없음, GitHub Pages CDN 배포).
휴대폰 브라우저에서 위 주소로 접속하면 바로 플레이됩니다.

## 로컬 실행 방법

```bash
node tools/server.js
# → http://localhost:8080 접속 (모바일이면 같은 Wi-Fi에서 PC IP:8080)
```

정적 파일만 사용하므로 아무 웹서버에나 올려도 됩니다. (mp4 재생을 위해 Range 요청을 지원하는 서버 권장 — `tools/server.js`는 지원)

## 게임 방법 (모바일 세로 화면 최적화)

| 조작 | 동작 |
|---|---|
| 화면 탭 | 점프 |
| 공중에서 한 번 더 탭 | 2단 점프 |
| (PC) Space / ↑ | 점프 |

- **장애물**(바위·통나무·가시식물)에 부딪히면 속도가 줄고 🐯 호랑이가 가까워집니다.
- **구덩이**에 빠지거나 호랑이에게 따라잡히면 게임 오버.
- **🦴 뼈다귀 간식**을 8개 모을 때마다 호랑이를 따돌립니다.
- 500m마다 "유치원 →" 표지판이 지나가며 속도가 빨라집니다.
- 최고 기록은 기기에 저장됩니다(localStorage).

## 구조

```
index.html / style.css / game.js   ← 게임 본체 (의존성 없는 바닐라 JS + Canvas)
assets/video/intro.mp4             ← 인트로 영상 (원본 홍보 영상)
assets/sprites/                    ← Gemini로 생성한 스프라이트
  shiba_1~4.png   시바견+바이크 (글라이드/킥A/킥B/점프 — 밸런스바이크라 발로 킥)
  tiger_1~4.png   호랑이 질주 사이클 4프레임
  obs_1~3.png     바위/통나무/가시식물 장애물
  obs_4.png       뼈다귀 아이템
  ground.png      정글 흙길 타일 (교차 미러링으로 무한 반복)
  bg_jungle.jpg   패럴랙스 정글 배경
  gameover.jpg    게임오버 일러스트
```

## 에셋 재생성 (Gemini 이미지 생성 파이프라인)

`tools/` 폴더에 생성 파이프라인이 있습니다. 영상 프레임(`assets/ref/`)을
레퍼런스로 넣어 캐릭터 일관성을 유지하고, 크로마키(초록/마젠타) 배경으로 생성 후
투명 PNG로 후처리합니다.

```bash
export GEMINI_API_KEY=<키>
# 생성: node tools/gen.js <출력.png> <종횡비> <프롬프트파일> [레퍼런스이미지...]
node tools/gen.js tools/out/shiba_sheet.png 1:1 tools/prompts/shiba_sheet.txt assets/ref/ref_full_shiba.jpg
# 후처리(크로마키+슬라이스+트림): KEY_COLOR=green|magenta
KEY_COLOR=green node tools/process.js slice tools/out/shiba_sheet.png assets/sprites/shiba_ 2 2 420
```

프롬프트는 `tools/prompts/*.txt` 에 있으며, API 키는 코드에 하드코딩하지 말고
환경변수로만 전달하세요.
