import React, { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { useCanteen } from '../context/CanteenContext';
import { getDisplayImageUrl } from '../utils/imageUtils';

const EMBLEM_IMAGE = require('../../assets/6a72e4e7-5e3f-43cb-bd57-bac2a1fcb7f4.png');

import { DatePickerInput } from '../components/DatePickerInput';

interface ChildInfo {
  gender: 'Male' | 'Female';
  name: string;
  dob: string;
}

function parseChildrenDetails(detailsStr?: string, countStr?: string): ChildInfo[] {
  if (!detailsStr || typeof detailsStr !== 'string' || detailsStr.trim() === '') {
    const num = parseInt(countStr || '0', 10);
    if (!isNaN(num) && num > 0) {
      return Array.from({ length: num }, () => ({ gender: 'Male', name: '', dob: '' }));
    }
    return [];
  }
  try {
    const parsed = JSON.parse(detailsStr);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        gender: item.gender === 'Female' ? 'Female' : 'Male',
        name: String(item.name || ''),
        dob: String(item.dob || ''),
      }));
    }
  } catch (e) {}

  // If stored as formatted legacy text
  const count = parseInt(countStr || '1', 10) || 1;
  return Array.from({ length: Math.max(1, count) }, (_, i) => ({
    gender: 'Male',
    name: detailsStr,
    dob: '',
  }));
}

