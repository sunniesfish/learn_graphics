# 레슨 4 — Uniform과 렌더 루프

[concept.md](../concept.md) §5, §7의 상세판. 이 레슨이 끝나면 점의 색·크기를 CPU에서 바꿀 수 있고, rAF 루프가 돌고 있어야 한다. 여기까지가 DoD 전부다.

---

## 1. Uniform 세팅

```js
const colorLoc = gl.getUniformLocation(program, "u_color"); // 링크 후, 초기화 때 한 번
gl.uniform4f(colorLoc, 1.0, 0.6, 0.2, 1.0);                 // draw 전, 값 넣기
```

- `uniform` 계열 함수는 **현재 `useProgram`된 program**에 값을 쓴다 — location만으론 부족하고 program이 활성 상태여야 한다. 순서 틀리면 조용히 무시된다.
- 이름 규칙: `uniform{성분수}{타입}`. 진화 1에서 쓸 것들:

| 셰이더 타입 | 함수 |
| --- | --- |
| `float` (예: `u_size`) | `gl.uniform1f(loc, v)` |
| `vec3` | `gl.uniform3f(loc, x, y, z)` |
| `vec4` (예: `u_color`) | `gl.uniform4f(loc, r, g, b, a)` |

- location이 `null`이어도 uniform 함수는 에러 없이 무시된다. "값을 바꿨는데 아무 변화 없음"이면 location null(이름 오타/미사용 제거, 레슨 2 §7)부터 의심.
- uniform 값은 program에 저장되므로 매 프레임 같은 값을 다시 넣을 필요는 없다. **바뀔 때만** 넣으면 된다.

## 2. attribute vs uniform — 판단 기준

- 정점마다 다른 값 → attribute (buffer에 실어서)
- draw call 전체가 공유하는 값 → uniform
- "점마다 다른 색"을 원하는 순간 색은 uniform에서 attribute로 이사해야 한다. 이 판단이 손에 붙으면 이 레슨은 끝난 거다.

## 3. 렌더 루프

```js
let rafId;
function frame() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.POINTS, 0, count);
  rafId = requestAnimationFrame(frame);
}
rafId = requestAnimationFrame(frame);
```

- 콜백은 브라우저 리프레시(보통 60fps)에 맞춰 호출된다. 콜백 인자로 타임스탬프(ms)가 들어온다 — 진화 1에선 안 쓰지만, 진화 2의 `u_time`이 바로 이 값이다.
- **초기화 vs 매 프레임의 경계**가 이 레슨의 핵심 판단이다:

| 한 번만 (초기화) | 매 프레임 (루프) |
| --- | --- |
| 컨텍스트, 셰이더 컴파일·링크 | `clear` |
| buffer 생성·업로드, VAO 배선 | `drawArrays` |
| location 조회 | (바뀌는 uniform이 있으면) uniform 세팅 |

매 프레임 `bufferData`나 컴파일을 하고 있다면 구조가 틀린 거다. 진화 1은 이 표대로면 루프 본체가 몇 줄 안 된다.

## 4. React cleanup

```js
cancelAnimationFrame(rafId);
```

- effect cleanup에서 루프를 반드시 끊어라. 안 끊으면 StrictMode 이중 마운트에서 루프가 2개 돌고, 죽은 컨텍스트에 그리려다 경고가 쏟아진다.
- GPU 리소스 반납(`deleteBuffer`, `deleteProgram`, `deleteVertexArray`)도 여기서 (레슨 1 §5).

---

## 체크포인트 = 진화 1 DoD

- [ ] 화면에 1,000개 이상의 점
- [ ] 색·크기를 uniform으로 제어 (코드에서 값 바꾸면 화면이 바뀐다 — UI 슬라이더는 불필요, 만들지 마라)
- [ ] 셰이더가 별도 `.glsl` 파일, 컴파일 에러를 콘솔에서 읽을 수 있음
- [ ] rAF 루프가 돌고 있음 (StrictMode 이중 마운트에서 안 샘)

통과하면 [dod.md](../dod.md)에 날짜·증거를 적고, note.md/troubleshooting.md를 채우고, **다듬지 말고 진화 2로.**
