# 에셋 가이드 (ASSET_GUIDE)

모든 그래픽은 Gemini 이미지 생성(`gemini-2.5-flash-image`)으로 제작 후
크로마키·트림 후처리한 것입니다. 원본 홍보 영상(intro.mp4)의 캐릭터/제품과
일관성을 유지하도록 레퍼런스 이미지를 첨부해 생성했습니다.

## game/assets/sprites/ 목록

### 캐릭터
| 파일 | 용도 |
|---|---|
| shiba_1~4.png | 시바견+바이크: 글라이드/전진/킥A/킥B (밸런스바이크라 발차기 주행) |
| shiba_slide.png | 슬라이드(수그리기) 포즈 |
| tiger_1~4.png | 호랑이 질주 4프레임 |
| face_shiba.png / face_tiger.png | 컷인·카툰 이벤트용 얼굴 (약올리기/분노) |

### 장애물
| 파일 | 용도 |
|---|---|
| obs_1~3.png | 바위 / 통나무 / 가시식물 |
| obs_4.png | 뼈다귀(수집품) |
| obs_branch.png | 낮은 나뭇가지(슬라이드 전용) — **마젠타 키잉** |
| toucan_1~2.png | 투칸 날갯짓 2프레임 |
| snake_1~2.png | 뱀 머리 하강/상승 — **마젠타 키잉** |
| monkey.png | 코코넛 던지는 원숭이 — **마젠타 키잉** |
| obsA_1~4.png | 게 / 선인장 / 개구리 / 고슴도치 — **마젠타 키잉** |
| obsB_1~4.png | 허수아비 / 러버콘 / 쓰레기통 / 등불(진자용) |
| pow_1~4.png | 파워업: 안전모 / 자석 / 부스터 / 황금뼈 |

### 배경 (10 스테이지) & 지면
| 파일 | 스테이지 |
|---|---|
| bg_jungle.jpg | 1 아침 정글 (스타일 기준 원본) |
| bg_river.jpg | 2 폭포 강가 |
| bg_beach.jpg | 3 반짝 해변 |
| bg_bamboo.jpg | 4 대나무 숲 |
| bg_village.jpg | 5 시골 마을(한옥) |
| bg_sunset.jpg | 6 노을 들판 |
| bg_night.jpg | 7 반딧불 숲 |
| bg_canyon.jpg | 8 붉은 협곡 |
| bg_city.jpg | 9 도시 거리 |
| bg_kinder.jpg | 10 유치원 길(벚꽃) |
| ground.png | 지면 타일(교차 미러링 무한 반복) |
| gameover.jpg | 게임오버 배경 일러스트 |

규격: 스프라이트는 투명 PNG(트림+4px 패딩), 배경은 1200px JPG(q82).
게임은 이미지 원본 비율에서 크기를 계산하므로 교체 시 비율만 비슷하면 됨.

## 재생성 파이프라인 (tools/)

```bash
export GEMINI_API_KEY=<발급 키>          # 키는 절대 코드에 하드코딩 금지
# 1) 생성: node gen.js <출력.png> <종횡비> <프롬프트파일> [레퍼런스 이미지...]
node tools/gen.js out.png 1:1 tools/prompts/shiba_slide.txt game/assets/sprites/shiba_1.png
# 2) 후처리: 크로마키 → 트림 → (시트면 분할) → 리사이즈
KEY_COLOR=green   node tools/process.js key   out.png result.png 360
KEY_COLOR=magenta node tools/process.js slice out.png prefix_ 2 2 220
```
- `tools/prompts/*.txt` 에 전체 프롬프트 보존 — 동일 스타일 재생성의 기준.
- 후처리는 `sharp` 필요: `cd tools && npm i sharp`.

## ⚠️ 제작 노하우 (실패 사례에서 얻은 규칙)

1. **초록색이 포함된 오브젝트는 반드시 마젠타(#FF00FF) 배경으로 생성**
   — 초록 배경이면 잎/피부가 함께 키잉되어 하얗게 뚫림(나뭇가지에서 실제 발생).
2. **배경 생성 시 스타일 레퍼런스를 붙이면 구도까지 복제될 수 있음**
   — 대나무숲이 정글 복제본으로 나온 사례. 차별화가 필요하면 레퍼런스 없이
   텍스트만으로 생성.
3. 캐릭터 일관성: 신규 포즈는 기존 스프라이트(shiba_1 등)를 레퍼런스로 첨부하고
   프롬프트에 "EXACTLY the same character as the attached reference" 명시.
4. 시트 생성(2x2/1x2)이 개별 생성보다 스타일 통일과 비용에 유리.
5. 헤드밴드 한글("등원은 재밌쟁")은 생성마다 글자가 뭉개질 수 있음 — 작게 보이는
   용도로만 사용하고 클로즈업 에셋은 결과 검수 필수.

## reference/ 폴더
원본 홍보 영상에서 추출한 프레임(캐릭터/바이크/호랑이 레퍼런스).
신규 에셋 생성 시 스타일 기준으로 사용. (워터마크가 있어 게임에 직접 사용 금지)
