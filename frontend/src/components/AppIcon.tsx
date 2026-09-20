import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

export type IconName =
  | 'home'
  | 'home-outline'
  | 'restaurant'
  | 'restaurant-outline'
  | 'receipt'
  | 'receipt-outline'
  | 'person'
  | 'person-outline'
  | 'settings-outline'
  | 'help-circle-outline'
  | 'leaf'
  | 'leaf-outline'
  | 'search-outline'
  | 'options-outline'
  | 'notifications-outline'
  | 'chevron-down'
  | 'chevron-forward'
  | 'arrow-forward'
  | 'arrow-back'
  | 'cart-outline'
  | 'bag-handle-outline'
  | 'fast-food-outline'
  | 'sunny-outline'
  | 'cafe-outline'
  | 'wine-outline'
  | 'nutrition'
  | 'flame'
  | 'business-outline'
  | 'grid'
  | 'triangle-outline'
  | 'time-outline'
  | 'moon-outline'
  | 'trash-outline'
  | 'document-text-outline'
  | 'card'
  | 'card-outline'
  | 'cash-outline'
  | 'checkmark-circle'
  | 'shield-checkmark'
  | 'call-outline'
  | 'lock-closed-outline'
  | 'eye-outline'
  | 'eye-off-outline'
  | 'qr-code-outline'
  | 'person-add-outline'
  | 'log-out-outline'
  | 'mail-outline'
  | 'scan-outline'
  | 'refresh'
  | 'cart'
  | 'qr-code'
  | 'checkmark-done-circle';

