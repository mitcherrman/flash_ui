// FlipDrill.js – single React‑Native component for Game 2
import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView, View, Text, StyleSheet, Pressable,
  Dimensions, Animated, PanResponder,
} from "react-native";

const API_ROOT = "http://127.0.0.1:8000/api/flashcards";  // change for prod

export default function FlipDrill({ deckId, mode = "basic" }) {
  /* ----- state ----- */
  const [cards,   setCards]   = useState([]);
  const [idx,     setIdx]     = useState(0);
  const [flipped, setFlipped] = useState(false);

  /* ----- fetch hand once ----- */
  useEffect(() => {
    const url = `${API_ROOT}/hand?deck_id=${deckId}&n=12`;
    fetch(url)
      .then(r => r.json())
      .then(setCards)
      .catch(err => console.error("Fetch /hand failed:", err));
  }, [deckId]);

  /* loading */
  if (!cards.length) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.counter}>Loading…</Text>
      </SafeAreaView>
    );
  }
  const card = cards[idx];

  /* ----- flip animation ----- */
  const flip = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(flip, {
      toValue: flipped ? 180 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [flipped]);

  const frontRot = flip.interpolate({ inputRange:[0,180], outputRange:["0deg","180deg"] });
  const backRot  = flip.interpolate({ inputRange:[0,180], outputRange:["180deg","360deg"] });

  /* ----- swipe ----- */
  const panX = useRef(new Animated.Value(0)).current;
  const responder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20,
    onPanResponderMove : (_, g) => panX.setValue(g.dx),
    onPanResponderRelease: (_, g) => {
      if (g.dx > 100) prev(); else if (g.dx < -100) next();
      Animated.spring(panX, { toValue:0, useNativeDriver:true }).start();
    },
  });

  const next = () => { setIdx(i => (i+1)%cards.length); setFlipped(false); };
  const prev = () => { setIdx(i => (i-1+cards.length)%cards.length); setFlipped(false); };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.counter}>Card {idx+1}/{cards.length}</Text>

      <Animated.View {...responder.panHandlers}
        style={[styles.cardWrap, {transform:[{translateX:panX}]}]}>

        {/* front */}
        <Animated.View style={[styles.card,
          {transform:[{perspective:1000},{rotateY:frontRot}]}]}>
          <Text style={styles.text}>{card.front}</Text>
        </Animated.View>

        {/* back */}
        <Animated.View style={[styles.card, styles.cardBack,
          {transform:[{perspective:1000},{rotateY:backRot}]}]}>
          <Text style={styles.text}>{card.back}</Text>
        </Animated.View>

        {/* tap to flip */}
        <Pressable style={StyleSheet.absoluteFillObject}
                   onPress={()=>setFlipped(f=>!f)} />
      </Animated.View>

      <View style={styles.buttons}>
        <Pressable style={styles.btn} onPress={prev}><Text style={styles.btnTxt}>Prev</Text></Pressable>
        <Pressable style={styles.btn} onPress={next}><Text style={styles.btnTxt}>Next</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ----- styles ----- */
const { width } = Dimensions.get("window");
const CARD_W = width*0.8, CARD_H = CARD_W*0.6;

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#f9fafb", alignItems:"center" },
  counter  :{ marginTop:16, fontSize:16, color:"#64748b" },
  cardWrap :{ marginTop:40, width:CARD_W, height:CARD_H },
  card:{ position:"absolute", width:"100%", height:"100%", borderRadius:16,
         backgroundColor:"#fff", alignItems:"center", justifyContent:"center",
         backfaceVisibility:"hidden", shadowColor:"#000", shadowOpacity:0.1,
         shadowRadius:10, shadowOffset:{width:0,height:4}},
  cardBack:{ backgroundColor:"#e0f2fe" },
  text:{ fontSize:22, textAlign:"center", color:"#0f172a", paddingHorizontal:8 },
  buttons:{ position:"absolute", bottom:40, flexDirection:"row", gap:20 },
  btn:{ backgroundColor:"#0ea5e9", paddingHorizontal:24, paddingVertical:12, borderRadius:8 },
  btnTxt:{ color:"#fff", fontWeight:"600" },
});
