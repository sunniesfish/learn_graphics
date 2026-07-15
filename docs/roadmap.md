# 웹 그래픽스 학습 로드맵

**하나의 GPU 파티클 프로젝트로 WebGL2 → 셰이더 → three.js → WebGPU 전부 밟기**

---

## 이 로드맵의 전제

너의 상황을 그대로 반영해서 짰다.

- **가진 것**: 브라우저/JS 런타임, GPU readback·동기화, 성능·안정성 엔지니어링에 대한 실무 이해 (FaceRGB SDK).
- **없는 것**: 그래픽스 API 문법과 개념 어휘 (WebGL, 셰이더, three.js).
- **목표**: "저수준 렌더링/그래픽스"에서 시장 경쟁력을 갖추는 것.

그래서 **bottom-up(밑에서 위로)** 순서로 간다. 대부분은 three.js부터 시작하는데, 그 정석의 유일한 큰 단점("raw WebGL은 어렵고 지루해서 포기함")이 너한테는 거의 안 걸리기 때문이다. 너의 시스템 이해가 남들의 진입장벽을 진입장점으로 바꿔준다.

### 3개의 원칙

1. **하나의 프로젝트를 층층이 키운다.** 매번 새 프로젝트를 세팅하지 않는다. 같은 파티클 시스템을 4번 다시 만들면서, 같은 문제를 4가지 도구로 풀어본다.
2. **각 단계를 타임박스한다.** 특히 진화 1. "완벽하게 다듬기"나 "추상화 라이브러리 만들기"는 너의 오버엔지니어링 함정이다. 완료 기준(DoD)을 넘기면 미련 없이 다음으로.
3. **도메인(카메라/신호처리)을 건드리지 않는다.** 파티클은 의도적으로 네 전문 영역 밖이다. 여기선 "안정성 엔지니어"가 아니라 "그래픽스 학습자"로 있어야 한다.

### 왜 파티클 시스템인가

이 4단계 커리큘럼과 파티클 시스템의 구조가 정확히 겹친다. 우연이 아니라, 파티클이 웹 그래픽스 학습의 정석 프로젝트인 이유가 바로 이것이다.

| 단계           | 파티클로 배우는 것                            |
| -------------- | --------------------------------------------- |
| raw WebGL2     | 버퍼·어트리뷰트·드로우콜 (점 N개 그리기)      |
| GLSL 셰이더    | 셰이더로 움직임과 색을 만들기                 |
| three.js / R3F | 씬 그래프·인터랙션·후처리                     |
| WebGPU compute | GPU 병렬 시뮬레이션 (compute의 교과서적 용례) |

---

## 전체 지도

```
Day 0        지형 파악 (주말 하루) — three.js 데모 구경, "뭐가 가능한지" 지도만
  │
진화 1  ▸    raw WebGL2      점 필드를 화면에            (1~2주, 타임박스 엄격)
  │
진화 2  ▸    GLSL 셰이더      절차적 움직임 + 발광          (2~3주)
  │
진화 3  ▸    three.js / R3F   씬·카메라·인터랙션·bloom      (2~3주)
  │
진화 4  ▸    WebGPU compute   수백만 파티클 GPU 시뮬레이션   (3~4주)
  │
마무리  ▸    포트폴리오화 + 벤치마크 비교 글
```

전체 8~12주 목표. 주당 투입 시간에 따라 조정. 각 단계는 "완료 기준"을 통과하면 끝이다 — 시간이 남아도 다듬지 말고 넘어간다.

---

## Day 0 — 지형 파악 (주말 하루)

**목표**: 코드를 쓰기 전에 "웹에서 뭐가 가능한지" 지도를 그려서 동기부여와 방향 감각을 얻는다. 여기선 이해하려 하지 말고 구경만 한다.

