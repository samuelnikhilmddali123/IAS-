import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { useCanteen } from '../context/CanteenContext';
import { CategoryFilterBar } from '../components/CategoryFilterBar';
import { FoodCard } from '../components/FoodCard';
import { ChefCookingAnimation } from '../components/ChefCookingAnimation';
import { MenuItem, CategoryId } from '../types';
import { CATEGORIES } from '../data/canteenData';

const BUDDHA_IMAGE_SOURCE = Platform.select({
  web: { uri: '/po.png' },
  default: require('../../assets/po.png'),
});

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: "Georgia, 'Playfair Display', 'Times New Roman', serif",
  default: 'Georgia',
});

const SANS_FONT = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  web: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  default: 'System',
});

const getTimeBasedGreeting = (): string => {
  const hours = new Date().getHours();
  if (hours >= 4 && hours < 12) {
    return 'Good Morning,';
  } else if (hours >= 12 && hours < 17) {
    return 'Good Afternoon,';
  } else if (hours >= 17 && hours < 21) {
    return 'Good Evening,';
  } else {
    return 'Good Night,';
  }
};

const isStarterItem = (item: MenuItem): boolean => {
  const cat = (item.category || '').toLowerCase();
  const sub = (item.subCategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  return (
    cat.includes('starter') ||
    sub.includes('starter') ||
    cat === 'tandoori-kebabs' ||
    name.includes('starter') ||
    name.includes('kabab') ||
    name.includes('tikka') ||
    name.includes('lollipop') ||
    name.includes('roll') ||
    name.includes('manchurian') ||
    name.includes('65') ||
    name.includes('crispy') ||
    name.includes('fry') ||
    name.includes('bites')
  );
};

const isBeverageItem = (item: MenuItem): boolean => {
  const cat = (item.category || '').toLowerCase();
  const sub = (item.subCategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();

  // Exclude main meals, rice, biryani, curries, starters
  if (cat.includes('rice') || cat.includes('biryani') || cat.includes('curry') || cat.includes('starter') || cat.includes('soup') || cat.includes('salad') || cat.includes('noodle') || cat.includes('bread')) {
    return false;
  }

  return (
    cat === 'beverages' ||
    cat.includes('drink') ||
    sub.includes('beverage') ||
    sub.includes('drink') ||
    name.includes('tea') ||
    name.includes('coffee') ||
    name.includes('juice') ||
    name.includes('shake') ||
    name.includes('soda') ||
    name.includes('mojito') ||
    name.includes('water') ||
    name.includes('coke') ||
    name.includes('fanta') ||
    name.includes('maaza') ||
    name.includes('thums up') ||
    name.includes('spirit') ||
    name.includes('laasi') ||
    name.includes('butter milk')
  );
};

const isIceCreamOrDessertItem = (item: MenuItem): boolean => {
  const cat = (item.category || '').toLowerCase();
  const sub = (item.subCategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();

  // Exclude main meals, rice, biryani, curries, starters
  if (cat.includes('rice') || cat.includes('biryani') || cat.includes('curry') || cat.includes('starter') || cat.includes('soup') || cat.includes('salad') || cat.includes('noodle') || cat.includes('bread') || cat.includes('buffet')) {
    return false;
  }

  return (
    cat === 'desserts' ||
    cat === 'ice-cream' ||
    cat === 'icecream' ||
    sub.includes('ice cream') ||
    sub.includes('dessert') ||
    name.includes('ice cream') ||
    name.includes('chocobar') ||
    name.includes('kulfi') ||
    name.includes('sundae') ||
    name.includes('halwa') ||
    name.includes('gulab jamun') ||
    name.includes('cup')
  );
};

const isBreadItem = (item: MenuItem): boolean => {
  const cat = (item.category || '').toLowerCase();
  const sub = (item.subCategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  return (
    cat === 'indian-breads' ||
    cat.includes('bread') ||
    sub.includes('bread') ||
    name.includes('roti') ||
    name.includes('pulka') ||
    name.includes('phulka') ||
    name.includes('naan') ||
    name.includes('parota') ||
    name.includes('paratha') ||
    name.includes('chapati') ||
    name.includes('kulcha')
  );
};

interface MenuSectionConfig {
  id: string;
  title: string;
  targetCategory: CategoryId;
  items: MenuItem[];
}

export const HomeScreen: React.FC = () => {
  const {
    setActiveTab,
    activeCategory,
    setActiveCategory,
    searchQuery,
    menuItems,
    menuError,
    isMenuLoading,
    fetchMenu,
    userProfile,
    totalCartItems,
    cartSubtotal,
  } = useCanteen();
  const [greeting, setGreeting] = React.useState<string>(getTimeBasedGreeting);
  const [dietFilter, setDietFilter] = React.useState<'all' | 'veg' | 'non-veg'>('all');
  const [isScrolled, setIsScrolled] = React.useState<boolean>(false);
  const mainScrollRef = React.useRef<ScrollView>(null);

  React.useEffect(() => {
    const updateGreeting = () => {
      setGreeting(getTimeBasedGreeting());
    };
    updateGreeting();
    const interval = setInterval(updateGreeting, 30000);
    return () => clearInterval(interval);
  }, []);

  // Automatically reset vertical scroll to top when switching category or diet filter
  React.useEffect(() => {
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [activeCategory, dietFilter]);

  React.useEffect(() => {
    if (!menuItems || menuItems.length === 0) {
      fetchMenu();
    }
  }, [fetchMenu]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > 5) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }
  };

  // Structured Sections (Veg Starters, Non-Veg Starters, Veg Food, Non-Veg Food, Beverages, Ice Creams)
  const sections: MenuSectionConfig[] = React.useMemo(() => {
    const allItems = menuItems || [];

    // 1. Veg Starters (Prioritize Golden French Fries, Veg Crispy Fingers (10 pcs), etc.)
    const vegStarters = allItems
      .filter(
        (item) =>
          item.isVeg === true &&
          isStarterItem(item) &&
          !isBeverageItem(item) &&
          !isIceCreamOrDessertItem(item)
      )
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const getScore = (n: string) => {
          if (n.includes('golden french fries') || n === 'french fries') return 100;
          if (n.includes('veg crispy fingers') || n.includes('veg fingers')) return 95;
          if (n.includes('crispy onion pakoda') || n.includes('onion pakoda')) return 90;
          if (n.includes('paneer spring rolls') || n.includes('crispy veg rolls')) return 85;
          if (n.includes('chilli mushroom') || n.includes('loose crispy mushroom')) return 1;
          return 50;
        };
        return getScore(bName) - getScore(aName);
      });

    // 2. Non-Veg Starters (Pepper Chicken, Chicken 65, Chilli Apollo Fish, Chilli Prawns)
    const nonVegStarters = allItems
      .filter(
        (item) =>
          item.isVeg === false &&
          isStarterItem(item) &&
          !isBeverageItem(item) &&
          !isIceCreamOrDessertItem(item)
      )
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const getScore = (n: string) => {
          if (n.includes('pepper chicken')) return 100;
          if (n.includes('chicken 65')) return 95;
          if (n.includes('chilli apollo fish')) return 90;
          if (n.includes('chilli prawns')) return 85;
          if (n.includes('apollo fish')) return 80;
          if (n.includes('prawns')) return 75;
          if (n.includes('chicken manchurian') || n.includes('crispy chicken 555')) return 1;
          return 50;
        };
        return getScore(bName) - getScore(aName);
      });

    // 3. Veg Food (All veg curries and fried rice, EXCLUDING roti/pulka/breads and starters)
    // Prioritize Paneer Fried Rice, Veg Fried Rice, Palak Paneer, Paneer Butter Masala
    const vegFood = allItems
      .filter(
        (item) =>
          item.isVeg === true &&
          !isStarterItem(item) &&
          !isBreadItem(item) &&
          !isBeverageItem(item) &&
          !isIceCreamOrDessertItem(item)
      )
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const getScore = (n: string) => {
          if (n.includes('paneer fried rice')) return 100;
          if (n.includes('veg fried rice')) return 95;
          if (n.includes('paneer butter masala')) return 85;
          if (n.includes('palak paneer')) return 80;
          if (n.includes('biryani rice') || n.includes('kuska')) return 75;
          if (n.includes('fried rice')) return 70;
          return 1;
        };
        return getScore(bName) - getScore(aName);
      });

    // 4. Non-Veg Food (All non-veg dishes except starters, breads, beverages, ice cream)
    const nonVegFood = allItems.filter(
      (item) =>
        item.isVeg === false &&
        !isStarterItem(item) &&
        !isBreadItem(item) &&
        !isBeverageItem(item) &&
        !isIceCreamOrDessertItem(item)
    );

    // 5. Beverages
    const beverages = allItems.filter((item) => isBeverageItem(item));

    // 6. Ice Creams / Desserts
    const iceCreams = allItems.filter((item) => isIceCreamOrDessertItem(item));

    const list: MenuSectionConfig[] = [];

    if (dietFilter === 'all') {
      if (vegStarters.length > 0)
        list.push({
          id: 'veg-starters',
          title: 'Veg Starters',
          targetCategory: 'veg-starters',
          items: vegStarters,
        });
      if (nonVegStarters.length > 0)
        list.push({
          id: 'non-veg-starters',
          title: 'Non-Veg Starters',
          targetCategory: 'chicken-starters',
          items: nonVegStarters,
        });
      if (vegFood.length > 0)
        list.push({
          id: 'veg-food',
          title: 'Veg Food',
          targetCategory: 'veg-curries',
          items: vegFood,
        });
      if (nonVegFood.length > 0)
        list.push({
          id: 'non-veg-food',
          title: 'Non-Veg Food',
          targetCategory: 'chicken-biryani',
          items: nonVegFood,
        });
      if (beverages.length > 0)
        list.push({
          id: 'beverages',
          title: 'Beverages',
          targetCategory: 'beverages',
          items: beverages,
        });
      if (iceCreams.length > 0)
        list.push({
          id: 'ice-creams',
          title: 'Ice Creams',
          targetCategory: 'desserts',
          items: iceCreams,
        });
    } else if (dietFilter === 'veg') {
      if (vegStarters.length > 0)
        list.push({
          id: 'veg-starters',
          title: 'Veg Starters',
          targetCategory: 'veg-starters',
          items: vegStarters,
        });
      if (vegFood.length > 0)
        list.push({
          id: 'veg-food',
          title: 'Veg Food',
          targetCategory: 'veg-curries',
          items: vegFood,
        });
      if (beverages.length > 0)
        list.push({
          id: 'beverages',
          title: 'Beverages',
          targetCategory: 'beverages',
          items: beverages,
        });
      if (iceCreams.length > 0)
        list.push({
          id: 'ice-creams',
          title: 'Ice Creams',
          targetCategory: 'desserts',
          items: iceCreams,
        });
    } else if (dietFilter === 'non-veg') {
      if (nonVegStarters.length > 0)
        list.push({
          id: 'non-veg-starters',
          title: 'Non-Veg Starters',
          targetCategory: 'chicken-starters',
          items: nonVegStarters,
        });
      if (nonVegFood.length > 0)
        list.push({
          id: 'non-veg-food',
          title: 'Non-Veg Food',
          targetCategory: 'chicken-biryani',
          items: nonVegFood,
        });
      if (beverages.length > 0)
        list.push({
          id: 'beverages',
          title: 'Beverages',
          targetCategory: 'beverages',
          items: beverages,
        });
      if (iceCreams.length > 0)
        list.push({
          id: 'ice-creams',
          title: 'Ice Creams',
          targetCategory: 'desserts',
          items: iceCreams,
        });
    }

    return list;
  }, [menuItems, dietFilter]);

  // Filter items when a specific category is active or search query is present
  const filteredItems = React.useMemo(() => {
    return (menuItems || []).filter((item) => {
      let matchesCategory = true;
      if (activeCategory !== 'all') {
        if (activeCategory === 'veg-starters') {
          matchesCategory =
            item.category === 'veg-starters' ||
            item.category === 'paneer-starters' ||
            (item.isVeg && isStarterItem(item));
        } else if (activeCategory === 'chicken-starters') {
          matchesCategory =
            item.category === 'chicken-starters' ||
            item.category === 'egg-starters' ||
            item.category === 'fish-prawns-starters' ||
            (!item.isVeg && isStarterItem(item));
        } else if (activeCategory === 'veg-curries' || activeCategory === 'rice-veg') {
          // Exactly matches the Veg Food collection (veg curries + veg fried rice, excluding starters & breads)
          matchesCategory =
            item.isVeg === true &&
            !isStarterItem(item) &&
            !isBreadItem(item) &&
            !isBeverageItem(item) &&
            !isIceCreamOrDessertItem(item);
        } else if (activeCategory === 'chicken-biryani') {
          // Exactly matches the Non-Veg Food collection (biryanis, curries, non-veg fried rice, excluding starters & breads)
          matchesCategory =
            item.isVeg === false &&
            !isStarterItem(item) &&
            !isBreadItem(item) &&
            !isBeverageItem(item) &&
            !isIceCreamOrDessertItem(item);
        } else if (activeCategory === 'beverages') {
          matchesCategory = isBeverageItem(item);
        } else if (activeCategory === 'desserts') {
          matchesCategory = isIceCreamOrDessertItem(item);
        } else {
          matchesCategory = item.category === activeCategory;
        }
      }

      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.subCategory && item.subCategory.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDiet =
        dietFilter === 'all' ||
        activeCategory === 'beverages' ||
        activeCategory === 'desserts' ||
        isBeverageItem(item) ||
        isIceCreamOrDessertItem(item) ||
        (dietFilter === 'veg' && item.isVeg === true) ||
        (dietFilter === 'non-veg' && item.isVeg === false);

      return matchesCategory && matchesSearch && matchesDiet;
    });
  }, [menuItems, activeCategory, searchQuery, dietFilter]);

  const activeCategoryObj = CATEGORIES.find((c) => c.id === activeCategory);
  const currentCategoryTitle = activeCategoryObj ? activeCategoryObj.label : 'All Menu';

  const isMultiSectionView = activeCategory === 'all' && !searchQuery;

  return (
    <View style={styles.screenWrapper}>
      {/* Standard Full-Page ScrollView */}
      <ScrollView
        ref={mainScrollRef}
        style={styles.scrollPageContainer}
        contentContainerStyle={styles.scrollPageContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* 1. Hero Greeting Banner with Buddha Artwork on White Background */}
        <View style={styles.heroBanner}>
          <View style={styles.backdropWrapper} pointerEvents="none">
            <Image
              source={BUDDHA_IMAGE_SOURCE}
              style={styles.buddhaBackdropImage}
              resizeMode="contain"
            />
          </View>

          {/* Left: Officer Greeting */}
          <View style={styles.heroGreeting}>
            <Text style={styles.greetingSub}>{greeting}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={styles.officerTitle}>
                {userProfile.name ? userProfile.name : 'Chandra Babu Naidu'}
              </Text>
              {Boolean(userProfile.isOfficial) && (
                <View style={styles.verifiedHeroBadge} accessibilityLabel="Official Verified Officer">
                  <AppIcon name="checkmark" size={13} color="#ffffff" />
                </View>
              )}
            </View>
            <Text style={styles.mottoSub}>Good food. Greater service.</Text>
            <View style={styles.greetingAccentLine} />
          </View>

          {/* Right Slogan */}
          <View style={styles.sloganWrapper}>
            <View style={styles.sloganRow}>
              <View style={styles.sloganVerticalLine} />
              <Text style={styles.sloganText}>
                Nourishing{'\n'}People.{'\n'}Enabling{'\n'}Progress.
              </Text>
            </View>
            <View style={styles.orangeAccentLine} />
          </View>
        </View>

        {/* 2. Controls Bar & Category Filter Bar */}
        <View style={styles.filterSectionWrapper}>
          <View style={styles.topControlBar}>
            {/* Diet Toggle Buttons (All, Veg, Non-Veg) */}
            <View style={styles.dietToggleRow}>
              <TouchableOpacity
                style={[styles.dietBtn, dietFilter === 'all' && styles.dietBtnActive]}
                onPress={() => setDietFilter('all')}
                activeOpacity={0.75}
              >
                <Text style={[styles.dietBtnText, dietFilter === 'all' && styles.dietBtnTextActive]}>
                  All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dietBtn, dietFilter === 'veg' && styles.dietBtnVegActive]}
                onPress={() => setDietFilter('veg')}
                activeOpacity={0.75}
              >
                <View style={styles.vegDotIcon} />
                <Text style={[styles.dietBtnText, dietFilter === 'veg' && styles.dietBtnTextActive]}>
                  Veg
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dietBtn, dietFilter === 'non-veg' && styles.dietBtnNonVegActive]}
                onPress={() => setDietFilter('non-veg')}
                activeOpacity={0.75}
              >
                <View style={styles.nonVegDotIcon} />
                <Text style={[styles.dietBtnText, dietFilter === 'non-veg' && styles.dietBtnTextActive]}>
                  Non-Veg
                </Text>
              </TouchableOpacity>
            </View>

            {/* Right: Live Culinary Kitchen Animation */}
            <ChefCookingAnimation />
          </View>

          {/* Category Filter Chips */}
          <CategoryFilterBar dietFilter={dietFilter} />
        </View>

        {/* 3. Dishes Sections */}
        <View style={styles.menuSection}>
          {menuError ? (
            <View style={styles.errorContainer}>
              <AppIcon name="alert-circle-outline" size={32} color="#dc2626" />
              <Text style={styles.errorTitle}>Unable to Load Menu</Text>
              <Text style={styles.errorSubtitle}>{menuError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchMenu} activeOpacity={0.8}>
                <AppIcon name="refresh-outline" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText}>Retry Connection</Text>
              </TouchableOpacity>
            </View>
          ) : isMenuLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0a3d31" />
              <Text style={styles.loadingText}>Loading fresh menu from canteen server...</Text>
            </View>
          ) : isMultiSectionView ? (
            /* Multi-Section Structured Layout (4 items per section with See All) */
            sections.length === 0 ? (
              <View style={styles.emptyContainer}>
                <AppIcon name="restaurant-outline" size={28} color="#94a3b8" />
                <Text style={styles.emptyText}>No dishes available for this diet selection</Text>
              </View>
            ) : (
              sections.map((section) => (
                <View key={section.id} style={styles.categoryBlock}>
                  {/* Section Title on Left, See All on Right */}
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>

                    <TouchableOpacity
                      style={styles.seeAllBtn}
                      activeOpacity={0.7}
                      onPress={() => {
                        setActiveCategory(section.targetCategory);
                        mainScrollRef.current?.scrollTo({ y: 0, animated: true });
                      }}
                    >
                      <Text style={styles.seeAllText}>See All</Text>
                      <AppIcon name="arrow-forward" size={14} color="#0d7b5f" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  </View>

                  {/* 4 Cards Grid */}
                  <View style={styles.foodGrid}>
                    {section.items.slice(0, 4).map((item, idx) => (
                      <View key={item.id} style={styles.gridItem}>
                        <FoodCard item={item} index={idx} />
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )
          ) : (
            /* Single Category Filtered / Search View */
            <View style={styles.categoryBlock}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    {searchQuery ? `Search Results: "${searchQuery}"` : currentCategoryTitle}{' '}
                    <Text style={styles.sectionItemCount}>
                      ({filteredItems.length} {filteredItems.length === 1 ? 'dish' : 'dishes'})
                    </Text>
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.seeAllBtn}
                  activeOpacity={0.7}
                  onPress={() => {
                    setActiveCategory('all');
                    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
                  }}
                >
                  <Text style={styles.seeAllText}>All Sections</Text>
                  <AppIcon name="grid-outline" size={14} color="#0d7b5f" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>

              {filteredItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <AppIcon name="restaurant-outline" size={28} color="#94a3b8" />
                  <Text style={styles.emptyText}>No dishes found in this category</Text>
                </View>
              ) : (
                <View style={styles.foodGrid}>
                  {filteredItems.map((item, idx) => (
                    <View key={item.id} style={styles.gridItem}>
                      <FoodCard item={item} index={idx} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* 4. Bottom Footer */}
        <View style={styles.footerRow}>
          <View style={styles.footerBrand}>
            <Image
              source={require('../../assets/6a72e4e7-5e3f-43cb-bd57-bac2a1fcb7f4.png')}
              style={styles.footerEmblem}
              resizeMode="contain"
              accessibilityLabel="State Emblem of India"
            />
            <Text style={styles.footerLeft}>
              Canteen Services | Government of India
            </Text>
          </View>
          <Text style={styles.footerRight}>
            Healthy People. Efficient Governance. Stronger India.
          </Text>
        </View>
      </ScrollView>

      {/* 5. Floating Quick Cart Button */}
      {totalCartItems > 0 && isScrolled && (
        <TouchableOpacity
          style={styles.floatingCartFab}
          onPress={() => setActiveTab('cart')}
          activeOpacity={0.88}
        >
          <View style={styles.floatingCartInner}>
            <View style={styles.floatingCartCount}>
              <Text style={styles.floatingCartCountText}>{totalCartItems}</Text>
            </View>
            <View style={styles.floatingCartTextGroup}>
              <Text style={styles.floatingCartTitle}>View Cart</Text>
              <Text style={styles.floatingCartSubtitle}>₹{cartSubtotal.toFixed(0)}</Text>
            </View>
            <AppIcon name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 8 }} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  scrollPageContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollPageContent: {
    paddingBottom: 40,
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 8,
    width: '100%',
    minHeight: 135,
    backgroundColor: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
  },
  backdropWrapper: {
    position: 'absolute',
    top: 0,
    left: 60,
    right: -20,
    bottom: 0,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    pointerEvents: 'none',
  },
  buddhaBackdropImage: {
    width: '100%',
    height: '100%',
    maxHeight: 135,
    transform: [{ translateX: 60 }],
  },
  heroGreeting: {
    zIndex: 2,
    maxWidth: 440,
  },
  greetingSub: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: SERIF_FONT,
    letterSpacing: -0.2,
    marginBottom: 1,
  },
  officerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: SERIF_FONT,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  verifiedHeroBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mottoSub: {
    fontSize: 12,
    color: '#334155',
    fontFamily: SANS_FONT,
    fontWeight: '500',
    marginTop: 3,
  },
  greetingAccentLine: {
    width: 28,
    height: 2.5,
    backgroundColor: '#0a3d31',
    borderRadius: 2,
    marginTop: 5,
  },
  sloganWrapper: {
    alignItems: 'flex-start',
    zIndex: 2,
  },
  sloganRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  sloganVerticalLine: {
    width: 2.5,
    backgroundColor: '#0a3d31',
    borderRadius: 1.5,
    marginRight: 8,
  },
  sloganText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: SERIF_FONT,
    lineHeight: 17,
    letterSpacing: -0.2,
  },
  orangeAccentLine: {
    width: 32,
    height: 2.5,
    backgroundColor: '#ea580c',
    borderRadius: 2,
    marginTop: 5,
    marginLeft: 10.5,
  },
  filterSectionWrapper: {
    backgroundColor: '#ffffff',
    paddingTop: 8,
    paddingBottom: 4,
  },
  topControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 12,
  },
  dietToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dietBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dietBtnActive: {
    backgroundColor: '#0a3d31',
    borderColor: '#0a3d31',
  },
  dietBtnVegActive: {
    backgroundColor: '#15803d',
    borderColor: '#15803d',
  },
  dietBtnNonVegActive: {
    backgroundColor: '#be123c',
    borderColor: '#be123c',
  },
  dietBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  dietBtnTextActive: {
    color: '#ffffff',
  },
  vegDotIcon: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
    marginRight: 6,
  },
  nonVegDotIcon: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e11d48',
    marginRight: 6,
  },
  menuSection: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 20,
  },
  categoryBlock: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0a192f',
    letterSpacing: -0.3,
  },
  sectionItemCount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0d9488',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0d7b5f',
  },
  foodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  gridItem: {
    width: '23.6%',
    minWidth: 160,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 16,
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerEmblem: {
    width: 14,
    height: 18,
    marginRight: 6,
  },
  footerLeft: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  footerRight: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#991b1b',
    marginTop: 8,
  },
  errorSubtitle: {
    fontSize: 12,
    color: '#b91c1c',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 300,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a3d31',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 10,
  },
  emptyContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 8,
  },
  floatingCartFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#0a3d31',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  floatingCartInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingCartCount: {
    backgroundColor: '#ea580c',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  floatingCartCountText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  floatingCartTextGroup: {
    marginRight: 4,
  },
  floatingCartTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  floatingCartSubtitle: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '500',
  },
});
