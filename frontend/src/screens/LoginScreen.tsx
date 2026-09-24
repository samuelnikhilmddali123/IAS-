import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  Keyboard,
  Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import jsQR from 'jsqr';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AppIcon } from '../components/AppIcon';
import { useCanteen, fetchWithFallback } from '../context/CanteenContext';

const BACKGROUND_IMG = require('../../assets/BG.png');
const EMBLEM_IMG = require('../../assets/6a72e4e7-5e3f-43cb-bd57-bac2a1fcb7f4.png');

const SERPAPI_KEY = '2d8c514adc81802ac3aeb0339ae905060021acc30a101f2177316f2bae88e950';

interface OfficerPhotoItem {
  id: string;
  name: string;
  role: string;
  img: string;
}

const DEFAULT_SUGGESTED_OFFICERS: OfficerPhotoItem[] = [
  {
    id: '1',
    name: 'Smita Sabharwal',
    role: '(IAS)',
    img: 'https://ts4.mm.bing.net/th?id=OIP.SIM9STETOVZc4cn6jEF4BgHaEc&pid=15.1',
  },
  {
    id: '2',
    name: 'Tina Dabi',
    role: '(IAS)',
    img: 'https://ts4.mm.bing.net/th?id=OIP.Ux2okdnRi4pJa08yMeYZLQHaEK&pid=15.1',
  },
  {
    id: '3',
    name: 'T.V. Somanathan',
    role: '(IAS)',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/T._V._Somanathan.jpg/500px-T._V._Somanathan.jpg',
  },
  {
    id: '4',
    name: 'Dr. Vivek Agnihotri',
    role: '(IAS)',
    img: 'https://ts3.mm.bing.net/th?id=OIP.NLtv5k9i-RD2JpCfDZ6pSAAAAA&pid=15.1',
  },
  {
    id: '5',
    name: 'Arvind Kumar',
    role: '(IAS)',
    img: 'https://ts1.mm.bing.net/th?id=OIP.bYqP963s9Jg7vP3yYhL6XwHaEK&pid=15.1',
  },
  {
    id: '6',
    name: 'Durga Shakti Nagpal',
    role: '(IAS)',
    img: 'https://ts3.mm.bing.net/th?id=OIP.qWdoZX1Ugfyx8KzpfwRiMAHaEK&pid=15.1',
  },
  {
    id: '7',
    name: 'Awanish Sharan',
    role: '(IAS)',
    img: 'https://ts3.mm.bing.net/th?id=OIP.2On8XPbGsWEK5TiHLUrk_gHaE_&pid=15.1',
  },
  {
    id: '8',
    name: 'Suhas L.Y.',
    role: '(IAS)',
    img: 'https://ts2.mm.bing.net/th?id=OIP.ur3Rbvx1NTrEkFkfmtMkPAHaEK&pid=15.1',
  },
  {
    id: '9',
    name: 'Srinivas Katikithala',
    role: '(IAS)',
    img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQpIVryRt0bhJwXFG2pX-iK_SWfHLKG8rCFgX9O7vuEVQ&s=10',
  },
];

