import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { formatCurrency } from '../utils/helpers';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';
import { fonts } from '../../../../../../theme';

const CartItem = ({ item, onQuantityUpdate, onRemove, onOrderTypeChange, showOrderTypeChip = true }) => {
  if (!item) return null;
  
  console.log('CartItem received item:', JSON.stringify(item, null, 2)); // Debug log
  
  const {
    id,
    name,
    price,
    image,
    quantity,
    isVeg,
    category,
    orderType = 'dine-in', // Default to dine-in
  } = item;

  // Get category name with proper fallback and debug logging
  let categoryName = 'Food';
  console.log('CartItem category data:', { category, item_name: name }); // Debug log
  
  if (category) {
    if (typeof category === 'object') {
      if (category.dish_category_name) {
        categoryName = category.dish_category_name;
      } else if (category.name) {
        categoryName = category.name;
      }
    } else if (typeof category === 'string' && category !== '') {
      categoryName = category;
    }
  }
  
  console.log('Final category name:', categoryName); // Debug log

  const basePrice = price * quantity;
  const parcelCharge = orderType === 'parcel' ? 5 * quantity : 0;
  const totalPrice = basePrice + parcelCharge;

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 0) {
      onQuantityUpdate(id, newQuantity);
    }
  };

  const handleOrderTypeToggle = () => {
    const newOrderType = orderType === 'dine-in' ? 'parcel' : 'dine-in';
    console.log(`Toggling order type for item ${id}: ${orderType} -> ${newOrderType}`);
    onOrderTypeChange(id, newOrderType);
  };

  console.log(`CartItem render - showOrderTypeChip: ${showOrderTypeChip}, orderType: ${orderType}, item:`, {id, name});

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Image
          source={image ? { uri: image } : require('../../assets/food1.jpg')}
          style={styles.image}
        />

        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.name} numberOfLines={2}>
                {name}
              </Text>
              <View style={styles.badgeContainer}>
                {/* Order Type Badge - Most prominent */}
                {showOrderTypeChip && (
                  <TouchableOpacity
                    onPress={handleOrderTypeToggle}
                    style={[styles.badge, orderType === 'parcel' ? styles.parcelBadge : styles.dineInBadge]}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={orderType === 'dine-in' ? 'silverware-fork-knife' : 'package-variant'}
                      size={12}
                      color={colors.white}
                    />
                    <Text style={styles.orderTypeBadgeText}>
                      {orderType === 'dine-in' ? 'Dine In' : 'Parcel (+₹5)'}
                    </Text>
                  </TouchableOpacity>
                )}
                {/* Category Badge */}
                <View style={[styles.badge, styles.categoryBadge]}>
                  <Text style={styles.categoryBadgeText}>{categoryName}</Text>
                </View>
                {/* Veg Badge */}
                {isVeg && (
                  <View style={[styles.badge, styles.vegBadge]}>
                    <MaterialCommunityIcons name="leaf" size={12} color={colors.success} />
                    <Text style={styles.vegBadgeText}>Veg</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => onRemove(id)}
              style={styles.deleteButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="delete-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <View style={styles.priceContainer}>
              <Text style={styles.unitPrice}>
                {formatCurrency(price)} each
              </Text>
              <Text style={styles.totalPrice}>
                {formatCurrency(totalPrice)}
              </Text>
            </View>

            <View style={styles.quantityContainer}>
              <TouchableOpacity
                onPress={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                style={styles.quantityButton}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MaterialCommunityIcons name="minus" size={18} color={quantity <= 1 ? colors.gray : colors.primary} />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                onPress={() => handleQuantityChange(1)}
                style={styles.quantityButton}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardContent: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.md,
    backgroundColor: colors.lightGray,
    marginRight: spacing.md,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: `${colors.primary}1A`,
  },
  categoryBadgeText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
  vegBadge: {
    backgroundColor: `${colors.success}1A`,
  },
  vegBadgeText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontFamily: fonts.semibold,
  },
  dineInBadge: {
    backgroundColor: colors.success,
  },
  parcelBadge: {
    backgroundColor: colors.warning,
  },
  orderTypeBadgeText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontFamily: fonts.bold,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flex: 1,
  },
  unitPrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontFamily: fonts.regular,
  },
  totalPrice: {
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    color: colors.text,
    marginHorizontal: spacing.sm,
    minWidth: 24,
    textAlign: 'center',
  },
});

export default CartItem;