interface AppIconProps {
  name: IconName | string;
  size?: number;
  color?: string;
  style?: any;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 20,
  color = '#0f172a',
  style,
}) => {
  const renderPath = () => {
    switch (name) {
      case 'home':
        return <Path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill={color} />;
      case 'home-outline':
        return (
          <Path
            d="M3 10.5L12 3l9 7.5v9a1.5 1.5 0 01-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 013 19.5v-9z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );
      case 'restaurant':
        return (
          <Path
            d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"
            fill={color}
          />
        );
      case 'restaurant-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Path d="M18 2v20M21 2v6a3 3 0 01-3 3M6 2v10M3 2v6a3 3 0 003 3M6 12v10M9 2v6a3 3 0 01-3 3" />
          </G>
        );
      case 'receipt':
      case 'clipboard':
        return (
          <Path
            d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 14H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V6h8v2z"
            fill={color}
          />
        );
      case 'receipt-outline':
      case 'clipboard-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Rect x="4" y="2" width="16" height="20" rx="2" />
            <Path d="M8 6h8M8 10h8M8 14h6" />
          </G>
        );
      case 'person':
        return (
          <Path
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
            fill={color}
          />
        );
      case 'person-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Circle cx="12" cy="7" r="4" />
            <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          </G>
        );
      case 'settings-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Circle cx="12" cy="12" r="3" />
            <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </G>
        );
      case 'help-circle-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Circle cx="12" cy="12" r="10" />
            <Path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
          </G>
        );
      case 'leaf':
      case 'leaf-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Path d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.5 21 3c-1.5 4-2 5.5-3.1 11.2A7 7 0 0111 20zM2 21c0-3 1.5-5.5 4-7" />
          </G>
        );
      case 'search-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Circle cx="11" cy="11" r="8" />
            <Path d="M21 21l-4.35-4.35" />
          </G>
        );
      case 'options-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
          </G>
        );
      case 'notifications-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
          </G>
        );
      case 'chevron-down':
        return (
          <Path
            d="M6 9l6 6 6-6"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );
      case 'chevron-forward':
        return (
          <Path
            d="M9 18l6-6-6-6"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );
      case 'arrow-forward':
        return (
          <Path
            d="M5 12h14M12 5l7 7-7 7"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );
      case 'arrow-back':
        return (
          <Path
            d="M19 12H5M12 19l-7-7 7-7"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );
      case 'cart':
      case 'cart-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Circle cx="9" cy="21" r="1" />
            <Circle cx="20" cy="21" r="1" />
            <Path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
          </G>
        );
      case 'bag-handle-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
          </G>
        );
      case 'sunny-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Circle cx="12" cy="12" r="5" />
            <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </G>
        );
      case 'cafe-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
          </G>
        );
      case 'wine-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Path d="M8 22h8M12 15v7M8 2h8l2 9a6 6 0 01-12 0l2-9z" />
          </G>
        );
      case 'grid':
        return (
          <G fill={color}>
            <Rect x="3" y="3" width="7" height="7" rx="1" />
            <Rect x="14" y="3" width="7" height="7" rx="1" />
            <Rect x="14" y="14" width="7" height="7" rx="1" />
            <Rect x="3" y="14" width="7" height="7" rx="1" />
          </G>
        );
      case 'triangle-outline':
      case 'nutrition':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </G>
        );
      case 'flame':
      case 'business-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Rect x="3" y="2" width="18" height="20" rx="2" />
            <Path d="M9 22V12h6v10M8 6h.01M16 6h.01M12 6h.01M12 9h.01M8 9h.01M16 9h.01" />
          </G>
        );
      case 'time-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Circle cx="12" cy="12" r="10" />
            <Path d="M12 6v6l4 2" />
          </G>
        );
      case 'moon-outline':
        return (
          <Path
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );
      case 'trash-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
          </G>
        );
      case 'document-text-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </G>
        );
      case 'card':
        return (
          <G fill={color}>
            <Rect x="1" y="4" width="22" height="16" rx="2" />
            <Rect x="1" y="8" width="22" height="3" fill="#ffffff" opacity={0.3} />
          </G>
        );
      case 'card-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Rect x="2" y="5" width="20" height="14" rx="2" />
            <Path d="M2 10h20" />
          </G>
        );
      case 'cash-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Rect x="2" y="6" width="20" height="12" rx="2" />
            <Circle cx="12" cy="12" r="2" />
            <Path d="M6 12h.01M18 12h.01" />
          </G>
        );
      case 'checkmark-done-circle':
      case 'checkmark-circle':
        return (
          <G stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Circle cx="12" cy="12" r="10" />
            <Path d="M8 12l3 3 5-5" />
          </G>
        );
      case 'refresh':
        return (
          <G stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Path d="M23 4v6h-6M1 20v-6h6" />
            <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </G>
        );
      case 'shield-checkmark':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" />
          </G>
        );
      case 'call-outline':
        return (
          <Path
            d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );
      case 'lock-closed-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </G>
        );
      case 'eye-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <Circle cx="12" cy="12" r="3" />
          </G>
        );
      case 'eye-off-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <Path d="M1 1l22 22" />
          </G>
        );
      case 'qr-code':
      case 'qr-code-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Rect x="3" y="3" width="7" height="7" rx="1.5" />
            <Rect x="14" y="3" width="7" height="7" rx="1.5" />
            <Rect x="3" y="14" width="7" height="7" rx="1.5" />
            <Path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 18h.01M18 14h3M14 21h3" />
          </G>
        );
      case 'person-add-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Circle cx="9" cy="7" r="4" />
            <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <Path d="M19 8v6M16 11h6" />
          </G>
        );
      case 'log-out-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </G>
        );
      case 'mail-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Rect x="3" y="5" width="18" height="14" rx="2" />
            <Path d="M3 7l9 6 9-6" />
          </G>
        );
      case 'scan-outline':
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Path d="M4 7V4h3M17 4h3v3M4 17v3h3M20 17v3h-3M7 12h10" />
          </G>
        );
      default:
        return (
          <G stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <Circle cx="12" cy="12" r="10" />
          </G>
        );
    }
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {renderPath()}
    </Svg>
  );
};
