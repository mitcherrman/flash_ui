// src/components/TemplateBar.js
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Modal, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadTemplate } from "../utils/cache";
import { onTemplateOpen } from "../utils/TemplateBus"; // ⟵ NEW
import { Button, Surface } from "../ui";
import s from "../styles/components/TemplateBar.styles";

export default function TemplateBar({ deckId, onHeight, hidden = false }) {
  const [open, setOpen] = useState(false);
  const [tpl, setTpl] = useState(null);

  // listen for global "open template" requests
  useEffect(() => {
    const unsub = onTemplateOpen(() => setOpen(true));
    return unsub;
  }, []);

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
      {/* Bottom bar (skip when hidden) */}
      {!hidden && (
        <SafeAreaView
          edges={["bottom", "left", "right"]}
          style={s.bar}
          onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
        >
          <View style={s.row}>
            <Button
              title={`Template ${sectionCount ? `(${sectionCount} sec · ${itemCount} pts)` : ""}`.trim()}
              variant="secondary"
              size="sm"
              accessibilityLabel="Open study template"
              onPress={() => setOpen(true)}
            />

            {!tpl && (
              <Text style={s.hint}>
                No template cached for this deck (build once to populate)
              </Text>
            )}
          </View>
        </SafeAreaView>
      )}

      {/* Full-screen modal viewer (works even when hidden) */}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={s.modalRoot}>
          <View style={s.modalTop}>
            <View style={s.modalTopInner}>
              <Text accessibilityRole="header" style={s.modalTitle} numberOfLines={2}>
                {tpl?.title || `Deck ${deckId}`} • Template
              </Text>
              <Button title="Close" variant="secondary" size="sm" onPress={() => setOpen(false)} />
            </View>
          </View>

          <ScrollView contentContainerStyle={s.modalScroll}>
            <View style={s.modalColumn}>
              {tpl?.sections?.length ? (
                tpl.sections.map((sec, idx) => (
                  <Surface key={`${idx}-${sec.title}`}>
                    <Text style={s.secTitle}>{sec.title || "Section"}</Text>
                    <Text style={s.secMeta}>
                      Pages {sec.page_start ?? "?"}–{sec.page_end ?? "?"} • {sec.items?.length || 0} points
                    </Text>
                    {(sec.items || []).map((it, j) => (
                      <View key={j} style={s.itemRow}>
                        <Text style={s.itemTerm}>• {it.term}</Text>
                        {!!it.definition && <Text style={s.itemDef}>{it.definition}</Text>}
                      </View>
                    ))}
                  </Surface>
                ))
              ) : (
                <Text style={s.noSec}>
                  No sections available. Build a deck to generate the template.
                </Text>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
