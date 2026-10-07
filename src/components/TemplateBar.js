// src/components/TemplateBar.js
// Bottom bar under the Flip Drill that opens the study template (F3).
// It owns its own TemplateSheet; nothing else can open it. (Before F3 every
// mounted TemplateBar listened to a global bus, so the TOC's Template button
// opened one modal per mounted bar.)
import React, { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../ui";
import TemplateSheet from "./study/TemplateSheet";
import { loadTemplateForViewing } from "../study/useDeck";
import { templateCounts } from "../study/template";
import s from "../styles/components/TemplateBar.styles";

export default function TemplateBar({ deckId, template = null, deckTitle = null, onHeight, hidden = false }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { sections, points } = templateCounts(template);

  async function openSheet() {
    setOpen(true);
    setError("");
    if (template) {
      setShown(template);
      return;
    }
    setLoading(true);
    try {
      setShown(await loadTemplateForViewing(deckId, deckTitle));
    } catch (e) {
      console.warn("[TemplateBar] template unavailable", e);
      setShown(null);
      setError("The deck's cards couldn't be loaded to rebuild an outline. Check the connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!hidden && (
        <SafeAreaView
          edges={["bottom", "left", "right"]}
          style={s.bar}
          onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
        >
          <View style={s.row}>
            <Button
              title="Study template"
              variant="secondary"
              size="sm"
              accessibilityLabel="Open study template"
              onPress={openSheet}
            />
            <Text style={s.hint} numberOfLines={1}>
              {sections ? `${sections} ${sections === 1 ? "section" : "sections"} · ${points} key points` : "Outline rebuilt from your cards"}
            </Text>
          </View>
        </SafeAreaView>
      )}

      <TemplateSheet
        visible={open}
        onClose={() => setOpen(false)}
        template={shown}
        loading={loading}
        error={error}
        deckTitle={deckTitle}
      />
    </>
  );
}
