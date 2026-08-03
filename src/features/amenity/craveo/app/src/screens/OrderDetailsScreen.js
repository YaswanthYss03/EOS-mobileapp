import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';

import { orderAPI } from '../services/api';
import { formatCurrency, formatDate, formatTime } from '../utils/helpers';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';

const OrderDetailsScreen = ({ navigation, route }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { token } = useSelector(state => state.auth);

  useEffect(() => {
    fetchOrderDetails();
  }, []);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getOrderById(orderId, token);
      
      if (response.success) {
        setOrder(response.order);
      } else {
        setError(response.message || 'Failed to fetch order details');
      }
    } catch (error) {
      setError(error.message || 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get item name with fallback
  const getItemName = (item) => {
    console.log('🔍 OrderDetails - Getting item name for item:', JSON.stringify(item, null, 2));
    // First priority: stored dish name in order_items (for data integrity)
    if (item.dish_name) return item.dish_name;
    // Second: relationship with dish table
    if (item.dish?.dish_name) return item.dish.dish_name;
    // Fallbacks for other possible field names
    if (item.name) return item.name;
    if (item.dish?.name) return item.dish.name;
    return `Unknown Item (ID: ${item.dish_id || 'N/A'})`;
  };

  // Helper function to get category name
  const getCategoryName = (item) => {
    console.log('🔍 OrderDetails - Getting category name for item:', JSON.stringify(item, null, 2));
    // First try to get category from order_items table via dish_category_id relationship
    if (item.dish_category?.dish_category_name) return item.dish_category.dish_category_name;
    // Then try direct category relationship (legacy)
    if (item.category?.dish_category_name) return item.category.dish_category_name;
    // Then try dish.category relationship (for backward compatibility)
    if (item.dish?.category?.dish_category_name) return item.dish.category.dish_category_name;
    // Fallbacks for other possible structures
    if (item.dish?.dish_category?.dish_category_name) return item.dish.dish_category.dish_category_name;
    if (item.dish?.main_category?.dish_category_name) return item.dish.main_category.dish_category_name;
    if (item.dish?.categories?.dish_category_name) return item.dish.categories.dish_category_name;
    return 'Unknown Category';
  };

  // Helper function to calculate total from order items
  const calculateOrderTotal = (orderItems) => {
    if (!orderItems || !Array.isArray(orderItems)) return 0;
    
    return orderItems.reduce((total, item) => {
      const price = item.price || 0;
      const quantity = item.quantity || 0;
      return total + (price * quantity);
    }, 0);
  };

  // Get total amount (calculated from items if database total_amount is 0)
  const getTotalAmount = () => {
    const dbTotal = order?.total_amount || 0;
    const calculatedTotal = calculateOrderTotal(order?.order_items);
    
    console.log('💰 Total calculation:', {
      dbTotal,
      calculatedTotal,
      orderItemsCount: order?.order_items?.length || 0
    });
    
    // Use database total if available, otherwise calculate
    return dbTotal > 0 ? dbTotal : calculatedTotal;
  };

  // Helper function to get payment status display
  const getPaymentStatusDisplay = (paymentStatus) => {
    switch (paymentStatus?.toLowerCase()) {
      case 'success':
        return 'Success';
      case 'completed':
        return 'Success';
      case 'cod':
        return 'COD';
      case 'cash_on_delivery':
        return 'COD';
      case 'failed':
        return 'Failed';
      case 'failure':
        return 'Failed';
      default:
        return paymentStatus || 'Pending';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      default:
        return colors.gray;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Being Prepared';
      case 'completed':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'clock-outline';
      case 'completed':
        return 'check-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'information-outline';
    }
  };

  const getPaymentStatusIcon = (isCOD, paymentStatus) => {
    if (isCOD) return 'cash';
    switch (paymentStatus?.toLowerCase()) {
      case 'success':
      case 'completed':
        return 'check-circle';
      case 'failed':
      case 'failure':
        return 'alert-circle';
      default:
        return 'clock-outline';
    }
  };

  const handleTrackOrder = () => {
    if (order?.order_status === 'pending') {
      Alert.alert(
        'Track Order',
        'Use the QR Scanner to track your order at the canteen pickup counter.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open QR Scanner',
            onPress: () => navigation.navigate('QR Scanner'),
          },
        ]
      );
    }
  };

  const renderOrderHeader = () => {
    const statusColor = getStatusColor(order.order_status);

    return (
      <View style={styles.card}>
        <View style={styles.headerTopRow}>
          <Text style={styles.orderId}>#ORD{order.order_id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1A` }]}>
            <MaterialCommunityIcons name={getStatusIcon(order.order_status)} size={14} color={statusColor} />
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {getStatusText(order.order_status)}
            </Text>
          </View>
        </View>

        <View style={styles.tokenBox}>
          <Text style={styles.tokenLabel}>Pickup Token</Text>
          <Text style={styles.tokenNumber}>#{order.token_number || order.order_id}</Text>
        </View>

        <View style={styles.dateRow}>
          <MaterialCommunityIcons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
        </View>
      </View>
    );
  };

  const renderOrderItems = () => (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <MaterialCommunityIcons name="silverware-variant" size={18} color={colors.primary} />
        <Text style={styles.cardTitle}>Order Items</Text>
      </View>
      {order.order_items?.map((item, index) => (
        <View key={index} style={styles.itemRow}>
          <View style={styles.itemDetails}>
            <Text style={styles.itemName}>{getItemName(item)}</Text>
            <Text style={styles.itemPrice}>
              {formatCurrency(item.price || 0)} each
            </Text>
          </View>
          <View style={styles.itemQuantity}>
            <Text style={styles.quantityText}>×{item.quantity || 0}</Text>
            <Text style={styles.itemTotal}>
              {formatCurrency((item.price || 0) * (item.quantity || 0))}
            </Text>
          </View>
        </View>
      ))}

      <View style={styles.divider} />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={styles.totalAmount}>
          {formatCurrency(getTotalAmount())}
        </Text>
      </View>
    </View>
  );

  const renderPaymentDetails = () => {
    const isCODOrder = order.COD || order.payment_method === 'COD' || order.payment_status === 'cod';
    
    // Define colors based on requirements
    let paymentStatusColor;
    if (isCODOrder) {
      paymentStatusColor = '#87CEEB'; // Light blue for COD
    } else if (order.payment_status === 'success' || order.payment_status === 'completed') {
      paymentStatusColor = '#22c55e'; // Green for success
    } else if (order.payment_status === 'failed' || order.payment_status === 'failure') {
      paymentStatusColor = '#ef4444'; // Red for failed
    } else {
      paymentStatusColor = colors.warning; // Default warning color
    }

    const paymentStatusText = isCODOrder
      ? 'Pending'
      : getPaymentStatusDisplay(order.payment_status || order.razorpay_payment_status);
    const paymentStatusIcon = getPaymentStatusIcon(isCODOrder, order.payment_status || order.razorpay_payment_status);

    return (
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <MaterialCommunityIcons name="credit-card-outline" size={18} color={colors.primary} />
          <Text style={styles.cardTitle}>Payment Details</Text>
        </View>

        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Transaction ID</Text>
          <Text style={styles.paymentValue}>
            {isCODOrder ? 'N/A' : (order.rz_transaction_id || order.transaction_id || order.razorpay_payment_id || 'N/A')}
          </Text>
        </View>

        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Payment Method</Text>
          <Text style={styles.paymentValue}>
            {isCODOrder ? 'Cash on Delivery' : (order.payment_method || 'UPI')}
          </Text>
        </View>

        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Payment Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${paymentStatusColor}1A` }]}>
            <MaterialCommunityIcons name={paymentStatusIcon} size={13} color={paymentStatusColor} />
            <Text style={[styles.statusBadgeText, { color: paymentStatusColor }]}>{paymentStatusText}</Text>
          </View>
        </View>

        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Amount {isCODOrder ? 'to Pay' : 'Paid'}</Text>
          <Text style={[styles.paymentValue, isCODOrder ? styles.pendingAmount : styles.paidAmount]}>
            {isCODOrder ? formatCurrency(getTotalAmount()) : formatCurrency(order.amount_paid || getTotalAmount())}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={40} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={fetchOrderDetails} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="receipt-text-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {renderOrderHeader()}
        {renderOrderItems()}
        {renderPaymentDetails()}
      </ScrollView>

      {order.order_status === 'pending' && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleTrackOrder} activeOpacity={0.85}>
            <MaterialCommunityIcons name="qrcode-scan" size={18} color={colors.white} />
            <Text style={styles.primaryButtonText}>Track at Canteen</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
  },
  scrollContainer: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  orderId: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  tokenBox: {
    alignItems: 'center',
    backgroundColor: `${colors.primary}0D`,
    borderRadius: 14,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  tokenLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tokenNumber: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.primary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  orderDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  itemPrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  itemQuantity: {
    alignItems: 'flex-end',
  },
  quantityText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  itemTotal: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  totalAmount: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.primary,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  paymentLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  paymentValue: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  paidAmount: {
    color: colors.success,
    fontWeight: 'bold',
  },
  pendingAmount: {
    color: colors.warning,
    fontWeight: 'bold',
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingVertical: spacing.sm + 2,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  primaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.white,
  },
});

export default OrderDetailsScreen;
