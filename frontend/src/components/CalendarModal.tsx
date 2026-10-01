import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { AppIcon } from './AppIcon';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (formattedDate: string) => void;
  initialDate?: string;
  title?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Parse "DD/MM/YYYY" or "YYYY-MM-DD" or standard date string
function parseDateString(dateStr?: string): Date {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') {
    return new Date();
  }
  const clean = dateStr.trim();
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return new Date(y, m, d);
      }
    }
  } else if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return new Date(y, m, d);
      }
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatDateToDDMMYYYY(d: Date): string {
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  onClose,
  onSelectDate,
  initialDate,
  title = 'Select Date',
}) => {
  const initial = parseDateString(initialDate);
  const [currentYear, setCurrentYear] = useState(initial.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initial.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(initial);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      const d = parseDateString(initialDate);
      setSelectedDate(d);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
      setShowYearPicker(false);
      setShowMonthPicker(false);
    }
  }, [visible, initialDate]);

  // Generate days in currentMonth & currentYear
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleDaySelect = (dayNum: number) => {
    const d = new Date(currentYear, currentMonth, dayNum);
    setSelectedDate(d);
  };

  const handleConfirm = () => {
    onSelectDate(formatDateToDDMMYYYY(selectedDate));
    onClose();
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Generate Year range (1940 to 2035)
  const currentActualYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentActualYear + 5; y >= 1940; y--) {
    years.push(y);
  }

  const today = new Date();
  const isToday = (dayNum: number) =>
    today.getDate() === dayNum &&
    today.getMonth() === currentMonth &&
    today.getFullYear() === currentYear;

  const isSelected = (dayNum: number) =>
    selectedDate.getDate() === dayNum &&
    selectedDate.getMonth() === currentMonth &&
    selectedDate.getFullYear() === currentYear;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppIcon name="calendar" size={20} color="#ffffff" />
              <Text style={styles.title}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <AppIcon name="close" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Selected Date Ribbon */}
          <View style={styles.selectedRibbon}>
            <Text style={styles.ribbonLabel}>Selected Date:</Text>
            <Text style={styles.ribbonDate}>
              {formatDateToDDMMYYYY(selectedDate)} ({SHORT_MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()})
            </Text>
          </View>

          {/* Month & Year Navigation Bar */}
          <View style={styles.navBar}>
            <TouchableOpacity onPress={prevMonth} style={styles.navArrowBtn}>
              <AppIcon name="chevron-back" size={20} color="#0d3829" />
            </TouchableOpacity>

            <View style={styles.monthYearRow}>
              <TouchableOpacity
                onPress={() => {
                  setShowMonthPicker(!showMonthPicker);
                  setShowYearPicker(false);
                }}
                style={[styles.dropdownBtn, showMonthPicker && styles.dropdownBtnActive]}
              >
                <Text style={styles.dropdownBtnText}>{MONTH_NAMES[currentMonth]}</Text>
                <AppIcon name="chevron-down" size={14} color="#0d3829" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowYearPicker(!showYearPicker);
                  setShowMonthPicker(false);
                }}
                style={[styles.dropdownBtn, showYearPicker && styles.dropdownBtnActive]}
              >
                <Text style={styles.dropdownBtnText}>{currentYear}</Text>
                <AppIcon name="chevron-down" size={14} color="#0d3829" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={nextMonth} style={styles.navArrowBtn}>
              <AppIcon name="chevron-forward" size={20} color="#0d3829" />
            </TouchableOpacity>
          </View>

          {/* Body Section: Month Picker / Year Picker / Calendar Grid */}
          {showMonthPicker ? (
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerHeader}>Select Month</Text>
              <View style={styles.monthsGrid}>
                {MONTH_NAMES.map((mName, idx) => (
                  <TouchableOpacity
                    key={mName}
                    style={[
                      styles.monthOption,
                      idx === currentMonth && styles.monthOptionActive
                    ]}
                    onPress={() => {
                      setCurrentMonth(idx);
                      setShowMonthPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.monthOptionText,
                        idx === currentMonth && styles.monthOptionTextActive
                      ]}
                    >
                      {SHORT_MONTHS[idx]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : showYearPicker ? (
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerHeader}>Select Year</Text>
              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={true}>
                <View style={styles.yearsGrid}>
                  {years.map((yr) => (
                    <TouchableOpacity
                      key={yr}
                      style={[
                        styles.yearOption,
                        yr === currentYear && styles.yearOptionActive
                      ]}
                      onPress={() => {
                        setCurrentYear(yr);
                        setShowYearPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.yearOptionText,
                          yr === currentYear && styles.yearOptionTextActive
                        ]}
                      >
                        {yr}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View style={styles.calendarBody}>
              {/* Day Headers (Su, Mo, Tu, We, Th, Fr, Sa) */}
              <View style={styles.dayHeadersRow}>
                {DAY_HEADERS.map((dh) => (
                  <Text key={dh} style={styles.dayHeaderCell}>
                    {dh}
                  </Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.daysGrid}>
                {/* Empty cells before 1st of month */}
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.dayCellEmpty} />
                ))}

                {/* Day numbers */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const sel = isSelected(dayNum);
                  const tod = isToday(dayNum);

                  return (
                    <TouchableOpacity
                      key={`day-${dayNum}`}
                      style={[
                        styles.dayCell,
                        tod && !sel && styles.dayCellToday,
                        sel && styles.dayCellSelected
                      ]}
                      onPress={() => handleDaySelect(dayNum)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayCellText,
                          tod && !sel && styles.dayCellTextToday,
                          sel && styles.dayCellTextSelected
                        ]}
                      >
                        {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Footer Controls */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleToday} style={styles.todayBtn} activeOpacity={0.8}>
              <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>

            <View style={styles.footerRight}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} style={styles.confirmBtn} activeOpacity={0.85}>
                <AppIcon name="checkmark" size={16} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.confirmBtnText}>Select Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  header: {
    backgroundColor: '#0d3829',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  closeBtn: {
    padding: 4,
  },
  selectedRibbon: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ribbonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  ribbonDate: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0d3829',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  navArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dropdownBtnActive: {
    backgroundColor: '#e2e8f0',
    borderColor: '#0d3829',
  },
  dropdownBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d3829',
  },
  calendarBody: {
    padding: 12,
  },
  dayHeadersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dayHeaderCell: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 38,
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 1,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#0d3829',
  },
  dayCellSelected: {
    backgroundColor: '#0d3829',
  },
  dayCellText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  dayCellTextToday: {
    color: '#0d3829',
    fontWeight: '800',
  },
  dayCellTextSelected: {
    color: '#ffffff',
    fontWeight: '900',
  },
  pickerContainer: {
    padding: 14,
    minHeight: 240,
  },
  pickerHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
    textAlign: 'center',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  monthOption: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  monthOptionActive: {
    backgroundColor: '#0d3829',
    borderColor: '#0d3829',
  },
  monthOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  monthOptionTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  yearOption: {
    width: '22%',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  yearOptionActive: {
    backgroundColor: '#0d3829',
    borderColor: '#0d3829',
  },
  yearOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  yearOptionTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0d3829',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d3829',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
