import React from "react";
import { View, Image, StyleSheet } from "react-native";
import Svg, {
  Path,
  Ellipse,
  Circle,
  Rect,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import type { Face } from "./pet";
export function Yard() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 400 800"
      preserveAspectRatio="xMidYMid slice"
    >
      <Defs>
        <LinearGradient id="sky" x2="0" y2="1">
          <Stop offset="0" stopColor="#c9eafa" />
          <Stop offset="1" stopColor="#f4f7dd" />
        </LinearGradient>
        <LinearGradient id="grass" x2="0" y2="1">
          <Stop offset="0" stopColor="#b9d889" />
          <Stop offset="1" stopColor="#6ba269" />
        </LinearGradient>
      </Defs>
      <Rect width="400" height="800" fill="url(#sky)" />
      <Circle cx="330" cy="105" r="42" fill="#fff3bd" />
      <Ellipse cx="80" cy="140" rx="62" ry="16" fill="#ffffff" opacity=".7" />
      <Ellipse cx="245" cy="190" rx="70" ry="15" fill="#fff" opacity=".6" />
      <Path
        d="M0 350 Q90 270 190 340 Q300 260 400 320 L400 800 L0 800Z"
        fill="#c6df9e"
      />
      <Path
        d="M0 405 Q140 350 250 400 Q350 370 400 390 L400 800 L0 800Z"
        fill="url(#grass)"
      />
      {[20, 60, 100, 140, 180, 220, 260, 300, 340, 380].map((x) => (
        <Path
          key={x}
          d={`M${x} 405 v-67 l12 -10 12 10 v67`}
          fill="#f6efdd"
          stroke="#e7dfc9"
          strokeWidth="2"
        />
      ))}
      <Rect x="0" y="359" width="400" height="9" fill="#e6dcc4" />
      <Path d="M288 419 V335 H373 V419Z" fill="#e5ba83" />
      <Path d="M276 338 L330 289 L385 338Z" fill="#c97e63" />
      <Path d="M315 419 V381 A16 16 0 0 1 347 381 V419Z" fill="#946950" />
      {Array.from({ length: 42 }, (_, i) => {
        const x = (i * 83 + 19) % 400,
          y = 440 + ((i * 53) % 350);
        return (
          <Path
            key={i}
            d={`M${x} ${y} l-5 -9 m5 9 l5 -12`}
            stroke="#548451"
            strokeWidth="2"
            opacity=".4"
          />
        );
      })}
      {[
        { x: 35, y: 476 },
        { x: 350, y: 503 },
        { x: 63, y: 622 },
        { x: 325, y: 695 },
        { x: 115, y: 732 },
      ].map((p, i) => (
        <React.Fragment key={i}>
          {[0, 1, 2, 3, 4].map((j) => (
            <Circle
              key={j}
              cx={p.x + Math.cos(j * 1.257) * 6}
              cy={p.y + Math.sin(j * 1.257) * 6}
              r="5"
              fill="#fffbee"
            />
          ))}
          <Circle cx={p.x} cy={p.y} r="3" fill="#e9bd62" />
        </React.Fragment>
      ))}
    </Svg>
  );
}
export function FacePhoto({ face, size }: { face: Face; size: number }) {
  const ratio = size / 220,
    scale = Math.max(220 / face.width, 220 / face.height) * face.zoom;
  const width = face.width * scale * ratio,
    height = face.height * scale * ratio;
  return (
    <View
      style={{
        width: size,
        height: face.mode === "cutout" ? size * (face.bottom ?? 0.85) : size,
        borderRadius: face.mode === "cutout" ? 0 : size / 2,
        overflow: "hidden",
        backgroundColor: face.mode === "cutout" ? "transparent" : "#f4e4c5",
      }}
    >
      <Image
        source={{ uri: face.uri }}
        style={{
          position: "absolute",
          width,
          height,
          left: (size - width) / 2 + face.x * ratio,
          top: (size - height) / 2 + face.y * ratio,
        }}
        resizeMode="stretch"
      />
    </View>
  );
}
export function Dog({
  face,
  sleeping,
}: {
  face: Face | null;
  sleeping: boolean;
}) {
  return (
    <View style={s.dog}>
      <Svg width="250" height="250" viewBox="0 0 250 250">
        <Ellipse
          cx="125"
          cy="226"
          rx="81"
          ry="13"
          fill="#385b35"
          opacity=".18"
        />
        <Path
          d="M185 186 Q238 136 204 114 Q231 173 175 182"
          fill="#e8c391"
          stroke="#b48b62"
          strokeWidth="3"
        />
        <Ellipse
          cx="125"
          cy="171"
          rx="60"
          ry="58"
          fill="#edd2a5"
          stroke="#b48b62"
          strokeWidth="3"
        />
        <Ellipse cx="101" cy="179" rx="19" ry="43" fill="#fff0d4" />
        <Ellipse cx="147" cy="179" rx="19" ry="43" fill="#fff0d4" />
        <Ellipse
          cx="87"
          cy="218"
          rx="26"
          ry="15"
          fill="#f8e4c1"
          stroke="#b48b62"
          strokeWidth="3"
        />
        <Ellipse
          cx="161"
          cy="218"
          rx="26"
          ry="15"
          fill="#f8e4c1"
          stroke="#b48b62"
          strokeWidth="3"
        />
        <Path d="M78 127 L125 157 L170 127" fill="#e6ad51" />
        <Circle cx="125" cy="141" r="6" fill="#fff2c7" />
        {!face && (
          <>
            <Ellipse
              cx="62"
              cy="80"
              rx="22"
              ry="43"
              fill="#bb865c"
              transform="rotate(20 62 80)"
            />
            <Ellipse
              cx="188"
              cy="80"
              rx="22"
              ry="43"
              fill="#bb865c"
              transform="rotate(-20 188 80)"
            />
            <Ellipse
              cx="125"
              cy="82"
              rx="65"
              ry="56"
              fill="#f6dfb9"
              stroke="#b48b62"
              strokeWidth="3"
            />
            {sleeping ? (
              <>
                <Path
                  d="M87 77 q10 9 20 0 M144 77 q10 9 20 0"
                  stroke="#594638"
                  strokeWidth="4"
                  fill="none"
                />
              </>
            ) : (
              <>
                <Circle cx="99" cy="75" r="5" fill="#594638" />
                <Circle cx="152" cy="75" r="5" fill="#594638" />
              </>
            )}
            <Ellipse cx="125" cy="98" rx="26" ry="19" fill="#fff0d4" />
            <Path d="M117 92 Q125 86 133 92 L125 100Z" fill="#594638" />
            <Path
              d="M125 100 v7 m-12 -2 q12 12 24 0"
              fill="none"
              stroke="#594638"
              strokeWidth="3"
            />
            <Circle cx="85" cy="96" r="8" fill="#e8a896" opacity=".6" />
            <Circle cx="165" cy="96" r="8" fill="#e8a896" opacity=".6" />
          </>
        )}
      </Svg>
      {face && (
        <View
          style={[
            s.face,
            face.mode === "cutout" && {
              borderWidth: 0,
              borderRadius: 0,
              left: 61,
            },
          ]}
        >
          <FacePhoto face={face} size={128} />
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  dog: { width: 250, height: 250 },
  face: {
    position: "absolute",
    top: 11,
    left: 61,
    borderWidth: 3,
    borderColor: "#f6dfb9",
    borderRadius: 70,
    overflow: "hidden",
  },
});
