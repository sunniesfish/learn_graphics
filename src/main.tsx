import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import Home from "./pages/Home";
import Webgl2 from "./pages/01-webgl2";
import Shaders from "./pages/02-shaders";
import Threejs from "./pages/03-threejs";
import Webgpu from "./pages/04-webgpu";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/01-webgl2" element={<Webgl2 />} />
        <Route path="/02-shaders" element={<Shaders />} />
        <Route path="/03-threejs" element={<Threejs />} />
        <Route path="/04-webgpu" element={<Webgpu />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
