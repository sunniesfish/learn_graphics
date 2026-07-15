import { Link } from "react-router";

export default function Home() {
  return (
    <main>
      <h1>learn_graphics</h1>
      <p>하나의 파티클 시스템, 4가지 도구</p>
      <ol>
        <li>
          <Link to="/01-webgl2">진화 1 — raw WebGL2: 점 필드</Link>
        </li>
        <li>
          <Link to="/02-shaders">진화 2 — GLSL: 움직임과 발광</Link>
        </li>
        <li>
          <Link to="/03-threejs">진화 3 — three.js: 씬·인터랙션·bloom</Link>
        </li>
        <li>
          <Link to="/04-webgpu">진화 4 — WebGPU compute: 100만 파티클</Link>
        </li>
      </ol>
    </main>
  );
}