export const ProfileScreen: React.FC = () => {
  const { setActiveTab, logout, userProfile, updateProfile } = useCanteen();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userProfile.name || '');
  const [editDesignation, setEditDesignation] = useState(userProfile.designation || '');
  const [editLocation, setEditLocation] = useState(userProfile.location || '');
  const [editEmail, setEditEmail] = useState(userProfile.email || '');
  const [editAvatar, setEditAvatar] = useState(userProfile.avatar || '');
  const [editDob, setEditDob] = useState(userProfile.dob || '');
  const [editMarriageDate, setEditMarriageDate] = useState(userProfile.marriageDate || '');
  const [editImportantDates, setEditImportantDates] = useState(userProfile.importantDates || '');
  const [editChildrenCount, setEditChildrenCount] = useState(userProfile.childrenCount || '');
  const [childrenList, setChildrenList] = useState<ChildInfo[]>(() =>
    parseChildrenDetails(userProfile.childrenDetails, userProfile.childrenCount)
  );
  const [editSiblings, setEditSiblings] = useState(userProfile.siblings || '');
  const [editDietaryPreferences, setEditDietaryPreferences] = useState(userProfile.dietaryPreferences || '');
  const [editEmergencyContact, setEditEmergencyContact] = useState(userProfile.emergencyContact || '');
  const [editBloodGroup, setEditBloodGroup] = useState(userProfile.bloodGroup || '');
  const [editHomeAddress, setEditHomeAddress] = useState(userProfile.homeAddress || '');
  const [avatarError, setAvatarError] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const scrollViewRef = React.useRef<any>(null);

  // Sync state if userProfile changes
  useEffect(() => {
    setEditName(userProfile.name || '');
    setEditDesignation(userProfile.designation || '');
    setEditLocation(userProfile.location || '');
    setEditEmail(userProfile.email || '');
    setEditAvatar(userProfile.avatar || '');
    setEditDob(userProfile.dob || '');
    setEditMarriageDate(userProfile.marriageDate || '');
    setEditImportantDates(userProfile.importantDates || '');
    setEditChildrenCount(userProfile.childrenCount || '');
    setChildrenList(parseChildrenDetails(userProfile.childrenDetails, userProfile.childrenCount));
    setEditSiblings(userProfile.siblings || '');
    setEditDietaryPreferences(userProfile.dietaryPreferences || '');
    setEditEmergencyContact(userProfile.emergencyContact || '');
    setEditBloodGroup(userProfile.bloodGroup || '');
    setEditHomeAddress(userProfile.homeAddress || '');
    setAvatarError(false);
  }, [userProfile]);

  useEffect(() => {
    setAvatarError(false);
  }, [editAvatar]);

  // Profile completion status calculation
  const optionalFields = [
    { label: 'Designation', val: userProfile.designation },
    { label: 'Office Location', val: userProfile.location },
    { label: 'Email Address', val: userProfile.email },
    { label: 'Date of Birth (DOB)', val: userProfile.dob },
    { label: 'Marriage Date', val: userProfile.marriageDate },
    { label: 'Important Dates', val: userProfile.importantDates },
    { label: 'Children Info', val: userProfile.childrenCount || userProfile.childrenDetails },
    { label: 'Siblings Info', val: userProfile.siblings },
    { label: 'Dietary Preferences', val: userProfile.dietaryPreferences },
    { label: 'Emergency Contact', val: userProfile.emergencyContact },
    { label: 'Blood Group', val: userProfile.bloodGroup },
    { label: 'Residential Address', val: userProfile.homeAddress },
  ];

  const filledOptionalCount = optionalFields.filter((f) => Boolean(f.val && String(f.val).trim() !== '')).length;
  const completionPercent = Math.min(100, Math.round(20 + (filledOptionalCount / optionalFields.length) * 80));
  const missingFields = optionalFields.filter((f) => !f.val || String(f.val).trim() === '');

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let avatarUri = asset.uri;
        if (asset.base64) {
          avatarUri = asset.base64.startsWith('data:')
            ? asset.base64
            : `data:image/jpeg;base64,${asset.base64}`;
        }
        setEditAvatar(avatarUri);
        setAvatarError(false);
        setIsEditing(true);
      }
    } catch (e) {
      console.warn('Image picker error:', e);
    }
  };

  const handleChildrenCountChange = (text: string) => {
    setEditChildrenCount(text);
    const count = parseInt(text.trim(), 10);
    if (!isNaN(count) && count >= 0) {
      const safeCount = Math.min(10, Math.max(0, count));
      setChildrenList((prev) => {
        const updated = [...prev];
        if (safeCount > prev.length) {
          for (let i = prev.length; i < safeCount; i++) {
            updated.push({ gender: 'Male', name: '', dob: '' });
          }
        } else if (safeCount < prev.length) {
          updated.splice(safeCount);
        }
        return updated;
      });
    } else if (text.trim() === '') {
      setChildrenList([]);
    }
  };

  const handleAddChild = () => {
    const nextCount = childrenList.length + 1;
    setEditChildrenCount(String(nextCount));
    setChildrenList([...childrenList, { gender: 'Male', name: '', dob: '' }]);
  };

  const handleRemoveChild = (index: number) => {
    const updated = childrenList.filter((_, i) => i !== index);
    setChildrenList(updated);
    setEditChildrenCount(updated.length > 0 ? String(updated.length) : '0');
  };

  const handleUpdateChild = (index: number, field: keyof ChildInfo, value: any) => {
    setChildrenList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    const serializedChildrenDetails = JSON.stringify(childrenList);
    const countToSave = childrenList.length > 0 ? String(childrenList.length) : editChildrenCount.trim();

    const updates = {
      name: editName.trim(),
      designation: editDesignation.trim(),
      location: editLocation.trim(),
      email: editEmail.trim(),
      avatar: editAvatar,
      dob: editDob.trim(),
      marriageDate: editMarriageDate.trim(),
      importantDates: editImportantDates.trim(),
      childrenCount: countToSave,
      childrenDetails: serializedChildrenDetails,
      siblings: editSiblings.trim(),
      dietaryPreferences: editDietaryPreferences.trim(),
      emergencyContact: editEmergencyContact.trim(),
      bloodGroup: editBloodGroup.trim(),
      homeAddress: editHomeAddress.trim(),
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
    setEditEmail(userProfile.email || '');
    setEditAvatar(userProfile.avatar || '');
    setEditDob(userProfile.dob || '');
    setEditMarriageDate(userProfile.marriageDate || '');
    setEditImportantDates(userProfile.importantDates || '');
    setEditChildrenCount(userProfile.childrenCount || '');
    setChildrenList(parseChildrenDetails(userProfile.childrenDetails, userProfile.childrenCount));
    setEditSiblings(userProfile.siblings || '');
    setEditDietaryPreferences(userProfile.dietaryPreferences || '');
    setEditEmergencyContact(userProfile.emergencyContact || '');
    setEditBloodGroup(userProfile.bloodGroup || '');
    setEditHomeAddress(userProfile.homeAddress || '');
    setAvatarError(false);
    setIsEditing(false);
  };

  const viewChildrenList = parseChildrenDetails(userProfile.childrenDetails, userProfile.childrenCount);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: isEditing ? 120 : 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={true}
      >
        <View style={styles.container}>
          <View style={styles.card}>
            {/* Officer Avatar Section */}
            {(() => {
              const activeAvatar = isEditing ? editAvatar : (userProfile?.avatar || editAvatar || '');
              const displayUri = getDisplayImageUrl(activeAvatar);
              const hasCustomAvatar = Boolean(
                displayUri &&
                !avatarError &&
                !displayUri.includes('photo-1507003211169')
              );
              return (
                <View style={styles.avatarContainer}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handlePickImage}
                    style={{ position: 'relative' }}
                  >
                    <Image
                      source={hasCustomAvatar ? { uri: displayUri } : EMBLEM_IMAGE}
                      style={styles.avatarLarge}
                      resizeMode={hasCustomAvatar ? 'cover' : 'contain'}
                      onError={() => setAvatarError(true)}
                    />
                    <View style={styles.avatarEditBtn}>
                      <AppIcon name="camera-outline" size={18} color="#fff" />
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })()}

            {/* Profile Name & Status Title */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              <Text style={styles.name}>{userProfile.name || 'Officer'}</Text>
              {Boolean(userProfile.isOfficial) && (
                <View style={styles.verifiedProfileBadge} accessibilityLabel="Verified Official User">
                  <AppIcon name="checkmark" size={11} color="#ffffff" />
                </View>
              )}
              {!isEditing && (
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  style={styles.editPencilBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <AppIcon name="create-outline" size={18} color="#0d3829" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.role}>
              {userProfile.designation ? userProfile.designation : 'Officer Profile (Designation not set)'}
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <Text style={styles.idBadge}>Officer ID: {userProfile.officerId || userProfile.id || 'GOI-DL-2026'}</Text>
              {Boolean(userProfile.isOfficial) ? (
                <View style={styles.officialStatusPill}>
                  <Text style={styles.officialStatusPillText}>✓ Official / Verified User</Text>
                </View>
              ) : (
                <View style={styles.generalStatusPill}>
                  <Text style={styles.generalStatusPillText}>General User</Text>
                </View>
              )}
            </View>

            {/* Dynamic Profile Status Card (20% -> 100% completion tracking) */}
            <View style={styles.completionCard}>
              <View style={styles.completionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppIcon name="ribbon-outline" size={18} color="#0d3829" />
                  <Text style={styles.completionTitle}>Profile Status</Text>
                </View>
                <View style={styles.badgeWrapper}>
                  <Text style={styles.completionBadge}>{completionPercent}% Complete</Text>
                </View>
              </View>

              {/* Progress Bar Track */}
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${completionPercent}%` as any,
                      backgroundColor:
                        completionPercent >= 80 ? '#16a34a' : completionPercent >= 50 ? '#0d9488' : '#2563eb',
                    },
                  ]}
                />
              </View>

              <Text style={styles.completionHint}>
                {completionPercent === 100
                  ? 'Outstanding! Your profile is 100% complete.'
                  : completionPercent >= 60
                  ? 'Great progress! Fill in ' + missingFields.slice(0, 2).map((m) => m.label).join(', ') + ' to reach 100%.'
                  : 'Profile is ' + completionPercent + '% complete. Add your Designation, Location, DOB & Family details below.'}
              </Text>
            </View>

            {!isEditing ? (
              /* ==================== VIEW MODE ==================== */
              <>
                {/* 1. Official & Contact Details */}
                <View style={styles.sectionBox}>
                  <View style={styles.sectionHeaderRow}>
                    <AppIcon name="briefcase-outline" size={16} color="#0d3829" />
                    <Text style={styles.sectionHeading}>Official & Contact Info</Text>
                  </View>
                  <View style={styles.detailsList}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Designation</Text>
                      <Text style={styles.detailVal}>{userProfile.designation || 'Not set (Click Edit)'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Office Location / Room</Text>
                      <Text style={styles.detailVal}>{userProfile.location || 'Not set'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Registered Mobile</Text>
                      <Text style={styles.detailVal}>{userProfile.mobile || 'Not available'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Official Email</Text>
                      <Text style={styles.detailVal}>{userProfile.email || 'Not provided'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Emergency Contact</Text>
                      <Text style={styles.detailVal}>{userProfile.emergencyContact || 'Not provided'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Residential Address</Text>
                      <Text style={styles.detailVal}>{userProfile.homeAddress || 'Not provided'}</Text>
                    </View>
                  </View>
                </View>

                {/* 2. Special Dates & Milestones */}
                <View style={styles.sectionBox}>
                  <View style={styles.sectionHeaderRow}>
                    <AppIcon name="calendar-outline" size={16} color="#0d3829" />
                    <Text style={styles.sectionHeading}>Important Dates & Milestones</Text>
                  </View>
                  <View style={styles.detailsList}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date of Birth (DOB)</Text>
                      <View style={styles.detailValWrapper}>
                        <AppIcon name="calendar-outline" size={13} color="#0d3829" />
                        <Text style={styles.detailVal}>{userProfile.dob || 'Not provided'}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Marriage Date / Anniversary</Text>
                      <View style={styles.detailValWrapper}>
                        <AppIcon name="heart-outline" size={13} color="#e11d48" />
                        <Text style={styles.detailVal}>{userProfile.marriageDate || 'Not provided'}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Important Dates / Reminders</Text>
                      <View style={styles.detailValWrapper}>
                        <Text style={styles.detailVal}>{userProfile.importantDates || 'Not provided'}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* 3. Family Details */}
                <View style={styles.sectionBox}>
                  <View style={styles.sectionHeaderRow}>
                    <AppIcon name="people-outline" size={16} color="#0d3829" />
                    <Text style={styles.sectionHeading}>Family Details</Text>
                  </View>
                  <View style={styles.detailsList}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Number of Children</Text>
                      <Text style={styles.detailVal}>
                        {viewChildrenList.length > 0
                          ? `${viewChildrenList.length} Child${viewChildrenList.length > 1 ? 'ren' : ''}`
                          : userProfile.childrenCount
                          ? `${userProfile.childrenCount} Children`
                          : 'Not provided'}
                      </Text>
                    </View>

                    {/* Detailed Child Cards in View Mode */}
                    {viewChildrenList.length > 0 ? (
                      <View style={styles.childViewList}>
                        {viewChildrenList.map((child, idx) => (
                          <View key={`child-view-${idx}`} style={styles.childViewCard}>
                            <View style={styles.childViewHeader}>
                              <View style={[styles.childGenderBadge, child.gender === 'Female' ? styles.badgeGirl : styles.badgeBoy]}>
                                <Text style={styles.childGenderBadgeText}>
                                  {child.gender === 'Female' ? '👧 Female' : '👦 Male'}
                                </Text>
                              </View>
                              <Text style={styles.childIndexLabel}>Child #{idx + 1}</Text>
                            </View>

                            <View style={styles.childViewBody}>
                              {child.name ? (
                                <Text style={styles.childNameText}>{child.name}</Text>
                              ) : null}
                              <View style={styles.childDobRow}>
                                <AppIcon name="calendar-outline" size={14} color="#0d3829" />
                                <Text style={styles.childDobText}>
                                  DOB: {child.dob || 'Not provided'}
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : userProfile.childrenDetails ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Children Details</Text>
                        <Text style={styles.detailVal}>{userProfile.childrenDetails}</Text>
                      </View>
                    ) : null}

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Siblings Information</Text>
                      <Text style={styles.detailVal}>{userProfile.siblings || 'Not provided'}</Text>
                    </View>
                  </View>
                </View>

                {/* 4. Health & Dietary Preferences */}
                <View style={styles.sectionBox}>
                  <View style={styles.sectionHeaderRow}>
                    <AppIcon name="restaurant-outline" size={16} color="#0d3829" />
                    <Text style={styles.sectionHeading}>Health & Dining Preferences</Text>
                  </View>
                  <View style={styles.detailsList}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Dietary Preferences</Text>
                      <Text style={styles.detailVal}>{userProfile.dietaryPreferences || 'Standard'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Blood Group</Text>
                      <Text style={styles.detailVal}>{userProfile.bloodGroup || 'Not provided'}</Text>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionRowFull}>
                  <TouchableOpacity style={styles.editBtnFull} onPress={() => setIsEditing(true)} activeOpacity={0.85}>
                    <AppIcon name="create-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.editBtnFullText}>Edit Profile</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.actionRowBottom}>
                  <TouchableOpacity style={styles.backBtn} onPress={() => setActiveTab('home')} activeOpacity={0.8}>
                    <AppIcon name="arrow-back" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.backBtnText}>Back to Menu</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
                    <AppIcon name="log-out-outline" size={16} color="#dc2626" style={{ marginRight: 6 }} />
                    <Text style={styles.logoutBtnText}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* ==================== EDIT MODE ==================== */
              <View style={{ width: '100%', marginTop: 14 }}>
                {/* 1. Official & Contact Details */}
                <Text style={styles.formSectionTitle}>1. Personal & Official Details</Text>

                <Text style={styles.editLabel}>Full Name *</Text>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter full officer name"
                  placeholderTextColor="#94a3b8"
                />

                <Text style={styles.editLabel}>Designation</Text>
                <TextInput
                  style={styles.editInput}
                  value={editDesignation}
                  onChangeText={setEditDesignation}
                  placeholder="e.g. IAS, Special Secretary, Joint Secretary, Director"
                  placeholderTextColor="#94a3b8"
                />

                <Text style={styles.editLabel}>Office Location / Room / Department</Text>
                <TextInput
                  style={styles.editInput}
                  value={editLocation}
                  onChangeText={setEditLocation}
                  placeholder="e.g. North Block, Room 204, New Delhi"
                  placeholderTextColor="#94a3b8"
                />

                <Text style={styles.editLabel}>Official Email Address</Text>
                <TextInput
                  style={styles.editInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="officer@nic.in / email@gov.in"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.editLabel}>Emergency Contact Number</Text>
                <TextInput
                  style={styles.editInput}
                  value={editEmergencyContact}
                  onChangeText={setEditEmergencyContact}
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                />

                <Text style={styles.editLabel}>Residential Address / Quarters</Text>
                <TextInput
                  style={styles.editInput}
                  value={editHomeAddress}
                  onChangeText={setEditHomeAddress}
                  placeholder="e.g. Sector 2, Type V Quarters, Chanakyapuri"
                  placeholderTextColor="#94a3b8"
                />

                {/* 2. Special Dates with Calendar Pickers */}
                <Text style={styles.formSectionTitle}>2. Important Dates & Milestones</Text>

                <DatePickerInput
                  label="Date of Birth (DOB) 📅"
                  value={editDob}
                  onChange={setEditDob}
                  placeholder="Select Date of Birth (DD/MM/YYYY)"
                  title="Select Date of Birth (DOB)"
                />

                <DatePickerInput
                  label="Marriage Date / Wedding Anniversary 💍"
                  value={editMarriageDate}
                  onChange={setEditMarriageDate}
                  placeholder="Select Marriage Date (DD/MM/YYYY)"
                  title="Select Marriage Date"
                />

                <DatePickerInput
                  label="Important Milestone / Cadre Date 🗓️"
                  value={editImportantDates}
                  onChange={setEditImportantDates}
                  placeholder="Select Important Date (DD/MM/YYYY)"
                  title="Select Important Date"
                />

                {/* 3. Family Details & Dynamic Children Section */}
                <Text style={styles.formSectionTitle}>3. Family Details & Children Info</Text>

                <View style={styles.childrenCountHeader}>
                  <Text style={styles.editLabel}>How many children do you have?</Text>
                  <TouchableOpacity onPress={handleAddChild} style={styles.addChildSmallBtn} activeOpacity={0.8}>
                    <AppIcon name="add" size={14} color="#0d3829" />
                    <Text style={styles.addChildSmallBtnText}>+ Add Child</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.editInput}
                  value={editChildrenCount}
                  onChangeText={handleChildrenCountChange}
                  placeholder="Enter number of children (e.g. 2, or 0 if none)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                />

                {/* Dynamic Child Input Boxes */}
                {childrenList.length > 0 ? (
                  <View style={styles.childrenEditContainer}>
                    <Text style={styles.childrenEditHint}>
                      Enter details for each child below (select Male / Female and pick DOB from Calendar):
                    </Text>

                    {childrenList.map((child, index) => (
                      <View key={`child-edit-${index}`} style={styles.childEditCard}>
                        {/* Child Card Header */}
                        <View style={styles.childCardHeader}>
                          <View style={styles.childTitleRow}>
                            <View style={styles.childNumberCircle}>
                              <Text style={styles.childNumberText}>{index + 1}</Text>
                            </View>
                            <Text style={styles.childCardTitle}>Child #{index + 1}</Text>
                          </View>

                          <TouchableOpacity
                            onPress={() => handleRemoveChild(index)}
                            style={styles.removeChildBtn}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <AppIcon name="trash-outline" size={16} color="#ef4444" />
                            <Text style={styles.removeChildText}>Remove</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Gender Selector: Male / Female Pills */}
                        <Text style={styles.childFieldLabel}>Select Gender *</Text>
                        <View style={styles.genderPillsRow}>
                          <TouchableOpacity
                            style={[
                              styles.genderPill,
                              child.gender === 'Male' && styles.genderPillMaleActive,
                            ]}
                            onPress={() => handleUpdateChild(index, 'gender', 'Male')}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.genderIcon}>👦</Text>
                            <Text
                              style={[
                                styles.genderPillText,
                                child.gender === 'Male' && styles.genderPillTextActive,
                              ]}
                            >
                              Male
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.genderPill,
                              child.gender === 'Female' && styles.genderPillFemaleActive,
                            ]}
                            onPress={() => handleUpdateChild(index, 'gender', 'Female')}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.genderIcon}>👧</Text>
                            <Text
                              style={[
                                styles.genderPillText,
                                child.gender === 'Female' && styles.genderPillTextActive,
                              ]}
                            >
                              Female
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Child Name Input */}
                        <Text style={styles.childFieldLabel}>Child's Name (Optional)</Text>
                        <TextInput
                          style={styles.childNameInput}
                          value={child.name}
                          onChangeText={(val) => handleUpdateChild(index, 'name', val)}
                          placeholder={`Enter Child #${index + 1} Name (e.g. ${child.gender === 'Female' ? 'Ananya' : 'Aarav'})`}
                          placeholderTextColor="#94a3b8"
                        />

                        {/* Child DOB with Calendar Picker */}
                        <DatePickerInput
                          label={`Child #${index + 1} Date of Birth (DOB) 📅`}
                          value={child.dob}
                          onChange={(val) => handleUpdateChild(index, 'dob', val)}
                          placeholder={`Select Child #${index + 1} DOB (DD/MM/YYYY)`}
                          title={`Select Child #${index + 1} Date of Birth`}
                        />
                      </View>
                    ))}
                  </View>
                ) : null}

                <Text style={styles.editLabel}>Siblings Information</Text>
                <TextInput
                  style={styles.editInput}
                  value={editSiblings}
                  onChangeText={setEditSiblings}
                  placeholder="e.g. 1 Elder Brother, 1 Younger Sister"
                  placeholderTextColor="#94a3b8"
                />

                {/* 4. Dining & Health Preferences */}
                <Text style={styles.formSectionTitle}>4. Health & Dining Preferences</Text>

                <Text style={styles.editLabel}>Dietary Preferences & Restrictions</Text>
                <TextInput
                  style={styles.editInput}
                  value={editDietaryPreferences}
                  onChangeText={setEditDietaryPreferences}
                  placeholder="e.g. Pure Veg, Jain, Low Sugar, No Garlic/Onion, Gluten Free"
                  placeholderTextColor="#94a3b8"
                />

                <Text style={styles.editLabel}>Blood Group</Text>
                <TextInput
                  style={styles.editInput}
                  value={editBloodGroup}
                  onChangeText={setEditBloodGroup}
                  placeholder="e.g. B+, O+, A+, AB+"
                  placeholderTextColor="#94a3b8"
                />

                <Text style={styles.editLabelDisabled}>Registered Phone (Permanent ID)</Text>
                <TextInput
                  style={styles.editInputDisabled}
                  value={userProfile.mobile}
                  editable={false}
                />

                <View style={styles.actionRowBottom}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={isSaving} activeOpacity={0.7}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving} activeOpacity={0.85}>
                    {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Profile</Text>}
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
            <Text style={styles.detailVal}>IAS Canteen Portal   v2.4</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => setActiveTab('home')} activeOpacity={0.8}>
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
            <Text style={styles.detailVal}>7:00 AM - 9:30 PM (All Days)</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Meal Collection</Text>
            <Text style={styles.detailVal}>Counter 1 (Beverages), Counter 2 (Meals)</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => setActiveTab('home')} activeOpacity={0.8}>
          <Text style={styles.backBtnText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#f8fafc',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 640,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    alignItems: 'stretch',
  },
  avatarContainer: {
    position: 'relative',
    alignSelf: 'center',
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#0d3829',
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
  editPencilBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  role: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
    textAlign: 'center',
  },
  idBadge: {
    fontSize: 12,
    color: '#0d3829',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '700',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  verifiedProfileBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  officialStatusPill: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#93c5fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  officialStatusPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  generalStatusPill: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  generalStatusPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },
  completionCard: {
    width: '100%',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    marginBottom: 10,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  badgeWrapper: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  completionBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d',
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  completionHint: {
    fontSize: 11.5,
    color: '#166534',
    lineHeight: 16,
    fontWeight: '500',
  },
  sectionBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginTop: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d3829',
  },
  detailsList: {
    width: '100%',
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 28,
  },
  detailLabel: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '600',
    flex: 1,
  },
  detailValWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    flex: 1.2,
  },
  detailVal: {
    fontSize: 12.5,
    color: '#0f172a',
    fontWeight: '700',
    textAlign: 'right',
  },
  /* View mode child cards */
  childViewList: {
    width: '100%',
    gap: 8,
    marginTop: 6,
  },
  childViewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  childViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  childGenderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeBoy: {
    backgroundColor: '#dbeafe',
  },
  badgeGirl: {
    backgroundColor: '#fce7f3',
  },
  childGenderBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
  },
  childIndexLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  childViewBody: {
    gap: 4,
  },
  childNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  childDobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  childDobText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0d3829',
  },
  /* Edit mode child cards */
  childrenCountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  addChildSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addChildSmallBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0d3829',
  },
  childrenEditContainer: {
    width: '100%',
    marginTop: 10,
    gap: 12,
  },
  childrenEditHint: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748b',
    lineHeight: 16,
  },
  childEditCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    padding: 14,
  },
  childCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  childTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  childNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0d3829',
    justifyContent: 'center',
    alignItems: 'center',
  },
  childNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  childCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  removeChildBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removeChildText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },
  childFieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 4,
  },
  genderPillsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  genderPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 8,
  },
  genderPillMaleActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  genderPillFemaleActive: {
    backgroundColor: '#fce7f3',
    borderColor: '#db2777',
  },
  genderIcon: {
    fontSize: 16,
  },
  genderPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  genderPillTextActive: {
    color: '#0f172a',
  },
  childNameInput: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 10,
  },
  actionRowFull: {
    width: '100%',
    marginTop: 16,
  },
  editBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d3829',
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
  },
  editBtnFullText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  actionRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
    marginTop: 12,
  },
  backBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 11,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  logoutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  logoutBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700',
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0d3829',
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  editLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
    marginBottom: 3,
  },
  editLabelDisabled: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 8,
    marginBottom: 3,
  },
  editInput: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  editInputDisabled: {
    width: '100%',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#94a3b8',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#0d3829',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
