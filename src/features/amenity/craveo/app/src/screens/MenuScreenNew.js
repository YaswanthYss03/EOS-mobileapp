import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text,
  Badge,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import * as Animatable from 'react-native-animatable';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  fetchMenuStart,
  fetchMenuSuccess,
  fetchMenuFailure,
} from '../redux/slices/menuSlice';
import { addToCart, updateQuantity } from '../redux/slices/cartSlice';
import { menuAPI, todaysSpecialAPI } from '../services';
import CraveoBottomNav from '../components/CraveoBottomNav';
import { MenuLoader } from '../components/FoodActivityIndicator';
import { EnhancedMenuLoader } from '../components/EnhancedLoaders';
import TodaysSpecialModal from '../components/TodaysSpecialModal';
import quantitySyncService from '../services/quantitySyncService';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';
import { ERROR_MESSAGES } from '../constants/config';
import { showToast, handleError } from '../utils/toastUtils';
import { isAfter7PMIST } from '../utils/timezoneUtils';

const { width } = Dimensions.get('window');

// Get greeting based on current time
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const CATEGORY_ICONS = {
  all: 'view-grid-outline',
  beverages: 'cup-outline',
  drinks: 'cup-outline',
  breakfast: 'weather-sunny',
  lunch: 'silverware-fork-knife',
  'main course': 'silverware-fork-knife',
  'fast food': 'hamburger',
  snacks: 'popcorn',
  sweets: 'cupcake',
  desserts: 'cake-variant',
  chinese: 'noodles',
  'north indian': 'food-variant',
  'south indian': 'food-variant',
};

const getCategoryIcon = (name) => CATEGORY_ICONS[String(name || '').toLowerCase()] || 'silverware-variant';

// Dish Card Component
const DishCard = ({ dish, onAddToCart, onQuantityChange, cartQuantity = 0 }) => {
  const imageUri = dish?.image_url || dish?.dish_image_url;
  const isInCart = cartQuantity > 0;
  const availableQuantity = dish?.quantity_available || dish?.available_quantity || dish?.quantity || 0;
  const isOutOfStock = availableQuantity <= 0;
  
  return (
    <Animatable.View
      animation="fadeInUp"
      duration={600}
      style={styles.dishCard}
    >
      <View style={styles.cardImageContainer}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.cardImage}
            resizeMode="cover"
            defaultSource={require('../../assets/placeholder.png')}
          />
        ) : (
          <Image
            source={require('../../assets/placeholder.png')}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.dishName} numberOfLines={1}>
          {String(dish?.dish_name || dish?.name || 'Delicious Item')}
        </Text>

        <View style={styles.availabilityContainer}>
          <MaterialCommunityIcons 
            name="package-variant" 
            size={14} 
            color={isOutOfStock ? colors.error : colors.success} 
          />
          <Text style={[
            styles.availabilityText,
            isOutOfStock && { color: colors.error, fontWeight: 'bold' }
          ]}>
            {isOutOfStock ? 'Out of Stock' : `${availableQuantity} available`}
          </Text>
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.priceContainer}>
            <MaterialCommunityIcons name="currency-inr" size={16} color={colors.primary} />
            <Text style={styles.price}>
              {String(dish?.dish_price || dish?.price || '0')}
            </Text>
          </View>
          
          <View style={styles.cartSection}>
            {isInCart && cartQuantity > 0 ? (
              // Show quantity controls when item is in cart
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => onQuantityChange && onQuantityChange(dish.dish_id || dish.id, cartQuantity - 1)}
                >
                  <MaterialCommunityIcons 
                    name="minus" 
                    size={16} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
                <View style={styles.quantityDisplay}>
                  <Text style={styles.quantityText}>{String(cartQuantity || 0)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => onQuantityChange && onQuantityChange(dish.dish_id || dish.id, cartQuantity + 1)}
                  disabled={cartQuantity >= availableQuantity}
                >
                  <MaterialCommunityIcons 
                    name="plus" 
                    size={16} 
                    color={cartQuantity >= availableQuantity ? colors.gray : colors.primary} 
                  />
                </TouchableOpacity>
              </View>
            ) : (
              // Show add to cart button when item is not in cart
              <TouchableOpacity
                style={[
                  styles.cartButton,
                  isOutOfStock && styles.cartButtonDisabled
                ]}
                onPress={() => !isOutOfStock && onAddToCart(dish)}
                disabled={isOutOfStock}
              >
                <MaterialCommunityIcons 
                  name={isOutOfStock ? "cart-remove" : "cart-plus"} 
                  size={18} 
                  color={isOutOfStock ? colors.error : colors.white} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Animatable.View>
  );
};

const MenuScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [filteredDishes, setFilteredDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(true);
  const [syncStatus, setSyncStatus] = useState(null);
  
  // Today's Special Modal state
  const [showSpecialModal, setShowSpecialModal] = useState(false);
  const [todaysSpecials, setTodaysSpecials] = useState([]);
  const [specialsLoaded, setSpecialsLoaded] = useState(false);
  
  // Refs to prevent excessive re-renders
  const lastFilterRef = useRef({ dishes: [], category: '', search: '' });
  const filterTimeoutRef = useRef(null);

  // Search + category bar: a single collapsible header (not a duplicated
  // overlay - that approach was fragile and could show two copies at once).
  // Animated.diffClamp does the right thing by construction: it only grows as
  // you keep scrolling down, and shrinks back the instant you scroll up even
  // slightly, clamped between 0 and the header's own height.
  const [collapsibleHeaderHeight, setCollapsibleHeaderHeight] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleListScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
    [scrollY]
  );

  const headerTranslateY = useMemo(() => {
    if (!collapsibleHeaderHeight) return 0;
    return Animated.diffClamp(scrollY, 0, collapsibleHeaderHeight).interpolate({
      inputRange: [0, collapsibleHeaderHeight],
      outputRange: [0, -collapsibleHeaderHeight],
      extrapolate: 'clamp',
    });
  }, [scrollY, collapsibleHeaderHeight]);

  const dispatch = useDispatch();
  const { items: cartItems } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const { dishes: reduxDishes, loading: menuLoading } = useSelector((state) => state.menu);

  // Use Redux dishes as the source of truth, fallback to local state during initial load
  const dishes = reduxDishes && reduxDishes.length > 0 ? reduxDishes : [];
  
  // Debug: Log when Redux dishes change (with reduced frequency)
  useEffect(() => {
    if (reduxDishes && reduxDishes.length > 0) {
      // Only log occasionally to prevent spam
      if (Math.random() < 0.2) { // 20% chance to log
        console.log(`🔄 Redux dishes updated: ${reduxDishes.length} dishes available`);
        
        // Log a few dish quantities for debugging (less frequently)
        const sampleDishes = reduxDishes.slice(0, 2);
        sampleDishes.forEach(dish => {
          console.log(`📊 Dish "${dish.name || dish.dish_name}": quantity = ${dish.quantity || dish.quantity_available || dish.available_quantity || 'unknown'}`);
        });
      }
    }
  }, [reduxDishes]);

  // Get cart quantity for a specific dish
  const getCartQuantity = useCallback((dishId) => {
    const cartItem = cartItems.find(item => item.id === dishId);
    return cartItem ? cartItem.quantity : 0;
  }, [cartItems]);

  // Get total cart items count
  const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Fetch Today's Specials
  const fetchTodaysSpecials = async () => {
    try {
      console.log('🌟 Fetching today\'s specials...');
      
      const response = await todaysSpecialAPI.getCurrentSpecials();
      
      if (response.success && response.data && response.data.length > 0) {
        console.log('✅ Today\'s specials loaded:', response.data.length, 'images');
        setTodaysSpecials(response.data);
        
        // Show modal every time the app is opened or user navigates to menu
        setShowSpecialModal(true);
        console.log('🎉 Today\'s Special modal will be displayed');
      } else {
        console.log('ℹ️ No active specials for current time');
        setTodaysSpecials([]);
      }
      
      setSpecialsLoaded(true);
    } catch (error) {
      console.error('❌ Error fetching today\'s specials:', error);
      setSpecialsLoaded(true);
    }
  };

  // Fetch menu data
  const fetchMenuData = async () => {
    try {
      setLoading(true);
      dispatch(fetchMenuStart());

      // Fetch dishes and categories
      const [dishesResponse, categoriesResponse] = await Promise.all([
        menuAPI.getDishes(),
        menuAPI.getCategories()
      ]);

      console.log('📊 API Responses received:', {
        dishesSuccess: dishesResponse?.success,
        dishesDataLength: dishesResponse?.data?.length,
        categoriesSuccess: categoriesResponse?.success,
        categoriesDataLength: categoriesResponse?.data?.length
      });

      if (dishesResponse.success && dishesResponse.data) {
        const dishesData = Array.isArray(dishesResponse.data) ? dishesResponse.data : [];
        
        // Dispatch to Redux with the expected payload structure
        dispatch(fetchMenuSuccess({
          dishes: dishesData,
          inventoryAvailable: dishesData.length > 0 // Set to true if we have dishes
        }));
        
        // Set initial filtered dishes from Redux data
        setFilteredDishes(dishesData);
        
        console.log(`✅ Loaded ${dishesData.length} dishes to Redux store`);
      } else {
        console.warn('⚠️ No dishes data received from API');
        dispatch(fetchMenuSuccess({
          dishes: [],
          inventoryAvailable: false
        }));
        setFilteredDishes([]);
      }

      if (categoriesResponse.success && categoriesResponse.data) {
        const categoriesData = Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [];
        const categoryNames = ['All', ...categoriesData.map(cat => cat.dish_category_name || cat.name || cat.category_name).filter(Boolean)];
        setCategories(categoryNames);
      } else {
        // Fallback: extract categories from dishes
        const dishesData = Array.isArray(dishesResponse.data) ? dishesResponse.data : [];
        const categorySet = new Set(['All']);
        
        dishesData.forEach(dish => {
          if (!dish) return;
          
          try {
            const dishCategory = dish.dish_category || dish.category || null;
            
            if (dishCategory) {
              if (typeof dishCategory === 'object') {
                const categoryName = dishCategory.dish_category_name || dishCategory.name || dishCategory.category_name;
                if (categoryName) categorySet.add(categoryName);
              } else if (typeof dishCategory === 'string' && dishCategory.trim()) {
                categorySet.add(dishCategory.trim());
              }
            }
          } catch (error) {
            console.warn('Error extracting category from dish:', error, dish);
          }
        });
        
        setCategories(Array.from(categorySet));
      }

    } catch (error) {
      console.error('Menu fetch error:', error);
      dispatch(fetchMenuFailure(error.message));
      await handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMenuData();
    setRefreshing(false);
  };

  const handleAddToCart = (dish) => {
    console.log('Adding to cart - dish data:', JSON.stringify(dish, null, 2)); // Debug log
    
    // Check ordering time restriction for Girls Hostellers (user_type = 3)
    if (user?.user_type === 3 && isAfter7PMIST()) {
      showToast.warning(
        'Girls Hostellers can only order until 6:00 PM. Ordering is currently closed.',
        'Ordering Closed'
      );
      return;
    }
    
    // Check if dish is available
    const availableQuantity = dish?.quantity_available || dish?.available_quantity || dish?.quantity || 0;
    if (availableQuantity <= 0) {
      showToast.warning('This item is currently not available.', 'Out of Stock');
      return;
    }
    
    // Extract category information properly with ID preservation
    let category = null; 
    if (dish.category && dish.category.dish_category_name) {
      // From database relation - preserve the whole category object with ID
      category = {
        dish_category_id: dish.category.dish_category_id,
        dish_category_name: dish.category.dish_category_name,
        id: dish.category.dish_category_id, // Also store as 'id' for compatibility
        name: dish.category.dish_category_name // Also store as 'name' for compatibility
      };
    } else if (dish.dish_category_id) {
      // Direct property - create category object from dish data
      category = {
        dish_category_id: dish.dish_category_id,
        dish_category_name: dish.dish_category_name || 'Unknown Category',
        id: dish.dish_category_id,
        name: dish.dish_category_name || 'Unknown Category'
      };
    } else if (dish.category && typeof dish.category === 'string') {
      // String category - default to Food category
      category = dish.category;
    } else {
      // Fallback
      category = { dish_category_name: 'Food', name: 'Food' };
    }
    
    console.log('🏷️ Processed category for cart:', category);
    
    const cartItem = {
      id: dish.dish_id || dish.id,
      name: dish.dish_name || dish.name,
      price: parseFloat(dish.dish_price || dish.price || 0),
      quantity: 1,
      image: dish.image_url || dish.dish_image_url,
      category: category,
      isVeg: dish.is_veg || dish.isVeg || false,
      quantity_available: availableQuantity,
      available_quantity: availableQuantity,
      stock: availableQuantity,
      available: availableQuantity
    };
    
    console.log('Dispatching cart item:', JSON.stringify(cartItem, null, 2)); // Debug log
    
    dispatch(addToCart(cartItem));
  };

  const handleQuantityChange = (dishId, newQuantity) => {
    if (newQuantity === 0) {
      dispatch(updateQuantity({ id: dishId, quantity: 0 }));
    } else {
      dispatch(updateQuantity({ id: dishId, quantity: newQuantity }));
    }
  };

  // Filter dishes by category - now uses Redux dishes with optimization
  useEffect(() => {
    if (!isMounted || !Array.isArray(dishes)) {
      return;
    }

    // Prevent unnecessary filtering if inputs haven't changed significantly
    const currentInputs = {
      dishCount: dishes.length,
      category: selectedCategory,
    };

    // Simple comparison to prevent excessive filtering
    const lastInputs = lastFilterRef.current;
    if (lastInputs.dishCount === currentInputs.dishCount &&
        lastInputs.category === currentInputs.category) {
      return; // Skip filtering if nothing important has changed
    }

    lastFilterRef.current = currentInputs;

    // Debounce filtering to prevent excessive calls during rapid updates
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }

    filterTimeoutRef.current = setTimeout(() => {
      let filtered = [...dishes];

      if (selectedCategory !== 'All') {
        filtered = filtered.filter(dish => {
          if (!dish) return false;

          try {
            const dishCategory = dish.dish_category || dish.category || null;

            // Handle object category
            if (dishCategory && typeof dishCategory === 'object' && dishCategory !== null) {
              const categoryName = dishCategory.dish_category_name || dishCategory.name || dishCategory.category_name || '';
              return categoryName === selectedCategory;
            }
            // Handle string category
            if (dishCategory && typeof dishCategory === 'string') {
              return dishCategory === selectedCategory;
            }

            return false;
          } catch (error) {
            console.warn('Error filtering dish:', error, dish);
            return false;
          }
        });
      }

      if (isMounted) {
        setFilteredDishes(filtered);

        // Reduced frequency debug logging
        if (dishes.length > 0 && Math.random() < 0.1) { // Only log 10% of the time
          console.log(`🔄 UI updated with ${filtered.length} filtered dishes from ${dishes.length} total dishes`);
        }
      }
    }, 150); // 150ms debounce to prevent excessive updates

    // Cleanup timeout on unmount
    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, [dishes, selectedCategory, isMounted]);

  const handleCategoryPress = useCallback((category) => {
    if (!isMounted) return;
    setSelectedCategory(category);
    // Filtering will happen automatically via useEffect
  }, [isMounted]);

  useEffect(() => {
    // First fetch menu data
    fetchMenuData().then(() => {
      console.log('🍽️ Menu data loaded, initializing services...');
      
      // Fetch today's specials
      fetchTodaysSpecials();
      
      // Set dispatch function for the sync service
      quantitySyncService.setDispatch(dispatch);
      
      // Small delay to ensure Redux store is updated
      setTimeout(() => {
        // Initialize quantity sync service for real-time updates
        quantitySyncService.initialize();
        
        // Update sync status
        const status = quantitySyncService.getStatus();
        setSyncStatus(status);
      }, 1000); // 1 second delay
      
    }).catch(error => {
      console.error('❌ Failed to load menu data:', error);
      
      // Still try to initialize sync service even if initial fetch fails
      console.log('🔄 Initializing sync service despite fetch failure...');
      quantitySyncService.setDispatch(dispatch);
      
      setTimeout(() => {
        quantitySyncService.initialize();
      }, 2000);
    });
    
    // Set up periodic status updates
    const statusInterval = setInterval(() => {
      const currentStatus = quantitySyncService.getStatus();
      setSyncStatus(currentStatus);
    }, 10000); // Update every 10 seconds
    
    return () => {
      setIsMounted(false);
      clearInterval(statusInterval);
      
      // Cleanup filter timeout
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
      
      // Cleanup quantity sync when component unmounts
      quantitySyncService.cleanup();
    };
  }, []); // Remove dispatch dependency to prevent infinite loop

  // Handle navigation focus to ensure component is still mounted
  useFocusEffect(
    useCallback(() => {
      setIsMounted(true);
      
      // Activate fast sync when menu screen is focused (user actively viewing)
      quantitySyncService.activateFastSync();
      
      // Fetch today's specials when screen comes into focus
      fetchTodaysSpecials();
      
      return () => {
        setIsMounted(false);
        // Switch to normal sync when leaving menu screen
        quantitySyncService.activateNormalSync();
      };
    }, [])
  );

  const renderDishItem = ({ item }) => {
    if (!item || !isMounted) return null;
    
    try {
      return (
        <DishCard
          key={item.dish_id || item.id || `dish-${Math.random()}`}
          dish={item}
          onAddToCart={handleAddToCart}
          onQuantityChange={handleQuantityChange}
          cartQuantity={getCartQuantity(item.dish_id || item.id)}
        />
      );
    } catch (error) {
      console.warn('Error rendering dish item:', error, item);
      return null;
    }
  };

  const renderCategoryItem = ({ item }) => {
    if (!isMounted || !item) return null;
    
    try {
      return (
        <TouchableOpacity
          style={[
            styles.categoryChip,
            selectedCategory === item && styles.selectedCategoryChip
          ]}
          onPress={() => handleCategoryPress(item)}
        >
          <MaterialCommunityIcons
            name={getCategoryIcon(item)}
            size={16}
            color={selectedCategory === item ? colors.white : colors.primary}
            style={styles.categoryIcon}
          />
          <Text style={[
            styles.categoryText,
            selectedCategory === item && styles.selectedCategoryText
          ]}>
            {String(item || 'Unknown')}
          </Text>
        </TouchableOpacity>
      );
    } catch (error) {
      console.warn('Error rendering category item:', error, item);
      return null;
    }
  };

  // Rendered once inside the collapsible header above the dish FlatList.
  const renderSearchAndCategories = () => (
    <View style={styles.categoriesContainer}>
      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item, index) => `category-${index}-${item}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
      />
    </View>
  );

  if (loading || menuLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <EnhancedMenuLoader 
          size="xlarge" 
          text="Discovering delicious dishes..."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Scrollable Content */}
      <View style={styles.scrollableContent}>
        {/* Single collapsible header - hides as you scroll down into the list,
            reappears the instant you scroll up even slightly. Includes the back
            button/title block plus the categories, so the whole top section
            hides and reveals together. Only one copy ever exists, so "two
            search bars" isn't structurally possible. */}
        <Animated.View
          style={[styles.collapsibleHeader, { transform: [{ translateY: headerTranslateY }] }]}
          renderToHardwareTextureAndroid
          onLayout={(e) => {
            const measuredHeight = e.nativeEvent.layout.height;
            if (Math.round(measuredHeight) !== Math.round(collapsibleHeaderHeight)) {
              setCollapsibleHeaderHeight(measuredHeight);
            }
          }}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
            </TouchableOpacity>
            <View style={styles.headerTextBlock}>
              <Text style={styles.headerTitle}>Order your food now</Text>
              <Text style={styles.headerSubtitle}>Delicious meals, delivered to you</Text>
            </View>
          </View>
          {renderSearchAndCategories()}
        </Animated.View>

        {/* Dishes Grid */}
        <Animated.FlatList
          data={filteredDishes}
          renderItem={renderDishItem}
          keyExtractor={(item, index) => `dish-${item?.dish_id || item?.id || index}`}
          contentContainerStyle={[styles.dishList, { paddingTop: collapsibleHeaderHeight }]}
          onScroll={handleListScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="food-off" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No dishes found</Text>
            </View>
          }
        />
      </View>

      {/* Today's Special Modal */}
      <TodaysSpecialModal
        visible={showSpecialModal}
        onClose={() => setShowSpecialModal(false)}
        specials={todaysSpecials}
      />

      <CraveoBottomNav navigation={navigation} currentRoute="Menu" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollableContent: {
    flex: 1,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Greeting Styles
  greetingContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  greetingText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
  },

  // Categories Styles
  categoriesContainer: {
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
    paddingVertical: spacing.xs,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  categoriesList: {
    paddingHorizontal: spacing.md,
  },
  categoryChip: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    minWidth: 60,
    alignItems: 'center',
  },
  selectedCategoryChip: {
    backgroundColor: colors.primary,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  
  // Dish List Styles
  dishList: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120, // Space for bottom navigation
  },

  // Dish Card Styles (horizontal list layout - image left, details right)
  dishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: spacing.sm + 4,
    padding: spacing.sm,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardImageContainer: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm + 4,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    flex: 1,
  },
  dishName: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    lineHeight: fontSize.sm * 1.25,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  availabilityText: {
    fontSize: fontSize.xs,
    color: colors.success,
    marginLeft: 4,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  price: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.primary,
  },
  actionContainer: {
    alignItems: 'flex-end',
  },
  cartSection: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  quantityBadge: {
    position: 'absolute',
    top: -8,
    right: -2,
    backgroundColor: colors.success,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 3,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: colors.white,
  },
  quantityBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: fontSize.xs + 2,
  },
  cartButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  cartButtonInCart: {
    backgroundColor: colors.success,
    elevation: 3,
    shadowOpacity: 0.3,
  },
  cartButtonDisabled: {
    backgroundColor: '#cccccc',
    elevation: 1,
    shadowOpacity: 0.1,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 2,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },
  quantityDisplay: {
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  quantityText: {
    fontSize: fontSize.sm,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    minWidth: 20,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  
  // End of styles
});

export default MenuScreen;
