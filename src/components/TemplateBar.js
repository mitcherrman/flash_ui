// src/components/TemplateBar.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Modal, ScrollView, SafeAreaView, Platform } from "react-native";
import { loadTemplate } from "../utils/cache";
import styles from "../styles/components/TemplateBar.styles";

export default function TemplateBar({ deckId, onHeight, hidden = false }) {
  // ---- Hooks MUST be unconditional (avoid early returns before hooks) ----
  const [open, setOpen] = useState(false);
  const [tpl, setTpl] = useState(null);

  // We keep the measured height locally so we can notify the parent via effect
  const [measuredH, setMeasuredH] = useState(0);
  const rafRef = useRef(null);

  // Load cached template once per deck
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
    return () => {
      mounted = false;
    };
  }, [deckId]);

  // If hidden, report 0 height to parent (defer via RAF to avoid “setState while rendering”)
  useEffect(() => {
    if (!onHeight) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      onHeight(hidden ? 0 : measuredH);
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [hidden, measuredH, onHeight]);

  const sectionCount = tpl?.sections?.length || 0;
  const itemCount = useMemo(() => {
    if (!tpl?.sections) return 0;
    return tpl.sections.reduce((acc, s) => acc + (s.items?.length || 0), 0);
  }, [tpl]);

  // If hidden, render nothing (hooks above still ran, so no “fewer hooks” error)
  if (hidden) return null;

  return (
    <>
      {/* Bottom bar */}
      <SafeAreaView
        style={styles.bar}
        onLayout={(e) => {
          // Do NOT call onHeight here; store locally, then notify in useEffect
          const h = e.nativeEvent.layout.height || 0;
          if (h !== measuredH) setMeasuredH(h);
        }}
      >
        <View style={styles.row}>
          <Pressable onPress={() => setOpen(true)} style={styles.btn}>
            <Text style={styles.btnTxt}>
              Template {sectionCount ? `(${sectionCount} sec · ${itemCount} pts)` : ""}
            </Text>
          </Pressable>

          {!tpl && (
            <Text style={styles.hint}>
              No template cached for this deck (build once to populate)
            </Text>
          )}
        </View>
      </SafeAreaView>

      {/* Full-screen modal viewer */}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalTop}>
            <Text style={styles.modalTitle}>
              {tpl?.title || `Deck ${deckId}`} • Template
            </Text>
            <Pressable onPress={() => setOpen(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseTxt}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            {tpl?.sections?.length ? (
              tpl.sections.map((s, idx) => (
                <View key={`${idx}-${s.title}`} style={styles.secCard}>
                  <Text style={styles.secTitle}>{s.title || "Section"}</Text>
                  <Text style={styles.secMeta}>
                    Pages {s.page_start ?? "?"}–{s.page_end ?? "?"} • {s.items?.length || 0} points
                  </Text>
                  {(s.items || []).map((it, j) => (
                    <View key={j} style={styles.itemRow}>
                      <Text style={styles.itemTerm}>• {it.term}</Text>
                      {!!it.definition && <Text style={styles.itemDef}>{it.definition}</Text>}
                    </View>
                  ))}
                </View>
              ))
            ) : (
              <Text style={styles.noSec}>
                No sections available. Build a deck to generate the template.
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
