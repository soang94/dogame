import React, { useEffect, useRef, useState } from "react";
import {
  AppState,
  Animated,
  ActivityIndicator,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { File, Paths } from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  constrainFace,
  initialPet,
  readFace,
  readPet,
  tick,
  type Face,
  type Pet,
} from "./src/pet";
import { Dog, FacePhoto, Yard } from "./src/Scene";
const KEY = "dogame:pet:v1";
export default function App() {
  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}
function Game() {
  const compact = useWindowDimensions().height < 700;
  const [pet, setPet] = useState<Pet>({ ...initialPet }),
    [face, setFace] = useState<Face | null>(null),
    [draft, setDraft] = useState<Face | null>(null);
  const [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("오늘도 함께해서 좋아요"),
    [error, setError] = useState("");
  const petRef = useRef(pet),
    faceRef = useRef(face),
    ready = useRef(false),
    active = useRef(AppState.currentState === "active"),
    last = useRef(Date.now());
  const bounce = useRef(new Animated.Value(0)).current,
    heart = useRef(new Animated.Value(0)).current;
  const queue = useRef(Promise.resolve()),
    messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function save(p = petRef.current, f = faceRef.current, reportError = true) {
    if (!ready.current) return Promise.resolve(false);
    const snapshot = JSON.stringify({ pet: p, face: f });
    const write = queue.current.then(() => AsyncStorage.setItem(KEY, snapshot));
    // Keep writes ordered, while giving callers an explicit success result.
    queue.current = write.catch(() => {});
    return write.then(
      () => true,
      () => {
        if (reportError)
          setError("저장하지 못했어요. 저장 공간을 확인해 주세요.");
        return false;
      },
    );
  }

  function update(p: Pet) {
    petRef.current = p;
    setPet(p);
  }
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (!cancelled) {
            update(readPet(data.pet));
            const f = readFace(data.face);
            faceRef.current = f;
            setFace(f);
          }
        }
      } catch {
        if (!cancelled)
          setError("저장된 정보를 읽지 못했어요. 기본 강아지로 시작해요.");
      } finally {
        if (!cancelled) {
          ready.current = true;
          last.current = Date.now();
          setLoaded(true);
        }
      }
    })();
    const sub = AppState.addEventListener("change", (state) => {
      const now = Date.now();
      if (active.current && ready.current) {
        update(tick(petRef.current, Math.max(0, now - last.current) / 1000));
        void save();
      }
      active.current = state === "active";
      last.current = now;
    });
    const interval = setInterval(() => {
      const now = Date.now();
      if (active.current && ready.current) {
        update(tick(petRef.current, Math.max(0, now - last.current) / 1000));
        void save();
      }
      last.current = now;
    }, 5000);
    return () => {
      cancelled = true;
      sub.remove();
      clearInterval(interval);
      if (messageTimer.current) clearTimeout(messageTimer.current);
    };
  }, []);
  function announce(text: string) {
    setMessage(text);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(
      () => setMessage("오늘도 함께해서 좋아요"),
      3500,
    );
  }
  function action(type: "feed" | "pet" | "sleep") {
    if (petRef.current.sleeping && type !== "sleep") return;
    // Account for the partial active interval before changing sleep state.
    const now = Date.now();
    if (active.current)
      update(tick(petRef.current, (now - last.current) / 1000));
    last.current = now;
    const next = act(petRef.current, type);
    update(next);
    void save();
    announce(
      type === "feed"
        ? "냠냠! 맛있어요"
        : type === "pet"
          ? "쓰담쓰담, 기분 좋아요 ♥"
          : next.sleeping
            ? "잠깐 쉬어갈게요…"
            : "잘 잤어요! 같이 놀아요",
    );
    bounce.stopAnimation();
    bounce.setValue(0);
    Animated.sequence([
      Animated.timing(bounce, {
        toValue: -12,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(bounce, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
    if (type === "pet") {
      heart.stopAnimation();
      heart.setValue(1);
      Animated.timing(heart, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }).start();
    }
  }
  async function choosePhoto() {
    setBusy(true);
    setError("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.9,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        setDraft({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          zoom: 1,
          x: 0,
          y: 0,
        });
      }
    } catch {
      setError(
        "사진을 열지 못했어요. 사진 접근 권한을 확인하고 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function confirmPhoto(f: Face) {
    setBusy(true);
    setError("");
    try {
      let uri = f.uri;
      if (Platform.OS === "web") {
        // Browser preview uses a persistent data URL instead of an expiring blob URI.
        const response = await fetch(f.uri);
        const blob = await response.blob();
        uri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        const source = new File(f.uri);
        const destination = new File(
          Paths.document,
          `dog-face-${Date.now()}.${source.extension.replace(".", "") || "jpg"}`,
        );
        source.copy(destination);
        uri = destination.uri;
      }
      const previous = faceRef.current;
      const selected = { ...constrainFace(f), uri };
      faceRef.current = selected;
      setFace(selected);
      if (!(await save(petRef.current, selected))) {
        faceRef.current = previous;
        setFace(previous);
        void save(petRef.current, previous, false);
        if (Platform.OS !== "web") {
          try {
            new File(uri).delete();
          } catch {
            /* Retain the prior photo even if cleanup fails. */
          }
        }
        setError(
          "사진을 저장하지 못했어요. 저장 공간을 확인하고 다시 시도해 주세요.",
        );
        return;
      }
      if (previous && Platform.OS !== "web" && previous.uri !== uri) {
        try {
          const old = new File(previous.uri);
          if (
            old.uri.startsWith(Paths.document.uri) &&
            old.name.startsWith("dog-face-")
          )
            old.delete();
        } catch {
          /* The new photo is saved; a cleanup failure should not undo it. */
        }
      }
      setDraft(null);
      announce("우리 강아지가 마당에 왔어요!");
    } catch {
      setError("사진을 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  if (!loaded)
    return (
      <View style={s.loading}>
        <ActivityIndicator color="#526744" />
        <Text style={s.sub}>마당을 준비하고 있어요…</Text>
      </View>
    );
  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <View style={StyleSheet.absoluteFill}>
        <Yard />
      </View>
      <SafeAreaView style={s.safe}>
        <View
          style={[s.header, compact && { paddingTop: 4, marginBottom: 10 }]}
        >
          <View>
            <Text style={s.eyebrow}>MY LITTLE YARD</Text>
            <Text style={s.title}>우리 강아지</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="강아지 얼굴 사진 선택"
            disabled={busy}
            onPress={choosePhoto}
            style={s.photoButton}
          >
            <Text style={s.photoIcon}>＋</Text>
            <Text style={s.photoLabel}>{busy ? "준비 중" : "사진 바꾸기"}</Text>
          </Pressable>
        </View>
        <View style={s.stats}>
          <Meter
            label="포만감"
            emoji="🍚"
            value={pet.fullness}
            color="#dea755"
          />
          <Meter label="행복" emoji="♥" value={pet.happiness} color="#dc8f92" />
          <Meter label="에너지" emoji="☾" value={pet.energy} color="#81afbe" />
        </View>
        <View style={[s.center, compact && { minHeight: 210 }]}>
          <View
            style={[
              s.bubble,
              compact && { marginBottom: 4, paddingVertical: 8 },
            ]}
          >
            <Text style={s.bubbleText}>
              {pet.sleeping ? "새근새근… 쉬는 중이에요" : message}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              pet.sleeping ? "잠자는 강아지" : "강아지 쓰다듬기"
            }
            disabled={pet.sleeping}
            onPress={() => action("pet")}
          >
            <Animated.View style={{ transform: [{ translateY: bounce }] }}>
              <View style={compact ? { width: 200, height: 200 } : undefined}>
                <View
                  style={
                    compact
                      ? {
                          width: 250,
                          height: 250,
                          marginLeft: -25,
                          marginTop: -25,
                          transform: [{ scale: 0.8 }],
                        }
                      : undefined
                  }
                >
                  <Dog face={face} sleeping={pet.sleeping} />
                </View>
              </View>
            </Animated.View>
          </Pressable>
          <Animated.Text
            pointerEvents="none"
            style={[
              s.heart,
              {
                opacity: heart,
                transform: [
                  {
                    translateY: heart.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-65, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            ♥
          </Animated.Text>
          {pet.sleeping && <Text style={s.zzz}>z Z z</Text>}
          {!face && (
            <Pressable
              onPress={choosePhoto}
              disabled={busy}
              accessibilityRole="button"
              style={s.photoHint}
            >
              <Text style={s.hintText}>＋ 내 강아지 사진으로 시작하기</Text>
            </Pressable>
          )}
        </View>
        {!!error && (
          <View accessibilityRole="alert" style={s.error}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}
        <View style={s.actions}>
          <Action
            label="밥 주기"
            icon="🍚"
            color="#f5d994"
            disabled={pet.sleeping}
            onPress={() => action("feed")}
          />
          <Action
            label="쓰다듬기"
            icon="♡"
            color="#f1c1c1"
            disabled={pet.sleeping}
            onPress={() => action("pet")}
          />
          <Action
            label={pet.sleeping ? "깨우기" : "재우기"}
            icon={pet.sleeping ? "☀" : "☾"}
            color="#bbdce8"
            onPress={() => action("sleep")}
          />
        </View>
        <Text style={s.footer}>앱을 사용하는 동안만 상태가 변해요</Text>
      </SafeAreaView>
      <Modal
        visible={!!draft}
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setDraft(null);
        }}
      >
        {draft && (
          <FaceEditor
            initial={draft}
            busy={busy}
            error={error}
            onCancel={() => setDraft(null)}
            onSave={confirmPhoto}
          />
        )}
      </Modal>
    </View>
  );
}
function Meter({
  label,
  emoji,
  value,
  color,
}: {
  label: string;
  emoji: string;
  value: number;
  color: string;
}) {
  return (
    <View
      style={s.meter}
      accessible
      accessibilityLabel={`${label} ${Math.round(value)}퍼센트`}
    >
      <View style={s.meterTop}>
        <Text style={[s.meterLabel, { color }]}>
          {emoji} {label}
        </Text>
        <Text style={s.number}>{Math.round(value)}</Text>
      </View>
      <View style={s.track}>
        <View
          style={{
            height: 7,
            width: `${value}%`,
            backgroundColor: color,
            borderRadius: 5,
          }}
        />
      </View>
    </View>
  );
}
function Action({
  label,
  icon,
  color,
  onPress,
  disabled = false,
}: {
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        {
          backgroundColor: color,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <Text style={s.actionIcon}>{icon}</Text>
      <Text style={s.actionText}>{label}</Text>
    </Pressable>
  );
}
function FaceEditor({
  initial,
  busy,
  error,
  onCancel,
  onSave,
}: {
  initial: Face;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onSave: (f: Face) => void;
}) {
  const [face, setFace] = useState(initial);
  const current = useRef(initial),
    origin = useRef({ x: 0, y: 0 });
  const change = (f: Face) => {
    const next = constrainFace(f);
    current.current = next;
    setFace(next);
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        origin.current = { x: current.current.x, y: current.current.y };
      },
      onPanResponderMove: (_, g) =>
        change({
          ...current.current,
          x: origin.current.x + g.dx,
          y: origin.current.y + g.dy,
        }),
    }),
  ).current;
  return (
    <SafeAreaView style={s.editorSafe}>
      <ScrollView contentContainerStyle={s.editor}>
        <View style={s.editorHeader}>
          <Text style={s.eyebrow}>MEET YOUR DOG</Text>
          <Text style={s.title}>얼굴을 맞춰주세요</Text>
          <Text style={s.editorDescription}>
            {
              "사진을 끌어서 위치를 맞추고\n크기를 조절해 얼굴을 원 안에 담아주세요."
            }
          </Text>
        </View>
        <View style={s.crop} {...pan.panHandlers}>
          <FacePhoto face={face} size={220} />
        </View>
        <View style={s.zoom}>
          <Pressable
            disabled={busy || face.zoom <= 1}
            accessibilityRole="button"
            accessibilityLabel="사진 축소"
            onPress={() =>
              change({
                ...current.current,
                zoom: Math.max(1, current.current.zoom - 0.15),
              })
            }
            style={s.zoomButton}
          >
            <Text style={s.zoomText}>−</Text>
          </Pressable>
          <Text style={s.sub}>{Math.round(face.zoom * 100)}%</Text>
          <Pressable
            disabled={busy || face.zoom >= 3}
            accessibilityRole="button"
            accessibilityLabel="사진 확대"
            onPress={() =>
              change({
                ...current.current,
                zoom: Math.min(3, current.current.zoom + 0.15),
              })
            }
            style={s.zoomButton}
          >
            <Text style={s.zoomText}>＋</Text>
          </Pressable>
        </View>
        <Text style={s.sub}>사진은 이 기기에만 저장돼요</Text>
        {!!error && (
          <Text accessibilityRole="alert" style={s.errorText}>
            {error}
          </Text>
        )}
        <View style={s.editorButtons}>
          <Pressable
            disabled={busy}
            accessibilityRole="button"
            onPress={onCancel}
            style={s.cancel}
          >
            <Text style={s.actionText}>취소</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            accessibilityRole="button"
            onPress={() => onSave(current.current)}
            style={s.confirm}
          >
            <Text style={s.confirmText}>
              {busy ? "저장 중…" : "이 얼굴로 시작하기"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#d3e7bb" },
  safe: { flex: 1, paddingHorizontal: 24 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#f7f5eb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#687655",
    fontWeight: "700",
    marginBottom: 6,
  },
  title: { fontSize: 28, fontWeight: "800", color: "#354732" },
  photoButton: {
    backgroundColor: "#fffaf0",
    borderRadius: 19,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e6e6d3",
  },
  photoIcon: { fontSize: 22, color: "#637252" },
  photoLabel: { fontSize: 10, color: "#637252", fontWeight: "700" },
  stats: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(255,252,240,.94)",
    padding: 14,
    borderRadius: 20,
  },
  meter: { flex: 1 },
  meterTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  meterLabel: { fontSize: 11, fontWeight: "700" },
  number: { fontSize: 11, color: "#687655", fontWeight: "600" },
  track: {
    height: 7,
    borderRadius: 5,
    backgroundColor: "#e8e8da",
    overflow: "hidden",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 275,
  },
  bubble: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#fffaf0",
    borderRadius: 20,
    marginBottom: 14,
  },
  bubbleText: { fontSize: 13, color: "#637252", fontWeight: "600" },
  heart: {
    position: "absolute",
    top: "35%",
    right: "23%",
    fontSize: 40,
    color: "#d97983",
  },
  zzz: {
    position: "absolute",
    top: "35%",
    right: "20%",
    color: "#547d97",
    fontSize: 25,
    fontWeight: "700",
  },
  photoHint: {
    backgroundColor: "rgba(255,250,240,.9)",
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  hintText: { fontSize: 12, color: "#526744", fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10 },
  action: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,.65)",
  },
  actionIcon: { fontSize: 30, marginBottom: 8, color: "#735542" },
  actionText: { fontSize: 14, fontWeight: "800", color: "#514d3d" },
  footer: {
    textAlign: "center",
    fontSize: 10,
    color: "#fff9e9",
    paddingVertical: 14,
    fontWeight: "600",
  },
  error: {
    padding: 10,
    backgroundColor: "#fff1e9",
    borderRadius: 12,
    marginBottom: 10,
  },
  errorText: { fontSize: 12, color: "#9f493e", textAlign: "center" },
  editorSafe: { flex: 1, backgroundColor: "#f7f5eb" },
  editor: {
    flexGrow: 1,
    backgroundColor: "#f7f5eb",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 22,
  },
  editorHeader: { alignItems: "center", gap: 6 },
  editorDescription: {
    textAlign: "center",
    fontSize: 14,
    color: "#748069",
    lineHeight: 23,
    marginTop: 10,
  },
  crop: {
    borderRadius: 120,
    borderWidth: 5,
    borderColor: "#d6dfc2",
    overflow: "hidden",
  },
  zoom: { flexDirection: "row", alignItems: "center", gap: 30 },
  zoomButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e5ead9",
  },
  zoomText: { fontSize: 26, color: "#526744" },
  sub: { fontSize: 12, color: "#748069" },
  editorButtons: { flexDirection: "row", gap: 12, marginTop: 12 },
  cancel: {
    paddingVertical: 17,
    paddingHorizontal: 24,
    borderRadius: 18,
    backgroundColor: "#e9e8de",
  },
  confirm: {
    paddingVertical: 17,
    paddingHorizontal: 24,
    borderRadius: 18,
    backgroundColor: "#627950",
  },
  confirmText: { fontSize: 14, fontWeight: "700", color: "#fffaf0" },
});
