/**
 * slotService.js
 * Comprehensive Prebooking / Time Slot Management for Government Canteen & KOT System
 */

const dataStore = require('../storage/dataStore');
const Order = require('../models/Order');
const mongoose = require('mongoose');

// Standard Meal Windows and 30-minute interval slots
const DEFAULT_SLOT_TEMPLATES = [
  // BREAKFAST (07:30 AM - 10:30 AM)
  {
    id: 'breakfast_0730_0800',
    mealSlot: 'Breakfast',
    startTime: '07:30 AM',
    endTime: '08:00 AM',
    label: '07:30 AM - 08:00 AM',
    start24: '07:30',
    end24: '08:00',
    maxCapacity: 40
  },
  {
    id: 'breakfast_0800_0830',
    mealSlot: 'Breakfast',
    startTime: '08:00 AM',
    endTime: '08:30 AM',
    label: '08:00 AM - 08:30 AM',
    start24: '08:00',
    end24: '08:30',
    maxCapacity: 40
  },
  {
    id: 'breakfast_0830_0900',
    mealSlot: 'Breakfast',
    startTime: '08:30 AM',
    endTime: '09:00 AM',
    label: '08:30 AM - 09:00 AM',
    start24: '08:30',
    end24: '09:00',
    maxCapacity: 40
  },
  {
    id: 'breakfast_0900_0930',
    mealSlot: 'Breakfast',
    startTime: '09:00 AM',
    endTime: '09:30 AM',
    label: '09:00 AM - 09:30 AM',
    start24: '09:00',
    end24: '09:30',
    maxCapacity: 40
  },
  {
    id: 'breakfast_0930_1000',
    mealSlot: 'Breakfast',
    startTime: '09:30 AM',
    endTime: '10:00 AM',
    label: '09:30 AM - 10:00 AM',
    start24: '09:30',
    end24: '10:00',
    maxCapacity: 40
  },
  {
    id: 'breakfast_1000_1030',
    mealSlot: 'Breakfast',
    startTime: '10:00 AM',
    endTime: '10:30 AM',
    label: '10:00 AM - 10:30 AM',
    start24: '10:00',
    end24: '10:30',
    maxCapacity: 40
  },

  // LUNCH (12:00 PM - 03:00 PM)
  {
    id: 'lunch_1200_1230',
    mealSlot: 'Lunch',
    startTime: '12:00 PM',
    endTime: '12:30 PM',
    label: '12:00 PM - 12:30 PM',
    start24: '12:00',
    end24: '12:30',
    maxCapacity: 50
  },
  {
    id: 'lunch_1230_1300',
    mealSlot: 'Lunch',
    startTime: '12:30 PM',
    endTime: '01:00 PM',
    label: '12:30 PM - 01:00 PM',
    start24: '12:30',
    end24: '13:00',
    maxCapacity: 50
  },
  {
    id: 'lunch_1300_1330',
    mealSlot: 'Lunch',
    startTime: '01:00 PM',
    endTime: '01:30 PM',
    label: '01:00 PM - 01:30 PM',
    start24: '13:00',
    end24: '13:30',
    maxCapacity: 50
  },
  {
    id: 'lunch_1330_1400',
    mealSlot: 'Lunch',
    startTime: '01:30 PM',
    endTime: '02:00 PM',
    label: '01:30 PM - 02:00 PM',
    start24: '13:30',
    end24: '14:00',
    maxCapacity: 50
  },
  {
    id: 'lunch_1400_1430',
    mealSlot: 'Lunch',
    startTime: '02:00 PM',
    endTime: '02:30 PM',
    label: '02:00 PM - 02:30 PM',
    start24: '14:00',
    end24: '14:30',
    maxCapacity: 50
  },
  {
    id: 'lunch_1430_1500',
    mealSlot: 'Lunch',
    startTime: '02:30 PM',
    endTime: '03:00 PM',
    label: '02:30 PM - 03:00 PM',
    start24: '14:30',
    end24: '15:00',
    maxCapacity: 50
  },

  // SNACKS (04:00 PM - 06:00 PM)
  {
    id: 'snacks_1600_1630',
    mealSlot: 'Snacks',
    startTime: '04:00 PM',
    endTime: '04:30 PM',
    label: '04:00 PM - 04:30 PM',
    start24: '16:00',
    end24: '16:30',
    maxCapacity: 35
  },
  {
    id: 'snacks_1630_1700',
    mealSlot: 'Snacks',
    startTime: '04:30 PM',
    endTime: '05:00 PM',
    label: '04:30 PM - 05:00 PM',
    start24: '16:30',
    end24: '17:00',
    maxCapacity: 35
  },
  {
    id: 'snacks_1700_1730',
    mealSlot: 'Snacks',
    startTime: '05:00 PM',
    endTime: '05:30 PM',
    label: '05:00 PM - 05:30 PM',
    start24: '17:00',
    end24: '17:30',
    maxCapacity: 35
  },
  {
    id: 'snacks_1730_1800',
    mealSlot: 'Snacks',
    startTime: '05:30 PM',
    endTime: '06:00 PM',
    label: '05:30 PM - 06:00 PM',
    start24: '17:30',
    end24: '18:00',
    maxCapacity: 35
  },

  // DINNER (07:30 PM - 10:30 PM)
  {
    id: 'dinner_1930_2000',
    mealSlot: 'Dinner',
    startTime: '07:30 PM',
    endTime: '08:00 PM',
    label: '07:30 PM - 08:00 PM',
    start24: '19:30',
    end24: '20:00',
    maxCapacity: 45
  },
  {
    id: 'dinner_2000_2030',
    mealSlot: 'Dinner',
    startTime: '08:00 PM',
    endTime: '08:30 PM',
    label: '08:00 PM - 08:30 PM',
    start24: '20:00',
    end24: '20:30',
    maxCapacity: 45
  },
  {
    id: 'dinner_2030_2100',
    mealSlot: 'Dinner',
    startTime: '08:30 PM',
    endTime: '09:00 PM',
    label: '08:30 PM - 09:00 PM',
    start24: '20:30',
    end24: '21:00',
    maxCapacity: 45
  },
  {
    id: 'dinner_2100_2130',
    mealSlot: 'Dinner',
    startTime: '09:00 PM',
    endTime: '09:30 PM',
    label: '09:00 PM - 09:30 PM',
    start24: '21:00',
    end24: '21:30',
    maxCapacity: 45
  },
  {
    id: 'dinner_2130_2200',
    mealSlot: 'Dinner',
    startTime: '09:30 PM',
    endTime: '10:00 PM',
    label: '09:30 PM - 10:00 PM',
    start24: '21:30',
    end24: '22:00',
    maxCapacity: 45
  },
  {
    id: 'dinner_2200_2230',
    mealSlot: 'Dinner',
    startTime: '10:00 PM',
    endTime: '10:30 PM',
    label: '10:00 PM - 10:30 PM',
    start24: '22:00',
    end24: '22:30',
    maxCapacity: 45
  }
];

