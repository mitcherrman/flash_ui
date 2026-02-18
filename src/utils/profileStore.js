// src/utils/profileStore.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "mogsy:profile:v1";

export async function saveProfile(profile) {
  const payload = {
    name: String(profile?.name || "").trim(),
    age: profile?.age == null ? null : Number(profile.age),
    location: String(profile?.location || "").trim(),
    updatedAt: Date.now(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  return payload;
}

export async function loadProfile() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearProfile() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
