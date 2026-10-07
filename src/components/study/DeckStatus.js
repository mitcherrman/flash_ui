// src/components/study/DeckStatus.js
// Full-screen loading / empty / missing / error state for a study screen
// (F3). Every state ends in a way out: Try again, Back to deck, Back to
// Upload, and — for a deck the server no longer has — Forget this deck.
import React from "react";
import { Text } from "react-native";
import { text } from "../../theme";
import { Button, StatusView } from "../../ui";
import { describeDeckState } from "../../study/deck";
import { backToPickerAction, backToUploadAction } from "../../study/tocNav";
import { forgetDeck } from "../../utils/cache";

export default function DeckStatus({ state, deckId, navigation, loadingTitle = "Loading cards…", showBackToDeck = true }) {
  if (state?.status === "loading") return <StatusView loading title={loadingTitle} />;

  const copy = describeDeckState(state, { deckId });
  const toUpload = () => navigation?.dispatch(backToUploadAction());
  const forget = async () => {
    await forgetDeck(deckId);
    toUpload();
  };

  const stale = state?.status === "missing" || state?.status === "empty";
  const noDeck = state?.reason === "no-deck";
  const retryable = state?.status === "error" && !noDeck;

  const action = (
    <>
      {retryable && <Button title="Try again" size="sm" onPress={state.retry} />}
      {showBackToDeck && !stale && !noDeck && (
        <Button title="Back to deck" size="sm" variant="secondary" onPress={() => navigation?.dispatch(backToPickerAction(deckId))} />
      )}
      <Button title="Back to Upload" size="sm" variant={retryable ? "secondary" : "primary"} onPress={toUpload} />
      {stale && (
        <Button
          title="Forget this deck"
          size="sm"
          variant="secondary"
          accessibilityHint="Removes this deck's saved copy and resume entry from this device"
          onPress={forget}
        />
      )}
    </>
  );

  const message = copy.detail ? (
    <>
      {copy.message}
      {"\n"}
      <Text style={text.muted}>{copy.detail}</Text>
    </>
  ) : (
    copy.message
  );

  return <StatusView tone={stale ? "warning" : "error"} title={copy.title} message={message} action={action} />;
}