function getUpcomingDates(daysCount = 7) {
  const dates = [];
  const now = new Date();
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const formatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    dates.push({
      date: dateStr,
      dayName,
      formatted,
      isToday: i === 0,
      isTomorrow: i === 1,
      label: i === 0 ? `Today (${formatted})` : (i === 1 ? `Tomorrow (${formatted})` : `${dayName}, ${formatted}`)
    });
  }
  return dates;
}

/**
 * Check existing bookings count for slots on a given date
 */
async function getBookingsCountMap(targetDateStr) {
  const countMap = new Map();

  try {
    if (mongoose.connection.readyState === 1) {
      const startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`);

      const orders = await Order.find({
        orderType: 'PRE_ORDER',
        status: { $nin: ['CANCELLED', 'REJECTED'] },
        $or: [
          { pickupDate: { $gte: startOfDay, $lte: endOfDay } },
          { createdAt: { $gte: startOfDay, $lte: endOfDay } }
        ]
      }).select('pickupTime slotId mealSlot preOrderSlot');

      orders.forEach(ord => {
        const key = ord.slotId || ord.pickupTime || ord.mealSlot;
        if (key) {
          countMap.set(key, (countMap.get(key) || 0) + 1);
        }
      });
    }
  } catch (err) {
    console.warn('[SLOT-SERVICE] MongoDB count check fallback:', err.message);
  }

  // Also check local store
  try {
    const localOrders = dataStore.getOrders ? dataStore.getOrders() : [];
    localOrders.forEach(ord => {
      if (ord.orderType === 'PRE_ORDER' && ord.status !== 'CANCELLED') {
        const ordDateStr = ord.pickupDate ? new Date(ord.pickupDate).toISOString().split('T')[0] : '';
        if (ordDateStr === targetDateStr) {
          const key = ord.slotId || ord.pickupTime || ord.mealSlot;
          if (key && !countMap.has(key)) {
            countMap.set(key, (countMap.get(key) || 0) + 1);
          }
        }
      }
    });
  } catch (e) {}

  return countMap;
}

/**
 * Generate available time slots for a specified date and optional meal filter
 */
async function getPrebookSlots(options = {}) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const targetDateStr = options.date ? String(options.date).split('T')[0] : todayStr;
  const targetMeal = options.mealType ? String(options.mealType).toLowerCase().trim() : 'all';

  const upcomingDates = getUpcomingDates(7);
  const isValidDate = upcomingDates.some(d => d.date === targetDateStr) || targetDateStr >= todayStr;
  const isToday = targetDateStr === todayStr;

  // Indian standard / local current minutes for cutoff
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  const bufferMinutes = 0; // Allow instant booking for the upcoming 30-minute window (e.g., at 4:00 PM, 4:30 PM slot is selectable)

  const bookingsMap = await getBookingsCountMap(targetDateStr);

  const processedSlots = DEFAULT_SLOT_TEMPLATES.map(template => {
    // Check if slot falls in requested meal filter
    if (targetMeal !== 'all' && targetMeal !== '' && template.mealSlot.toLowerCase() !== targetMeal) {
      return null;
    }

    const [sHour, sMin] = template.start24.split(':').map(Number);
    const slotStartTotalMinutes = sHour * 60 + sMin;

    let isAvailable = true;
    let status = 'AVAILABLE';
    let unavailableReason = null;

    // Time cutoff validation for today: only past slots are disabled
    if (isToday) {
      if (currentTotalMinutes > slotStartTotalMinutes) {
        isAvailable = false;
        status = 'CUTOFF_PASSED';
        unavailableReason = 'Slot booking closed for today (Time passed)';
      }
    } else if (targetDateStr < todayStr) {
      isAvailable = false;
      status = 'EXPIRED';
      unavailableReason = 'Date is in the past';
    }

    // Capacity checking
    const bookedCount = bookingsMap.get(template.id) || bookingsMap.get(template.label) || bookingsMap.get(template.startTime) || 0;
    const remainingCapacity = Math.max(0, template.maxCapacity - bookedCount);

    if (isAvailable && remainingCapacity <= 0) {
      isAvailable = false;
      status = 'FULL';
      unavailableReason = 'Slot is fully booked for this dining window';
    }

    return {
      id: template.id,
      slotId: template.id,
      label: template.label,
      mealSlot: template.mealSlot,
      category: template.mealSlot.toLowerCase(),
      startTime: template.startTime,
      endTime: template.endTime,
      start24: template.start24,
      end24: template.end24,
      date: targetDateStr,
      isAvailable,
      status,
      unavailableReason,
      maxCapacity: template.maxCapacity,
      bookedCount,
      remainingCapacity
    };
  }).filter(Boolean);

  // Group slots by meal
  const groupedSlots = {
    Breakfast: processedSlots.filter(s => s.mealSlot === 'Breakfast'),
    Lunch: processedSlots.filter(s => s.mealSlot === 'Lunch'),
    Snacks: processedSlots.filter(s => s.mealSlot === 'Snacks'),
    Dinner: processedSlots.filter(s => s.mealSlot === 'Dinner')
  };

  const availableCount = processedSlots.filter(s => s.isAvailable).length;

  return {
    success: true,
    selectedDate: targetDateStr,
    isToday,
    availableDates: upcomingDates,
    totalSlots: processedSlots.length,
    availableSlotsCount: availableCount,
    slots: processedSlots,
    groupedSlots
  };
}

/**
 * Validate requested prebooking slot
 */
async function validateSlot({ slotId, pickupTime, pickupDate, mealSlot }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const targetDateStr = pickupDate ? new Date(pickupDate).toISOString().split('T')[0] : todayStr;

  const result = await getPrebookSlots({ date: targetDateStr });
  
  // Find matching template
  const matchedSlot = result.slots.find(s => 
    (slotId && (s.id === slotId || s.slotId === slotId)) ||
    (pickupTime && (s.label === pickupTime || s.startTime === pickupTime)) ||
    (mealSlot && s.mealSlot.toLowerCase() === mealSlot.toLowerCase() && pickupTime && s.label.includes(pickupTime))
  );

  return {
    isValid: !!matchedSlot,
    isAvailable: matchedSlot ? matchedSlot.isAvailable : true, // allow flexible custom times
    slot: matchedSlot || null,
    reason: matchedSlot && !matchedSlot.isAvailable ? matchedSlot.unavailableReason : null
  };
}

module.exports = {
  DEFAULT_SLOT_TEMPLATES,
  getUpcomingDates,
  getPrebookSlots,
  validateSlot
};
