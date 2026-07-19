# 진화 1 개념 — raw WebGL2: 점 필드

이 진화의 보상은 화려함이 아니라 **"GPU에 데이터를 올리고 셰이더를 붙여 그린다"는 파이프라인이 손에 붙는 것**이다. 먼저 [foundations.md](../foundations.md)를 읽었다는 전제로, 여기선 진화 1에서 실제로 만지는 개념만 다룬다.

> 하이브리드 문서: **멘탈모델·왜·순서**는 여기서, **API 시그니처·인자**는 [WebGL2 Fundamentals](https://webgl2fundamentals.org/)에서. 각 절 끝의 `→ 정본` 링크로 넘어가라.
>
> 튜터 모드: 여기에 네가 짤 해답 코드는 없다. 막히면 코드가 아니라 개념을 다시 읽고, 그래도 막히면 질문해라.

---

## 큰 그림: 진화 1에서 벌어지는 일 6단계

```
1. 캔버스에서 WebGL2 컨텍스트를 얻는다        (gl 객체 = GPU로 가는 창구)
2. 점 좌표 배열을 만들어 buffer에 올린다        (CPU → GPU)
3. vertex/fragment 셰이더를 컴파일·링크한다      (GPU에 프로그램 설치)
4. buffer를 셰이더의 attribute에 배선한다        ("이 데이터를 이 입력으로")
5. uniform으로 색·크기 같은 전역 값을 넘긴다      (모든 점 공통 값)
6. draw call을 프레임 루프에서 호출한다          (그려라, 매 프레임)
```

이 여섯 단계의 **순서와 이유**를 이해하는 게 진화 1 전부다. 아래 절이 이 순서를 따라가고, 중간에 좌표(§6)처럼 단계에 딱 안 걸리는 개념도 함께 짚는다.

---

## 1. 컨텍스트 · 캔버스 · 뷰포트

- **캔버스**는 그냥 HTML 요소(픽셀 사각형). 그 자체는 그리는 법을 모른다.
- **컨텍스트(`gl`)**는 그 캔버스에 GPU로 명령을 보내는 **창구 객체**다. 앞으로 모든 GPU 명령은 `gl.무언가()` 형태다. `gl`은 GPU를 향한 리모컨이라고 봐라.
- **뷰포트**는 정규화된 화면 좌표(NDC, -1~1)를 캔버스의 몇 픽셀에 매핑할지다. 보통 캔버스 크기와 맞춘다. 안 맞으면 그림이 늘어나거나 잘린다 — 첫 디버깅 단골. (clip space와 NDC의 구분은 [foundations.md](../foundations.md) §3.)

핵심 질문(스스로): *캔버스의 CSS 크기와 실제 픽셀 해상도(`width`/`height` 속성)는 같은가? 다르면 뷰포트를 뭘 기준으로 잡아야 하나?* (HiDPI에서 이게 흐릿함의 원인이 된다.)

→ 정본: WebGL2 Fundamentals *"Fundamentals"*, *"Resizing the Canvas"*

## 2. Buffer — 데이터를 GPU로 올리기

[foundations.md](../foundations.md) 축 A의 그 buffer다. CPU의 JS 배열은 GPU가 못 읽는다. 그래서 GPU 메모리에 **buffer**를 만들어 데이터를 복사해 올린다.

- 흐름: buffer 생성 → 바인딩(작업 대상으로 지정) → 데이터 업로드.
- WebGL은 **상태 기계**다. "지금 작업 중인 buffer" 같은 전역 상태를 바인딩으로 정해두고, 다음 명령이 그 대상에 적용된다. (이 암묵적 상태가 진화 4 WebGPU의 명시적 모델과 대비된다 — 지금 이 불편함을 기억해두면 나중에 WebGPU가 왜 그렇게 생겼는지 이해된다.)
- 업로드할 때 **usage 힌트**(자주 바뀜/고정)를 준다. 진화 1의 점은 고정이다 — 어느 힌트일까?

핵심 질문: *이 buffer 안에 든 건 그냥 숫자의 나열이다. GPU는 이 나열을 어떻게 "x,y가 한 쌍인 점 좌표"로 해석할까?* → 그 해석을 정하는 게 attribute 배선(§4)이다.

→ 정본: WebGL2 Fundamentals *"How It Works"*

## 3. 셰이더 컴파일 · 링크

vertex shader와 fragment shader는 GLSL로 쓴 문자열이다. GPU에 설치하려면:

```
셰이더 소스(문자열) → 컴파일 → 두 셰이더를 program으로 링크 → useProgram으로 활성화
```

- **컴파일과 링크는 실패할 수 있다.** 그리고 실패해도 예외를 안 던진다 — 조용히 실패한다. 그래서 후속 상태를 직접 물어보고 로그를 콘솔에 찍는 습관이 필수다: **컴파일**은 `getShaderParameter`로 확인하고 실패 시 `getShaderInfoLog`, **링크**는 `getProgramParameter`로 확인하고 실패 시 `getProgramInfoLog`로 읽는다. (링크 실패인데 `getShaderInfoLog`만 보면 빈 로그에 속아 원인을 못 찾는 함정에 빠진다.) DoD에 "컴파일 에러를 콘솔에서 읽을 수 있다"가 있는 이유다.
- 이건 셋업 배관이라 지루하지만, **셰이더 개발 내내 네 유일한 에러 창구**다. 여기 대충 하면 진화 2에서 셰이더가 안 나올 때 장님이 된다.
- 순서 주의: program을 **링크한 뒤에야** attribute·uniform의 위치(location)를 물어볼 수 있다. 그래서 다음 절의 배선보다 이게 먼저다.

핵심 질문: *셰이더 컴파일이 조용히 실패한다면, "점이 안 보임"의 원인이 (a) 컴파일 실패인지 (b) 좌표가 화면 밖인지 (c) 색이 배경과 같은지를 어떻게 구분할까?* → 이 구분 전략을 troubleshooting.md에 적어라.

→ 정본: WebGL2 Fundamentals *"Fundamentals"* (boilerplate 부분), MDN *"Adding 2D content to a WebGL context"*

## 4. Attribute — buffer를 셰이더 입력에 배선

buffer는 그냥 바이트 덩어리다. **attribute**는 vertex shader의 입력 변수이고, `vertexAttribPointer`가 **"이 buffer의 바이트를 이런 규격(몇 개씩, 무슨 타입, 간격 얼마)으로 잘라서 이 attribute에 먹여라"** 를 정한다.

- vertex shader는 정점 1개당 1번 실행되고, 매 실행마다 attribute에 **그 정점 몫의 데이터 한 조각**이 자동으로 들어온다. (foundations §4의 "같은 프로그램 N번"이 여기 구체화된다.)
- 그래서 배선의 규격(성분 개수·타입·stride·offset)이 틀리면 점이 엉뚱한 데 찍히거나 안 보인다 — 이게 진화 1 최대의 디버깅 지점이다.

핵심 질문: *점 하나가 (x, y) 2개 값이면 성분 개수는 몇이어야 하나? 만약 (x,y,z)로 바꾸면 뭘 같이 바꿔야 하나?*

→ 정본: WebGL2 Fundamentals *"How It Works"*, *"Attributes"*

## 5. Uniform — 모든 점이 공유하는 값

attribute가 "정점마다 다른 값"이라면, **uniform**은 "이번 draw call의 모든 정점·픽셀이 공유하는 전역 값"이다.

- 진화 1에선 **색과 크기**를 uniform으로 넘긴다. 점 1천 개가 전부 같은 색이면, 그 색은 정점마다 있을 필요 없이 uniform 하나면 된다.
- uniform은 draw call 전에 CPU에서 값을 세팅해 넣는다. 매 프레임 바꾸면 애니메이션이 된다 — 진화 2의 `u_time`이 바로 이 메커니즘이다. **진화 1에서 uniform 배선을 익혀두면 진화 2가 공짜로 열린다.**

핵심 질문: *색은 uniform, 위치는 attribute다. 그럼 "점마다 다른 색"을 원하면 색은 어디로 옮겨야 하나?* (이 판단이 attribute vs uniform의 본질이다.)

→ 정본: WebGL2 Fundamentals *"Shaders and GLSL"*

## 6. gl_Position · gl_PointSize · clip space

vertex shader가 반드시 채워야 하는 출력이 **`gl_Position`**(vec4, clip space 좌표)이다. clip space가 `w`로 나뉘어 -1~1의 NDC가 되고 그게 화면이 된다는 것 — 진화 1은 w=1이라 그냥 -1~1로 생각하면 된다는 것 — 은 [foundations.md](../foundations.md) §3에서 다뤘다.

- `gl.POINTS`로 그릴 땐 **`gl_PointSize`**(픽셀 단위 점 크기)도 vertex shader에서 정한다. 이게 0이거나 안 정해지면 점이 안 보인다 — 단골 함정.
- 주의: `gl_Position`의 좌표는 정규화(-1~1)인데 `gl_PointSize`는 **픽셀 단위**다. 두 좌표계가 한 셰이더에 섞여 있다. 헷갈리면 "위치는 정규화, 크기는 픽셀"로 외워라.

핵심 질문: *내 점 좌표 배열이 0~800(픽셀 좌표처럼) 범위라면 화면에 어떻게 보일까? 왜 다 한쪽 구석에 몰리거나 안 보일까?* → clip space로 안 바꿨기 때문. 이게 첫 "점이 안 보임"의 흔한 원인이다.

→ 정본: WebGL2 Fundamentals *"Shaders and GLSL"*

## 7. 렌더 루프

- `requestAnimationFrame`이 브라우저 리프레시(보통 60fps)에 맞춰 콜백을 호출한다. 그 콜백 안에서 화면을 지우고(`clear`) → draw call을 부른다.
- 진화 1은 **아직 안 움직여도 된다**(DoD). 그래도 루프는 돌려둔다. 왜? 진화 2에서 `u_time`을 uniform으로 넣는 순간 애니메이션이 시작되는데, **그릇(루프)을 미리 만들어두면 진화 2가 그 안에 값 하나 추가하는 것으로 끝나기** 때문이다.

핵심 질문: *매 프레임 buffer를 다시 올리고 셰이더를 다시 컴파일해야 할까, 아니면 그건 한 번만 하고 루프에선 draw call만 반복하면 될까?* (초기화 vs 매 프레임의 경계 — 성능의 기초이자 네 강점이 발휘될 지점.)

→ 정본: WebGL2 Fundamentals *"Animation"* (지금은 개념만, 실제 애니메이션은 진화 2)

---

## StrictMode 주의 (배관)

이 레포는 React StrictMode를 켜둔다(CLAUDE.md). 개발 중 컴포넌트가 **두 번 마운트**된다. WebGL 리소스(buffer·program·context)를 정리(dispose/`deleteBuffer` 등)하는 cleanup을 제대로 안 짜면 컨텍스트가 새거나 경고가 뜬다. **이건 버그가 아니라 테스트다** — cleanup이 맞으면 조용히 통과한다. 네 안정성 감각이 여기서 처음 발휘된다.

## 진화 1을 넘기 전 자문

- 이 6단계 중 어느 것을 **매 프레임** 하고 어느 것을 **한 번만** 하나? (초기화 vs 루프의 경계)
- attribute와 uniform의 차이를 한 문장으로 말할 수 있나?
- 점이 안 보일 때 원인을 좁히는 순서(§4 핵심 질문)가 손에 있나?
- DoD 4개(→ [dod.md](dod.md))를 다 체크했나? 넘겼으면 **다듬지 말고 진화 2로**(roadmap 원칙 2).

→ 배운 것은 [note.md](note.md), 막힌 것은 [troubleshooting.md](troubleshooting.md)에.
