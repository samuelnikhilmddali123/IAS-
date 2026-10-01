import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing, Platform } from 'react-native';
import Svg, { Path, Rect, Circle, Ellipse, G } from 'react-native-svg';

export const ChefCookingAnimation: React.FC = () => {
  // Mobile / Native Animated Drivers
  const chopAnim = useRef(new Animated.Value(0)).current;
  const carrotAnim = useRef(new Animated.Value(0)).current;
  const panAnim = useRef(new Animated.Value(0)).current;
  const foodTossAnim = useRef(new Animated.Value(0)).current;
  const flameAnim = useRef(new Animated.Value(0)).current;
  const steamAnim1 = useRef(new Animated.Value(0)).current;
  const steamAnim2 = useRef(new Animated.Value(0)).current;
  const clocheAnim = useRef(new Animated.Value(0)).current;
  const arrowPulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Knife Chop Loop
    const chopLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(chopAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(chopAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // 2. Veggie Slice Hop Loop
    const carrotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(carrotAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(carrotAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // 3. Pan Sizzle Wobble Loop
    const panLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(panAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.inOut(Easing.linear),
          useNativeDriver: true,
        }),
        Animated.timing(panAnim, {
          toValue: 2,
          duration: 220,
          easing: Easing.inOut(Easing.linear),
          useNativeDriver: true,
        }),
        Animated.timing(panAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.inOut(Easing.linear),
          useNativeDriver: true,
        }),
      ])
    );

    // 4. Food Toss Loop
    const foodTossLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(foodTossAnim, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(foodTossAnim, {
          toValue: 0,
          duration: 550,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // 5. Flame Flicker Loop
    const flameLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(flameAnim, {
          toValue: 1,
          duration: 225,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(flameAnim, {
          toValue: 0,
          duration: 225,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // 6. Steam Rise Loop 1
    const steamLoop1 = Animated.loop(
      Animated.timing(steamAnim1, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.linear),
        useNativeDriver: true,
      })
    );

    // 7. Steam Rise Loop 2
    const steamLoop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(steamAnim2, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.linear),
          useNativeDriver: true,
        }),
      ])
    );

    // 8. Cloche Lift Loop
    const clocheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(clocheAnim, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(500),
        Animated.timing(clocheAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(300),
      ])
    );

    // 9. Chevron Arrow Pulse
    const arrowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowPulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(arrowPulseAnim, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    chopLoop.start();
    carrotLoop.start();
    panLoop.start();
    foodTossLoop.start();
    flameLoop.start();
    steamLoop1.start();
    steamLoop2.start();
    clocheLoop.start();
    arrowLoop.start();

    return () => {
      chopLoop.stop();
      carrotLoop.stop();
      panLoop.stop();
      foodTossLoop.stop();
      flameLoop.stop();
      steamLoop1.stop();
      steamLoop2.stop();
      clocheLoop.stop();
      arrowLoop.stop();
    };
  }, []);

  // =========================================================================
  // Web Platform Rendering: CSS GPU Keyframes
  // =========================================================================
  if (Platform.OS === 'web') {
    return (
      <div className="culinary-storyboard" style={{ display: 'inline-flex', alignItems: 'center' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes knifeSlice {
            0% { transform: translateY(-5px) rotate(-16deg); }
            50% { transform: translateY(3px) rotate(3deg); }
            100% { transform: translateY(-5px) rotate(-16deg); }
          }
          @keyframes carrotFly {
            0% { transform: scale(1) translateY(0); }
            50% { transform: scale(1.1) translateY(-3px) translateX(-2px); }
            100% { transform: scale(1) translateY(0); }
          }
          @keyframes tomatoFly {
            0% { transform: scale(1) translateY(0); }
            50% { transform: scale(1.12) translateY(-4px) translateX(2px); }
            100% { transform: scale(1) translateY(0); }
          }
          @keyframes panSizzle {
            0% { transform: rotate(0deg) translateY(0); }
            25% { transform: rotate(-3deg) translateY(-2px); }
            50% { transform: rotate(2deg) translateY(1px); }
            75% { transform: rotate(-2deg) translateY(-1px); }
            100% { transform: rotate(0deg) translateY(0); }
          }
          @keyframes foodToss {
            0% { transform: translateY(0) rotate(0); opacity: 0.9; }
            40% { transform: translateY(-8px) rotate(25deg); opacity: 1; }
            80% { transform: translateY(0) rotate(0); opacity: 0.9; }
            100% { transform: translateY(0) rotate(0); opacity: 0.9; }
          }
          @keyframes flameFlicker {
            0% { transform: scaleY(1); opacity: 0.85; }
            50% { transform: scaleY(1.25) scaleX(1.1); opacity: 1; }
            100% { transform: scaleY(1); opacity: 0.85; }
          }
          @keyframes steamFloat1 {
            0% { opacity: 0; transform: translateY(2px) scaleX(0.8); }
            35% { opacity: 0.8; transform: translateY(-6px) scaleX(1.1); }
            100% { opacity: 0; transform: translateY(-16px) scaleX(1.4); }
          }
          @keyframes steamFloat2 {
            0% { opacity: 0; transform: translateY(3px) scaleX(0.9); }
            45% { opacity: 0.9; transform: translateY(-8px) scaleX(1.2); }
            100% { opacity: 0; transform: translateY(-18px) scaleX(1.5); }
          }
          @keyframes clocheLift {
            0% { transform: translateY(0) rotate(0); }
            35% { transform: translateY(-9px) rotate(-6deg); }
            65% { transform: translateY(-9px) rotate(-6deg); }
            100% { transform: translateY(0) rotate(0); }
          }
          @keyframes serveGarnishGlow {
            0% { transform: scale(0.95); opacity: 0.7; }
            50% { transform: scale(1.15); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.7; }
          }
          @keyframes flowArrowPulse {
            0% { opacity: 0.25; transform: translateX(-1px); }
            50% { opacity: 0.8; transform: translateX(2px); }
            100% { opacity: 0.25; transform: translateX(-1px); }
          }
          .culinary-strip-box {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            background: transparent;
            border: none;
            padding: 2px 4px;
            user-select: none;
          }
          .stage-knife {
            transform-origin: 22px 14px;
            animation: knifeSlice 0.6s ease-in-out infinite;
          }
          .stage-carrot {
            animation: carrotFly 0.6s ease-in-out infinite;
          }
          .stage-tomato {
            animation: tomatoFly 0.6s ease-in-out infinite;
          }
          .stage-pan {
            transform-origin: 16px 20px;
            animation: panSizzle 0.9s ease-in-out infinite;
          }
          .stage-toss {
            transform-origin: center;
            animation: foodToss 1.1s ease-out infinite;
          }
          .stage-flame {
            transform-origin: bottom center;
            animation: flameFlicker 0.45s ease-in-out infinite;
          }
          .stage-steam1 {
            animation: steamFloat1 1.6s ease-out infinite;
          }
          .stage-steam2 {
            animation: steamFloat2 2.0s ease-out infinite 0.5s;
          }
          .stage-cloche {
            transform-origin: center;
            animation: clocheLift 2.6s ease-in-out infinite;
          }
          .stage-garnish {
            transform-origin: center;
            animation: serveGarnishGlow 1.3s ease-in-out infinite;
          }
          .stage-arrow {
            animation: flowArrowPulse 1.4s ease-in-out infinite;
          }
        `}} />

        <div className="culinary-strip-box">
          {/* 1. Chopping Stage */}
          <div title="1. Chopping Vegetables" style={{ position: 'relative', width: 34, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="34" height="30" viewBox="0 0 36 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="21" width="28" height="5" rx="2" fill="#78350f" />
              <rect x="6" y="22" width="24" height="2" rx="1" fill="#92400e" />
              <g className="stage-carrot">
                <circle cx="11" cy="18.5" r="2.8" fill="#ea580c" />
                <circle cx="11" cy="18.5" r="1.4" fill="#fb923c" />
              </g>
              <g className="stage-tomato">
                <path d="M17 19.5C17 16.8 20.5 16.8 22 19.5H17Z" fill="#e11d48" />
                <circle cx="19.5" cy="18.2" r="0.8" fill="#fecdd3" />
              </g>
              <path d="M23 18.5C24.5 16.8 27.5 17.8 26.5 19.5C25.5 20.2 24 19.5 23 18.5Z" fill="#16a34a" />
              <g className="stage-knife">
                <rect x="19" y="8" width="11" height="3" rx="1" fill="#1e293b" transform="rotate(-15 19 8)" />
                <circle cx="23" cy="7.2" r="0.6" fill="#f8fafc" />
                <path d="M10 12.5L20 9.8V15L13 15.5C10.5 15.5 9.5 13.5 10 12.5Z" fill="#94a3b8" stroke="#475569" strokeWidth="0.6" />
                <path d="M12 13L19 11V12.5L13.5 14Z" fill="#ffffff" opacity="0.8" />
              </g>
            </svg>
          </div>

          {/* Minimal Flow Arrow */}
          <div className="stage-arrow" style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>

          {/* 2. Cooking / Sizzling Pan Stage */}
          <div title="2. Sizzling Wok Cooking" style={{ position: 'relative', width: 34, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="34" height="30" viewBox="0 0 36 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path className="stage-steam1" d="M15 10C13.5 7.5 16.5 5 15 2.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
              <path className="stage-steam2" d="M21 11C19.5 8 22.5 5.5 21 3" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
              <g className="stage-flame">
                <path d="M14 26C14 23.5 16 22 16.5 20C17 22 19 23.5 19 26C19 27.5 17.5 28 16.5 28C15.5 28 14 27.5 14 26Z" fill="#ea580c" />
                <path d="M15.5 26.5C15.5 25 16.5 24 16.5 22.5C16.5 24 17.5 25 17.5 26.5C17.5 27.5 17 27.8 16.5 27.8C16 27.8 15.5 27.5 15.5 26.5Z" fill="#facc15" />
              </g>
              <g className="stage-pan">
                <rect x="23" y="19" width="10" height="2.5" rx="1.2" fill="#334155" />
                <ellipse cx="16" cy="20" rx="9" ry="3.5" fill="#0f172a" />
                <path d="M7 20C7 24 11 25.5 16 25.5C21 25.5 25 24 25 20H7Z" fill="#1e293b" />
                <ellipse cx="16" cy="20" rx="8" ry="2.5" fill="#334155" />
              </g>
              <g className="stage-toss">
                <circle cx="13" cy="16" r="1.6" fill="#f97316" />
                <circle cx="17.5" cy="14" r="1.8" fill="#ef4444" />
                <circle cx="19" cy="16.5" r="1.4" fill="#22c55e" />
                <circle cx="15" cy="14.5" r="1.2" fill="#eab308" />
              </g>
            </svg>
          </div>

          {/* Minimal Flow Arrow */}
          <div className="stage-arrow" style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>

          {/* 3. Serving / Plating Stage */}
          <div title="3. Serving to Customer" style={{ position: 'relative', width: 34, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="34" height="30" viewBox="0 0 36 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path className="stage-steam1" d="M18 10C16.5 7.5 19.5 5 18 2.5" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
              <ellipse cx="18" cy="24" rx="14" ry="4" fill="#64748b" />
              <ellipse cx="18" cy="23.5" rx="13" ry="3.2" fill="#e2e8f0" />
              <ellipse cx="18" cy="23" rx="11" ry="2.4" fill="#ffffff" />
              <g className="stage-garnish">
                <ellipse cx="18" cy="22.5" rx="7.5" ry="2" fill="#b45309" />
                <circle cx="16" cy="21.5" r="1.5" fill="#f97316" />
                <circle cx="19.5" cy="21.5" r="1.6" fill="#ef4444" />
                <circle cx="17.5" cy="20.8" r="1.2" fill="#22c55e" />
                <path d="M26 12L27 9L28 12L31 13L28 14L27 17L26 14L23 13Z" fill="#f59e0b" opacity="0.8" />
              </g>
              <g className="stage-cloche">
                <circle cx="18" cy="11.5" r="2" fill="#475569" />
                <circle cx="18" cy="11.2" r="1.2" fill="#94a3b8" />
                <rect x="17.2" y="13" width="1.6" height="2" fill="#334155" />
                <path d="M8 22C8 14.5 12.5 14 18 14C23.5 14 28 14.5 28 22H8Z" fill="#94a3b8" stroke="#475569" strokeWidth="0.8" />
                <path d="M10 21C10.5 16.5 14 15.2 18 15.2V17C15 17 12 18 11.5 21H10Z" fill="#ffffff" opacity="0.75" />
                <ellipse cx="18" cy="22" rx="10" ry="1.8" fill="#64748b" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Native Platform Rendering (Android & iOS with react-native-svg vectors)
  // =========================================================================
  const knifeRotate = chopAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-16deg', '3deg'],
  });

  const knifeTranslateY = chopAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-5, 3],
  });

  const carrotTranslateY = carrotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
  });

  const panRotate = panAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['0deg', '-3deg', '2deg'],
  });

  const foodTossTranslateY = foodTossAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const foodTossRotate = foodTossAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '25deg'],
  });

  const flameScaleY = flameAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const steamTranslateY1 = steamAnim1.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [2, -6, -16],
  });

  const steamOpacity1 = steamAnim1.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.8, 0],
  });

  const steamTranslateY2 = steamAnim2.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [3, -8, -18],
  });

  const steamOpacity2 = steamAnim2.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0.9, 0],
  });

  const clocheTranslateY = clocheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -9],
  });

  const clocheRotate = clocheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-6deg'],
  });

  const arrowTranslateX = arrowPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-1, 2],
  });

  const arrowOpacity = arrowPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.9],
  });

  return (
    <View style={styles.nativeStrip}>
      
      {/* 1. CUTTING / CHOPPING STAGE */}
      <View style={styles.stageCell}>
        {/* Cutting Board & Base Slices */}
        <Svg width="34" height="30" viewBox="0 0 36 32" style={styles.svgAbsolute}>
          <Rect x="4" y="21" width="28" height="5" rx="2" fill="#78350f" />
          <Rect x="6" y="22" width="24" height="2" rx="1" fill="#92400e" />
          <Path d="M23 18.5C24.5 16.8 27.5 17.8 26.5 19.5C25.5 20.2 24 19.5 23 18.5Z" fill="#16a34a" />
        </Svg>

        {/* Hopping Carrot & Tomato slices */}
        <Animated.View style={[styles.svgAbsolute, { transform: [{ translateY: carrotTranslateY }] }]}>
          <Svg width="34" height="30" viewBox="0 0 36 32">
            <Circle cx="11" cy="18.5" r="2.8" fill="#ea580c" />
            <Circle cx="11" cy="18.5" r="1.4" fill="#fb923c" />
            <Path d="M17 19.5C17 16.8 20.5 16.8 22 19.5H17Z" fill="#e11d48" />
            <Circle cx="19.5" cy="18.2" r="0.8" fill="#fecdd3" />
          </Svg>
        </Animated.View>

        {/* Animated Knife */}
        <Animated.View style={[styles.svgAbsolute, { transform: [{ translateY: knifeTranslateY }, { rotate: knifeRotate }] }]}>
          <Svg width="34" height="30" viewBox="0 0 36 32">
            <Rect x="19" y="8" width="11" height="3" rx="1" fill="#1e293b" transform="rotate(-15 19 8)" />
            <Circle cx="23" cy="7.2" r="0.6" fill="#f8fafc" />
            <Path d="M10 12.5L20 9.8V15L13 15.5C10.5 15.5 9.5 13.5 10 12.5Z" fill="#94a3b8" stroke="#475569" strokeWidth="0.6" />
            <Path d="M12 13L19 11V12.5L13.5 14Z" fill="#ffffff" opacity={0.8} />
          </Svg>
        </Animated.View>
      </View>

      {/* Minimal Flow Arrow */}
      <Animated.View style={{ transform: [{ translateX: arrowTranslateX }], opacity: arrowOpacity }}>
        <Svg width="10" height="10" viewBox="0 0 24 24">
          <Path d="M9 18L15 12L9 6" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Animated.View>

      {/* 2. COOKING / SIZZLING PAN STAGE */}
      <View style={styles.stageCell}>
        {/* Steam 1 */}
        <Animated.View style={[styles.svgAbsolute, { transform: [{ translateY: steamTranslateY1 }], opacity: steamOpacity1 }]}>
          <Svg width="34" height="30" viewBox="0 0 36 32">
            <Path d="M15 10C13.5 7.5 16.5 5 15 2.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </Svg>
        </Animated.View>

        {/* Steam 2 */}
        <Animated.View style={[styles.svgAbsolute, { transform: [{ translateY: steamTranslateY2 }], opacity: steamOpacity2 }]}>
          <Svg width="34" height="30" viewBox="0 0 36 32">
            <Path d="M21 11C19.5 8 22.5 5.5 21 3" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </Svg>
        </Animated.View>

        {/* Flickering Flame */}
        <Animated.View style={[styles.svgAbsolute, { transform: [{ scaleY: flameScaleY }] }]}>
          <Svg width="34" height="30" viewBox="0 0 36 32">
            <Path d="M14 26C14 23.5 16 22 16.5 20C17 22 19 23.5 19 26C19 27.5 17.5 28 16.5 28C15.5 28 14 27.5 14 26Z" fill="#ea580c" />
            <Path d="M15.5 26.5C15.5 25 16.5 24 16.5 22.5C16.5 24 17.5 25 17.5 26.5C17.5 27.5 17 27.8 16.5 27.8C16 27.8 15.5 27.5 15.5 26.5Z" fill="#facc15" />
          </Svg>
        </Animated.View>

        {/* Sizzling Pan */}
        <Animated.View style={[styles.svgAbsolute, { transform: [{ rotate: panRotate }] }]}>
          <Svg width="34" height="30" viewBox="0 0 36 32">
            <Rect x="23" y="19" width="10" height="2.5" rx="1.2" fill="#334155" />
            <Ellipse cx="16" cy="20" rx="9" ry="3.5" fill="#0f172a" />
            <Path d="M7 20C7 24 11 25.5 16 25.5C21 25.5 25 24 25 20H7Z" fill="#1e293b" />
            <Ellipse cx="16" cy="20" rx="8" ry="2.5" fill="#334155" />
          </Svg>
        </Animated.View>

        {/* Tossing Veggies */}
        <Animated.View style={[styles.svgAbsolute, { transform: [{ translateY: foodTossTranslateY }, { rotate: foodTossRotate }] }]}>
          <Svg width="34" height="30" viewBox="0 0 36 32">
            <Circle cx="13" cy="16" r="1.6" fill="#f97316" />
            <Circle cx="17.5" cy="14" r="1.8" fill="#ef4444" />
            <Circle cx="19" cy="16.5" r="1.4" fill="#22c55e" />
            <Circle cx="15" cy="14.5" r="1.2" fill="#eab308" />
          </Svg>
        </Animated.View>
      </View>

      {/* Minimal Flow Arrow */}
      <Animated.View style={{ transform: [{ translateX: arrowTranslateX }], opacity: arrowOpacity }}>
        <Svg width="10" height="10" viewBox="0 0 24 24">
          <Path d="M9 18L15 12L9 6" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Animated.View>

      {/* 3. SERVING / PLATING STAGE */}
      <View style={styles.stageCell}>
        {/* Steam */}
        <Animated.View style={[styles.svgAbsolute, { transform: [{ translateY: steamTranslateY1 }], opacity: steamOpacity1 }]}>
          <Svg width="34" height="30" viewBox="0 0 36 32">
            <Path d="M18 10C16.5 7.5 19.5 5 18 2.5" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </Svg>
        </Animated.View>

        {/* Base Serving Platter & Plated Food */}
        <Svg width="34" height="30" viewBox="0 0 36 32" style={styles.svgAbsolute}>
          <Ellipse cx="18" cy="24" rx="14" ry="4" fill="#64748b" />
          <Ellipse cx="18" cy="23.5" rx="13" ry="3.2" fill="#e2e8f0" />
          <Ellipse cx="18" cy="23" rx="11" ry="2.4" fill="#ffffff" />
          <Ellipse cx="18" cy="22.5" rx="7.5" ry="2" fill="#b45309" />
          <Circle cx="16" cy="21.5" r="1.5" fill="#f97316" />
          <Circle cx="19.5" cy="21.5" r="1.6" fill="#ef4444" />
          <Circle cx="17.5" cy="20.8" r="1.2" fill="#22c55e" />
          <Path d="M26 12L27 9L28 12L31 13L28 14L27 17L26 14L23 13Z" fill="#f59e0b" opacity={0.8} />
        </Svg>

        {/* Lifting Chrome Cloche Dome */}
        <Animated.View style={[styles.svgAbsolute, { transform: [{ translateY: clocheTranslateY }, { rotate: clocheRotate }] }]}>
          <Svg width="34" height="30" viewBox="0 0 36 32">
            <Circle cx="18" cy="11.5" r="2" fill="#475569" />
            <Circle cx="18" cy="11.2" r="1.2" fill="#94a3b8" />
            <Rect x="17.2" y="13" width="1.6" height="2" fill="#334155" />
            <Path d="M8 22C8 14.5 12.5 14 18 14C23.5 14 28 14.5 28 22H8Z" fill="#94a3b8" stroke="#475569" strokeWidth="0.8" />
            <Path d="M10 21C10.5 16.5 14 15.2 18 15.2V17C15 17 12 18 11.5 21H10Z" fill="#ffffff" opacity={0.75} />
            <Ellipse cx="18" cy="22" rx="10" ry="1.8" fill="#64748b" />
          </Svg>
        </Animated.View>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  nativeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 12,
  },
  stageCell: {
    width: 34,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svgAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 34,
    height: 30,
  },
});