- [three.js examples 갤러리](https://threejs.org/examples/) 훑어보기 — 특히 파티클/points 예제들
- [Bruno Simon 포트폴리오](https://bruno-simon.com/) — 이 판의 "가능성"의 상한선
- [Shadertoy](https://www.shadertoy.com/) 인기 셰이더 몇 개 열어서 눈요기
- [Awwwards](https://www.awwwards.com/websites/three-js/) three.js 수상작 구경

**하지 말 것**: 여기서 튜토리얼 시작하기, 코드 이해하려 하기. 하루 안에 끝낸다.

---

## 진화 1 — raw WebGL2: 점 필드를 화면에

**⏱ 1~2주 · 타임박스 엄격**

three.js 없이 순수 WebGL2로 시작한다. 이 단계의 보상은 시각적 화려함이 아니라 "GPU에 데이터를 올리고 셰이더를 붙여 그린다"는 파이프라인이 손에 붙는 것이다.

### 목표

gl.POINTS로 화면에 정적인 점 필드(파티클 후보들)를 그린다. 색과 크기를 셰이더 유니폼으로 제어한다.

### 배우는 개념

- WebGL2 컨텍스트, 캔버스, 뷰포트
- vertex buffer object, `vertexAttribPointer`, attribute
- 셰이더 컴파일·링크 (vertex + fragment), `gl.useProgram`
- uniform 전달, `gl_PointSize`, `gl_Position`
- 좌표 공간의 기초 (clip space -1~1)
- 렌더 루프 (`requestAnimationFrame`)

### 완료 기준 (DoD)

- [ ] 화면에 1,000개 이상의 점이 그려진다
- [ ] 점의 색과 크기를 유니폼으로 바꿀 수 있다
- [ ] 셰이더 코드가 별도 문자열/파일로 분리돼 있고, 컴파일 에러를 콘솔에서 읽을 수 있다
- [ ] 프레임 루프가 돌고 있다 (아직 움직이지 않아도 됨)

### 핵심 자료

- [WebGL2 Fundamentals](https://webgl2fundamentals.org/) — 이 단계의 정본. "Fundamentals" → "How It Works" → "Shaders and GLSL"까지. OpenGL 기반이 아닌, WebGL을 처음부터 제대로 가르치는 유일한 시리즈.
- [MDN WebGL tutorial](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial) — 레퍼런스 보조

### 함정·힌트 (너를 위한 경고)

- ⚠️ **여기서 추상화하지 마라.** "buffer 헬퍼 클래스"나 "미니 엔진"을 만들고 싶어질 것이다. 참아라. 이 단계의 목적은 재사용 코드가 아니라 API 감각이다.
- ⚠️ **DoD를 넘기면 즉시 진화 2로.** 조명·3D·카메라는 지금 필요 없다. 점만 나오면 성공이다.
- 💡 너의 readback 경험은 GPU→CPU 방향이었다. 이 단계는 그 반대(CPU→GPU→화면) 방향을 채우는 것이다. 이 프레임으로 이해하면 빠르다.

---

## 진화 2 — GLSL 셰이더: 움직임과 발광

**⏱ 2~3주**

이제 파티클을 살아 움직이게 한다. 이 단계가 너의 진짜 차별화 지점이다 — three.js만 쓰는 사람은 많지만 셰이더를 손으로 짜는 사람은 훨씬 적다.

### 목표

vertex 셰이더에서 파티클을 절차적으로 움직이고(시간 기반 + 노이즈), fragment 셰이더에서 색·발광을 입힌다. additive 블렌딩으로 빛나는 느낌을 만든다.

### 배우는 개념

- GLSL 문법: 타입, 스위즐링(`.xyz`), 내장 함수(`sin`, `mix`, `smoothstep`, `length`)
- 시간 유니폼(`u_time`)으로 애니메이션
- 노이즈 함수 (value/simplex/curl noise) — 파티클 흐름 만들기
- fragment 셰이더로 원형 파티클 그리기 (point sprite + `gl_PointCoord`)
- 블렌딩 모드 (`gl.blendFunc`, additive)
- 이징·보간 감각

### 완료 기준 (DoD)

- [ ] 파티클이 노이즈 기반으로 유기적으로 흐른다
- [ ] 파티클이 딱딱한 사각형이 아니라 부드러운 원/발광점으로 보인다
- [ ] additive 블렌딩으로 겹치는 부분이 밝아진다
- [ ] Shadertoy에서 그라디언트/원/노이즈 셰이더를 3개 이상 직접 짜봤다

### 핵심 자료

- [The Book of Shaders](https://thebookofshaders.com/) — fragment 셰이더 입문의 정본. Patricio Gonzalez Vivo 저. "Shaping functions", "Colors", "Noise" 챕터가 핵심. 인터랙티브 에디터 내장.
- [Shadertoy](https://www.shadertoy.com/) — 매일 하나씩 남의 셰이더 뜯어보고 따라 짜기. 학습 가속기.
- [Inigo Quilez articles](https://iquilezle.org/articles/) — 셰이더 수학의 마스터클래스 (나중에 깊이 필요할 때)

### 함정·힌트

- 💡 노이즈 함수는 처음엔 복붙해도 된다. 원리는 나중에. 지금은 "노이즈를 파티클 속도에 먹이면 흐름이 생긴다"는 감각이 먼저다.
- 💡 셰이더 디버깅은 값을 색으로 출력하는 게 정석이다 (`gl_FragColor = vec4(value, 0, 0, 1)`). print가 없다.
- ⚠️ 여기서도 도메인 신호처리로 새지 마라. "이 노이즈로 심박을 시각화하면…" 같은 생각이 들면 멈춰라.

---

## 진화 3 — three.js / R3F: 씬·인터랙션·후처리

**⏱ 2~3주**

이제 three.js를 얹는다. 1~2단계를 거쳤기 때문에 three.js가 "마법"이 아니라 "내가 손으로 하던 걸 감싼 것"으로 보일 것이다. 이게 bottom-up의 보상이다.

### 목표

파티클 시스템을 three.js `Points` 또는 `InstancedMesh`로 재구성한다. 카메라를 마우스로 돌리고, 마우스 인터랙션을 넣고, postprocessing으로 bloom을 건다. 커스텀 셰이더는 `ShaderMaterial`로 그대로 재사용한다.

### 배우는 개념

- 씬 그래프: Scene / Camera / Mesh / Geometry / Material
- `BufferGeometry`로 커스텀 attribute 넘기기 (진화 1의 그 buffer가 여기 숨어 있다)
- `ShaderMaterial` — 진화 2의 GLSL을 three.js 안에서 쓰기
- `OrbitControls`, 카메라 조작
- 마우스 raycasting / 포인터 인터랙션
- `EffectComposer` + `UnrealBloomPass` (postprocessing)
- React Three Fiber(R3F) 기본 — 선언적 씬 구성
- 라이프사이클·리소스 dispose (너의 안정성 감각이 빛나는 지점)

### 완료 기준 (DoD)

- [ ] 파티클 씬을 마우스로 회전/줌 할 수 있다
- [ ] 커스텀 GLSL 셰이더가 `ShaderMaterial`로 돌아간다 (진화 2 재사용)
- [ ] bloom 후처리가 걸려 있다
- [ ] 마우스 위치에 파티클이 반응한다 (끌림/밀림 등)
- [ ] (선택) R3F 버전으로도 한 번 재구성

### 핵심 자료

- [Three.js Journey](https://threejs-journey.com/) (Bruno Simon, 유료) — 사실상 업계 표준 입문 코스. 93시간, 66개 영상. 셰이더·최적화·R3F 챕터 포함. 하나만 산다면 이것.
- [Three.js 공식 문서](https://threejs.org/docs/) + [manual](https://threejs.org/manual/)
- [React Three Fiber 문서](https://r3f.docs.pmnd.rs/) + [drei 헬퍼](https://github.com/pmndrs/drei)
- [Best Three.js courses 2026](https://www.creativedevjobs.com/blog/best-threejs-courses-2026) — 코스 비교 참고

### 함정·힌트

- 💡 three.js에서 막히면 "이걸 raw WebGL2로는 어떻게 했더라"를 떠올려라. 대부분 그 API의 래퍼다.
- 💡 R3F는 취업 공고에 자주 등장한다. 재미없어도 최소 한 번은 손대두는 게 시장 경쟁력에 직결된다.
- ⚠️ Journey 강의를 "완주"에 집착하지 마라. 파티클/셰이더/최적화 챕터를 프로젝트에 필요한 만큼만 발췌해도 된다.

---

## 진화 4 — WebGPU + compute shader: 제대로 다시 풀기

**⏱ 3~4주 · 하이라이트**

이 단계가 로드맵의 정점이자 너의 최대 차별화 자산이 된다. 파티클의 위치·속도 갱신을 CPU나 vertex 셰이더가 아니라 **compute shader**로 GPU 안에서 병렬 시뮬레이션한다. 파티클 수를 수천 → 수백만으로 올린다.

WebGPU는 2026년 1월부로 모든 주요 브라우저에서 Baseline(기본 탑재)이 됐고, 사용자 커버리지 ~95%, 나머지는 WebGL2로 자동 fallback이다. 지금이 배우기 딱 좋은 전환기다.

### 목표

compute shader + storage buffer로 파티클 물리(위치·속도)를 GPU에서 갱신하고, 그 결과를 렌더 파이프라인이 바로 그린다. 핑퐁 버퍼로 프레임 간 상태를 이어간다. WebGL 방식과 성능을 벤치마크한다.

### 배우는 개념

- WebGPU 아키텍처: device / queue / command encoder
- 명시적 리소스: buffer, bind group, pipeline (WebGL의 암묵적 상태와 대비)
- WGSL (WebGPU 셰이딩 언어) — GLSL과의 차이
- **compute shader + workgroup** — "이 함수를 N번 병렬 실행"
- storage buffer, 핑퐁(ping-pong) 버퍼로 상태 유지
- compute → render 파이프라인 연결 (readback 없이 GPU 안에서 완결)
- GPU 병렬 리덕션의 기초

### 완료 기준 (DoD)

- [ ] 파티클 시뮬레이션이 compute shader에서 돈다 (CPU 루프 아님)
- [ ] 100만 개 이상의 파티클이 60fps로 움직인다
- [ ] 핑퐁 버퍼로 속도·위치가 프레임 간 유지된다
- [ ] WebGL2 방식(transform feedback 또는 CPU 업데이트) 대비 성능을 숫자로 비교했다
- [ ] WebGPU 미지원 환경에서 WebGL로 fallback (선택, 너의 특기)

### 핵심 자료

- [WebGPU Fundamentals](https://webgpufundamentals.org/) — 정본. [Compute Shader Basics](https://webgpufundamentals.org/webgpu/lessons/webgpu-compute-shaders.html) 챕터 필독.
- [MDN WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) — 레퍼런스
- [three.js WebGPU / TSL](https://threejsroadmap.com/blog/introduction-to-webgpu-compute-shaders) — three.js의 `WebGPURenderer`와 TSL로 compute 쓰기 (진화 3 자산 재활용 가능)
- [Interactive Galaxy with WebGPU Compute](https://threejsroadmap.com/blog/galaxy-simulation-webgpu-compute-shaders) — 파티클 compute 실전 예제

### 함정·힌트 (여기가 너의 홈그라운드)

- 💡 **너의 FaceRGB readback 고생이 여기서 보상받는다.** WebGL2 비동기 readback의 함정을 몸으로 아는 상태에서 WebGPU의 명시적 큐/버퍼 모델을 보면 이해가 폭발할 것이다. "아, readback을 이렇게 피하는 거였구나."
- 💡 compute → render를 GPU 안에서 연결하면 CPU-GPU 왕복(네가 배치로 줄였던 그 왕복)이 아예 사라진다. 이 대비를 벤치마크 글로 쓰면 포트폴리오 서사가 완성된다.
- 💡 workgroup 크기 튜닝은 GPU 아키텍처 감각이 필요하다 — 네 강점이 또 발휘되는 지점.

---

## 마무리 — 학습을 포트폴리오로

프로젝트가 끝나면 이건 "학습 결과물"이 아니라 **시니어 레벨 포트폴리오 한 편**이다. 아래를 붙이면 시장에서 거의 유일한 서사가 된다.

- **데모 배포**: 진화 3·4 결과물을 웹에 올린다 (Vercel/Netlify + WebGPU 지원 안내)
- **벤치마크 글**: "같은 파티클 시스템을 WebGL2 / WebGPU compute로 구현하고 성능을 비교했다" — 진화 1→4의 수치 비교. 너의 성능·안정성 전문성이 그래픽스 문맥에서 재증명된다.
- **셰이더 아카이브**: 진화 2에서 만든 셰이더들을 Shadertoy/GitHub에 공개
- **README 서사**: "런타임·GPU를 다루던 프론트엔드가 그래픽스 파이프라인을 바닥부터 올라간 기록"

### 그 다음 방향 (하나 골라 특화)

- **WebXR / AR** — 3D 경험의 몰입형 확장
- **대규모 데이터 시각화** — compute 강점 직결
- **3D 제품 컨피규레이터 / 뷰어** — 커머스 수요
- **Gaussian Splatting / 3D 재구성** — 최신 니치
- **WebGPU 컴퓨트 기반 브라우저 내 연산** — 너의 신호처리 배경과 다시 만나는 지점 (단, 학습이 끝난 뒤에)

---

## 자료 한눈에 모음

**기초 (진화 1)**

- WebGL2 Fundamentals — https://webgl2fundamentals.org/
- MDN WebGL Tutorial — https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial

**셰이더 (진화 2)**

- The Book of Shaders — https://thebookofshaders.com/
- Shadertoy — https://www.shadertoy.com/
- Inigo Quilez — https://iquilezle.org/articles/

**three.js / R3F (진화 3)**

- Three.js Journey — https://threejs-journey.com/
- Three.js 문서 — https://threejs.org/docs/ · https://threejs.org/manual/
- React Three Fiber — https://r3f.docs.pmnd.rs/
- drei — https://github.com/pmndrs/drei

**WebGPU (진화 4)**

- WebGPU Fundamentals — https://webgpufundamentals.org/
- Compute Shader Basics — https://webgpufundamentals.org/webgpu/lessons/webgpu-compute-shaders.html
- MDN WebGPU — https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
- Three.js Roadmap (compute) — https://threejsroadmap.com/blog/introduction-to-webgpu-compute-shaders

**영감·구경 (Day 0)**

- three.js examples — https://threejs.org/examples/
- Bruno Simon — https://bruno-simon.com/
- Awwwards three.js — https://www.awwwards.com/websites/three-js/
