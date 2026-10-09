import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "zustand";
import type { BlockComponentProps } from "@/core/registry";
import { compile, evalNum } from "@/core/expr";
import { useVarsStore } from "@/core/vars";
import { useTokens, type LiveTokens } from "@/theme";
import { renderInline } from "@/core/markup";
import type { Graph3DProps } from "./index";

type V3 = [number, number, number];

/** Text label as a camera-facing sprite (drawn into a canvas texture with the theme font). */
function TextSprite({ position, text, color, font, size = 0.32 }: { position: V3 | THREE.Vector3; text: string; color: string; font: string; size?: number }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    const px = 64;
    const ctx = c.getContext("2d")!;
    ctx.font = `600 ${px}px ${font}`;
    c.width = Math.ceil(ctx.measureText(text).width) + 16;
    c.height = px + 16;
    ctx.font = `600 ${px}px ${font}`;
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.fillText(text, 8, c.height / 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { t, aspect: c.width / c.height };
  }, [text, color, font]);
  return (
    <sprite position={position as never} scale={[size * tex.aspect, size, 1]}>
      <spriteMaterial map={tex.t} transparent depthWrite={false} />
    </sprite>
  );
}
// math (x, y, z-up) → three (x, z, -y) so z points up on screen
const m2t = ([x, y, z]: V3): V3 => [x, z, -y];
const tok = (t: LiveTokens, c: string) => (c in t ? (t[c as keyof LiveTokens] as string) : c);

function Surface({ s, vars, color }: { s: Graph3DProps["surfaces"][number]; vars: Record<string, unknown>; color: string }) {
  const geo = useMemo(() => {
    const f = compile(s.z, ["x", "y"]);
    const n = s.segments;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= n; i++)
      for (let j = 0; j <= n; j++) {
        const x = s.x[0] + ((s.x[1] - s.x[0]) * i) / n;
        const y = s.y[0] + ((s.y[1] - s.y[0]) * j) / n;
        const z = f([x, y], vars as never);
        pos.push(...m2t([x, y, Number.isFinite(z) ? z : 0]));
      }
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const a = i * (n + 1) + j, b = a + n + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [s, vars]);
  return (
    <group>
      <mesh geometry={geo}>
        <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={s.opacity} roughness={0.95} metalness={0} depthWrite={false} />
      </mesh>
      <mesh geometry={geo}>
        <meshBasicMaterial color={color} wireframe transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function Arrow({ from, to, color, label, font }: { from: V3; to: V3; color: string; label?: string; font: string }) {
  const a = new THREE.Vector3(...m2t(from)), b = new THREE.Vector3(...m2t(to));
  const dir = b.clone().sub(a);
  const len = dir.length();
  const head = Math.min(0.28, len * 0.3);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const tipBase = a.clone().add(dir.clone().setLength(Math.max(0, len - head)));
  return (
    <group>
      <Line points={[a, tipBase]} color={color} lineWidth={3} />
      <mesh position={tipBase.clone().add(dir.clone().setLength(head / 2))} quaternion={q}>
        <coneGeometry args={[head * 0.42, head, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {label && <TextSprite position={b.clone().add(new THREE.Vector3(0.18, 0.18, 0))} text={label} color={color} font={font} size={0.38} />}
    </group>
  );
}

export default function Graph3DView({ props }: BlockComponentProps<Graph3DProps>) {
  const vars = useStore(useVarsStore(), (s) => s.values);
  const t = useTokens();
  const n3 = (p: readonly (number | string)[]) => p.map((v) => evalNum(v, vars)) as V3;
  const L = 2.6;
  return (
    <figure className="blk-graph">
      <div style={{ height: props.height * t.u - 24 }} className="graph3d">
        <Canvas camera={{ position: props.camera, fov: 40 }} dpr={[1, 2]}>
          <ambientLight intensity={1.4} />
          <directionalLight position={[5, 8, 4]} intensity={0.9} />
          {props.axes && (
            <group>
              {(
                [
                  [[-L, 0, 0], [L, 0, 0], "x"],
                  [[0, -L, 0], [0, L, 0], "y"],
                  [[0, 0, -L], [0, 0, L], "z"],
                ] as [V3, V3, string][]
              ).map(([a, b, name]) => (
                <group key={name}>
                  <Line points={[m2t(a), m2t(b)]} color={t["ink-soft"]} lineWidth={1} />
                  <TextSprite position={m2t(b)} text={name} color={t["ink-soft"]} font={t.font.mono} size={0.22} />
                </group>
              ))}
              <gridHelper args={[2 * L, 10, t.rule, t.rule]} />
            </group>
          )}
          {props.surfaces.map((s, i) => (
            <Surface key={i} s={s} vars={vars} color={tok(t, s.color)} />
          ))}
          {props.vectors.map((v, i) => (
            <Arrow key={i} from={n3(v.from)} to={n3(v.to)} color={tok(t, v.color)} label={v.label} font={t.font.hand} />
          ))}
          {props.points.map((p, i) => (
            <mesh key={i} position={m2t(n3(p.at))}>
              <sphereGeometry args={[0.07, 20, 20]} />
              <meshBasicMaterial color={tok(t, p.color)} />
            </mesh>
          ))}
          <OrbitControls enablePan={false} makeDefault />
        </Canvas>
      </div>
      {props.caption && <figcaption dangerouslySetInnerHTML={{ __html: renderInline(props.caption) }} />}
    </figure>
  );
}
