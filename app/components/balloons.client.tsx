/* eslint-disable react/prop-types, react/no-unknown-property */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Vector3, MathUtils }  from "three";
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { BallCollider, Physics, RigidBody } from "@react-three/rapier";
import { Effects } from "./balloons/effects.client";
import { dampC } from "~/lib/three-utils.client";

const accentColor = "#F7D320";

const spheres = (accent = "#F7D320") => [
  { color: "#06f", roughness: 0.1, metalness: 0.5 },
  { color: "#06f", roughness: 0.1, metalness: 0.5 },
  { color: "#06f", roughness: 0.1, metalness: 0.5 },
  { color: "white", roughness: 0.1, metalness: 0.1 },
  { color: "white", roughness: 0.1, metalness: 0.1 },
  { color: "white", roughness: 0.1, metalness: 0.1 },
  { color: accent, roughness: 0.1, accent: true },
  { color: accent, roughness: 0.1, accent: true },
  { color: accent, roughness: 0.1, accent: true },
  { color: "#06f", roughness: 0.1 },
  { color: "#06f", roughness: 0.3 },
  { color: "#06f", roughness: 0.3 },
  { color: "white", roughness: 0.1 },
  { color: "white", roughness: 0.2 },
  { color: "white", roughness: 0.1 },
  { color: accent, roughness: 0.1, accent: true },
  { color: accent, roughness: 0.3, accent: true },
  { color: accent, roughness: 0.1, accent: true },
];

export function Balloons(props) {
  const connectors = useMemo(() => spheres(accentColor), []);
  return (
    <div className="Balloons h-screen">
      <Canvas
        flat
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: false }}
        camera={{ position: [0, 0, 30], fov: 17.5, near: 10, far: 40 }}
        {...props}
      >
        {/*<color attach="background" args={['#141622']} />*/}
        <Physics /*debug*/ timeStep="vary" gravity={[0, 0, 0]}>
          <Pointer />
          {connectors.map((props, i) => (
            <Sphere key={i} {...props} />
          ))}
        </Physics>
        <Environment resolution={256}>
          <group rotation={[-Math.PI / 3, 0, 1]}>
            <Lightformer
              form="circle"
              intensity={100}
              rotation-x={Math.PI / 2}
              position={[0, 5, -9]}
              scale={2}
            />
            <Lightformer
              form="circle"
              intensity={2}
              rotation-y={Math.PI / 2}
              position={[-5, 1, -1]}
              scale={2}
            />
            <Lightformer
              form="circle"
              intensity={2}
              rotation-y={Math.PI / 2}
              position={[-5, -1, -1]}
              scale={2}
            />
            <Lightformer
              form="circle"
              intensity={2}
              rotation-y={-Math.PI / 2}
              position={[10, 1, 0]}
              scale={8}
            />
            <Lightformer
              form="ring"
              color="#4060ff"
              intensity={80}
              onUpdate={(self) => self.lookAt(0, 0, 0)}
              position={[10, 10, 0]}
              scale={10}
            />
          </group>
        </Environment>
        <Effects />
      </Canvas>
    </div>
  );
}

function Sphere({
  //position,
  children,
  vec = new Vector3(),
  //scale,
  r = MathUtils.randFloatSpread,
  color = "white",
  ...props
}) {
  const api = useRef();
  const ref = useRef();
  const pos = useMemo(() => [r(10), r(10), r(10)], [r]);
  useFrame((state, delta) => {
    delta = Math.min(0.1, delta);
    api.current?.applyImpulse(
      vec.copy(api.current.translation()).negate().multiplyScalar(0.2),
    );
    dampC(ref.current.material.color, color, 0.2, delta);
  });
  return (
    <RigidBody
      linearDamping={4}
      angularDamping={1}
      friction={0.1}
      position={pos}
      ref={api}
      colliders={false}
    >
      <BallCollider args={[1]} />
      <mesh ref={ref} castShadow receiveShadow>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial {...props} />
        {children}
      </mesh>
    </RigidBody>
  );
}

function Pointer({ vec = new Vector3() }) {
  const ref = useRef();
  useFrame(({ mouse, viewport }) =>
    ref.current?.setNextKinematicTranslation(
      vec.set(
        (mouse.x * viewport.width) / 2,
        (mouse.y * viewport.height) / 2,
        0,
      ),
    ),
  );
  return (
    <RigidBody
      position={[0, 0, 0]}
      type="kinematicPosition"
      colliders={false}
      ref={ref}
    >
      <BallCollider args={[1]} />
    </RigidBody>
  );
}
