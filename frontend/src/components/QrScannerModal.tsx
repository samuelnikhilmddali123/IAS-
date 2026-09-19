import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import jsQR from 'jsqr';
import { AppIcon } from './AppIcon';
import { useCanteen } from '../context/CanteenContext';

interface QrScannerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ visible, onClose }) => {
  const { qrLogin } = useCanteen();

  const [activeMode, setActiveMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');
  const [cameraPermissionError, setCameraPermissionError] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream cleanly
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Submit scanned QR payload to Backend
  const handleProcessPayload = useCallback(
    async (rawPayload: string) => {
      if (isProcessing) return;

      const trimmed = (rawPayload || '').trim();
      if (!trimmed) {
        setErrorMessage('QR payload is empty');
        return;
      }

      // App-only validation: Must start with APPQR:v1:
      if (!trimmed.startsWith('APPQR:v1:')) {
        setErrorMessage('Invalid QR code format. Not an official Canteen Services QR credential.');
        return;
      }

      setIsProcessing(true);
      setErrorMessage('');
      setSuccessMessage('Verifying one-time token with Central Server...');
      stopCamera();

      try {
        const result = await qrLogin(trimmed);
        if (result.success) {
          setSuccessMessage('✓ Officer authenticated successfully! Logging in...');
          setTimeout(() => {
            onClose();
          }, 600);
        } else {
          setErrorMessage(result.message || 'QR login verification failed');
          setSuccessMessage('');
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Authentication error');
        setSuccessMessage('');
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, qrLogin, onClose, stopCamera]
  );

  // Frame scanner loop using jsQR
  const scanVideoFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          handleProcessPayload(code.data);
          return; // Stop loop on hit
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
  }, [handleProcessPayload]);

  // Start live camera stream (Web / React Native Web)
  const startCamera = useCallback(async () => {
    setCameraPermissionError('');
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setActiveMode('upload');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera on mobile phones
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play().catch(() => {});
        animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraPermissionError('Could not start camera feed. Please use the Upload or Manual option below.');
      setActiveMode('upload');
    }
  }, [scanVideoFrame]);

