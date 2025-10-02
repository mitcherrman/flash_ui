// src/components/TemplateBar.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  SafeAreaView,
  Platform,
} from "react-native";
import { loadTemplate } from "../utils/cache";

export default function TemplateBar({ deckId, onHeight }) {
  const [open, setOpen] = useState(false);
  const [tpl, setTpl] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await loadTemplate(deckId);
        if (mounted) setTpl(data || null);
      } catch {
        if (mounted) setTpl(null);
      }
    })();
    return () => { mounted = false; };
  }, [deckId]);

  const sectionCount = tpl?.sections?.length || 0;
  const itemCount = useMemo(() => {
    if (!tpl?.sections) return 0;
    return tpl.sections.reduce((acc, s) => acc + (s.items?.length || 0), 0);
  }, [tpl]);

  return (
    <>
      {/* Bottom bar */}
      <SafeAreaView
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#062B52", // deep navy (Berkeley-ish)
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.08)",
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: Platform.OS === "web" ? 12 : 6,
          zIndex: 50,
        }}
        onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            justifyContent: "center",
          }}
        >
          <Pressable
            onPress={() => setOpen(true)}
            style={{
              backgroundColor: "#FDB515",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
            }}
          >
            <Text style={{ color: "#032e5d", fontWeight: "800" }}>
              Template {sectionCount ? `(${sectionCount} sec · ${itemCount} pts)` : ""}
            </Text>
          </Pressable>

          {!tpl && (
            <Text style={{ color: "#93c5fd", opacity: 0.9 }}>
              No template cached for this deck (build once to populate)
            </Text>
          )}
        </View>
      </SafeAreaView>

      {/* Full-screen modal viewer */}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#001f3f" }}>
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255,255,255,0.08)",
              backgroundColor: "#032e5d",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>
              {tpl?.title || `Deck ${deckId}`} • Template
            </Text>
            <Pressable
              onPress={() => setOpen(false)}
              style={{ backgroundColor: "#FDB515", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}
            >
              <Text style={{ color: "#032e5d", fontWeight: "800" }}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {tpl?.sections?.length ? (
              tpl.sections.map((s, idx) => (
                <View
                  key={`${idx}-${s.title}`}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.04)",
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16, marginBottom: 4 }}>
                    {s.title || "Section"}
                  </Text>
                  <Text style={{ color: "#93c5fd", marginBottom: 8 }}>
                    Pages {s.page_start ?? "?"}–{s.page_end ?? "?"} • {s.items?.length || 0} points
                  </Text>
                  {(s.items || []).map((it, j) => (
                    <View key={j} style={{ marginBottom: 8 }}>
                      <Text style={{ color: "#e5e7eb", fontWeight: "700" }}>• {it.term}</Text>
                      {!!it.definition && (
                        <Text style={{ color: "#cbd5e1" }}>{it.definition}</Text>
                      )}
                    </View>
                  ))}
                </View>
              ))
            ) : (
              <Text style={{ color: "#93c5fd" }}>
                No sections available. Build a deck to generate the template.
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
