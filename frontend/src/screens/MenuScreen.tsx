import React from 'react';
import { HomeScreen } from './HomeScreen';

/**
 * Menu screen has been merged into HomeScreen so all menu items, filters,
 * and ordering capabilities live directly on the main Home screen.
 */
export const MenuScreen: React.FC = () => {
  return <HomeScreen />;
};
