import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { StyleSheet, View, Text, Image, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { useCanteen } from '../context/CanteenContext';

export const ProfileScreen: React.FC = () => {
  const { setActiveTab, logout, userProfile, updateProfile } = useCanteen();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userProfile.name || '');
  const [editDesignation, setEditDesignation] = useState(userProfile.designation || '');
  const [editLocation, setEditLocation] = useState(userProfile.location || '');
  const [editAvatar, setEditAvatar] = useState(userProfile.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const scrollViewRef = React.useRef<any>(null);

  const handlePickImage = async () => {
    if (!isEditing) return;
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      setEditAvatar(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updates = {
      name: editName.trim(),
      designation: editDesignation.trim(),
      location: editLocation.trim(),
      avatar: editAvatar,
    };
    
    const res = await updateProfile(updates);
    setIsSaving(false);
    
    if (res.success) {
      setIsEditing(false);
    } else {
      alert(res.error || 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    setEditName(userProfile.name || '');
    setEditDesignation(userProfile.designation || '');
    setEditLocation(userProfile.location || '');
    setEditAvatar(userProfile.avatar || '');
    setIsEditing(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={{ flexGrow: 1, paddingBottom: isEditing ? 250 : 0 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets={true}>
        <View style={styles.container}>
          <View style={styles.card}>
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri:
                (isEditing ? editAvatar : userProfile.avatar) ||
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
            }}
            style={styles.avatarLarge}
          />
          {isEditing && (
            <TouchableOpacity style={styles.avatarEditBtn} onPress={handlePickImage}>
              <AppIcon name="camera-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {!isEditing ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Text style={styles.name}>{userProfile.name || 'Officer'}</Text>
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <AppIcon name="create-outline" size={20} color="#0d3829" />
              </TouchableOpacity>
            </View>
            <Text style={styles.role}>{userProfile.designation || 'Officer'}</Text>
            <Text style={styles.idBadge}>Officer ID: {userProfile.id || 'N/A'}</Text>

            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Registered Mobile</Text>
                <Text style={styles.detailVal}>{userProfile.mobile || 'Not available'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailVal}>{userProfile.email || 'Not provided'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailVal}>{userProfile.location || 'Not provided'}</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setActiveTab('home')}>
                <AppIcon name="arrow-back" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.backBtnText}>Back to Menu</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <AppIcon name="log-out-outline" size={16} color="#dc2626" style={{ marginRight: 6 }} />
                <Text style={styles.logoutBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={{ width: '100%', marginTop: 20 }}>
            <Text style={styles.editLabel}>Full Name</Text>
            <TextInput
              style={styles.editInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Full Name"
            />
            
            <Text style={styles.editLabel}>Designation</Text>
            <TextInput
              style={styles.editInput}
              value={editDesignation}
              onChangeText={setEditDesignation}
              placeholder="Designation"
            />
            
            <Text style={styles.editLabel}>Location</Text>
            <TextInput
              style={styles.editInput}
              value={editLocation}
              onChangeText={setEditLocation}
              placeholder="Location"
              onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150)}
            />
            
            <Text style={styles.editLabelDisabled}>Registered Mobile (Cannot edit)</Text>
            <TextInput
              style={styles.editInputDisabled}
              value={userProfile.mobile}
              editable={false}
            />

            <Text style={styles.editLabelDisabled}>Email (Cannot edit)</Text>
            <TextInput
              style={styles.editInputDisabled}
              value={userProfile.email}
              editable={false}
            />

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={isSaving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  avatarContainer: {
    position: 'relative',
    alignSelf: 'center',
  },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0d3829',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  editLabel: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: '600',
  },
  editLabelDisabled: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: '600',
    marginTop: 8,
  },
  editInput: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    color: '#111827',
  },
  editInputDisabled: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    color: '#9ca3af',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#0d3829',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 6,
  },
  cancelBtnText: {
    color: '#4b5563',
    fontWeight: '600',
    fontSize: 14,
  },

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
    maxWidth: 520,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
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
    marginBottom: 16,
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
});
