// src/components/study/TemplateSheet.js
// The one study-template viewer (F3). Each screen that offers the template
// owns exactly one of these and its `visible` state: Picker, the Flip Drill
// TemplateBar, and the TOC. There is no global "open template" event any
// more, so opening it once shows one sheet and Close closes it.
//
// F4: phones and short landscape get a full-screen sheet; tablet and desktop
// windows get a centred dialog over a scrim, so the outline reads as a
// column instead of a full-bleed page. Either way the header with Close
// stays fixed while the content scrolls on its own. On web, Escape closes
// it and focus returns to the button that opened it (react-native-web Modal).
import React from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../theme";
import { Button, Notice, Surface, useLayout, useReducedMotion } from "../../ui";
import { isTrustworthyTitle } from "../../study/deck";
import { isReconstructed, templateCounts, templateRangeLabel } from "../../study/template";
import s from "../../styles/components/TemplateBar.styles";

export default function TemplateSheet({ visible, onClose, template, loading = false, error = "", deckTitle = null }) {
  const title = isTrustworthyTitle(template?.title) ? template.title : isTrustworthyTitle(deckTitle) ? deckTitle : null;
  const sections = Array.isArray(template?.sections) ? template.sections : [];
  const { points } = templateCounts(template);
  const reduceMotion = useReducedMotion();
  const { height, layoutClass } = useLayout();
  const asDialog = layoutClass === "tablet" || layoutClass === "desktop";

  const top = (
    <View style={[s.modalTop, asDialog && s.dialogTop]}>
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
  );

  const body = loading ? (
    <View style={s.modalCenter} accessibilityRole="progressbar" accessibilityLabel="Loading study template">
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  ) : (
    <ScrollView style={asDialog ? s.dialogScroll : null} contentContainerStyle={s.modalScroll}>
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
  );

  return (
    <Modal
      visible={!!visible}
      transparent={asDialog}
      animationType={reduceMotion ? "none" : asDialog ? "fade" : "slide"}
      onRequestClose={onClose}
      // The web dialog's accessible name (react-native-web passes it to role=dialog; F6).
      aria-label="Study template"
    >
      {asDialog ? (
        <View style={s.scrim}>
          {/* Clicking outside closes, like Close (not a separate tab stop) */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            focusable={false}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          />
          <SafeAreaView edges={[]} style={[s.dialog, { maxHeight: Math.round(height * 0.88) }]}>
            {top}
            {body}
          </SafeAreaView>
        </View>
      ) : (
        <SafeAreaView style={s.modalRoot}>
          {top}
          {body}
        </SafeAreaView>
      )}
    </Modal>
  );
}
