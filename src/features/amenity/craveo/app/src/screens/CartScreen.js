import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  updateQuantity,
  removeFromCart,
  clearCart,
  setError,
  updateItemOrderType,
  incrementQuantity,
  decrementQuantity,
} from '../redux/slices/cartSlice';
import { refreshUserData } from '../redux/slices/authSlice';
import CartItem from '../components/CartItem';
import CraveoBottomNav from '../components/CraveoBottomNav';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';
import { formatCurrency } from '../utils/helpers';
import { APP_CONFIG } from '../constants/config';
import secureTimeService from '../services/secureTimeService';
import { showToast, handleError } from '../utils/toastUtils';
import ClearCartConfirmationModal from '../components/ClearCartConfirmationModal';
import { isAfter7PMIST } from '../utils/timezoneUtils';
import { fonts } from '../../../../../../theme';

const CartScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { items, total, itemCount, loading, error } = useSelector(state => state.cart);
  const { inventoryAvailable } = useSelector(state => state.menu);
  const { user } = useSelector(state => state.auth);

  const [codEnabled, setCodEnabled] = useState(false);
  const [serverTime, setServerTime] = useState(null);
  const [timeLoading, setTimeLoading] = useState(false);
  const [showClearCartModal, setShowClearCartModal] = useState(false);

  // Check COD eligibility using secure server time (prevents device time manipulation)
  const checkCODEligibility = async () => {
    console.log('🔍 CartScreen COD eligibility check - Current user data:', {
      user: user,
      userKeys: user ? Object.keys(user) : 'No user',
      userType: user?.user_type,
      userId: user?.user_id || user?.id,
      username: user?.username,
      isAuthenticated: user ? 'Yes' : 'No'
    });
    
    // If user exists but user_type is missing, try to refresh user data
    if (user && typeof user.user_type === 'undefined') {
      console.log('🔄 User data missing user_type, refreshing user data...');
      try {
        await dispatch(refreshUserData()).unwrap();
        console.log('✅ User data refreshed successfully');
        // Re-run the check with updated user data
        setTimeout(() => checkCODEligibility(), 1000);
        return;
      } catch (error) {
        console.error('❌ Failed to refresh user data:', error);
      }
    }
    
    if (!user || user.user_type !== 3) {
      console.log('🚫 CartScreen: COD not available for user type:', user?.user_type, '(Only available for Girls Hosteller - type 3)');
      setCodEnabled(false);
      return;
    }

    try {
      setTimeLoading(true);
      console.log('🕐 Checking COD eligibility with server time...');
      
      const isCODAllowed = await secureTimeService.isCODEnabled(user.user_type);
      const currentServerTime = await secureTimeService.getFormattedServerTime();
      
      setCodEnabled(isCODAllowed);
      setServerTime(currentServerTime);
      
      console.log('🔒 Secure COD check result:', {
        userType: user.user_type,
        serverTime: currentServerTime,
        codEnabled: isCODAllowed,
        securityNote: 'Time cannot be manipulated by students'
      });
    } catch (error) {
      console.error('❌ COD eligibility check failed:', error);
      setCodEnabled(false); // Fail safe - deny COD on error
    } finally {
      setTimeLoading(false);
    }
  };

  // Check COD eligibility on component mount and user change
  useEffect(() => {
    checkCODEligibility();
  }, [user?.user_type]);

  // Auto-set items to parcel for user_type 3 after 5:30 PM
  useEffect(() => {
    if (user?.user_type === 3) {
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const istOffset = 5.5; // IST is UTC+5:30
      const istTime = new Date(utcTime + (istOffset * 3600000));
      
      const currentHour = istTime.getHours();
      const currentMinute = istTime.getMinutes();
      const isAfter530PM = currentHour > 17 || (currentHour === 17 && currentMinute >= 30);
      
      if (isAfter530PM) {
        console.log('📦 AUTO-PARCEL: Converting all items to parcel for Girls Hosteller after 5:30 PM');
        items.forEach(item => {
          if (item.orderType !== 'parcel') {
            console.log(`📦 Converting ${item.name} from ${item.orderType || 'dine-in'} to parcel`);
            dispatch(updateItemOrderType({ id: item.id, orderType: 'parcel' }));
          }
        });
      }
    }
  }, [user?.user_type, items]);

  // Removed old insecure isCODEnabled function - using server-based approach instead

  const isMinOrderMet = total >= APP_CONFIG.MIN_ORDER_AMOUNT;
  const checkoutDisabled = !isMinOrderMet || loading || items.length === 0;

  // Debug logging
  console.log('🛒 CartScreen render state:', {
    itemsCount: items.length,
    total,
    minOrderAmount: APP_CONFIG.MIN_ORDER_AMOUNT,
    isMinOrderMet,
    inventoryAvailable,
    loading,
    codEnabled,
    serverTime,
    timeLoading,
    buttonDisabled: !isMinOrderMet || !inventoryAvailable || loading
  });

  // Calculate additional charges
  const calculateExtras = () => {
    let parcelCharge = 0;
    
    // Count parcel items and add ₹5 per parcel item
    items.forEach(item => {
      if (item.orderType === 'parcel') {
        parcelCharge += 5 * item.quantity;
      }
    });
    
    return { parcelCharge };
  };

  const { parcelCharge } = calculateExtras();
  const finalTotal = total + parcelCharge;

  // Handle order type change for individual items
  const handleItemOrderTypeChange = (itemId, orderType) => {
    dispatch(updateItemOrderType({ itemId, orderType }));
  };

  const handleQuantityUpdate = (itemId, newQuantity) => {
    if (newQuantity === 0) {
      handleRemoveItem(itemId);
    } else {
      dispatch(updateQuantity({ id: itemId, quantity: newQuantity }));
    }
  };

  const handleRemoveItem = (itemId) => {
    // Directly remove item without confirmation alert
    dispatch(removeFromCart(itemId));
  };

  const handleClearCart = () => {
    setShowClearCartModal(true);
  };

  const confirmClearCart = () => {
    setShowClearCartModal(false);
    dispatch(clearCart());
    showToast.success('Cart cleared successfully');
  };

  const cancelClearCart = () => {
    setShowClearCartModal(false);
  };

  const handleProceedToPayment = () => {
    console.log('🛒 Proceed to Payment clicked');
    console.log('📊 Cart validation:', {
      inventoryAvailable,
      isMinOrderMet,
      total,
      minOrderAmount: APP_CONFIG.MIN_ORDER_AMOUNT,
      itemCount,
      maxItems: APP_CONFIG.MAX_CART_ITEMS
    });

    // Check ordering time restriction for Girls Hostellers (user_type = 3)
    if (user?.user_type === 3 && isAfter7PMIST()) {
      console.log('❌ Ordering time restriction - Girls Hostellers cannot order after 7:00 PM IST');
      showToast.warning(
        'Girls Hostellers can only order until 7:00 PM IST. Ordering is currently closed.',
        'Ordering Closed'
      );
      return;
    }

    if (!inventoryAvailable) {
      console.log('❌ Inventory not available');
      showToast.warning('Menu booking is currently disabled', 'Booking Unavailable');
      return;
    }

    if (!isMinOrderMet) {
      console.log('❌ Minimum order not met');
      showToast.warning(
        `Minimum order amount is ${formatCurrency(APP_CONFIG.MIN_ORDER_AMOUNT)}`,
        'Minimum Order Amount'
      );
      return;
    }

    if (itemCount > APP_CONFIG.MAX_CART_ITEMS) {
      console.log('❌ Max items exceeded');
      showToast.warning(
        `Maximum ${APP_CONFIG.MAX_CART_ITEMS} items allowed per order`,
        'Maximum Items Exceeded'
      );
      return;
    }

    // Navigate to PaymentScreen where user will select payment method
    console.log('� Navigating to Payment Screen with data:', {
      orderItems: items,
      itemsLength: items?.length,
      totalAmount: finalTotal,
      firstItem: items?.[0],
      firstItemStructure: items?.[0] ? {
        hasQuantity: 'quantity' in items[0],
        hasDish: 'dish' in items[0],
        dishKeys: items[0].dish ? Object.keys(items[0].dish) : 'no dish'
      } : 'no first item'
    });
    
    navigation.navigate('Payment', {
      orderItems: items,
      totalAmount: finalTotal,
      extraCharges: { parcelCharge },
      serverTime,
      codEnabled,
    });
  };

  // Determine if order type chip should be shown based on user type and time
  const shouldShowOrderTypeChip = () => {
    // For user_type 3 (Girls Hosteller), check if it's after 5:30 PM
    if (user?.user_type === 3) {
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const istOffset = 5.5; // IST is UTC+5:30
      const istTime = new Date(utcTime + (istOffset * 3600000));
      
      const currentHour = istTime.getHours();
      const currentMinute = istTime.getMinutes();
      const isAfter530PM = currentHour > 17 || (currentHour === 17 && currentMinute >= 30);
      
      console.log(`🕐 CartScreen - User type 3, Time: ${currentHour}:${currentMinute.toString().padStart(2, '0')}, After 5:30 PM: ${isAfter530PM}`);
      
      // Hide chip after 5:30 PM for user_type 3 (auto-parcel)
      return !isAfter530PM;
    }
    
    // Show chip for user types 1 and 2 (manual selection)
    return true;
  };

  const renderCartItem = ({ item }) => (
    <CartItem
      item={item}
      onQuantityUpdate={handleQuantityUpdate}
      onRemove={handleRemoveItem}
      onOrderTypeChange={handleItemOrderTypeChange}
      showOrderTypeChip={shouldShowOrderTypeChip()}
    />
  );

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <MaterialCommunityIcons name="cart-outline" size={40} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Your cart is empty</Text>
      <Text style={styles.emptySubtitle}>
        Add some delicious items from the menu
      </Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Menu')}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>Browse Menu</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCartSummary = () => (
    <ScrollView style={styles.summaryContainer}>

      {/* Order Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <TouchableOpacity onPress={handleClearCart} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Items ({itemCount})</Text>
          <Text style={styles.summaryValue}>{formatCurrency(total)}</Text>
        </View>

        {parcelCharge > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Parcel Charges</Text>
            <Text style={styles.summaryValue}>+{formatCurrency(parcelCharge)}</Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>{formatCurrency(finalTotal)}</Text>
        </View>

        {!isMinOrderMet && (
          <Text style={styles.minOrderText}>
            Minimum order: {formatCurrency(APP_CONFIG.MIN_ORDER_AMOUNT)}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, checkoutDisabled && styles.primaryButtonDisabled]}
          onPress={handleProceedToPayment}
          disabled={checkoutDisabled}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>
            {loading
              ? 'Processing...'
              : !isMinOrderMet
                ? `Add ₹${(APP_CONFIG.MIN_ORDER_AMOUNT - total).toFixed(2)} more`
                : 'Proceed to Payment'
            }
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Cart</Text>
          <View style={styles.headerRight} />
        </View>

        {renderEmptyCart()}

        <CraveoBottomNav navigation={navigation} currentRoute="Cart" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart ({itemCount} items)</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        <FlatList
          data={items}
          renderItem={renderCartItem}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderCartSummary()}
        />
      </View>

      <CraveoBottomNav navigation={navigation} currentRoute="Cart" />

      {error && (
        <View style={styles.errorCard}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => dispatch(setError(null))}
            style={styles.dismissButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Clear Cart Confirmation Modal */}
      <ClearCartConfirmationModal
        visible={showClearCartModal}
        onCancel={cancelClearCart}
        onConfirm={confirmClearCart}
        itemCount={itemCount}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    height: 60,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: spacing.sm,
    paddingBottom: 120, // Space for bottom navigation
  },
  listFooter: {
    height: spacing.md,
  },
  
  // Summary
  summaryContainer: {
    paddingBottom: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginBottom: 120, // Space for bottom navigation
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    fontFamily: fonts.regular,
  },
  summaryCard: {
    margin: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.md,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  clearAllText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontFamily: fonts.semibold,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
  },
  summaryValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontFamily: fonts.medium,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  minOrderText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontFamily: fonts.medium,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.gray,
    elevation: 0,
    shadowOpacity: 0,
  },
  primaryButtonText: {
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    color: colors.white,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.error}14`,
    borderWidth: 1,
    borderColor: `${colors.error}55`,
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
  },
  dismissButton: {
    paddingHorizontal: spacing.xs,
  },
  dismissButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.error,
  },
});

export default CartScreen;
