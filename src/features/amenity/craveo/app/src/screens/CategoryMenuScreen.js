import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, RefreshControl, Alert, StyleSheet } from 'react-native';
import {
  Text,
  Button,
  ActivityIndicator,
  FAB,
  Appbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import * as Animatable from 'react-native-animatable';

import SimpleDishCard from '../components/SimpleDishCard';
import { menuAPI } from '../services';
import { addToCart } from '../redux/slices/cartSlice';
import { theme, colors, spacing, fontSize } from '../constants/theme';
import { formatCurrency } from '../utils/helpers';
import { ERROR_MESSAGES } from '../constants/config';
import SimpleToast from '../components/SimpleToast';
import { AnimatedView } from '../components/PremiumComponents';
import { isAfter7PMIST } from '../utils/timezoneUtils';
import { fonts } from '../../../../../../theme';

const CategoryMenuScreen = ({ route, navigation }) => {
  const { category } = route.params;
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' });

  const dispatch = useDispatch();
  const cartItems = useSelector(state => state.cart.items);
  const { inventoryAvailable } = useSelector(state => state.menu);
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    fetchCategoryDishes();
    
    // Set navigation title
    navigation.setOptions({
      title: category,
    });
  }, [category]);

  const fetchCategoryDishes = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      console.log('🔍 Fetching dishes for category:', category);
      const response = await menuAPI.getMenu();
      
      if (response.success) {
        console.log('📡 Total dishes received:', response.data?.length);
        // Filter dishes by category using correct nested structure
        const categoryDishes = (response.data || []).filter(
          dish => dish.category?.dish_category_name === category
        );
        console.log('📋 Dishes for category', category, ':', categoryDishes.length);
        setDishes(categoryDishes);
      } else {
        console.error('Failed to fetch dishes:', response.error);
        Alert.alert('Error', response.error || 'Failed to load dishes');
        setDishes([]);
      }
    } catch (error) {
      console.error('Fetch category dishes error:', error);
      Alert.alert('Error', 'Failed to load dishes. Please check your connection.');
      setDishes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddToCart = useCallback((dish, quantity = 1) => {
    // Check ordering time restriction for Girls Hostellers (user_type = 3)
    if (user?.user_type === 3 && isAfter7PMIST()) {
      Alert.alert(
        'Ordering Closed', 
        'Girls Hostellers can only order until 7:00 PM IST. Ordering is currently closed.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    if (!inventoryAvailable) {
      Alert.alert('Booking Unavailable', ERROR_MESSAGES.INVENTORY_UNAVAILABLE);
      return;
    }

    if (dish.quantity <= 0) {
      Alert.alert('Sold Out', ERROR_MESSAGES.ITEM_OUT_OF_STOCK);
      return;
    }

    if (quantity > dish.quantity) {
      Alert.alert('Insufficient Quantity', `Only ${dish.quantity} items available`);
      return;
    }

    // Check current cart quantity for this item
    const currentCartItem = (cartItems || []).find(item => item.dish.dish_id === dish.dish_id);
    const currentCartQuantity = currentCartItem ? currentCartItem.quantity : 0;
    
    if ((currentCartQuantity + quantity) > dish.quantity) {
      Alert.alert(
        'Insufficient Quantity', 
        `You already have ${currentCartQuantity} in cart. Only ${dish.quantity - currentCartQuantity} more available.`
      );
      return;
    }

    dispatch(addToCart({ dish, quantity }));
    setSnackbar({
      visible: true,
      message: `✅ ${dish.name} added to cart successfully!`,
      type: 'success',
    });
  }, [cartItems, inventoryAvailable, dispatch, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategoryDishes(false);
  };

  const getTotalCartValue = () => {
    return (cartItems || []).reduce((total, item) => total + (item.dish.price * item.quantity), 0);
  };

  const getTotalCartItems = () => {
    return (cartItems || []).reduce((total, item) => total + item.quantity, 0);
  };

  const goToCart = () => {
    if (!cartItems || cartItems.length === 0) {
      setSnackbar({
        visible: true,
        message: 'Your cart is empty',
      });
      return;
    }
    
    navigation.navigate('Main', {
      screen: 'Cart'
    });
  };

  const renderDishItem = ({ item }) => (
    <SimpleDishCard
      dish={item}
      onAddToCart={handleAddToCart}
      disabled={!inventoryAvailable}
      showQuantityInfo={true}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        No dishes available in {category} category
      </Text>
      <Text style={styles.emptyStateSubtext}>
        Check back later or try refreshing
      </Text>
      <Button 
        mode="outlined" 
        onPress={() => fetchCategoryDishes()} 
        style={styles.retryButton}
      >
        Retry
      </Button>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.categoryTitle}>{category}</Text>
      <Text style={styles.dishCount}>
        {dishes.length} {dishes.length === 1 ? 'item' : 'items'} available
      </Text>
      {!inventoryAvailable && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Limited availability - some items may be out of stock
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading {category} menu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={dishes}
        renderItem={renderDishItem}
        keyExtractor={(item) => item.dish_id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
      />

      {/* Cart FAB */}
      {(cartItems || []).length > 0 && (
        <Animatable.View animation="bounceInUp" duration={800}>
          <FAB
            icon="cart"
            label={`${getTotalCartItems()} • ${formatCurrency(getTotalCartValue())}`}
            onPress={goToCart}
            style={styles.cartFab}
            color="white"
          />
        </Animatable.View>
      )}

      {/* Premium Toast */}
      <SimpleToast
        visible={snackbar.visible}
        message={snackbar.message}
        type={snackbar.type}
        duration={3000}
        onHide={() => setSnackbar({ visible: false, message: '', type: 'success' })}
        position="top"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.lg,
    fontSize: 16,
    color: theme.colors.placeholder,
    textAlign: 'center',
    fontFamily: fonts.regular,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  categoryTitle: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  dishCount: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontFamily: fonts.regular,
  },
  warningContainer: {
    backgroundColor: colors.warning + '20',
    padding: spacing.sm,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontFamily: fonts.medium,
  },
  listContainer: {
    paddingBottom: 120, // Space for FAB
    paddingHorizontal: theme.spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
    marginTop: theme.spacing.xl,
  },
  emptyStateText: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: theme.colors.placeholder,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
    fontFamily: fonts.regular,
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
  },
  cartFab: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: 28,
    elevation: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
});

export default CategoryMenuScreen;
