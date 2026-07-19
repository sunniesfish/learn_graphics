# 진화 3 개념 — three.js / R3F: 씬·인터랙션·후처리

이제 three.js를 얹는다. 진화 1·2를 거쳤기 때문에 three.js가 **"마법"이 아니라 "내가 손으로 하던 걸 감싼 것"** 으로 보일 것이다 — 그게 [roadmap.md](../roadmap.md)가 말한 bottom-up의 보상이다. [foundations.md](../foundations.md), [진화 1](../01-webgl2/concept.md), [진화 2](../02-shaders/concept.md)를 읽은 전제로 간다.

> 하이브리드 문서: **"이게 진화 1·2의 무엇을 감싼 것인가"** 는 여기서, **three.js/R3F API 사용법**은 [Three.js Journey](https://threejs-journey.com/)와 [공식 문서](https://threejs.org/docs/)에서.
>
> 튜터 모드: 씬 구성 코드도, R3F 컴포넌트도, 여기엔 없다. 매핑과 개념만.

---

## 큰 그림: three.js를 "번역기"로 봐라

진화 3의 요령은 새 개념을 외우는 게 아니라 **매핑을 찾는 것**이다. 막힐 때마다 물어라: *"이걸 raw WebGL2로는 어떻게 했더라?"* 대부분 그 API의 래퍼다.

새로 **추가**되는 건 진화 1·2엔 없던 것들이다: 진짜 **3D 공간과 카메라**, **마우스 인터랙션**, **후처리(bloom)**. 파티클은 "그려진 것"(1·2)에서 **"만질 수 있는 것"**(3)이 된다([project.md](../project.md)).

---

## 1. 씬 그래프 — 장면을 나무로 구성

진화 1·2엔 "장면"이라는 개념이 없었다. 그냥 점을 그렸을 뿐. three.js는 세계를 **트리**로 구성한다:

- **Scene** = 그릴 것들을 담는 컨테이너(루트).
- **Camera** = 시점. 이게 [foundations §3](../foundations.md)의 clip space 변환(그 `w`!)을 담당한다 — 진화 1·2에서 네가 직접 -1~1로 쓰던 걸 이제 카메라가 계산한다.
- **Mesh** = **Geometry(형태) + Material(외형)**. 이 분리가 three.js의 핵심 구조다.
- **Renderer** = 이 트리를 실제 WebGL 명령으로 바꿔 캔버스에 그린다(진화 1에서 네가 손으로 하던 draw call).

핵심 질문: *진화 1에서 너는 "카메라" 없이 점을 그렸다. 그게 어떻게 가능했지? (힌트: 좌표를 이미 무슨 공간에 직접 썼었나?) 그럼 카메라는 정확히 무슨 일을 새로 해주는 거지?*

→ 정본: Three.js Journey *"Basics"*, Three.js Manual *"Fundamentals"*

## 2. BufferGeometry — 진화 1의 그 버퍼가 여기 숨어 있다

[foundations 축 A](../foundations.md)(데이터의 여정)가 여기서 실체로 드러난다. 진화 1에서 `createBuffer`→`bufferData`→`vertexAttribPointer`로 손수 배선하던 그 VBO가, three.js에선 **`BufferGeometry`의 attribute**로 들어간다. `setAttribute('position', ...)`가 곧 그 배선이다.

- 파티클엔 `Points` 객체(gl.POINTS의 래퍼) 또는 `InstancedMesh`를 쓴다. 진화 1이 `gl.POINTS`였으니 `Points`가 자연스러운 대응.
- 커스텀 attribute(색·크기·seed 등)도 `setAttribute`로 넘긴다 — 진화 1에서 attribute 규격 맞추던 그 감각 그대로.

핵심 질문: *진화 1에서 `vertexAttribPointer`에 넘기던 성분 개수([진화 1 §4](../01-webgl2/concept.md))가, three.js에서 attribute를 세팅할 때 어느 인자로 다시 나타날까? (x,y,z면 그 값은 몇이지?)* — 호출 형태는 정본 보고 네가 직접 조립해봐.

→ 정본: Three.js Journey *"Geometries"*, 문서 `BufferGeometry`

## 3. Material과 ShaderMaterial — 진화 2를 재사용 (함정 주의)

진화 2의 GLSL을 버리지 않는다. **`ShaderMaterial`**에 그대로 얹는다 — 이게 진화 3이 진화 2의 자산을 재활용하는 지점이다([foundations 축 C](../foundations.md)).

- ⚠️ **핵심 함정**: `ShaderMaterial`은 `projectionMatrix`·`modelViewMatrix` 같은 uniform과 `position` 등 attribute를 **자동 주입**한다. 진화 2의 raw GLSL(직접 clip space에 쓰던 vertex shader, 직접 선언한 attribute)을 그대로 붙이면 **재선언 충돌**이 난다.
  - fragment shader(발광·`gl_PointCoord`)는 대체로 그대로 온다.
  - vertex shader는 three.js 규약에 맞춰 조정해야 한다 — 이제 clip space에 직접 안 쓰고, 주입된 행렬로 위치를 변환한다(§1의 카메라가 하는 일). 아니면 자동 주입을 끄는 `RawShaderMaterial`을 쓴다.
- uniform(`u_time`·마우스 위치 등)의 **값은 네가 매 프레임 직접 갱신**하고(uniforms 객체의 `.value`), three.js는 그 값을 GPU에 **업로드만 대행**한다(진화 1에서 손으로 하던 `gl.uniform` 호출을 대신). 자동으로 흐르는 건 `projectionMatrix` 같은 내장 uniform뿐 — `u_time`은 네가 흘려야 한다.

핵심 질문: *진화 2에선 vertex shader가 `gl_Position`에 -1~1을 직접 썼다. three.js에선 왜 그러면 안 되고, 대신 주입된 `projectionMatrix`·`modelViewMatrix`를 곱해야 할까? 그 두 행렬이 [foundations §3](../foundations.md)의 무엇을 채우지?*

→ 정본: Three.js Journey *"Shaders"* 챕터 (필수), 문서 `ShaderMaterial`/`RawShaderMaterial`

## 4. 카메라 조작 — OrbitControls

DoD의 "마우스로 회전/줌". `OrbitControls`가 마우스 드래그를 카메라 이동으로 바꿔준다. 진화 1·2에선 시점이 고정이었으니 완전히 새 능력이다.

- 이걸 쓰는 순간 파티클이 진짜 3D 공간에 있다는 게 체감된다 — 그래서 진화 3부터 파티클 위치의 z가 의미를 가진다.
- `OrbitControls`는 헬퍼(three.js 애드온)다. R3F에선 `drei`의 `<OrbitControls />`가 같은 걸 선언적으로 준다.

핵심 질문: *카메라가 움직이면 파티클의 world 좌표는 안 바뀌는데 화면 위치는 바뀐다. 무엇이 매 프레임 다시 계산되는 거지?* (§3의 그 행렬.)

→ 정본: 문서 `OrbitControls`, drei

## 5. 마우스 인터랙션 — raycasting과 uniform

DoD의 "마우스 위치에 파티클이 반응". 두 갈래가 있다:

- **Raycasting**: 2D 마우스 좌표에서 3D로 광선을 쏴 "무엇을 가리키는지" 판정. 물체 선택·호버에 쓴다.
- **파티클 반응**(끌림/밀림): 대개 raycasting으로 마우스의 3D 위치(또는 평면 교점)를 구해 그걸 **uniform으로 셰이더에 넘기고**, 진화 2의 vertex shader가 그 위치로부터 밀림/끌림을 계산한다. 즉 **진화 2 셰이더의 확장**이지 새 시스템이 아니다.

핵심 질문: *마우스가 파티클을 "밀어내게" 하려면 셰이더가 무엇을 알아야 하나? 그 값을 CPU→셰이더로 어떻게 넘기지?* ([진화 1 §5](../01-webgl2/concept.md)의 uniform.)

→ 정본: 문서 `Raycaster`, Three.js Journey *"Interactions"*

## 6. 후처리 — EffectComposer + UnrealBloomPass

DoD의 bloom. 후처리는 **씬을 곧장 화면에 그리는 대신 텍스처로 뽑아, 여러 패스를 통과시킨 뒤 합성**하는 것이다. (네 FaceRGB의 "프레임을 텍스처로 받아 처리"와 방향이 닮았다 — 단, 여기선 CPU로 안 내리고 GPU 안에서.)

- `EffectComposer`가 패스들을 잇는 파이프라인, `UnrealBloomPass`가 bloom 패스.
- **Bloom의 원리**: 밝은 부분만 추출 → 블러 → 원본에 더한다. 그래서 진화 2의 **additive 발광과 궁합이 최고**다 — 이미 밝은 코어를 bloom이 번지게 한다.
- ⚠️ bloom은 [foundations §2](../foundations.md)의 fragment 비용을 크게 키운다(여러 패스 = 여러 번의 전체화면 fragment). 진화 4 성능 얘기의 복선.

핵심 질문: *bloom이 "밝은 부분을 블러해서 더한다"면, 진화 2에서 additive로 만든 하얀 코어에 이걸 걸면 뭐가 강조될까? 왜 검은 배경이 여기서도 중요하지?*

→ 정본: 문서 *"Post-processing"*, Three.js Journey *"Post-processing"* 챕터

## 7. React Three Fiber (R3F)

three.js를 **선언적으로** — 명령형 `scene.add(mesh)` 대신 `<mesh>`를 JSX로 쓴다. React 트리가 곧 씬 그래프가 된다.

- `useFrame`이 진화 1의 렌더 루프(`requestAnimationFrame`)에 대응한다 — 매 프레임 콜백.
- `drei`는 R3F용 헬퍼 모음(`<OrbitControls>`, `<Points>` 등).
- roadmap 조언: **R3F는 취업 공고에 자주 뜬다.** 재미없어도 최소 한 번은 손대는 게 시장 경쟁력에 직결(DoD 선택 항목).

핵심 질문: *R3F에서 `<mesh>` JSX 하나가 내부적으로 어떤 명령형 three.js 호출들로 풀릴까? React가 이 트리를 언마운트하면 그 리소스는 누가 정리하지?* (→ §8.)

→ 정본: [R3F 문서](https://r3f.docs.pmnd.rs/), [drei](https://github.com/pmndrs/drei)

## 8. 라이프사이클과 dispose — 네 강점 구역

여기가 네 안정성 감각이 그래픽스 문맥에서 빛나는 지점이다. GPU 리소스(geometry·material·texture·render target·renderer)는 GC가 안 거둔다 — **명시적으로 `dispose()`** 해야 VRAM이 안 샌다.

- StrictMode 이중 마운트([진화 1 맨 끝](../01-webgl2/concept.md))가 여기서 시험대다. 마운트/언마운트가 두 번 돌 때 리소스가 쌓이면 dispose가 빠진 거다.
- R3F가 자동으로 dispose하는 것 vs 네가 직접 해야 하는 것(특히 후처리 target, 커스텀 geometry)을 구분하는 게 관건.
- 진화 4는 리소스가 더 무겁다(100만 파티클 버퍼). 여기서 dispose 습관을 못 들이면 진화 4에서 크게 샌다.

핵심 질문: *StrictMode에서 컴포넌트가 두 번 마운트되는데 dispose를 안 하면, WebGL 컨텍스트/VRAM에 무슨 일이? 진화 1의 cleanup 감각을 three.js 리소스에 어떻게 옮기지?*

→ 정본: 문서 각 클래스의 `.dispose()`, Three.js Journey *"Performance tips"*

---

## 진화 3을 넘기 전 자문

- three.js의 Scene/Camera/Mesh/Geometry/Material 각각이 진화 1·2의 **무엇의 래퍼**인지 매핑할 수 있나?
- `ShaderMaterial` 재사용 함정(자동 주입 충돌)을 설명할 수 있나?
- bloom이 왜 additive 발광과 궁합이 좋은지 말할 수 있나?
- StrictMode 이중 마운트에서 리소스가 안 새는 걸 확인했나? (네 강점, DoD 아니어도 챙겨라)
- DoD 항목(→ [dod.md](dod.md))을 다 체크했나? R3F 재구성(선택)도 최소 한 번 손댔나?

→ 배운 것은 [note.md](note.md), 막힌 것은 [troubleshooting.md](troubleshooting.md)에. ⚠️ Journey 강의 "완주"에 집착 마라 — 파티클·셰이더·후처리·최적화 챕터를 프로젝트에 필요한 만큼만 발췌([roadmap](../roadmap.md)).
