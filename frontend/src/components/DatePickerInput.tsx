import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { AppIcon } from './AppIcon';
import { CalendarModal } from './CalendarModal';

interface DatePickerInputProps {
  label?: string;
  value: string;
  onChange: (newDate: string) => void;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select date (DD/MM/YYYY)',
  title = 'Select Date',
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleOpen = () => {
    if (!disabled) {
      setModalVisible(true);
    }
  };

  const handleClear = (e: any) => {
    e?.stopPropagation?.();
    onChange('');
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={[styles.inputBox, disabled && styles.inputDisabled]}
        onPress={handleOpen}
        activeOpacity={disabled ? 1 : 0.75}
      >
        <View style={styles.leftContent}>
          <View style={styles.iconCircle}>
            <AppIcon name="calendar-outline" size={16} color="#0d3829" />
          </View>
          <Text style={[styles.valueText, !value && styles.placeholderText]}>
            {value || placeholder}
          </Text>
        </View>

        <View style={styles.rightActions}>
          {value && !disabled ? (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <AppIcon name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
          <View style={styles.calendarTriggerBtn}>
            <Text style={styles.calendarTriggerText}>Pick Date</Text>
            <AppIcon name="calendar" size={14} color="#0d3829" />
          </View>
        </View>
      </TouchableOpacity>

      <CalendarModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelectDate={(selected) => onChange(selected)}
        initialDate={value}
        title={title}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d3829',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  placeholderText: {
    color: '#94a3b8',
    fontWeight: '400',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearBtn: {
    padding: 2,
  },
  calendarTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  calendarTriggerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d3829',
  },
});
