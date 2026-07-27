# 레슨 2 — 셰이더와 GLSL: 컴파일 · 링크

[concept.md](../concept.md) §3, §6의 상세판. 이 레슨이 끝나면 vertex/fragment 셰이더를 `.glsl` 파일로 쓰고, 컴파일·링크하고, **실패했을 때 에러 메시지를 콘솔에서 읽을 수** 있어야 한다. 이 마지막 항목이 DoD다.

---

## 1. GLSL ES 3.00 최소 문법

WebGL2의 정석은 GLSL ES 3.00이다. 소스 **첫 줄**(공백·주석도 앞에 오면 안 됨)에 버전 선언:

```glsl
#version 300 es
```

진화 1에서 쓰는 문법 전부:

| 것 | 문법 | 비고 |
| --- | --- | --- |
| 타입 | `float`, `vec2`, `vec3`, `vec4`, `int` | `vec4(1.0, 0.0, 0.0, 1.0)` 처럼 생성 |
| vertex 입력 | `in vec2 a_position;` | attribute. 정점마다 다른 값 |
| 전역 값 | `uniform vec4 u_color;` | draw call 내 모든 정점·픽셀 공유 |
| fragment 출력 | `out vec4 outColor;` | 직접 선언. `gl_FragColor`는 1.00 문법 — 쓰면 컴파일 에러 |
| 정밀도 | `precision highp float;` | fragment 셰이더에 필수 (vertex는 기본 highp) |

- GLSL은 `float`와 `int`를 암묵 변환하지 않는다. `1`이 아니라 `1.0` — 초반 컴파일 에러 1위.
- vec 조립: `vec4(a_position, 0.0, 1.0)` 처럼 작은 vec을 큰 vec에 채워 넣을 수 있다.

## 2. Vertex shader의 계약

정점 1개당 1번 실행. 반드시 채워야 하는 출력:

- **`gl_Position`** (`vec4`) — clip space 좌표. 진화 1은 w=1이므로 x,y가 -1~1 범위면 화면 안이다. ([foundations.md](../../foundations.md) §3)
- **`gl_PointSize`** (`float`) — `gl.POINTS`로 그릴 때 점의 픽셀 크기. **안 정하면 미정의 동작(사실상 안 보임)** — "점이 안 보임" 단골 원인.
- 위치는 정규화(-1~1), 크기는 픽셀 단위. 두 좌표계가 한 셰이더에 섞여 있다는 걸 기억.

## 3. Fragment shader의 계약

점이 덮는 픽셀 1개당 1번 실행. `out vec4` 변수에 그 픽셀의 색(RGBA, 0~1)을 대입하면 끝이다. 진화 1에선 uniform 색을 그대로 출력하는 정도면 충분하다.

## 4. Vite에서 셰이더 파일 불러오기

```ts
import vertSrc from "./point.vert.glsl?raw";
import fragSrc from "./point.frag.glsl?raw";
```

`?raw`가 파일 내용을 문자열로 준다. 플러그인 불필요. TS가 모듈을 못 찾는다고 하면 `src/vite-env.d.ts`에 Vite 클라이언트 타입(`/// <reference types="vite/client" />`)이 있는지 확인.

## 5. 컴파일 · 링크 API

흐름: 셰이더 2개를 각각 컴파일 → program에 붙여 링크 → 활성화.

```js
const shader = gl.createShader(gl.VERTEX_SHADER); // 또는 gl.FRAGMENT_SHADER
gl.shaderSource(shader, sourceString);
gl.compileShader(shader);
```

```js
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
```

```js
gl.useProgram(program); // 이후 draw call이 이 program을 쓴다 (상태 설정)
```

## 6. 에러 확인 — 이 진화에서 제일 중요한 절

**컴파일도 링크도 실패해도 예외를 안 던진다.** 직접 물어봐야 한다:

```js
// 컴파일 확인
if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
  console.error(gl.getShaderInfoLog(shader));
}

// 링크 확인
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  console.error(gl.getProgramInfoLog(program));
}
```

- 둘 다 확인해라. 컴파일은 통과했는데 링크에서 실패하는 경우(예: vertex의 `out`과 fragment의 `in` 불일치)가 있고, 그때 `getShaderInfoLog`는 **빈 문자열**이라 원인을 못 찾는다.
- 에러 로그의 행 번호는 `#version` 줄부터 센다. 템플릿 문자열 앞에 개행이 끼면 행 번호가 어긋나니, 소스를 `.glsl` 파일로 분리하는 게 (DoD이기도 하지만) 디버깅에도 이득이다.
- 실패한 셰이더/program은 `gl.deleteShader` / `gl.deleteProgram`으로 정리한다.
- 이 확인 코드를 대충 하면 진화 2에서 셰이더가 안 나올 때 장님이 된다. **지금 제대로 만들어라.**

## 7. location 조회 순서

program을 **링크한 뒤에야** attribute/uniform의 location을 조회할 수 있다:

```js
const posLoc = gl.getAttribLocation(program, "a_position");   // 실패 시 -1
const colorLoc = gl.getUniformLocation(program, "u_color");   // 실패 시 null
```

- 반환값이 `-1`/`null`이면 이름 오타이거나, **셰이더에서 선언만 하고 안 써서 컴파일러가 제거한** 경우다. 후자가 은근히 자주 겪는 함정이다.

---

## 체크포인트

- [ ] `.glsl` 파일 2개가 `?raw`로 import된다
- [ ] 일부러 문법 에러를 넣었을 때(예: `1.0` → `1`) 콘솔에서 행 번호와 메시지를 읽을 수 있다
- [ ] 컴파일 통과·링크 실패 케이스도 로그로 구분된다

다음: [레슨 3 — Buffer와 Attribute](03-buffers-and-attributes.md)
