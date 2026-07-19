# 진화 4 개념 — WebGPU + compute shader: 제대로 다시 풀기

로드맵의 **정점이자 네 최대 차별화 자산**이다([roadmap.md](../roadmap.md)). 파티클의 위치·속도 갱신을 CPU도 vertex shader도 아닌 **compute shader**로 GPU 안에서 병렬 시뮬레이션하고, 수를 수천 → 수백만으로 올린다. [foundations.md](../foundations.md)와 진화 1~3을 다 거친 전제로 간다.

> 하이브리드 문서: **"왜 WebGPU는 이렇게 생겼나 / 네 readback 경험과 어떻게 만나나"** 는 여기서, **WGSL 문법·API 절차**는 [WebGPU Fundamentals](https://webgpufundamentals.org/)에서. 특히 [Compute Shader Basics](https://webgpufundamentals.org/webgpu/lessons/webgpu-compute-shaders.html)는 필독.
>
> 튜터 모드: compute 셰이더도, 핑퐁 배선도, 여기엔 없다. 개념·대비·멘탈모델만.

---

## 큰 그림: 무상태에서 유상태로, readback을 삭제하다

이 진화가 [foundations 축 B](../foundations.md)의 클라이맥스다. 진화 2·3의 움직임은 **무상태**였다 — `u_time`으로 매 프레임 처음부터 재계산. 진화 4는 **유상태**다: 이전 프레임의 속도·위치를 이어받아 힘을 적분하는 **진짜 시뮬레이션**. 파티클끼리 영향을 주고받을 수 있게 된다.

그리고 이 시뮬레이션이 **readback 없이 GPU 안에서 완결**된다 — 여기가 네 홈그라운드다:

> 💡 네 FaceRGB의 비동기 readback 고생이 여기서 보상받는다. GPU→CPU 왕복의 함정을 몸으로 아는 상태에서 WebGPU의 명시적 큐/버퍼 모델을 보면 이해가 폭발한다: *"아, readback을 이렇게 피하는 거였구나."* compute→render를 GPU 안에서 이으면 네가 배치로 줄이던 그 왕복이 **아예 사라진다.**

---

## 1. 명시적 vs 암묵적 — 진화 1의 불편함이 풀리다

[진화 1 §2](../01-webgl2/concept.md)에서 WebGL을 **상태 기계**라 했다 — "지금 바인딩된 버퍼"에 다음 명령이 적용되는, 흩어진 전역 상태. 그 불편함(뭐가 바인딩됐는지 추적하기 어려움)을 기억하나?

WebGPU는 그걸 **명시적 객체**로 바꾼다. 모든 게 이름 붙은 객체(device·pipeline·bind group)로 존재하고, 무엇을 쓸지 매번 명시한다. 더 장황하지만:

- **예측 가능**하다 — 숨은 전역 상태가 없다.
- **병렬·검증 친화적**이다 — 드라이버가 미리 검증하고, 멀티스레드에서 안전하다.

즉 진화 4의 "장황함"은 벌이 아니라 진화 1에서 느낀 불편함의 해답이다.

핵심 질문: *진화 1에서 "어? 왜 이 버퍼가 그려지지?"를 겪었다면, 그건 어떤 bind 상태가 남아있어서였다. WebGPU가 "매번 명시"로 이걸 어떻게 원천 차단하지?*

→ 정본: WebGPU Fundamentals *"Fundamentals"*, MDN *"WebGPU API"*

## 2. device / queue / command encoder

WebGPU의 뼈대 3인방. 멘탈모델:

- **device** = GPU를 향한 논리적 핸들(진화 1의 `gl`에 대응하지만 훨씬 명시적). 여기서 모든 리소스를 만든다.
- **queue** = GPU에 일을 제출하는 창구. 명령은 여기로 submit된다.
- **command encoder** = 명령들을 **묶음으로 기록**하는 객체. 기록을 끝내면 command buffer가 되고, 그걸 queue에 제출한다.

핵심 질문: *네 FaceRGB에서 CPU-GPU 왕복을 줄이려고 명령을 배치로 모아 보냈던 감각 — command encoder가 "명령을 모아 한 번에 제출"하는 것과 어떻게 닮았지? 이 모델이 왜 왕복 최소화에 유리하지?*

→ 정본: WebGPU Fundamentals *"Fundamentals"*

## 3. buffer · bind group · pipeline — 흩어진 상태를 객체로

진화 1의 암묵적 배선이 세 종류의 명시적 객체가 된다:

- **buffer**: 진화 1의 VBO의 후예([foundations 축 A](../foundations.md)). 단 용도를 명시한다(vertex용/uniform용/**storage용** 등).
- **bind group**: 셰이더가 쓸 리소스(uniform·storage buffer·texture)를 **슬롯에 묶은 꾸러미**. 진화 1에서 uniform·attribute를 개별 배선하던 걸, WebGPU는 "이 셰이더가 쓸 것들"을 한 그룹으로 명시한다.
- **pipeline**: 셰이더 + 렌더 상태(블렌딩·포맷 등)를 **고정한 스냅샷**. 진화 1·2에서 매번 `useProgram`+상태설정 하던 걸 하나의 불변 객체로 굳힌다.

WGSL에서 이 슬롯들이 `@group(...) @binding(...)` 어트리뷰트로 셰이더 쪽과 짝지어진다.

핵심 질문: *진화 2의 additive 블렌딩 설정(`blendFunc`)은 WebGPU에선 어디에 "굳어" 들어갈까? bind group과 pipeline 중 어느 쪽이 "리소스"고 어느 쪽이 "상태"지?*

→ 정본: WebGPU Fundamentals *"Fundamentals"*, *"Bind Group Layouts"*

## 4. WGSL vs GLSL

진화 2·3에서 쌓은 GLSL 감각이 대부분 옮겨온다. 차이는 **문법이지 사고가 아니다**:

- 타입 표기 방식이 다르다(변수 선언, 함수 시그니처).
- 입출력·리소스를 `@location`/`@group`/`@binding`/`@builtin` 어트리뷰트로 **명시적으로** 표시한다(GLSL의 암묵적 `gl_*` 대비).
- 진입점을 `@vertex`/`@fragment`/`@compute`로 명시.

GLSL을 손으로 짜본 사람(=너, 진화 2 이후)에겐 러닝커브가 짧다. "명시적으로 다시 쓰기"에 가깝다.

⚠️ 이식 함정: 진화 2·3에서 `gl_PointCoord`로 둥근 파티클을 그렸지? **WebGPU엔 point sprite가 없다** — point-list 토폴로지는 1×1 픽셀 점만 그리고 point size도 없다. 100만 파티클을 둥글게 그리려면 **instanced quad**(파티클당 사각형)로 바꿔야 한다. 렌더 방식 자체가 바뀌는 지점이니 미리 알아둬라.

핵심 질문: *GLSL의 `gl_Position`(→ `@builtin(position)`)·`gl_VertexID`(→ `@builtin(vertex_index)`) 같은 내장 변수가 WGSL에선 `@builtin(...)`으로 명시된다. 왜 WebGPU는 이런 것도 "암묵적"을 버리고 명시로 갔을까?* (§1의 답과 같다.)

→ 정본: WebGPU Fundamentals *"WGSL"*, GLSL↔WGSL 비교 문서

## 5. compute shader + workgroup — "이 함수를 N번 병렬"

진화의 진짜 새 무기. vertex/fragment는 파이프라인의 정해진 칸에 묶여 있었지만, **compute shader는 파이프라인 밖에서 "임의 계산을 N번 병렬"**로 돌린다. 파티클 물리 갱신의 교과서적 용례다.

- **workgroup** = 함께 실행되는 스레드 묶음. `@workgroup_size(N)`으로 크기를 정하고, 필요한 만큼의 workgroup을 dispatch한다.
- 각 실행은 `@builtin(global_invocation_id)`로 **"내가 몇 번 파티클인지"**를 안다. 그걸로 storage buffer의 자기 몫을 읽고/쓴다.
- vertex shader와 결정적 차이: vertex도 read-only storage buffer에서 임의 위치를 **읽을** 순 있다. compute의 고유 능력은 **임의 위치에 쓰는 것(scatter write)** + 프레임 간 유지되는 read_write 상태다. 그래서 이웃을 참조하고 자기 상태를 갱신하는 상호작용이 가능해진다 — [foundations §4](../foundations.md)의 "실행끼리 격리"가 여기서 깨진다(storage buffer로 서로의 데이터를 읽고 쓴다).
- **병렬 리덕션(기초)**: 파티클별 독립 갱신 말고 "전체를 하나로 접는" 집계도 compute의 일이다 — 모든 파티클의 무게중심·총 에너지·경계상자 같은 것. 순차 합(N번)이 아니라 트리로 반씩 접어(log N 단계) 병렬로 줄인다. 파티클 시뮬에 필수는 아니지만 compute의 또 다른 교과서 패턴이라 [roadmap](../roadmap.md)이 "기초"만 짚어둔 것.

핵심 질문: *vertex shader는 정점당 1번 돌며 자기 출력만 냈다. compute가 "이웃 파티클의 위치를 읽어 힘을 계산"할 수 있다는 건 무슨 능력이 새로 생긴 거지? 왜 이게 시뮬레이션을 가능케 하지?*

→ 정본: **[Compute Shader Basics](https://webgpufundamentals.org/webgpu/lessons/webgpu-compute-shaders.html) (필독)**

## 6. storage buffer + 핑퐁 — 상태를 프레임 간 잇기

시뮬레이션은 "이전 상태 → 다음 상태"다. 그런데 **같은 buffer를 동시에 읽으면서 쓰면** 경쟁 조건이 난다(어떤 스레드가 이미 갱신한 값을 다른 스레드가 옛값인 줄 알고 읽음).

해법이 **핑퐁(ping-pong)**: buffer 두 개(A·B)를 두고, **A를 읽어 B에 쓰고**, 다음 프레임엔 역할을 **swap**한다. 이게 [foundations 축 B](../foundations.md)의 유상태를 실제로 구현하는 방법이다.

- **storage buffer** = compute가 읽고 쓰는 큰 데이터(파티클 배열). uniform buffer(작고 읽기 전용)와 구분.
- 진화 2·3의 무상태에선 필요 없던 개념 — 상태를 "어디에 보관하고 어떻게 세대 교체하나"가 핵심.

핵심 질문: *왜 buffer 하나로 "읽으면서 쓰기"를 하면 안 되지? 핑퐁의 두 버퍼가 각각 한 프레임에 무슨 역할을 맡고, swap이 왜 필요하지?*

→ 정본: WebGPU Fundamentals compute 챕터, [Galaxy Simulation 예제](https://threejsroadmap.com/blog/galaxy-simulation-webgpu-compute-shaders)

## 7. compute → render 연결 — 왕복의 삭제

이 진화의 하이라이트이자 네 포트폴리오 서사의 핵심. compute가 갱신한 storage buffer를 **CPU로 내리지 않고**, 그대로 render pass의 vertex 입력으로 쓴다.

```
[compute pass]  storage buffer 갱신 (위치·속도)
      │  같은 buffer, GPU 안에 머무름 (readback 없음!)
      ▼
[render pass]   그 buffer를 vertex 입력으로 그리기
```

- 진화 1~3에서(그리고 네 FaceRGB에서) 있던 CPU-GPU 왕복이 **아예 없다.** 이 대비를 숫자로 재는 게 DoD의 "WebGL2 대비 성능 비교"이자 벤치마크 글의 클라이맥스.

핵심 질문: *만약 compute 결과를 CPU로 readback한 뒤 다시 올려서 그린다면(=네가 옛날에 하던 방식) 100만 파티클에서 뭐가 병목이 될까? GPU 안에서 잇는 게 그걸 어떻게 없애지?*

→ 정본: WebGPU Fundamentals, Galaxy 예제

## 8. 성능·벤치마크 — 여기가 네 홈그라운드

DoD의 "숫자로 비교"와 [roadmap 마무리](../roadmap.md)의 벤치마크 글:

- **비교 대상**: WebGL2의 상태 유지 방식(transform feedback, 또는 CPU 업데이트) vs WebGPU compute. 같은 파티클 수에서 fps·프레임 타임.
- **workgroup 크기 튜닝**: GPU 아키텍처(워프/웨이브 크기) 감각이 필요한 지점 — 네 강점이 또 발휘된다. 크기에 따라 점유율(occupancy)이 갈린다.
- **overdraw**: [foundations §2](../foundations.md)에서 깐 복선. 100만 파티클 additive는 fragment/overdraw가 폭발한다 — compute만 빠르다고 끝이 아니라 render 쪽 fragment 비용도 병목이 된다.

핵심 질문: *"compute를 최적화했는데 fps가 안 오른다." 병목이 compute가 아니라 render(overdraw)일 수 있다. 이 둘을 어떻게 나눠서 측정하지?* (네 프로파일링 감각을 여기 옮겨라.)

→ 정본: WebGPU Fundamentals *"Timing/Performance"*

## 9. (선택) fallback — 네 특기

DoD 선택 항목이자 네 실무 감각이 직결되는 곳. WebGPU 미지원 환경에서 WebGL2로 자동 fallback. WebGPU는 2026년 기준 커버리지 ~95%, 나머지는 WebGL2로 떨어뜨린다([roadmap](../roadmap.md)). "감지 → 분기 → 열화된 경로" 설계는 네가 SDK에서 하던 그 일이다.

## 10. (경로) three.js WebGPURenderer / TSL

진화 3 자산을 버리지 않는 우회로. three.js의 `WebGPURenderer`와 TSL(Three Shading Language)로 compute를 쓰면, 진화 3의 씬·후처리를 재활용하면서 compute로 넘어갈 수 있다. raw WebGPU를 먼저 한 번 손으로 겪은 뒤 이 경로를 보면 "또 래퍼구나"가 보인다(진화 3의 교훈 재현).

→ 정본: [three.js WebGPU/TSL compute 소개](https://threejsroadmap.com/blog/introduction-to-webgpu-compute-shaders)

---

## 진화 4를 넘기 전 자문

- 무상태(진화 2·3)와 유상태(진화 4) 시뮬레이션의 차이를 한 문장으로?
- WebGPU의 명시적 모델(device/queue/encoder/pipeline/bind group)이 진화 1의 상태 기계와 어떻게 대비되는지 설명할 수 있나?
- compute shader가 vertex shader와 달리 할 수 있는 것(임의 읽기/쓰기)이 왜 시뮬레이션을 가능케 하나?
- 핑퐁 버퍼가 왜 필요한지, 각 버퍼의 프레임별 역할을 말할 수 있나?
- readback 없이 compute→render를 이었을 때 뭐가 사라지는지 — 네 FaceRGB 경험과 연결해 설명할 수 있나?
- DoD(→ [dod.md](dod.md)): compute 시뮬레이션 · 100만+ @60fps · 핑퐁 상태 유지 · **WebGL2 대비 성능을 숫자로** 비교 — 다 됐나?

→ 배운 것은 [note.md](note.md), 막힌 것은 [troubleshooting.md](troubleshooting.md)에. 이 진화가 끝나면 이건 학습 결과물이 아니라 **시니어 레벨 포트폴리오 한 편**이다([roadmap 마무리](../roadmap.md)) — 벤치마크 글·데모 배포·셰이더 아카이브로 마무리.
