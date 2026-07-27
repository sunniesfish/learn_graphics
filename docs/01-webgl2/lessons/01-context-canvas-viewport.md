# 레슨 1 — 컨텍스트 · 캔버스 · 뷰포트

[concept.md](../concept.md) §1의 상세판. 이 레슨이 끝나면 "캔버스를 원하는 색으로 clear"까지 할 수 있어야 한다. 파이프라인 없이 컨텍스트만 검증하는 단계다.

> 레슨 공통 규칙: 여기 나오는 코드는 **호출 단위의 레퍼런스 조각**이다. 이걸 조립해 동작하는 파이프라인으로 만드는 건 네 몫이고, 그게 이 진화의 학습 내용이다.

---

## 1. 컨텍스트 얻기

```js
const gl = canvas.getContext("webgl2");
```

- 반환 타입은 `WebGL2RenderingContext | null`. **`null` 체크는 필수다** — WebGL2 미지원 환경, 또는 같은 캔버스에서 이미 다른 종류의 컨텍스트(`"2d"` 등)를 얻은 경우 `null`이 온다.
- 한 캔버스는 **평생 한 종류의 컨텍스트만** 가진다. 같은 종류로 다시 부르면 같은 객체가 온다.
- 두 번째 인자로 옵션 객체를 줄 수 있다(`{ antialias, alpha, ... }`). 진화 1에선 기본값이면 된다.

## 2. 캔버스 크기 — CSS 크기 vs 픽셀 해상도

캔버스에는 크기가 **두 개** 있다:

| 것 | 정하는 곳 | 의미 |
| --- | --- | --- |
| `canvas.width` / `canvas.height` (속성) | JS 또는 HTML 속성 | 실제 픽셀 버퍼 해상도 |
| CSS `width` / `height` | 스타일 | 화면에 표시되는 크기 |

- 둘이 다르면 브라우저가 픽셀 버퍼를 **늘리거나 줄여서** 표시한다 → 흐릿함의 원인.
- HiDPI(레티나)에선 CSS 크기 × `devicePixelRatio`가 실제 필요한 픽셀 수다:

```js
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
```

- `width`/`height` 속성을 바꾸면 캔버스 내용이 지워진다. 리사이즈 처리는 **크기가 실제로 달라졌을 때만** 하는 게 관례다.

## 3. 뷰포트

```js
gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
```

- NDC(-1~1)를 캔버스의 어느 픽셀 사각형에 매핑할지 정한다. 인자는 `(x, y, width, height)` — 좌하단 원점, 픽셀 단위.
- **캔버스 크기를 바꿨으면 뷰포트도 다시 불러야 한다.** WebGL이 자동으로 안 맞춰준다. 그림이 한쪽 구석에 몰리거나 늘어나 보이면 여기부터 의심.
- `gl.drawingBufferWidth/Height`는 실제 버퍼 크기를 돌려주는 읽기 전용 속성 — `canvas.width`와 보통 같다.

## 4. Clear — 첫 GPU 명령

```js
gl.clearColor(0.1, 0.1, 0.1, 1.0); // RGBA, 각 0~1
gl.clear(gl.COLOR_BUFFER_BIT);
```

- `clearColor`는 "지울 때 쓸 색"이라는 **상태 설정**이고, `clear`가 실제 실행이다. WebGL의 상태 기계 패턴이 여기서 처음 나온다.
- 캔버스가 이 색으로 칠해지면 컨텍스트·뷰포트가 정상이라는 뜻이다. **점 디버깅 전에 이 단계부터 통과시켜라.**

## 5. React에서의 lifecycle (StrictMode)

- 컨텍스트 초기화는 ref가 잡힌 뒤, 즉 effect 안에서 한다.
- StrictMode는 개발 중 mount → unmount → mount를 한 번 더 돈다. cleanup에서 정리할 것:
  - `cancelAnimationFrame(id)` — 루프 정지 (레슨 4)
  - `gl.deleteBuffer(...)`, `gl.deleteProgram(...)` — GPU 리소스 반납
  - 컨텍스트 자체를 놓아주고 싶으면 확장을 쓴다: `gl.getExtension("WEBGL_lose_context")?.loseContext()`
- 브라우저는 페이지당 활성 WebGL 컨텍스트 수에 상한이 있다(대략 8~16). cleanup이 새면 "Too many active WebGL contexts" 경고로 드러난다 — StrictMode가 이걸 즉시 보여주는 테스트다.

---

## 체크포인트

- [ ] `/01-webgl2`에서 캔버스가 내가 정한 색으로 칠해진다
- [ ] 개발자 도구 콘솔에 컨텍스트 관련 경고가 없다 (StrictMode 이중 마운트 포함)
- [ ] 창 크기를 바꿔도 흐릿해지거나 비율이 깨지지 않는다 (또는: 지금은 고정 크기로 두고, 이 항목은 의도적으로 미룬다고 note.md에 적는다)

다음: [레슨 2 — 셰이더와 GLSL](02-shaders-and-glsl.md)