export const LoginScreen: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const { login, registerUser, qrLogin, logoutNotice, setLogoutNotice, quickLoginSession, quickLoginFromSaved, quickLogin } = useCanteen();
  interface RecentUserSession {
    id: string;
    name: string;
    phone?: string;
    avatar: string;
    designation?: string;
    token?: string;
    logoutTime: number;
    expiresAt?: number;
    orderStatus?: string | null;
  }

  const [recentUserSessions, setRecentUserSessions] = useState<RecentUserSession[]>([]);
  const profileScrollRef = useRef<ScrollView>(null);
  const [profileScrollOffset, setProfileScrollOffset] = useState<number>(0);

  const handleProfileScrollUp = () => {
    profileScrollRef.current?.scrollTo({ y: Math.max(0, profileScrollOffset - 110), animated: true });
  };

  const handleProfileScrollDown = () => {
    profileScrollRef.current?.scrollTo({ y: profileScrollOffset + 110, animated: true });
  };

  const handleProfileClick = async (session: RecentUserSession) => {
    try {
      const res = await fetchWithFallback('/api/auth/quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.id, phone: session.phone }),
      }, 4000);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.user) {
        quickLogin(data.token, data.user);
        return;
      }

      // Session expired or user not found -> require PIN login
      setErrorMsg(data.message || '1-hour session has expired. Please enter your PIN to login.');
      setRecentUserSessions((prev) => prev.filter((s) => s.id !== session.id && s.phone !== session.phone));
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('@recent_sessions');
        if (raw) {
          const list = JSON.parse(raw).filter((s: any) => s.id !== session.id && s.phone !== session.phone);
          localStorage.setItem('@recent_sessions', JSON.stringify(list));
        }
        localStorage.removeItem('canteen_quick_login');
      }
      await AsyncStorage.removeItem('@recent_sessions');
    } catch (err) {
      setErrorMsg('Unable to verify officer profile with backend database.');
    }
  };

  const fetchRecentSessionsAndStatuses = useCallback(async () => {
    try {
      // 1. Fetch live user list directly from backend
      const usersRes = await fetchWithFallback('/api/auth/users', {}, 3000);
      const usersData = await usersRes.json().catch(() => ({}));
      const validDbUsers = Array.isArray(usersData?.users) ? usersData.users : [];

      // If database has 0 users, wipe all stale sessions from storage & UI immediately!
      if (validDbUsers.length === 0) {
        setRecentUserSessions([]);
        await AsyncStorage.removeItem('@recent_sessions');
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.removeItem('@recent_sessions');
          localStorage.removeItem('canteen_quick_login');
        }
        return;
      }

      // 2. Read local sessions from storage
      let raw = await AsyncStorage.getItem('@recent_sessions');
      if (!raw && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        raw = localStorage.getItem('@recent_sessions');
      }

      let sessions: RecentUserSession[] = raw ? JSON.parse(raw) : [];
      const now = Date.now();

      // 3. Filter sessions: ONLY KEEP users who exist in DB AND whose 1-hour PIN timer has NOT expired
      sessions = sessions.filter((s) => {
        const sPhone = (s.phone || '').replace(/\D/g, '').slice(-10);
        const dbUser = validDbUsers.find((u: any) => {
          const uPhone = (u.phone || '').replace(/\D/g, '').slice(-10);
          return (uPhone && uPhone === sPhone) || String(u.id) === String(s.id) || String(u._id) === String(s.id);
        });
        if (!dbUser) return false;

        // Check 1-hour PIN expiration from database (or session expiresAt)
        const expTime = dbUser.pinExpiresAt ? new Date(dbUser.pinExpiresAt).getTime() : 0;
        if (!expTime || now >= expTime) return false; // 1 hr completed -> hide profile!

        s.expiresAt = expTime;
        return true;
      });

      // Update storage with only verified DB users
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem('@recent_sessions', JSON.stringify(sessions));
      }
      await AsyncStorage.setItem('@recent_sessions', JSON.stringify(sessions));

      if (sessions.length === 0) {
        setRecentUserSessions([]);
        return;
      }

      // 4. Query live active orders for verified sessions
      const updated = await Promise.all(
        sessions.map(async (s) => {
          try {
            const rawPhone = (s.phone || '').replace(/\D/g, '').slice(-10);
            const queryParam = rawPhone ? ('phone=' + rawPhone) : ('userId=' + s.id);
            let orders: any[] = [];

            if (queryParam) {
              try {
                const res = await fetchWithFallback(`/api/orders?${queryParam}`, {}, 3000);
                const data = await res.json().catch(() => ({}));
                if (data.success && Array.isArray(data.orders)) {
                  orders = data.orders;
                }
              } catch (e) {}
            }

            if (orders.length > 0) {
              orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              const active = orders.find((o) =>
                ['NEW', 'ACCEPTED', 'PENDING', 'PREPARING', 'COOKING', 'ALMOST_READY', 'READY'].includes(o.status)
              );
              if (active) {
                s.orderStatus = active.status;
                if (!s.avatar && active.userAvatar) {
                  s.avatar = active.userAvatar;
                }
              } else {
                s.orderStatus = null;
              }
            } else {
              s.orderStatus = null;
            }
          } catch (e) {
            s.orderStatus = null;
          }
          return s;
        })
      );

      setRecentUserSessions(updated);
    } catch (err) {
      console.warn('Error syncing real-time user sessions:', err);
    }
  }, []);

  useEffect(() => {
    fetchRecentSessionsAndStatuses();
    const interval = setInterval(fetchRecentSessionsAndStatuses, 2000); // Real-time sync every 2 seconds
    return () => clearInterval(interval);
  }, [fetchRecentSessionsAndStatuses]);

    // Mode: 'login' | 'register' | 'qr'
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'qr'>('login');

  // Camera & QR Scanner States
  const [showCameraPermissionModal, setShowCameraPermissionModal] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isVerifyingQr, setIsVerifyingQr] = useState<boolean>(false);
  const [qrErrorMsg, setQrErrorMsg] = useState<string>('');
  const [qrSuccessMsg, setQrSuccessMsg] = useState<string>('');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Video & Canvas Refs for Web Frame Scanning
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Animated Scan Laser
  const scanAnim = useRef(new Animated.Value(0)).current;

  // Login Form States
  const [mobile, setMobile] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Register Form States
  const [regFullName, setRegFullName] = useState<string>('');
  const [regDesignation, setRegDesignation] = useState<string>('');
  const [regDepartment, setRegDepartment] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regPinSuffix, setRegPinSuffix] = useState<string>('');
  const [regConfirmPinSuffix, setRegConfirmPinSuffix] = useState<string>('');
  const regPhoneDigits = regPhone.replace(/\D/g, '');
  const regPhonePrefix = regPhoneDigits.length >= 2 ? regPhoneDigits.slice(-2) : '';
  const regPin = regPhonePrefix + regPinSuffix;
  const regConfirmPin = regPhonePrefix + regConfirmPinSuffix;
  const [showRegPin, setShowRegPin] = useState<boolean>(false);
  const [showRegConfirmPin, setShowRegConfirmPin] = useState<boolean>(false);
  const [regErrorMsg, setRegErrorMsg] = useState<string>('');

  // Officer Photos State
  const [officerPhotos, setOfficerPhotos] = useState<OfficerPhotoItem[]>(DEFAULT_SUGGESTED_OFFICERS);
  const [selectedPhoto, setSelectedPhoto] = useState<string>(
    DEFAULT_SUGGESTED_OFFICERS[0].img
  );
  const [isSearchingPhotos, setIsSearchingPhotos] = useState<boolean>(false);
  const [showMorePhotos, setShowMorePhotos] = useState<boolean>(false);

  // Modals
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);

  const isWideScreen = width >= 640;

  const scrollViewRef = useRef<ScrollView>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);

  // Field refs for direct focus and keyboard chaining
  const mobileInputRef = useRef<TextInput>(null);
  const pinInputRef = useRef<TextInput>(null);

  const regFullNameRef = useRef<TextInput>(null);
  const regDesignationRef = useRef<TextInput>(null);
  const regDepartmentRef = useRef<TextInput>(null);
  const regEmailRef = useRef<TextInput>(null);
  const regPhoneRef = useRef<TextInput>(null);
  const regPinRef = useRef<TextInput>(null);
  const regConfirmPinRef = useRef<TextInput>(null);

  // Auto-scroll so active field remains visible above keyboard
  const handleFocusField = (fieldIndex: number) => {
    setIsKeyboardOpen(true);
    // Calculated landscape offsets for registration fields:
    // 0: Full Name -> 50
    // 1: Email Address -> 90
    // 2: Phone Number -> 135
    // 3: Create PIN -> 180
    // 4: Re-enter PIN -> 220
    const offsets = [50, 90, 135, 180, 220, 260, 300];
    const targetY = offsets[fieldIndex] !== undefined ? offsets[fieldIndex] : 80;
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
    }, 60);
  };

  const handleFieldBlur = () => {
    setTimeout(() => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const active = document.activeElement;
        const isStillInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
        if (!isStillInput) {
          setIsKeyboardOpen(false);
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }
      }
    }, 150);
  };

  // Keyboard dismiss listener to return page to normal position
  useEffect(() => {
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardOpen(false);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    );

    let viewportResizeHandler: (() => void) | null = null;
    if (typeof window !== 'undefined' && window.visualViewport) {
      viewportResizeHandler = () => {
        if (window.visualViewport && window.visualViewport.height >= window.innerHeight - 60) {
          setIsKeyboardOpen(false);
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }
      };
      window.visualViewport.addEventListener('resize', viewportResizeHandler);
    }

    return () => {
      hideSub.remove();
      if (viewportResizeHandler && typeof window !== 'undefined' && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', viewportResizeHandler);
      }
    };
  }, []);

  // Animated laser scan effect loop
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (isCameraActive) {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      animLoop.start();
    } else {
      scanAnim.setValue(0);
    }
    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [isCameraActive, scanAnim]);

  // Cleanly stop camera and frame loop
  const stopLiveCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks?.() || [];
        tracks.forEach((track: any) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
      } catch {
        // ignore
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Submit scanned QR payload to Backend
  const handleQrPayload = useCallback(
    async (payload: string) => {
      if (isVerifyingQr) return;
      const trimmed = (payload || '').trim();
      if (!trimmed) return;

      if (!trimmed.startsWith('APPQR:v1:')) {
        setQrErrorMsg('Invalid QR code format. Not an official Canteen Services QR credential.');
        return;
      }

      setIsVerifyingQr(true);
      setQrErrorMsg('');
      setQrSuccessMsg('Verifying lifetime credentials with Central Server...');
      stopLiveCamera();

      try {
        const result = await qrLogin(trimmed);
        if (result.success) {
          setQrSuccessMsg('✓ Officer authenticated successfully! Logging in...');
        } else {
          setQrErrorMsg(result.message || 'QR login verification failed.');
          setQrSuccessMsg('');
        }
      } catch (err: any) {
        setQrErrorMsg(err?.message || 'Authentication error.');
        setQrSuccessMsg('');
      } finally {
        setIsVerifyingQr(false);
      }
    },
    [isVerifyingQr, qrLogin, stopLiveCamera]
  );

  // Web camera video frame scan loop using jsQR
  const scanVideoFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState >= 2) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          handleQrPayload(code.data);
          return;
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
  }, [handleQrPayload]);

  // Start web camera using HTML5 getUserMedia
  const startWebCamera = useCallback(async () => {
    stopLiveCamera();
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setQrErrorMsg('Camera access is not supported on this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;
      setIsCameraActive(true);

      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play().catch(() => {});
          if (!animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
          }
        }
      }, 60);
    } catch (err) {
      console.warn('Camera access denied or error:', err);
      setIsCameraActive(false);
      setQrErrorMsg('Camera permission not granted. Please allow camera access.');
    }
  }, [scanVideoFrame, stopLiveCamera]);

  // Trigger camera permission & open live camera
  const handleAllowCamera = async () => {
    setShowCameraPermissionModal(false);
    setQrErrorMsg('');
    setQrSuccessMsg('');

    if (Platform.OS === 'web') {
      startWebCamera();
    } else {
      try {
        const res = await requestCameraPermission();
        if (res.granted) {
          setIsCameraActive(true);
        } else {
          setQrErrorMsg('Camera permission denied in device settings.');
        }
      } catch {
        setQrErrorMsg('Unable to access camera on this device.');
      }
    }
  };

  // Lifecycle: Stop camera when navigating away from QR mode
  useEffect(() => {
    if (authMode !== 'qr') {
      stopLiveCamera();
      setShowCameraPermissionModal(false);
      setQrErrorMsg('');
      setQrSuccessMsg('');
    }
  }, [authMode, stopLiveCamera]);

  useEffect(() => {
    return () => {
      stopLiveCamera();
    };
  }, [stopLiveCamera]);

  // Search Google/Web Images dynamically when the officer name is entered
  const fetchOfficerPhotos = useCallback(async (nameQuery: string) => {
    const trimmed = (nameQuery || '').trim();
    if (!trimmed) {
      setOfficerPhotos(DEFAULT_SUGGESTED_OFFICERS);
      return;
    }

    if (trimmed.length < 2) {
      return;
    }

    setIsSearchingPhotos(true);
    const enc = encodeURIComponent(trimmed);

    try {
      const res = await fetchWithFallback(`/search-officer?name=${enc}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }, 8000);

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.images) && data.images.length > 0) {
          const mapped: OfficerPhotoItem[] = data.images.map((item: any, idx: number) => ({
            id: item.id || `photo-${idx}`,
            name: item.title ? (item.title.length > 32 ? item.title.slice(0, 32) + '...' : item.title) : `${trimmed} (IAS)`,
            role: item.source ? `(${item.source.slice(0, 20)})` : '(IAS)',
            img: item.thumbnail || item.original,
          }));
          setOfficerPhotos(mapped);
          if (mapped[0]?.img) {
            setSelectedPhoto(mapped[0].img);
          }
        }
      }
    } catch (e) {
      console.warn('Officer search error:', e);
    } finally {
      setIsSearchingPhotos(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = regFullName.trim();
    if (!trimmed) {
      setOfficerPhotos(DEFAULT_SUGGESTED_OFFICERS);
      return;
    }

    if (trimmed.length < 2) {
      return;
    }

    const timer = setTimeout(() => {
      fetchOfficerPhotos(trimmed);
    }, 400);

    return () => clearTimeout(timer);
  }, [regFullName, fetchOfficerPhotos]);

  const handleLogin = async () => {
    if (!pin.trim()) {
      setErrorMsg('Please enter your password');
      return;
    }

    if (pin.trim().length < 4) {
      setErrorMsg('Please enter your password (min 4 characters)');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const result = await login(pin.trim());
      if (!result.success) {
        setErrorMsg(result.error || 'Invalid password.');
      }
    } catch (e: any) {
      setErrorMsg('Unable to connect to backend server. Please verify backend is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!regFullName.trim()) {
      setRegErrorMsg('Please enter your full name');
      return;
    }

    if (regFullName.trim().length < 2) {
      setRegErrorMsg('Please enter your full name');
      return;
    }

    const cleanPhoneDigits = regPhone.replace(/\D/g, '');
    if (!cleanPhoneDigits || cleanPhoneDigits.length < 10) {
      setRegErrorMsg('Please enter a valid 10-digit phone number');
      return;
    }

    const phonePrefix = cleanPhoneDigits.slice(-2);
    if (!regPinSuffix || regPinSuffix.length < 4) {
      setRegErrorMsg(`Please enter all 4 digits for PIN (Total 6 digits: ${phonePrefix} + 4 digits)`);
      return;
    }

    if (regPinSuffix !== regConfirmPinSuffix) {
      setRegErrorMsg('PINs do not match');
      return;
    }

    const fullFinalPin = `${phonePrefix}${regPinSuffix}`;

    setRegErrorMsg('');
    setIsSubmitting(true);
    try {
      const result = await registerUser({
        name: regFullName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        pin: fullFinalPin,
        avatar: selectedPhoto,
        designation: regDesignation.trim(),
        location: regDepartment.trim(),
        department: regDepartment.trim(),
      });
      if (!result.success) {
        setRegErrorMsg(result.error || 'Registration failed. Backend returned an error.');
      }
    } catch (e: any) {
      setRegErrorMsg('Unable to connect to backend server. Please verify backend is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedPhotos = showMorePhotos ? officerPhotos : officerPhotos.slice(0, 6);

  return (
    <View style={styles.container}>
      {/* 100% Full-Screen Responsive Background with BG.png and resizeMode="cover" */}
      <ImageBackground
        source={BACKGROUND_IMG}
        style={styles.background}
        imageStyle={styles.backgroundImageStyle}
        resizeMode="cover"
      >
        {/* Vertically scrollable container ensuring accessibility on all screen sizes */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { minHeight: height, paddingBottom: isKeyboardOpen ? 240 : 18 },
          ]}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
        >
          {/* Top Header Row with Government of India Emblem & Slogans */}
          <View style={styles.headerRow}>
            {/* Left Slogan */}
            {isWideScreen ? (
              <View style={styles.leftSloganCol}>
                <Text style={styles.sloganText}>Healthy People.</Text>
                <Text style={styles.sloganText}>Efficient Governance.</Text>
                <Text style={styles.sloganText}>Stronger India.</Text>
                <View style={styles.saffronAccentBar} />
              </View>
            ) : null}

            {/* Central Emblem & Title */}
            <View style={styles.centerIdentityCol}>
              <Image
                source={EMBLEM_IMG}
                style={styles.emblemImage}
                resizeMode="contain"
                accessibilityLabel="Ashoka Lion Capital - Government of India"
              />
              <Text style={styles.govTitle}>Government of India</Text>
              <Text style={styles.mainTitle}>Canteen Services</Text>
              <Text style={styles.subtitleTagline}>Good Food. Greater Service.</Text>
              <View style={styles.headerTricolorBar}>
                <View style={styles.headerSaffron} />
                <View style={styles.headerGreen} />
              </View>
            </View>

            {/* Right Slogan */}
            {isWideScreen ? (
              <View style={styles.rightSloganCol}>
                <Text style={styles.sloganText}>Nourishing</Text>
                <Text style={styles.sloganText}>People.</Text>
                <Text style={styles.sloganText}>Enabling</Text>
                <Text style={styles.sloganText}>Progress.</Text>
                <View style={styles.greenAccentBar} />
              </View>
            ) : null}
          </View>

          {/* ==================== QR SCANNER MODE ==================== */}
          {authMode === 'qr' ? (
            <View style={styles.cardWrapper}>
              <View style={styles.qrCard}>
                <Text style={styles.qrCardHeading}>Already Registered?</Text>
                <Text style={styles.qrCardSubheading}>Scan your QR to continue</Text>

                {logoutNotice ? (
                  <View style={styles.logoutSuccessBanner}>
                    <AppIcon name="checkmark-circle" size={16} color="#15803d" style={{ marginRight: 6 }} />
                    <Text style={styles.logoutSuccessBannerText}>{logoutNotice}</Text>
                    <TouchableOpacity onPress={() => setLogoutNotice(null)} style={{ padding: 4 }}>
                      <AppIcon name="close" size={14} color="#15803d" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Viewfinder Frame with 4 Green Corners */}
                <View style={styles.qrViewfinderWrapper}>
                  <TouchableOpacity
                    style={styles.qrViewfinder}
                    activeOpacity={isCameraActive ? 1 : 0.8}
                    onPress={() => {
                      if (!isCameraActive && !isVerifyingQr) {
                        setShowCameraPermissionModal(true);
                      }
                    }}
                  >
                    {/* Active Camera Feed */}
                    {isCameraActive ? (
                      Platform.OS === 'web' ? (
                        <View style={styles.webVideoContainer}>
                          {React.createElement('video', {
                            ref: videoRef,
                            playsInline: true,
                            autoPlay: true,
                            muted: true,
                            style: {
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            },
                          })}
                          {React.createElement('canvas', {
                            ref: canvasRef,
                            style: { display: 'none' },
                          })}
                        </View>
                      ) : (
                        <CameraView
                          style={StyleSheet.absoluteFill}
                          facing="back"
                          barcodeScannerSettings={{
                            barcodeTypes: ['qr'],
                          }}
                          onBarcodeScanned={
                            isCameraActive && !isVerifyingQr
                              ? ({ data }: { data: string }) => handleQrPayload(data)
                              : undefined
                          }
                        />
                      )
                    ) : (
                      /* Camera Inactive Placeholder */
                      <View style={styles.cameraPlaceholder}>
                        <View style={styles.cameraPlaceholderCircle}>
                          <AppIcon name="camera-outline" size={30} color="#0a3d31" />
                        </View>
                        <Text style={styles.cameraPlaceholderText}>
                          Camera access required to scan
                        </Text>
                        <Text style={styles.cameraTapHint}>Tap to open camera</Text>
                      </View>
                    )}

                    {/* Animated Scanning Laser */}
                    {isCameraActive && !isVerifyingQr ? (
                      <Animated.View
                        style={[
                          styles.scanLaser,
                          {
                            transform: [
                              {
                                translateY: scanAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [12, 198],
                                }),
                              },
                            ],
                          },
                        ]}
                      />
                    ) : null}

                    {/* 4 Green Corner Reticle Brackets */}
                    <View style={[styles.reticleCorner, styles.reticleTL]} />
                    <View style={[styles.reticleCorner, styles.reticleTR]} />
                    <View style={[styles.reticleCorner, styles.reticleBL]} />
                    <View style={[styles.reticleCorner, styles.reticleBR]} />
                  </TouchableOpacity>
                </View>

                {/* Status Messages */}
                {isVerifyingQr ? (
                  <View style={styles.qrStatusRow}>
                    <ActivityIndicator size="small" color="#0a3d31" style={{ marginRight: 8 }} />
                    <Text style={styles.qrStatusVerifyingText}>Verifying lifetime credentials...</Text>
                  </View>
                ) : null}

                {qrSuccessMsg ? (
                  <View style={styles.qrSuccessBanner}>
                    <AppIcon name="checkmark-circle" size={16} color="#15803d" style={{ marginRight: 6 }} />
                    <Text style={styles.qrSuccessBannerText}>{qrSuccessMsg}</Text>
                  </View>
                ) : null}

                {qrErrorMsg ? (
                  <View style={styles.qrErrorBanner}>
                    <AppIcon name="alert-circle" size={16} color="#dc2626" style={{ marginRight: 6 }} />
                    <Text style={styles.qrErrorBannerText}>{qrErrorMsg}</Text>
                  </View>
                ) : null}

                {/* OR Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Button: Login Using PIN */}
                <TouchableOpacity
                  style={styles.pinLoginCardBtn}
                  onPress={() => {
                    stopLiveCamera();
                    setAuthMode('login');
                    setQrErrorMsg('');
                    setQrSuccessMsg('');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.pinLoginLeft}>
                    <View style={styles.pinLockBadge}>
                      <AppIcon name="lock-closed-outline" size={18} color="#0a3d31" />
                    </View>
                    <Text style={styles.pinLoginTitle}>Login Using PIN</Text>
                  </View>
                  <AppIcon name="chevron-forward" size={18} color="#4b5563" />
                </TouchableOpacity>

                {/* Button: New User? Create Account */}
                <TouchableOpacity
                  style={styles.newUserBtnSolid}
                  onPress={() => {
                    stopLiveCamera();
                    setAuthMode('register');
                    setQrErrorMsg('');
                    setQrSuccessMsg('');
                  }}
                  activeOpacity={0.85}
                >
                  <AppIcon name="person-add-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.newUserBtnSolidText}>New User? Create Account</Text>
                  <AppIcon name="arrow-forward" size={16} color="#ffffff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>

                {/* Need Help Link */}
                <TouchableOpacity
                  style={styles.helpLinkContainer}
                  onPress={() => setShowHelpModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.helpLinkText}>Need help?</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : authMode === 'login' ? (
            <View style={styles.loginLayoutContainer}>
              <View style={styles.cardWrapperCenter}>
                <View style={styles.loginCard}>
                <Text style={styles.cardHeading}>Login to Canteen Services</Text>
                <Text style={styles.cardSubheading}>Access your account securely</Text>

                {logoutNotice ? (
                  <View style={styles.logoutSuccessBanner}>
                    <AppIcon name="checkmark-circle" size={16} color="#15803d" style={{ marginRight: 6 }} />
                    <Text style={styles.logoutSuccessBannerText}>{logoutNotice}</Text>
                    <TouchableOpacity onPress={() => setLogoutNotice(null)} style={{ padding: 4 }}>
                      <AppIcon name="close" size={14} color="#15803d" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                {errorMsg ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                ) : null}

                {/* Password Input Only (Requirement 13) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PIN</Text>
                  <TouchableOpacity
                    style={styles.inputContainer}
                    activeOpacity={1}
                    onPress={() => pinInputRef.current?.focus()}
                  >
                    <AppIcon name="lock-closed-outline" size={17} color="#4b5563" />
                    <TextInput
                      ref={pinInputRef}
                      style={styles.textInput}
                      placeholder="Enter 6-digit PIN"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                      disableFullscreenUI={true}
                      secureTextEntry={!showPin}
                      value={pin}
                      onChangeText={(val) => {
                        setPin(val);
                        if (errorMsg) setErrorMsg('');
                      }}
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                      onFocus={() => handleFocusField(0)}
                      onBlur={handleFieldBlur}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPin(!showPin)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <AppIcon
                        name={showPin ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  <Text style={styles.pinHelperText}>
                    Enter the last 2 digits of your mobile number and 4 digits.
                  </Text>
                </View>

                {/* Login Button */}
                <TouchableOpacity
                  style={[styles.primaryActionButton, isSubmitting && { opacity: 0.7 }]}
                  onPress={handleLogin}
                  disabled={isSubmitting}
                  activeOpacity={0.88}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={styles.primaryActionButtonText}>Login</Text>
                      <AppIcon name="arrow-forward" size={17} color="#ffffff" style={{ marginLeft: 8 }} />
                    </View>
                  )}
                </TouchableOpacity>

                {/* OR Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Scan QR */}
                <TouchableOpacity
                  style={styles.qrActionCard}
                  onPress={() => {
                    setAuthMode('qr');
                    setShowCameraPermissionModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.qrIconBadge}>
                    <AppIcon name="qr-code-outline" size={24} color="#0a3d31" />
                  </View>
                  <View style={styles.qrTextCol}>
                    <Text style={styles.qrActionTitle}>Scan QR to Continue</Text>
                    <Text style={styles.qrActionSubtitle}>
                      Use Canteen Services App to login
                    </Text>
                  </View>
                  <AppIcon name="chevron-forward" size={18} color="#0a3d31" />
                </TouchableOpacity>

                {/* Switch to Register Page */}
                <TouchableOpacity
                  style={styles.newUserActionCard}
                  onPress={() => {
                    setAuthMode('register');
                    setErrorMsg('');
                    setRegErrorMsg('');
                  }}
                  activeOpacity={0.8}
                >
                  <AppIcon name="person-add-outline" size={20} color="#0a3d31" />
                  <Text style={styles.newUserTitle}>New User? Create Account</Text>
                  <AppIcon name="chevron-forward" size={18} color="#0a3d31" />
                </TouchableOpacity>

                {/* Need Help Link */}
                <TouchableOpacity
                  style={styles.helpLinkContainer}
                  onPress={() => setShowHelpModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.helpLinkText}>Need help?</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Right Side Panel - User Profiles with Order Status Bubbles (Only when active officer sessions exist) */}
            {recentUserSessions.length > 0 ? (
              <View style={styles.rightSidePanel}>
                <View style={styles.foodStatusContainer}>
                  {/* Show Top Chevron only when there are 3+ profiles */}
                  {recentUserSessions.length > 2 ? (
                    <TouchableOpacity
                      style={styles.chevronButton}
                      onPress={handleProfileScrollUp}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 15, right: 15 }}
                    >
                      <AppIcon name="chevron-up" size={22} color="#64748b" />
                    </TouchableOpacity>
                  ) : null}

                  {/* Vertical Scrollable Profile List */}
                  <ScrollView
                    ref={profileScrollRef}
                    style={styles.profileScrollView}
                    contentContainerStyle={styles.profileScrollContent}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                    onScroll={(e) => setProfileScrollOffset(e.nativeEvent.contentOffset.y)}
                    scrollEventThrottle={16}
                  >
                    {recentUserSessions.map((session, idx) => {
                      let statusText = 'No active order';
                      let dotColor = '#10b981';

                      if (session.orderStatus === 'READY') {
                        statusText = 'Dish is ready!';
                        dotColor = '#10b981';
                      } else if (session.orderStatus === 'ALMOST_READY') {
                        statusText = 'Almost ready';
                        dotColor = '#0284c7';
                      } else if (session.orderStatus === 'COOKING' || session.orderStatus === 'ACCEPTED') {
                        statusText = 'Cooking...';
                        dotColor = '#f59e0b';
                      } else if (session.orderStatus === 'PREPARING' || session.orderStatus === 'NEW' || session.orderStatus === 'PENDING') {
                        statusText = 'Preparing food';
                        dotColor = '#10b981';
                      } else {
                        statusText = 'No active order';
                        dotColor = '#10b981';
                      }

                      const avatarUri = session.avatar || 'https://ts3.mm.bing.net/th?id=OIP.ffM33cELiUO4Z0b09vcH0gHaEw&pid=15.1';

                      return (
                        <TouchableOpacity
                          key={session.id || session.phone || idx}
                          style={styles.foodStatusItem}
                          activeOpacity={0.85}
                          onPress={() => handleProfileClick(session)}
                        >
                          {/* Left: White Pill with Order Status or 'No active order' */}
                          <View style={styles.foodStatusBubble}>
                            <Text style={styles.foodStatusText}>{statusText}</Text>
                          </View>

                          {/* Right: Circular Profile Avatar with Status Dot */}
                          <View style={styles.foodStatusAvatarWrapper}>
                            <Image source={{ uri: avatarUri }} style={styles.foodStatusAvatar} />
                            <View style={[styles.foodStatusDot, { backgroundColor: dotColor }]} />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Show Bottom Chevron only when there are 3+ profiles */}
                  {recentUserSessions.length > 2 ? (
                    <TouchableOpacity
                      style={styles.chevronButton}
                      onPress={handleProfileScrollDown}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 15, right: 15 }}
                    >
                      <AppIcon name="chevron-down" size={22} color="#64748b" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
          ) : (
            /* ==================== REGISTER MODE ==================== */
            <View style={styles.cardWrapper}>
              {/* Main Register Card with Form on Left & Photos/Emblem on Right */}
              <View style={[styles.registerMainCard, !isWideScreen && styles.registerMainCardStacked]}>
                {/* Left Side: Create Account Form */}
                <View style={styles.registerFormCol}>
                  <Text style={styles.cardHeadingLeft}>Create Your Account</Text>
                  <Text style={styles.cardSubheadingLeft}>
                    Join Canteen Services for a seamless experience
                  </Text>

                  {regErrorMsg ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{regErrorMsg}</Text>
                    </View>
                  ) : null}

                  {/* 1. Full Name */}
                  <TouchableOpacity
                    style={styles.inputContainerCompact}
                    activeOpacity={1}
                    onPress={() => regFullNameRef.current?.focus()}
                  >
                    <AppIcon name="person-outline" size={17} color="#4b5563" />
                    <TextInput
                      ref={regFullNameRef}
                      style={styles.textInput}
                      placeholder="Full Name"
                      placeholderTextColor="#9ca3af"
                      value={regFullName}
                      onChangeText={(val) => {
                        setRegFullName(val);
                        if (regErrorMsg) setRegErrorMsg('');
                      }}
                      autoCapitalize="words"
                      autoCorrect={false}
                      disableFullscreenUI={true}
                      returnKeyType="next"
                      onSubmitEditing={() => regDesignationRef.current?.focus()}
                      onFocus={() => handleFocusField(0)}
                      onBlur={handleFieldBlur}
                    />
                  </TouchableOpacity>

                  {/* 2. Designation */}
                  <TouchableOpacity
                    style={styles.inputContainerCompact}
                    activeOpacity={1}
                    onPress={() => regDesignationRef.current?.focus()}
                  >
                    <AppIcon name="briefcase-outline" size={17} color="#4b5563" />
                    <TextInput
                      ref={regDesignationRef}
                      style={styles.textInput}
                      placeholder="Designation"
                      placeholderTextColor="#9ca3af"
                      value={regDesignation}
                      onChangeText={setRegDesignation}
                      autoCapitalize="words"
                      disableFullscreenUI={true}
                      returnKeyType="next"
                      onSubmitEditing={() => regDepartmentRef.current?.focus()}
                      onFocus={() => handleFocusField(1)}
                      onBlur={handleFieldBlur}
                    />
                  </TouchableOpacity>

                  {/* 3. Location/Department */}
                  <TouchableOpacity
                    style={styles.inputContainerCompact}
                    activeOpacity={1}
                    onPress={() => regDepartmentRef.current?.focus()}
                  >
                    <AppIcon name="business-outline" size={17} color="#4b5563" />
                    <TextInput
                      ref={regDepartmentRef}
                      style={styles.textInput}
                      placeholder="Location"
                      placeholderTextColor="#9ca3af"
                      value={regDepartment}
                      onChangeText={setRegDepartment}
                      autoCapitalize="words"
                      disableFullscreenUI={true}
                      returnKeyType="next"
                      onSubmitEditing={() => regEmailRef.current?.focus()}
                      onFocus={() => handleFocusField(2)}
                      onBlur={handleFieldBlur}
                    />
                  </TouchableOpacity>

                  {/* 4. Email Address */}
                  <TouchableOpacity
                    style={styles.inputContainerCompact}
                    activeOpacity={1}
                    onPress={() => regEmailRef.current?.focus()}
                  >
                    <AppIcon name="mail-outline" size={17} color="#4b5563" />
                    <TextInput
                      ref={regEmailRef}
                      style={styles.textInput}
                      placeholder="Email Address"
                      placeholderTextColor="#9ca3af"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      disableFullscreenUI={true}
                      value={regEmail}
                      onChangeText={(val) => {
                        setRegEmail(val);
                        if (regErrorMsg) setRegErrorMsg('');
                      }}
                      returnKeyType="next"
                      onSubmitEditing={() => regPhoneRef.current?.focus()}
                      onFocus={() => handleFocusField(3)}
                      onBlur={handleFieldBlur}
                    />
                  </TouchableOpacity>

                  {/* 5. Phone Number */}
                  <TouchableOpacity
                    style={styles.inputContainerCompact}
                    activeOpacity={1}
                    onPress={() => regPhoneRef.current?.focus()}
                  >
                    <AppIcon name="call-outline" size={17} color="#4b5563" />
                    <TextInput
                      ref={regPhoneRef}
                      style={styles.textInput}
                      placeholder="Phone Number"
                      placeholderTextColor="#9ca3af"
                      keyboardType="phone-pad"
                      disableFullscreenUI={true}
                      value={regPhone}
                      onChangeText={(val) => {
                        setRegPhone(val);
                        if (regErrorMsg) setRegErrorMsg('');
                      }}
                      maxLength={15}
                      returnKeyType="next"
                      onSubmitEditing={() => regPinRef.current?.focus()}
                      onFocus={() => handleFocusField(4)}
                      onBlur={handleFieldBlur}
                    />
                  </TouchableOpacity>

                  {/* 6. Create 6-digit PIN */}
                  <TouchableOpacity
                    style={styles.inputContainerCompact}
                    activeOpacity={1}
                    onPress={() => regPinRef.current?.focus()}
                  >
                    <AppIcon name="lock-closed-outline" size={17} color="#4b5563" />
                    {regPhonePrefix ? (
                      <View style={styles.lockedPrefixBadge}>
                        <Text style={styles.lockedPrefixText}>{regPhonePrefix}</Text>
                      </View>
                    ) : null}
                    <TextInput
                      ref={regPinRef}
                      style={styles.textInput}
                      placeholder={regPhonePrefix ? "Enter 4 digits" : "Enter phone number first"}
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      disableFullscreenUI={true}
                      secureTextEntry={!showRegPin}
                      value={regPinSuffix}
                      onChangeText={(val) => {
                        const clean = val.replace(/\D/g, '').slice(0, 4);
                        setRegPinSuffix(clean);
                        if (regErrorMsg) setRegErrorMsg('');
                      }}
                      maxLength={4}
                      returnKeyType="next"
                      onSubmitEditing={() => regConfirmPinRef.current?.focus()}
                      onFocus={() => handleFocusField(5)}
                      onBlur={handleFieldBlur}
                    />
                    <TouchableOpacity
                      onPress={() => setShowRegPin(!showRegPin)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <AppIcon
                        name={showRegPin ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>

                  {/* 7. Re-enter PIN */}
                  <TouchableOpacity
                    style={styles.inputContainerCompact}
                    activeOpacity={1}
                    onPress={() => regConfirmPinRef.current?.focus()}
                  >
                    <AppIcon name="lock-closed-outline" size={17} color="#4b5563" />
                    {regPhonePrefix ? (
                      <View style={styles.lockedPrefixBadge}>
                        <Text style={styles.lockedPrefixText}>{regPhonePrefix}</Text>
                      </View>
                    ) : null}
                    <TextInput
                      ref={regConfirmPinRef}
                      style={styles.textInput}
                      placeholder={regPhonePrefix ? "Re-enter 4 digits" : "Enter phone number first"}
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      disableFullscreenUI={true}
                      secureTextEntry={!showRegConfirmPin}
                      value={regConfirmPinSuffix}
                      onChangeText={(val) => {
                        const clean = val.replace(/\D/g, '').slice(0, 4);
                        setRegConfirmPinSuffix(clean);
                        if (regErrorMsg) setRegErrorMsg('');
                      }}
                      maxLength={4}
                      returnKeyType="done"
                      onSubmitEditing={handleRegister}
                      onFocus={() => handleFocusField(6)}
                      onBlur={handleFieldBlur}
                    />
                    <TouchableOpacity
                      onPress={() => setShowRegConfirmPin(!showRegConfirmPin)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <AppIcon
                        name={showRegConfirmPin ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>

                  {/* WhatsApp QR Dispatch Notice */}
                  <View style={styles.waDispatchNotice}>
                    <AppIcon name="shield-checkmark" size={13} color="#15803d" style={{ marginRight: 6 }} />
                    <Text style={styles.waDispatchText}>
                      A permanent lifetime login QR code will be dispatched to your WhatsApp from the Admin Desk (+91 91212 66269).
                    </Text>
                  </View>

                  {/* Register Button */}
                  <TouchableOpacity
                    style={[styles.primaryActionButton, isSubmitting && { opacity: 0.7 }]}
                    onPress={handleRegister}
                    disabled={isSubmitting}
                    activeOpacity={0.88}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryActionButtonText}>Register  →</Text>
                    )}
                  </TouchableOpacity>

                  {/* Terms Text */}
                  <Text style={styles.termsNoticeText}>
                    By creating an account, you agree to the{' '}
                    <Text
                      style={styles.termsLink}
                      onPress={() => setShowTermsModal(true)}
                    >
                      Terms & Conditions
                    </Text>{' '}
                    and{' '}
                    <Text
                      style={styles.termsLink}
                      onPress={() => setShowTermsModal(true)}
                    >
                      Privacy Policy
                    </Text>
                    .
                  </Text>
                </View>

                {/* Right Side / Responsive: Dynamic Photos or Ashoka Emblem */}
                {isWideScreen || regFullName.trim() ? (
                  <View style={[styles.registerRightCol, !isWideScreen && styles.registerRightColStacked]}>
                    {/* When Full Name is entered -> Emblem disappears and Photos appear! */}
                    {regFullName.trim() ? (
                      <View style={styles.photoPickerContainer}>
                        {/* Header */}
                        <View style={styles.choosePhotoHeader}>
                          <View style={styles.choosePhotoHeaderRow}>
                            <Text style={styles.choosePhotoTitle}>Choose Your Profile Photo</Text>
                            <TouchableOpacity
                              style={styles.refreshPhotoBtn}
                              onPress={() => fetchOfficerPhotos(regFullName)}
                              disabled={isSearchingPhotos}
                              activeOpacity={0.7}
                            >
                              <AppIcon name="refresh-outline" size={16} color="#0a3d31" />
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.choosePhotoSubtitle}>
                            {isSearchingPhotos
                              ? `Searching official photos for ${regFullName}...`
                              : officerPhotos !== DEFAULT_SUGGESTED_OFFICERS
                              ? `Official Photos for ${regFullName}`
                              : 'Select from suggested IAS officers'}
                          </Text>
                        </View>

                        {/* Large Selected Profile Circular Image with Green Checkmark */}
                        <View style={styles.selectedPhotoWrapper}>
                          <Image
                            source={{ uri: selectedPhoto }}
                            style={styles.selectedPhotoCircle}
                          />
                          <View style={styles.checkmarkBadge}>
                            <Svg width={12} height={12} viewBox="0 0 24 24">
                              <Path
                                d="M4 12l5 5L20 6"
                                stroke="#ffffff"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                              />
                            </Svg>
                          </View>
                        </View>

                        {/* Searching Spinner */}
                        {isSearchingPhotos ? (
                          <View style={styles.searchingLoadingRow}>
                            <ActivityIndicator size="small" color="#0a3d31" />
                            <Text style={styles.searchingText}>Finding official officer photos...</Text>
                          </View>
                        ) : null}

                        {/* 6 Photos Grid */}
                        <View style={styles.officersGrid}>
                          {displayedPhotos.map((officer, index) => {
                            const isSelected = selectedPhoto === officer.img;
                            return (
                              <TouchableOpacity
                                key={`${officer.id || officer.name}-${index}`}
                                style={styles.officerCard}
                                activeOpacity={0.8}
                                onPress={() => {
                                  setSelectedPhoto(officer.img);
                                }}
                              >
                                <Image
                                  source={{ uri: officer.img }}
                                  style={[
                                    styles.officerThumbCircle,
                                    isSelected && styles.officerThumbSelected,
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.officerCardName,
                                    isSelected && styles.officerCardNameSelected,
                                  ]}
                                  numberOfLines={2}
                                >
                                  {officer.name}
                                </Text>
                                <Text style={styles.officerCardRole}>{officer.role}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* View More Button */}
                        <TouchableOpacity
                          style={styles.viewMorePill}
                          onPress={() => setShowMorePhotos(!showMorePhotos)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.viewMoreText}>
                            {showMorePhotos ? 'View Less ∧' : 'View More ∨'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      /* When Full Name is empty -> Display Ashoka Lion Capital Emblem */
                      <View style={styles.emblemContainerRight}>
                        <Image
                          source={EMBLEM_IMG}
                          style={styles.registerRightEmblem}
                          resizeMode="contain"
                        />
                        <Text style={styles.emblemHintText}>
                          Enter your name to load official officer photos
                        </Text>
                      </View>
                    )}
                  </View>
                ) : null}
              </View>

              {/* Bottom Card: "Already Registered? Scan your QR to continue" */}
              <View style={styles.alreadyRegisteredCard}>
                <View style={styles.alreadyRegLeft}>
                  <View style={styles.qrBadgeCircle}>
                    <AppIcon name="qr-code-outline" size={26} color="#0a3d31" />
                  </View>
                  <View style={styles.alreadyRegTextCol}>
                    <Text style={styles.alreadyRegTitle}>Already Registered?</Text>
                    <Text style={styles.alreadyRegSubtitle}>
                      Scan your QR to continue
                    </Text>
                  </View>
                </View>

                <View style={styles.alreadyRegActionsRow}>
                  {/* Back to Login Button */}
                  <TouchableOpacity
                    style={styles.backToLoginBtn}
                    onPress={() => {
                      setAuthMode('login');
                      setRegErrorMsg('');
                      setErrorMsg('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.backToLoginText}>Back to Login</Text>
                  </TouchableOpacity>

                  {/* Scan QR Code Button */}
                  <TouchableOpacity
                    style={styles.scanQrOutlineBtn}
                    onPress={() => {
                      setAuthMode('qr');
                      setShowCameraPermissionModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <AppIcon name="scan-outline" size={17} color="#0a3d31" style={{ marginRight: 6 }} />
                    <Text style={styles.scanQrBtnText}>Scan QR Code</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Bottom Footer Area */}
          <View style={styles.footerRow}>
            <View style={styles.bottomLeftCol}>
              <Text style={styles.footerGovText}>
                Canteen Services  |  Government of India
              </Text>
            </View>

            <View style={styles.bottomRightCol}>
              <Text style={styles.footerGovText}>
                Serve  |  Nourish  |  Build
              </Text>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>

      {/* Camera Permission Modal matching User Screenshot */}
      <Modal
        visible={showCameraPermissionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCameraPermissionModal(false)}
      >
        <View style={styles.permissionModalOverlay}>
          <View style={styles.permissionModalCard}>
            {/* Pale mint circular badge with camera icon */}
            <View style={styles.permissionCameraBadge}>
              <AppIcon name="camera-outline" size={26} color="#0a3d31" />
            </View>

            <Text style={styles.permissionModalTitle}>Allow Camera Access?</Text>
            <Text style={styles.permissionModalSubtitle}>
              Canteen Services needs access to your camera to scan the QR code.
            </Text>

            {/* Side-by-side action buttons */}
            <View style={styles.permissionButtonsRow}>
              <TouchableOpacity
                style={styles.permissionNotNowBtn}
                onPress={() => setShowCameraPermissionModal(false)}
                activeOpacity={0.75}
              >
                <Text style={styles.permissionNotNowText}>Not Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.permissionAllowBtn}
                onPress={handleAllowCamera}
                activeOpacity={0.85}
              >
                <Text style={styles.permissionAllowText}>Allow</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Help Modal */}
      <Modal visible={showHelpModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Canteen Services Helpdesk</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              For assistance with officer registration, credentials, or meal allowances:
            </Text>

            <View style={styles.helpInfoBox}>
              <Text style={styles.helpInfoLine}>
                <Text style={{ fontWeight: '700' }}>Toll Free Helpline: </Text>
                1800-11-2026
              </Text>
              <Text style={styles.helpInfoLine}>
                <Text style={{ fontWeight: '700' }}>Direct Ext: </Text>
                4829 (Cabinet Secretariat Desk)
              </Text>
              <Text style={styles.helpInfoLine}>
                <Text style={{ fontWeight: '700' }}>Support Email: </Text>
                canteen-support@nic.in
              </Text>
              <Text style={styles.helpInfoLine}>
                <Text style={{ fontWeight: '700' }}>Operating Hours: </Text>
                07:00 AM – 10:00 PM (Monday to Saturday)
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setShowHelpModal(false)}
            >
              <Text style={styles.modalPrimaryBtnText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Terms Modal */}
      <Modal visible={showTermsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Terms & Conditions</Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Central Government Canteen Services terms of service and officer meal allowance guidelines.
            </Text>

            <View style={styles.helpInfoBox}>
              <Text style={styles.helpInfoLine}>
                • All registered officers are eligible for daily subsidized canteen meal timings.
              </Text>
              <Text style={styles.helpInfoLine}>
                • Official ID and registered 6-digit PIN are strictly non-transferable.
              </Text>
              <Text style={styles.helpInfoLine}>
                • Data is handled according to Government of India Digital Data Protection regulations.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setShowTermsModal(false)}
            >
              <Text style={styles.modalPrimaryBtnText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#ebf3f5',
    margin: 0,
    padding: 0,
    overflow: 'hidden',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
    padding: 0,
  },
  backgroundImageStyle: {
    width: '100%',
    height: '100%',
    alignSelf: 'stretch',
  },
  scrollView: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignSelf: 'stretch',
    margin: 0,
    padding: 0,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    margin: 0,
  },

  /* Top Header */
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    paddingTop: 4,
    zIndex: 10,
  },
  leftSloganCol: {
    alignItems: 'flex-start',
    minWidth: 150,
  },
  rightSloganCol: {
    alignItems: 'flex-start',
    minWidth: 130,
  },
  sloganText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#264638',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  saffronAccentBar: {
    width: 28,
    height: 3,
    backgroundColor: '#f58220',
    borderRadius: 2,
    marginTop: 6,
  },
  greenAccentBar: {
    width: 28,
    height: 3,
    backgroundColor: '#0c3527',
    borderRadius: 2,
    marginTop: 6,
  },
  centerIdentityCol: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emblemImage: {
    width: 42,
    height: 52,
    marginBottom: 2,
  },
  govTitle: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#374151',
    letterSpacing: 0.4,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: '#0a3d31',
    letterSpacing: -0.5,
    marginTop: 1,
  },
  subtitleTagline: {
    fontSize: 12,
    color: '#2d6a4f',
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  headerTricolorBar: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  headerSaffron: {
    width: 16,
    height: 2.5,
    backgroundColor: '#f58220',
    borderRadius: 1,
  },
  headerGreen: {
    width: 16,
    height: 2.5,
    backgroundColor: '#0a3d31',
    borderRadius: 1,
  },

  /* Card Container */
  cardWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
    zIndex: 20,
  },

  /* Login Card */
  loginCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 410,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  cardHeading: {
    fontSize: 21,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: '#0a3d31',
    textAlign: 'center',
  },
  cardSubheading: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 16,
  },

  /* Register Main Card (2-column layout) */
  registerMainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 24,
    width: '100%',
    maxWidth: 720,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 12,
  },
  registerMainCardStacked: {
    flexDirection: 'column',
  },
  registerFormCol: {
    flex: 1.15,
    maxWidth: 360,
    paddingRight: 20,
  },
  cardHeadingLeft: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: '#0a3d31',
    textAlign: 'left',
  },
  cardSubheadingLeft: {
    fontSize: 12.5,
    color: '#6b7280',
    textAlign: 'left',
    marginTop: 3,
    marginBottom: 14,
  },
  inputContainerStacked: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    marginBottom: 12,
    maxWidth: 340,
  },
  inputIconCol: {
    width: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  inputDataCol: {
    flex: 1,
    justifyContent: 'center',
  },
  inputLabelSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0a3d31',
    marginBottom: 2,
  },
  textInputStacked: {
    fontSize: 13,
    color: '#111827',
    padding: 0,
    margin: 0,
    height: 20,
  },
  inputContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    marginBottom: 14,
  },

  /* Register Right Column */
  registerRightCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 20,
    minHeight: 330,
  },
  registerRightColStacked: {
    paddingLeft: 0,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    width: '100%',
    minHeight: 'auto',
  },

  /* Empty State Emblem */
  emblemContainerRight: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  registerRightEmblem: {
    width: 240,
    height: 280,
    opacity: 0.85,
    resizeMode: 'contain',
  },
  emblemHintText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
  },

  /* Photo Picker State */
  photoPickerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choosePhotoHeader: {
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  choosePhotoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  refreshPhotoBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  choosePhotoTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: '#0a3d31',
    textAlign: 'center',
  },
  choosePhotoSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  selectedPhotoWrapper: {
    position: 'relative',
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPhotoCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2.5,
    borderColor: '#0a3d31',
    backgroundColor: '#f1f5f9',
  },
  checkmarkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0a3d31',
    borderRadius: 11,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  searchingLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  searchingText: {
    fontSize: 11,
    color: '#0a3d31',
    fontWeight: '500',
  },
  officersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    maxWidth: 300,
  },
  officerCard: {
    width: 86,
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: 8,
  },
  officerThumbCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
  },
  officerThumbSelected: {
    borderColor: '#0a3d31',
    borderWidth: 2.5,
  },
  officerCardName: {
    fontSize: 9,
    color: '#334155',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 11,
  },
  officerCardNameSelected: {
    color: '#0a3d31',
    fontWeight: '800',
  },
  officerCardRole: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 10,
  },
  viewMorePill: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 12,
    marginTop: 8,
    backgroundColor: '#f8fafc',
  },
  viewMoreText: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '600',
  },

  termsNoticeText: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 10,
    lineHeight: 14,
  },
  termsLink: {
    color: '#0a3d31',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  /* Already Registered Sub-Card */
  alreadyRegisteredCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.07)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 720,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  alreadyRegLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrBadgeCircle: {
    marginRight: 12,
  },
  alreadyRegTextCol: {
    justifyContent: 'center',
  },
  alreadyRegTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0a3d31',
  },
  alreadyRegSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 1,
  },
  alreadyRegActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backToLoginBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backToLoginText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a3d31',
    textDecorationLine: 'underline',
  },
  scanQrOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0a3d31',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
  },
  scanQrBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0a3d31',
  },

  /* Error container */
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 11.5,
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '500',
  },

  /* General Form Inputs */
  inputGroup: {
    marginBottom: 13,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    marginLeft: 10,
    height: '100%',
    padding: 0,
    outlineStyle: 'none' as any,
  },
  eyeBtn: {
    padding: 4,
  },

  waDispatchNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
  },
  waDispatchText: {
    fontSize: 10.5,
    color: '#166534',
    fontWeight: '500',
    flex: 1,
    lineHeight: 14,
  },

  /* Primary Button */
  primaryActionButton: {
    backgroundColor: '#0a3d31',
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#0a3d31',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryActionButtonText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 13,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '700',
  },

  /* Actions on Login Screen */
  qrActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eef7f2',
    borderWidth: 1,
    borderColor: '#daede2',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginBottom: 9,
  },
  qrIconBadge: {
    marginRight: 10,
  },
  qrTextCol: {
    flex: 1,
  },
  qrActionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
  },
  qrActionSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 1,
  },

  newUserActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0a3d31',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  newUserTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0a3d31',
    marginLeft: 10,
    flex: 1,
  },

  helpLinkContainer: {
    alignItems: 'center',
    marginTop: 13,
  },
  helpLinkText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0a3d31',
    textDecorationLine: 'underline',
  },

  demoFillBtn: {
    marginTop: 11,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    alignItems: 'center',
  },
  demoFillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },

  /* Footer */
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    paddingBottom: 4,
    zIndex: 10,
  },
  bottomLeftCol: {
    alignItems: 'flex-start',
  },
  bottomRightCol: {
    alignItems: 'flex-end',
  },
  footerGovText: {
    fontSize: 11.5,
    color: '#6b7280',
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0a3d31',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b7280',
    padding: 4,
  },
  modalDesc: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
    marginBottom: 16,
  },
  qrCodeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    position: 'relative',
  },
  qrScanLine: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    top: '50%',
    height: 2,
    backgroundColor: '#10b981',
    borderRadius: 1,
  },
  helpInfoBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 14,
    gap: 8,
    marginBottom: 20,
  },
  helpInfoLine: {
    fontSize: 12.5,
    color: '#166534',
    lineHeight: 17,
  },
  modalPrimaryBtn: {
    backgroundColor: '#0a3d31',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Permission Modal Styles */
  permissionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
  },
  permissionModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
    width: '90%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  permissionCameraBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e6f4ea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  permissionModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: '#0a3d31',
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionModalSubtitle: {
    fontSize: 13,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 22,
    paddingHorizontal: 6,
  },
  permissionButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  permissionNotNowBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#0a3d31',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionNotNowText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a3d31',
  },
  permissionAllowBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#0a3d31',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionAllowText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* QR Mode Card Styles */
  qrCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 410,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  qrCardHeading: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: '#0a3d31',
    textAlign: 'center',
  },
  qrCardSubheading: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 16,
  },
  qrViewfinderWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  qrViewfinder: {
    width: 220,
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0b1e19',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webVideoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  cameraPlaceholderCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e6f4ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cameraPlaceholderText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  cameraTapHint: {
    fontSize: 11,
    color: '#34d399',
    fontWeight: '700',
  },
  scanLaser: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: '#10b981',
    borderRadius: 1,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 15,
  },
  reticleCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#22c55e',
    zIndex: 20,
  },
  reticleTL: {
    top: 8,
    left: 8,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 6,
  },
  reticleTR: {
    top: 8,
    right: 8,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 6,
  },
  reticleBL: {
    bottom: 8,
    left: 8,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 6,
  },
  reticleBR: {
    bottom: 8,
    right: 8,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 6,
  },
  qrStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  qrStatusVerifyingText: {
    fontSize: 12,
    color: '#0a3d31',
    fontWeight: '600',
  },
  qrSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 10,
  },
  qrSuccessBannerText: {
    fontSize: 11.5,
    color: '#15803d',
    fontWeight: '600',
  },
  logoutSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
    marginTop: 4,
  },
  logoutSuccessBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#15803d',
    fontWeight: '600',
    lineHeight: 16,
  },
  qrErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 10,
  },
  qrErrorBannerText: {
    fontSize: 11.5,
    color: '#dc2626',
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  pinLoginCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  pinLoginLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinLockBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#e6f4ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pinLoginTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
  },
  newUserBtnSolid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a3d31',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#0a3d31',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  newUserBtnSolidText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
  },

  loginLayoutContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapperCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  rightSidePanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 280,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 40,
    display: 'flex',
  },
  quickLoginProfileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: 200,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickLoginAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#0a3d31',
  },
  quickLoginInfo: {
    alignItems: 'center',
  },
  quickLoginName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  quickLoginStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  quickLoginStatus: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  tapToLoginText: {
    fontSize: 11,
    color: '#0a3d31',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  foodStatusContainer: {
    alignItems: 'flex-end',
    maxHeight: 480,
  },
  chevronButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  profileScrollView: {
    maxHeight: 340,
    width: '100%',
  },
  profileScrollContent: {
    alignItems: 'flex-end',
    paddingVertical: 6,
    gap: 14,
  },
  foodStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodStatusBubble: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  foodStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  foodStatusAvatarWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  foodStatusAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  foodStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  foodStatusEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  foodStatusEmptyText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
  lockedPrefixBadge: {
    backgroundColor: '#e6f4ea',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginRight: 6,
    marginLeft: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedPrefixText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0a3d31',
    letterSpacing: 0.5,
  },
  pinHelperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
    lineHeight: 16,
  },

});
