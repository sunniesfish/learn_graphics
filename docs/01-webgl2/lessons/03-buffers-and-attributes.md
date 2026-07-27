# 레슨 3 — Buffer와 Attribute: 데이터를 GPU에 올리고 배선하기

[concept.md](../concept.md) §2, §4의 상세판. 이 레슨이 끝나면 점 좌표 배열을 GPU에 올리고, 셰이더의 `in` 변수에 배선하고, draw call로 그릴 수 있어야 한다. **진화 1 최대의 디버깅 지점**이 이 배선이다.

---

## 1. Buffer 만들기 · 올리기

```js
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
```

- `bindBuffer`가 "지금부터 `ARRAY_BUFFER` 자리에 이 buffer" 라는 상태 설정이고, `bufferData`는 **그 자리에 바인딩된 buffer**에 업로드한다. 인자로 buffer를 직접 넘기지 않는다는 것 — 이게 WebGL 상태 기계의 핵심 불편함이다.
- `data`는 JS 배열이 아니라 **typed array**여야 한다. 좌표는 `new Float32Array([...])`.
- usage 힌트: 진화 1의 점은 한 번 올리고 안 바뀌니 `gl.STATIC_DRAW`. 매 프레임 갱신하면 `gl.DYNAMIC_DRAW` (진화 1에선 불필요).

점 1,000개의 (x, y)라면 Float32Array 길이는 2,000 — `[x0, y0, x1, y1, ...]` 순서의 평평한 나열이다. 이 나열을 "2개씩 한 점"으로 해석시키는 게 아래 배선이다.

## 2. VAO — 배선의 기록장 (WebGL2 정석)

```js
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
// ... 이후의 attribute 배선이 전부 이 VAO에 기록된다
```

- VAO(Vertex Array Object)는 attribute 배선 상태의 스냅샷이다. 초기화 때 배선을 VAO에 담아두면, 그릴 때는 `gl.bindVertexArray(vao)` 한 줄로 복원된다.
- 진화 1은 buffer가 하나라 없어도 돌아가지만, WebGL2 정석이고 진화 2~4에서 계속 쓰니 처음부터 써라.

## 3. Attribute 배선

```js
const loc = gl.getAttribLocation(program, "a_position"); // 링크 후에만 (레슨 2 §7)
gl.enableVertexAttribArray(loc);
gl.vertexAttribPointer(loc, size, type, normalized, stride, offset);
```

`vertexAttribPointer`가 이 레슨의 본체다. **호출 시점에 `ARRAY_BUFFER`에 바인딩돼 있는 buffer**가 이 attribute의 소스로 기록된다 — buffer를 인자로 안 받는데도 연결되는 이유다.

| 인자 | 의미 | (x,y) 점의 경우 |
| --- | --- | --- |
| `size` | 정점 하나당 성분 개수 (1~4) | `2` |
| `type` | buffer 안 숫자의 타입 | `gl.FLOAT` |
| `normalized` | 정수 타입을 0~1로 정규화할지 | `false` (float엔 무의미) |
| `stride` | 정점 간 바이트 간격. `0` = 빈틈없이 (size×타입크기로 자동) | `0` |
| `offset` | buffer 시작에서 첫 데이터까지 바이트 | `0` |

- `enableVertexAttribArray`를 빼먹으면 attribute가 buffer 대신 기본 상수값을 읽는다 — 에러 없이 모든 점이 한자리에 겹쳐 찍히는, 조용하고 악랄한 버그.
- `size`를 틀리면(2를 3으로 등) 좌표가 어긋나 점이 엉뚱한 데 가거나 사라진다. (x,y) → (x,y,z)로 바꿀 땐 배열 구성·`size`·셰이더의 `in` 타입 세 곳이 같이 바뀌어야 한다.

## 4. Draw call

```js
gl.drawArrays(gl.POINTS, 0, count);
```

- 인자: (프리미티브 종류, 시작 정점 인덱스, 정점 개수).
- `count`는 **정점 개수**지 float 개수가 아니다. (x,y) 1,000개면 배열 길이 2,000, `count`는 1,000. 이거 헷갈리면 절반만 그려진다.
- 프레임 루프에서 이 호출 전에 필요한 상태: `useProgram` → `bindVertexArray` → (uniform 세팅) → `drawArrays`.

## 5. "점이 안 보임" 원인 좁히기

에러 없이 화면이 비어 있을 때, 위에서부터 순서대로:

1. **clear 색은 나오나?** → 안 나오면 컨텍스트/뷰포트 문제 (레슨 1)
2. **셰이더 컴파일·링크 로그는 깨끗한가?** (레슨 2 §6)
3. **`gl_PointSize`를 정했나?** 크게(예: 20.0) 박아서 확인
4. **좌표가 -1~1 안인가?** 일단 `(0, 0)` 점 하나로 축소해 중앙에 찍히는지 확인
5. **`enableVertexAttribArray` 불렀나? `vertexAttribPointer` 인자(특히 size, count)가 맞나?**
6. **점 색이 배경색과 같지 않나?** clear를 어두운 색, 점을 밝은 색으로

이 순서를 겪은 대로 [troubleshooting.md](../troubleshooting.md)에 남겨라.

---

## 체크포인트

- [ ] 점 1개가 화면 중앙에 찍힌다 (최소 파이프라인 완성 — 진화 1의 고비는 여기까지다)
- [ ] 점 1,000개가 찍힌다 (랜덤이든 격자든)
- [ ] `count`와 배열 길이의 관계를 설명할 수 있다

다음: [레슨 4 — Uniform과 렌더 루프](04-uniforms-and-render-loop.md)