  // Handle modal lifecycle
  useEffect(() => {
    if (visible) {
      setErrorMessage('');
      setSuccessMessage('');
      setManualInput('');
      if (activeMode === 'camera') {
        startCamera();
      }
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [visible, activeMode, startCamera, stopCamera]);

  // Handle QR image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setSuccessMessage('Decoding QR image...');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new (window as any).Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setErrorMessage('Could not process image');
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          handleProcessPayload(code.data);
        } else {
          setErrorMessage('No valid QR code found in this image. Please select the full WhatsApp QR image.');
          setSuccessMessage('');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.emblemBadge}>
                <AppIcon name="qr-code-outline" size={20} color="#ffffff" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Scan Official WhatsApp QR</Text>
                <Text style={styles.modalSubtitle}>
                  Admin-Dispatched One-Time Login Credential
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Switcher */}
          <View style={styles.modeTabsRow}>
            <TouchableOpacity
              style={[styles.modeTab, activeMode === 'camera' && styles.modeTabActive]}
              onPress={() => {
                setActiveMode('camera');
                setErrorMessage('');
              }}
            >
              <Text style={[styles.modeTabText, activeMode === 'camera' && styles.modeTabTextActive]}>
                📹 Live Camera
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, activeMode === 'upload' && styles.modeTabActive]}
              onPress={() => {
                stopCamera();
                setActiveMode('upload');
                setErrorMessage('');
              }}
            >
              <Text style={[styles.modeTabText, activeMode === 'upload' && styles.modeTabTextActive]}>
                📁 Upload WhatsApp QR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, activeMode === 'manual' && styles.modeTabActive]}
              onPress={() => {
                stopCamera();
                setActiveMode('manual');
                setErrorMessage('');
              }}
            >
              <Text style={[styles.modeTabText, activeMode === 'manual' && styles.modeTabTextActive]}>
                ⌨️ Manual Payload
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error & Status Banners */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Scanner Viewport Content */}
          <View style={styles.scannerBody}>
            {/* Mode 1: Live Camera Feed */}
            {activeMode === 'camera' && (
              <View style={styles.cameraContainer}>
                {Platform.OS === 'web' ? (
                  <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', borderRadius: 12, backgroundColor: '#000' }}>
                    <video
                      ref={videoRef as any}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      muted
                    />
                    <canvas ref={canvasRef as any} style={{ display: 'none' }} />

                    {/* Reticle Overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '200px',
                        height: '200px',
                        border: '2px solid #52b788',
                        borderRadius: '16px',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '90%',
                          height: '2px',
                          background: 'linear-gradient(90deg, transparent, #22c55e, transparent)',
                          boxShadow: '0 0 8px #22c55e',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <View style={styles.fallbackBox}>
                    <Text style={styles.fallbackText}>Camera view is active</Text>
                  </View>
                )}

                <Text style={styles.instructionText}>
                  Point camera at the QR code image received on WhatsApp
                </Text>
              </View>
            )}

            {/* Mode 2: Upload WhatsApp QR Screenshot / Image */}
            {activeMode === 'upload' && (
              <View style={styles.uploadContainer}>
                <View style={styles.uploadDottedBox}>
                  <AppIcon name="qr-code-outline" size={54} color="#0a3d31" />
                  <Text style={styles.uploadTitle}>Select WhatsApp QR Image</Text>
                  <Text style={styles.uploadSub}>
                    Upload the QR screenshot or image received on your phone
                  </Text>

                  {Platform.OS === 'web' && (
                    <input
                      type="file"
                      ref={fileInputRef as any}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                  )}

                  <TouchableOpacity
                    style={styles.chooseFileBtn}
                    onPress={() => fileInputRef.current?.click()}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.chooseFileBtnText}>Choose File / Photo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Mode 3: Manual Input for testing / copy-paste */}
            {activeMode === 'manual' && (
              <View style={styles.manualContainer}>
                <Text style={styles.manualLabel}>Paste Scanned Payload String:</Text>
                <TextInput
                  style={styles.manualInput}
                  placeholder="APPQR:v1:qr_1789...d6c5...signature"
                  placeholderTextColor="#94a3b8"
                  value={manualInput}
                  onChangeText={(val) => {
                    setManualInput(val);
                    if (errorMessage) setErrorMessage('');
                  }}
                  multiline
                  disableFullscreenUI={true}
                />

                <TouchableOpacity
                  style={styles.verifyBtn}
                  onPress={() => handleProcessPayload(manualInput)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.verifyBtnText}>Authenticate QR Credential →</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Security Footer Notice */}
          <View style={styles.securityBadge}>
            <AppIcon name="shield-checkmark" size={14} color="#0a3d31" style={{ marginRight: 6 }} />
            <Text style={styles.securityText}>
              Zero-Trust One-Time Login • 5-min Expiry • App-Only Validation
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 61, 49, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    width: 480,
    maxWidth: '94%',
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emblemBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0a3d31',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0a3d31',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '700',
  },
  modeTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  modeTabTextActive: {
    color: '#0a3d31',
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '600',
  },
  successBanner: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  successBannerText: {
    fontSize: 12,
    color: '#15803d',
    fontWeight: '600',
  },
  scannerBody: {
    height: 270,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  fallbackBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 12,
    color: '#64748b',
  },
  instructionText: {
    position: 'absolute',
    bottom: 8,
    fontSize: 11,
    color: '#ffffff',
    backgroundColor: 'rgba(10, 61, 49, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    textAlign: 'center',
  },
  uploadContainer: {
    width: '100%',
    height: '100%',
    padding: 16,
    justifyContent: 'center',
  },
  uploadDottedBox: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
  },
  uploadSub: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 14,
  },
  chooseFileBtn: {
    backgroundColor: '#0a3d31',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  chooseFileBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  manualContainer: {
    width: '100%',
    padding: 16,
    justifyContent: 'center',
  },
  manualLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  manualInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 11,
    color: '#0f172a',
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  verifyBtn: {
    backgroundColor: '#0a3d31',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef7f2',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 14,
  },
  securityText: {
    fontSize: 10.5,
    color: '#0a3d31',
    fontWeight: '600',
  },
});
