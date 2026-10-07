// src/components/study/TemplateSheet.js
// The one study-template viewer (F3). Each screen that offers the template
// owns exactly one of these and its `visible` state: Picker, the Flip Drill
// TemplateBar, and the TOC. There is no global "open template" event any
// more, so opening it once shows one sheet and Close closes it.
import React from "react";
import { ActivityIndicator, Modal, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../theme";
import { Button, Notice, Surface, useReducedMotion } from "../../ui";
import { isTrustworthyTitle } from "../../study/deck";
import { isReconstructed, templateCounts, templateRangeLabel } from "../../study/template";
import s from "../../styles/components/TemplateBar.styles";

export default function TemplateSheet({ visible, onClose, template, loading = false, error = "", deckTitle = null }) {
  const title = isTrustworthyTitle(template?.title) ? template.title : isTrustworthyTitle(deckTitle) ? deckTitle : null;
  const sections = Array.isArray(template?.sections) ? template.sections : [];
  const { points } = templateCounts(template);
  const reduceMotion = useReducedMotion();

  return (
    <Modal visible={!!visible} animationType={reduceMotion ? "none" : "slide"} onRequestClose={onClose}>
      <SafeAreaView style={s.modalRoot}>
        <View style={s.modalTop}>
          <View style={s.modalTopInner}>
            <View style={s.modalTitleWrap}>
              <Text accessibilityRole="header" style={s.modalTitle} numberOfLines={2}>
                Study template
              </Text>
              {!!title && (
                <Text style={s.modalSub} numberOfLines={2}>
                  {title}
                </Text>
              )}
            </View>
            <Button title="Close" variant="secondary" size="sm" accessibilityLabel="Close study template" onPress={onClose} />
          </View>
        </View>

        {loading ? (
          <View style={s.modalCenter} accessibilityRole="progressbar" accessibilityLabel="Loading study template">
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.modalScroll}>
            <View style={s.modalColumn}>
              {error ? (
                <Notice tone="error" title="Couldn't open the study template" message={error} />
              ) : !sections.length ? (
                <Text style={s.noSec}>No study template is saved for this deck.</Text>
              ) : (
                <>
                  <Text style={s.summary}>
                    {sections.length} {sections.length === 1 ? "section" : "sections"} · {points} key {points === 1 ? "point" : "points"}
                  </Text>
                  {isReconstructed(template) && (
                    <Notice
                      tone="info"
                      title="Rebuilt from your cards"
                      message="The study template from the build isn't saved on this device, so this outline lists your cards by section. Page ranges cover only the cards' known pages."
                    />
                  )}
                  {sections.map((sec, idx) => (
                    <Surface key={`${idx}-${sec?.title}`}>
                      <Text style={s.secTitle}>{sec?.title || "Untitled section"}</Text>
                      <Text style={s.secMeta}>
                        {templateRangeLabel(sec)} · {(sec?.items || []).length}{" "}
                        {(sec?.items || []).length === 1 ? "point" : "points"}
                      </Text>
                      {(sec?.items || []).map((it, j) => (
                        <View key={j} style={s.itemRow}>
                          <Text style={s.itemTerm}>{it?.term || "—"}</Text>
                          {!!it?.definition && <Text style={s.itemDef}>{it.definition}</Text>}
                        </View>
                      ))}
                    </Surface>
                  ))}
                </>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
