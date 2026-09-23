import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { useCanteen } from '../context/CanteenContext';

export const ProfileScreen: React.FC = () => {
  const { setActiveTab, logout, userProfile, updateProfile } = useCanteen();

  // Update Profile Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(userProfile.name || '');
  const [editAvatar, setEditAvatar] = useState<string>(userProfile.avatar || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);

  const handleOpenEditModal = () => {
    setEditName(userProfile.name || '');
    setEditAvatar(userProfile.avatar || '');
    setEditError('');
    setShowUrlInput(false);
    setIsEditModalOpen(true);
  };

  // Device file picker for uploading user's own photo
  const handlePickFromDevice = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            setEditError('Please choose an image under 5MB');
            return;
          }
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              setEditAvatar(dataUrl);
              setEditError('');
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      setShowUrlInput(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || editName.trim().length < 2) {
      setEditError('Please enter a valid full name');
      return;
    }

    setEditError('');
    setIsSaving(true);
    try {
      const res = await updateProfile({
        name: editName.trim(),
        avatar: editAvatar.trim(),
      });
      if (res.success) {
        setIsEditModalOpen(false);
        setSuccessToast('✓ Profile updated successfully!');
        setTimeout(() => setSuccessToast(''), 4000);
      } else {
        setEditError(res.error || 'Failed to update profile');
      }
    } catch {
      setEditError('Network error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Success Toast */}
        {successToast ? (
          <View style={styles.toastBanner}>
            <AppIcon name="checkmark-circle" size={15} color="#15803d" style={{ marginRight: 6 }} />
            <Text style={styles.toastText}>{successToast}</Text>
          </View>
        ) : null}

        {/* Profile Avatar with Camera Button */}
        <View style={styles.avatarWrapper}>
          <Image
            source={{
              uri:
                userProfile.avatar ||
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
            }}
            style={styles.avatarLarge}
          />
          <TouchableOpacity
            style={styles.avatarCameraBadge}
            onPress={handleOpenEditModal}
            activeOpacity={0.8}
            accessibilityLabel="Update Profile Picture"
          >
            <AppIcon name="camera" size={14} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.name}>{userProfile.name || 'Officer'}</Text>
        <Text style={styles.role}>{userProfile.department || userProfile.designation || 'Cabinet Secretariat'}</Text>
        <Text style={styles.idBadge}>Officer ID: {userProfile.id || 'N/A'}</Text>

        {/* Update Profile Button */}
        <TouchableOpacity
          style={styles.updateProfileBtn}
          onPress={handleOpenEditModal}
          activeOpacity={0.85}
        >
          <AppIcon name="create-outline" size={15} color="#0d3829" style={{ marginRight: 6 }} />
          <Text style={styles.updateProfileBtnText}>Update Profile</Text>
        </TouchableOpacity>

        {/* Officer Details List */}
        <View style={styles.detailsList}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Registered Mobile</Text>
            <Text style={styles.detailVal}>{userProfile.mobile || 'Not available'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailVal}>{userProfile.email || 'Not provided'}</Text>
          </View>
          {userProfile.designation ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Designation</Text>
              <Text style={styles.detailVal}>{userProfile.designation}</Text>
            </View>
          ) : null}
          {userProfile.department ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Department</Text>
              <Text style={styles.detailVal}>{userProfile.department}</Text>
            </View>
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setActiveTab('home')}>
            <AppIcon name="arrow-back" size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.backBtnText}>Back to Menu</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={() => logout()}>
            <AppIcon name="log-out-outline" size={16} color="#dc2626" style={{ marginRight: 6 }} />
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Update Profile Modal (Only Profile Pic & Name) */}
      <Modal
        visible={isEditModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalHeaderIconWrap}>
                  <AppIcon name="person" size={16} color="#0d3829" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Update Profile</Text>
                  <Text style={styles.modalSubtitle}>Change your profile picture & name</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditModalOpen(false)}
                style={styles.closeModalBtn}
                activeOpacity={0.7}
              >
                <AppIcon name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {editError ? (
              <View style={styles.modalErrorBanner}>
                <AppIcon name="alert-circle" size={14} color="#dc2626" style={{ marginRight: 6 }} />
                <Text style={styles.modalErrorText}>{editError}</Text>
              </View>
            ) : null}

            {/* 1. Profile Picture Editor */}
            <View style={styles.editSection}>
              <Text style={styles.sectionLabel}>Profile Picture</Text>
              <View style={styles.avatarEditRow}>
                <Image
                  source={{
                    uri:
                      editAvatar ||
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
                  }}
                  style={styles.avatarEditPreview}
                />
                <View style={styles.avatarEditActions}>
                  <TouchableOpacity
                    style={styles.uploadDeviceBtn}
                    onPress={handlePickFromDevice}
                    activeOpacity={0.85}
                  >
                    <AppIcon name="cloud-upload-outline" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.uploadDeviceBtnText}>Upload from Device</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.toggleUrlBtn}
                    onPress={() => setShowUrlInput(!showUrlInput)}
                    activeOpacity={0.7}
                  >
                    <AppIcon name="link-outline" size={13} color="#0d3829" style={{ marginRight: 4 }} />
                    <Text style={styles.toggleUrlBtnText}>
                      {showUrlInput ? 'Hide URL Input' : 'Or Paste Image URL'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showUrlInput ? (
                <View style={styles.urlInputWrap}>
                  <TextInput
                    style={styles.textInputCompact}
                    placeholder="Paste image URL (https://...)"
                    placeholderTextColor="#94a3b8"
                    value={editAvatar.startsWith('data:') ? '' : editAvatar}
                    onChangeText={(val) => setEditAvatar(val)}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              ) : null}
            </View>

            {/* 2. Full Name Editor */}
            <View style={styles.editSection}>
              <Text style={styles.sectionLabel}>Full Name</Text>
              <View style={styles.nameInputWrap}>
                <AppIcon name="person-outline" size={16} color="#475569" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInputFull}
                  placeholder="Enter your official full name"
                  placeholderTextColor="#94a3b8"
                  value={editName}
                  onChangeText={setEditName}
                  maxLength={50}
                />
              </View>
            </View>

            {/* Locked Fields Security Notice */}
            <View style={styles.securityNoticeRow}>
              <AppIcon name="lock-closed" size={12} color="#047857" style={{ marginRight: 6 }} />
              <Text style={styles.securityNoticeText}>
                Only Name & Profile Picture can be modified. Registered mobile and officer ID remain locked.
              </Text>
            </View>

            {/* Modal Action Buttons */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setIsEditModalOpen(false)}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveModalBtn, isSaving && { opacity: 0.7 }]}
                onPress={handleSaveProfile}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <AppIcon name="checkmark" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.saveModalBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export const SettingsScreen: React.FC = () => {
  const { setActiveTab } = useCanteen();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <AppIcon name="settings-outline" size={36} color="#0d3829" style={{ marginBottom: 12 }} />
        <Text style={styles.name}>Canteen Preferences</Text>
        <Text style={styles.role}>Customize your canteen experience</Text>

        <View style={styles.detailsList}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Orientation Lock</Text>
            <Text style={styles.detailVal}>Fixed Landscape (Active)</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Dietary Filters</Text>
            <Text style={styles.detailVal}>Show All / Highlight Healthy</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Version</Text>
            <Text style={styles.detailVal}>Expo SDK 57 • React 19</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => setActiveTab('home')}>
          <Text style={styles.backBtnText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const HelpScreen: React.FC = () => {
  const { setActiveTab } = useCanteen();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <AppIcon name="help-circle-outline" size={36} color="#0d3829" style={{ marginBottom: 12 }} />
        <Text style={styles.name}>Canteen Support & Feedback</Text>
        <Text style={styles.role}>Canteen Services Desk, Cabinet Secretariat</Text>

        <View style={styles.detailsList}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Helpline</Text>
            <Text style={styles.detailVal}>Ext. 4829 / +91 11 2309 0000</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Operating Hours</Text>
            <Text style={styles.detailVal}>7:00 AM – 9:30 PM (All Days)</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Meal Collection</Text>
            <Text style={styles.detailVal}>Counter 1 (Beverages), Counter 2 (Meals)</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => setActiveTab('home')}>
          <Text style={styles.backBtnText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 28,
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
    width: '100%',
  },
  toastText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: '#0d3829',
    backgroundColor: '#f1f5f9',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0d3829',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  role: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  idBadge: {
    backgroundColor: '#eef7f2',
    color: '#0d3829',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 10,
  },
  updateProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 14,
  },
  updateProfileBtnText: {
    color: '#0d3829',
    fontSize: 12,
    fontWeight: '700',
  },
  detailsList: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
    gap: 10,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d3829',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  logoutBtnText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Update Profile Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  editModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeaderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eef7f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  closeModalBtn: {
    padding: 6,
    borderRadius: 6,
  },
  modalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  modalErrorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
    flex: 1,
  },
  editSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  avatarEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarEditPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#0d3829',
    backgroundColor: '#f8fafc',
  },
  avatarEditActions: {
    flex: 1,
    gap: 6,
  },
  uploadDeviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d3829',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  uploadDeviceBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  toggleUrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleUrlBtnText: {
    color: '#0d3829',
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  urlInputWrap: {
    marginTop: 8,
  },
  textInputCompact: {
    height: 38,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  nameInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
  },
  textInputFull: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
    height: '100%',
  },
  securityNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 18,
  },
  securityNoticeText: {
    fontSize: 11,
    color: '#166534',
    flex: 1,
    lineHeight: 14,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelModalBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  cancelModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  saveModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#0d3829',
  },
  saveModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
