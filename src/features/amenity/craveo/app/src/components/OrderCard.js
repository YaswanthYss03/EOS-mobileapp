import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { formatCurrency, formatDate, formatTime, formatOrderDateTime } from '../utils/helpers';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';
import { fonts } from '../../../../../../theme';

const OrderCard = ({ order, onPress }) => {
  // Debug: Log the order data to see what we're getting
  console.log('📦 OrderCard received order data:', order);
  
  const {
    order_id,
    order_status,
    order_items,
    created_at,
    estimated_time,
    COD,
  } = order;

  console.log('📋 Extracted order fields:', {
    order_id,
    order_status,
    order_items_count: order_items?.length,
    created_at,
    first_item_structure: order_items?.[0] ? {
      hasPrice: 'price' in order_items[0],
      hasQuantity: 'quantity' in order_items[0],
      hasDish: 'dish' in order_items[0],
      dishKeys: order_items[0].dish ? Object.keys(order_items[0].dish) : 'no dish',
      itemKeys: Object.keys(order_items[0])
    } : 'no items'
  });

  // Calculate total amount from order items
  const totalAmount = (order_items || []).reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);

  console.log('💰 Calculated total amount:', totalAmount);

  // Helper function to get dish name
  const getItemName = (item) => {
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
    // First try to get category from order_items table via dish_category_id relationship
    if (item.category?.dish_category_name) return item.category.dish_category_name;
    // Then try dish.category relationship (for backward compatibility)
    if (item.dish?.category?.dish_category_name) return item.dish.category.dish_category_name;
    // Fallbacks for other possible structures
    if (item.dish?.dish_category?.dish_category_name) return item.dish.dish_category.dish_category_name;
    if (item.dish?.main_category?.dish_category_name) return item.dish.main_category.dish_category_name;
    if (item.dish?.categories?.dish_category_name) return item.dish.categories.dish_category_name;
    return 'Unknown Category';
  };

  const getStatusColor = (status) => {
    // Check for COD orders first
    if (order.COD || order.payment_method === 'COD' || order.payment_status === 'cod') {
      return '#87CEEB'; // Light blue for COD
    }
    
    // Check payment status if available
    if (order.payment_status) {
      switch (order.payment_status?.toLowerCase()) {
        case 'success':
        case 'completed':
          return '#22c55e'; // Green for success
        case 'failed':
        case 'failure':
          return '#ef4444'; // Red for failed
        case 'cod':
        case 'cash_on_delivery':
          return '#87CEEB'; // Light blue for COD
        default:
          break;
      }
    }
    
    // Fallback to order status
    switch (status?.toLowerCase()) {
      case 'pending':
        return colors.warning;
      case 'confirmed':
      case 'paid':
        return '#22c55e'; // Green for success
      case 'success':
        return '#22c55e'; // Green for success
      case 'completed':
      case 'delivered':
        return '#22c55e'; // Green for success
      case 'cancelled':
      case 'failed':
        return '#ef4444'; // Red for failed
      default:
        return colors.gray;
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        // Check if this is a COD order based on order data
        if (order.COD || order.payment_method === 'COD') {
          return 'COD';
        }
        // Check payment status if available
        if (order.payment_status) {
          return getPaymentStatusDisplay(order.payment_status);
        }
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'completed':
        return 'Completed';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      case 'paid':
        return 'Paid';
      case 'success':
        return 'Success';
      case 'failed':
        return 'Failed';
      default:
        return status || 'Unknown';
    }
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
        return 'Payment Failed';
      case 'failed_stock_released':
        return 'Failed (Stock Restored)';
      case 'failure':
        return 'Payment Failed';
      default:
        return paymentStatus || 'Pending';
    }
  };

  const getStatusIcon = (text) => {
    switch (text?.toLowerCase()) {
      case 'success':
      case 'confirmed':
      case 'completed':
      case 'delivered':
      case 'paid':
        return 'check-circle';
      case 'cod':
        return 'cash';
      case 'payment failed':
      case 'failed (stock restored)':
      case 'failed':
      case 'cancelled':
        return 'alert-circle';
      case 'pending':
        return 'clock-outline';
      default:
        return 'information-outline';
    }
  };

  const statusText = getStatusText(order_status);
  const statusColor = getStatusColor(order_status);
  const statusIcon = getStatusIcon(statusText);

  const itemCount = (order_items || []).reduce((total, item) => total + item.quantity, 0);
  const firstThreeItems = (order_items || []).slice(0, 3);
  const remainingItemsCount = (order_items || []).length - 3;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.cardWrapper}>
      <View style={[styles.accentBar, { backgroundColor: statusColor }]} />
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.tokenNumber}>#ORD{order_id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1A` }]}>
            <MaterialCommunityIcons name={statusIcon} size={13} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.itemsContainer}>
          <View style={styles.itemsLabelRow}>
            <MaterialCommunityIcons name="silverware-variant" size={14} color={colors.textSecondary} />
            <Text style={styles.itemsLabel}>Items ({itemCount})</Text>
          </View>
          <View style={styles.itemsList}>
            {firstThreeItems.map((item, index) => (
              <Text key={index} style={styles.itemText} numberOfLines={1}>
                {item.quantity}x {getItemName(item)}
              </Text>
            ))}
            {remainingItemsCount > 0 && (
              <Text style={styles.moreItemsText}>
                +{remainingItemsCount} more items
              </Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>
              Ordered
            </Text>
            <Text style={styles.timeText}>
              {formatOrderDateTime(created_at)}
            </Text>
            {order_status?.toLowerCase() === 'pending' && estimated_time && (
              <Text style={styles.estimatedTime}>
                Est: {estimated_time}m
              </Text>
            )}
          </View>
          <Text style={styles.totalAmount}>
            {formatCurrency(totalAmount)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.surface,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  accentBar: {
    width: 5,
  },
  card: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tokenNumber: {
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
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
  statusText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
  },
  itemsContainer: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  itemsLabel: {
    fontSize: fontSize.sm,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  itemsList: {
    paddingLeft: spacing.md,
  },
  itemText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
    fontFamily: fonts.regular,
  },
  moreItemsText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontFamily: fonts.medium,
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  timeContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
  },
  timeText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    color: colors.text,
    marginTop: 2,
  },
  estimatedTime: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  totalAmount: {
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
});

export default OrderCard;
