export const initialOrders = {
  new: [
    {
      id: '1047',
      timeAgo: '2 mins ago',
      type: 'Dine In',
      table: 'Table 5',
      items: [
        { qty: 2, name: 'Chicken Biryani' },
        { qty: 1, name: 'Chicken 65', spicy: true },
        { qty: 2, name: 'Butter Naan' }
      ],
      note: 'No onion. Extra spicy please.',
      status: 'new'
    },
    {
      id: '1041',
      timeAgo: '6 mins ago',
      type: 'Delivery',
      platform: 'Swiggy',
      items: [
        { qty: 1, name: 'Chicken Burger' },
        { qty: 1, name: 'French Fries' },
        { qty: 1, name: 'Coke' }
      ],
      note: 'No mayo. Extra ketchup.',
      status: 'new'
    },
    {
      id: '1038',
      timeAgo: '9 mins ago',
      type: 'Dine In',
      table: 'Table 9',
      items: [
        { qty: 1, name: 'Paneer Tikka' },
        { qty: 2, name: 'Garlic Naan' }
      ],
      note: 'Medium spicy.',
      status: 'new'
    }
  ],
  prep: [
    {
      id: '1046',
      startedTimeAgo: 'Started 5 mins ago',
      type: 'Dine In',
      table: 'Table 3',
      items: [
        { qty: 2, name: 'Paneer Butter Masala' },
        { qty: 2, name: 'Garlic Naan' },
        { qty: 1, name: 'Fresh Lime Soda' }
      ],
      note: 'Less oil please.',
      timerSeconds: 312, // 05:12
      progress: 40,
      status: 'prep'
    },
    {
      id: '1037',
      startedTimeAgo: 'Started 12 mins ago',
      type: 'Dine In',
      table: 'Table 4',
      items: [
        { qty: 1, name: 'Veg Manchurian' },
        { qty: 1, name: 'Hakka Noodles' }
      ],
      note: 'Use Schezwan sauce.',
      timerSeconds: 740, // 12:20
      progress: 70,
      status: 'prep'
    },
    {
      id: '1036',
      startedTimeAgo: 'Started 15 mins ago',
      type: 'Delivery',
      items: [
        { qty: 1, name: 'Paneer Pizza' },
        { qty: 1, name: 'Cheese Garlic Bread' }
      ],
      timerSeconds: 908, // 15:08
      progress: 85,
      status: 'prep'
    }
  ],
  ready: [
    {
      id: '1045',
      readyTimeAgo: 'Ready 2 mins ago',
      type: 'Dine In',
      table: 'Table 1',
      items: [
        { qty: 1, name: 'Veg Biryani' },
        { qty: 1, name: 'Raita' },
        { qty: 1, name: 'Masala Papad' }
      ],
      statusNote: 'Ready for pickup.',
      status: 'ready'
    },
    {
      id: '1042',
      readyTimeAgo: 'Ready 8 mins ago',
      type: 'Dine In',
      table: 'Table 6',
      items: [
        { qty: 1, name: 'Fish Fry' },
        { qty: 1, name: 'Steamed Rice' },
        { qty: 1, name: 'Dal Tadka' }
      ],
      statusNote: 'Ready for pickup.',
      status: 'ready'
    },
    {
      id: '1035',
      readyTimeAgo: 'Ready 12 mins ago',
      type: 'Dine In',
      table: 'Table 2',
      items: [
        { qty: 1, name: 'Veg Thali' },
        { qty: 1, name: 'Buttermilk' }
      ],
      statusNote: 'Ready for pickup.',
      status: 'ready'
    }
  ]
};

export const initialCompletedOrders = [
  { id: '#1033', location: 'Table 4', time: '12:05 PM' },
  { id: '#1032', location: 'Delivery', time: '11:58 AM' },
  { id: '#1031', location: 'Table 7', time: '11:45 AM' },
  { id: '#1030', location: 'Take Away', time: '11:32 AM' },
  { id: '#1029', location: 'Table 1', time: '11:20 AM' }
];

export const initialAlerts = [
  { id: 1, type: 'new', title: 'New order received', target: '#1048', time: 'Just now', dot: 'red' },
  { id: 2, type: 'completed', title: '#1035 marked as Completed', time: '2 mins ago', dot: 'green' },
  { id: 3, type: 'ready', title: '#1042 is Ready', time: '8 mins ago', dot: 'green' },
  { id: 4, type: 'alert', title: 'High preparation time', target: '#1037', time: '12 mins ago', dot: 'red' }
];
