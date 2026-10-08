// src/demo/DemoSourceScreen.js
// The offline demo's first screen (F6): the synthetic source document and
// what the pipeline made of it, before handing over to the real Picker and
// study screens. Everything shown is read from the fixture: the analysis,
// the template's section ranges and the cards' grounded pages.
//
// It stands in for the app's Upload step (it is registered under that route
// name): building a deck from a new PDF needs the backend and a model key,
// which the demo deliberately doesn't have.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { formatPageRange } from "../source/plan";
import StructureSummary from "../components/source/StructureSummary";
import { colors, radius, spacing, text } from "../theme";
import { Badge, BrandMark, Button, MetaLabel, PageHeader, ProductSteps, Screen, Surface } from "../ui";
import { demoSections, groundingExample, provenanceCounts } from "./demoSource";
import { openDeckAction, startStudyAction } from "./demoNav";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default function DemoSourceScreen({ navigation, fixture }) {
  const deckId = fixture.generate.deck_id;
  const doc = fixture.document;
  const sections = demoSections(fixture);
  const counts = provenanceCounts(fixture);
  const example = groundingExample(fixture);
  const exampleSection = example ? sections.find((s) => s.title === example.card.section) : null;
  const unknown = fixture.hand.find((c) => c.page == null);
  const unknownSection = unknown ? sections.find((s) => s.title === unknown.section) : null;

  return (
    <Screen scroll maxWidth="content">
      <PageHeader
        left={<BrandMark size={24} />}
        eyebrow={<Badge tone="accent">Offline demo · synthetic document</Badge>}
        title={doc.title}
        subtitle={`A fictional ${fixture.analysis.pages}-page PDF and the ${plural(
          counts.total,
          "card",
          "cards"
        )} built from it. You study the saved deck right here: no upload, no server and no AI call.`}
      />

      <View style={styles.actions}>
        <Button title="Start Flip Drill" size="lg" onPress={() => navigation.dispatch(startStudyAction(deckId, "Game2"))} />
        <Button
          title="Open the deck"
          size="lg"
          variant="secondary"
          accessibilityLabel="Open the deck: study modes, contents and template"
          onPress={() => navigation.dispatch(openDeckAction(deckId))}
        />
      </View>

      <Text style={styles.sectionLabel} accessibilityRole="header">
        How the deck was made
      </Text>
      <ProductSteps style={styles.steps} />

      <Surface style={styles.block}>
        <MetaLabel>Source</MetaLabel>
        <Text style={styles.fileName}>{doc.filename}</Text>
        <Text style={text.small}>{doc.notice}</Text>
      </Surface>

      <View style={styles.block}>
        <StructureSummary stats={fixture.analysis} sectionCount={fixture.analysis.sections_count} />
      </View>

      <Surface style={styles.block}>
        <Text style={text.heading} accessibilityRole="header">
          Sections and cards
        </Text>
        <Text style={[text.muted, styles.gapSm]}>
          {plural(counts.total, "card", "cards")} · {counts.exact} tied to an exact page · {counts.unknown} with the page
          unknown
        </Text>
        {sections.map((s) => (
          <View
            key={s.title}
            style={styles.secRow}
            accessible
            accessibilityLabel={`${s.title}, ${formatPageRange(s)}, ${plural(s.cards, "card", "cards")}`}
          >
            <View style={styles.secText}>
              <Text style={text.bodyStrong}>{s.title}</Text>
              <Text style={text.small}>{formatPageRange(s)}</Text>
            </View>
            <Badge>{plural(s.cards, "card", "cards")}</Badge>
          </View>
        ))}
      </Surface>

      {example && (
        <Surface variant="source" style={styles.block}>
          <Text style={text.heading} accessibilityRole="header">
            From source to card
          </Text>
          <MetaLabel style={styles.gapMd}>
            Page {example.page} · {example.card.section}
          </MetaLabel>
          <Text style={[text.secondary, styles.gapSm]}>
            {example.before}
            <Text style={styles.mark} accessibilityLabel={`Excerpt: ${example.match}`}>
              {example.match}
            </Text>
            {example.after}
          </Text>
          <View style={styles.arrowRow}>
            <Text style={styles.arrow} accessibilityElementsHidden importantForAccessibility="no">
              ↓
            </Text>
            <Text style={[text.muted, styles.secText]}>
              The highlighted sentence is card {example.card.ordinal}'s excerpt. It appears word for word on page{" "}
              {example.page}, so the card is tied to that page
              {exampleSection && exampleSection.page_end > exampleSection.page_start
                ? ` (its section covers ${formatPageRange(exampleSection).toLowerCase()})`
                : ""}
              .
            </Text>
          </View>
          <View style={styles.cardPreview}>
            <MetaLabel>Card {example.card.ordinal} · Question</MetaLabel>
            <Text style={[text.bodyStrong, styles.gapXs]}>{example.card.front}</Text>
            <Text style={[text.small, styles.gapXs]}>
              Page {example.card.page} · {example.card.section}
            </Text>
          </View>
          {unknown && unknownSection && (
            <Text style={[text.small, styles.gapMd]}>
              Card {unknown.ordinal}'s excerpt is a paraphrase, so no page can be confirmed for it. The app says "Page
              unknown · Section covers {formatPageRange(unknownSection).toLowerCase()}" instead of guessing.
            </Text>
          )}
        </Surface>
      )}

      <Text style={[text.muted, styles.footnote]}>
        Making a deck from your own PDF needs the Flashcard Maker server and a model API key, so this demo ships one
        deck. Its card text was written for the demo; the page numbers, section ranges and card order were computed
        by the real backend pipeline.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.xxl },
  sectionLabel: { ...text.heading, marginBottom: spacing.lg },
  steps: { marginBottom: spacing.xl },
  block: { marginBottom: spacing.lg },
  fileName: { ...text.bodyStrong, marginTop: spacing.xs, marginBottom: spacing.xs },
  gapXs: { marginTop: spacing.xs },
  gapSm: { marginTop: spacing.sm },
  gapMd: { marginTop: spacing.md },
  secRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  secText: { flexShrink: 1 },
  // Highlighter mark: tinted background plus an underline, so the excerpt
  // doesn't rely on colour alone.
  mark: {
    backgroundColor: colors.cardBack,
    color: colors.text,
    textDecorationLine: "underline",
    textDecorationColor: colors.highlightText,
  },
  arrowRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  arrow: { ...text.heading, color: colors.highlightText },
  cardPreview: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardFront,
  },
  footnote: { marginTop: spacing.md },
});
