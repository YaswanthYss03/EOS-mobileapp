import React, { useState } from 'react';
import { View, StyleSheet, Image, Alert, TouchableOpacity } from 'react-native';
import {
  Card,
  Text,
  Button,
  IconButton,
  Badge,
  Chip,
} from 'react-native-paper';
import * as Animatable from 'react-native-animatable';

import { formatCurrency } from '../utils/helpers';
import { theme, colors, spacing } from '../constants/theme';
import { PremiumCard } from './PremiumComponents';

const DishCard = ({ dish, onAddToCart, disabled = false, showQuantityInfo = false }) => {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const {
    dish_id: id,
    name,
    description,
    price,
    quantity: remainingQuantity,
    category,
    image,
    isVeg,
    isSpicy,
    preparationTime,
  } = dish;

  const isSoldOut = remainingQuantity <= 0;
  const isDisabled = disabled || isSoldOut;
  const isLowStock = remainingQuantity <= 5 && remainingQuantity > 0;

  const handleQuantityChange = (change) => {
    const newQuantity = Math.max(1, Math.min(quantity + change, remainingQuantity));
    setQuantity(newQuantity);
  };

  const handleAddToCart = async () => {
    if (isDisabled) return;

    setLoading(true);
    try {
      await onAddToCart(dish, quantity);
      setQuantity(1); // Reset quantity after adding
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to cart');
    } finally {
      setLoading(false);
    }
  };

  const renderQuantityControls = () => (
    <View style={styles.quantityContainer}>
      <IconButton
        icon="minus"
        size={20}
        onPress={() => handleQuantityChange(-1)}
        disabled={quantity <= 1 || isDisabled}
        style={styles.quantityButton}
      />
      <Text style={styles.quantityText}>{quantity}</Text>
      <IconButton
        icon="plus"
        size={20}
        onPress={() => handleQuantityChange(1)}
        disabled={quantity >= remainingQuantity || isDisabled}
        style={styles.quantityButton}
      />
    </View>
  );

  const renderBadges = () => (
    <View style={styles.badgeContainer}>
      {isVeg && (
        <Chip
          icon="leaf"
          compact
          style={[styles.badge, styles.vegBadge]}
          textStyle={styles.badgeText}
        >
          Veg
        </Chip>
      )}
      {isSpicy && (
        <Chip
          icon="chili-hot"
          compact
          style={[styles.badge, styles.spicyBadge]}
          textStyle={styles.badgeText}
        >
          Spicy
        </Chip>
      )}
      {preparationTime && (
        <Chip
          icon="clock"
          compact
          style={[styles.badge, styles.timeBadge]}
          textStyle={styles.badgeText}
        >
          {preparationTime}m
        </Chip>
      )}
    </View>
  );

  return (
    <Animatable.View animation="fadeInUp" duration={600}>
      <PremiumCard style={[styles.card, isDisabled && styles.disabledCard]}>
        <View style={styles.cardContent}>
          {/* Premium Image Container with Default Food Image */}
          <View style={styles.imageContainer}>
            <Image 
              source={image ? { uri: image } : require('../../assets/food1.jpg')} 
              style={styles.image}
            />
            {isSoldOut && (
              <View style={styles.soldOutOverlay}>
                <Text style={styles.soldOutText}>SOLD OUT</Text>
              </View>
            )}
            {/* Premium gradient overlay */}
            <View style={styles.gradientOverlay} />
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.header}>
              <Text style={styles.name} numberOfLines={2}>
                {name}
              </Text>
              <View style={styles.priceContainer}>
                <Text style={styles.price}>{formatCurrency(price)}</Text>
                {(isLowStock || showQuantityInfo) && remainingQuantity >= 0 && (
                  <View style={styles.quantityInfo}>
                    <Badge 
                      style={[
                        styles.stockBadge, 
                        isLowStock ? styles.lowStockBadge : styles.normalStockBadge
                      ]} 
                      size={16}
                    >
                      {remainingQuantity}
                    </Badge>
                    <Text style={styles.stockLabel}>left</Text>
                  </View>
                )}
              </View>
            </View>

            {description && (
              <Text style={styles.description} numberOfLines={2}>
                {description}
              </Text>
            )}

            {renderBadges()}

            <View style={styles.footer}>
              <View style={styles.stockContainer}>
                <Text style={[
                  styles.stockText,
                  isSoldOut ? styles.soldOutText : 
                  isLowStock ? styles.lowStockText : styles.availableText
                ]}>
                  {isSoldOut ? 'Sold Out' : 
                   isLowStock ? `Only ${remainingQuantity} left` : 
                   `${remainingQuantity} available`}
                </Text>
              </View>
              
              {!isDisabled && (
                <View style={styles.actionContainer}>
                  {renderQuantityControls()}
                  <TouchableOpacity
                    onPress={handleAddToCart}
                    disabled={loading || isDisabled}
                    style={styles.addButton}
                  >
                    <Animatable.View animation={loading ? "pulse" : "bounceIn"} iterationCount={loading ? "infinite" : 1}>
                      <Text style={styles.addButtonText}>
                        {loading ? 'Adding...' : 'Add to Cart'}
                      </Text>
                    </Animatable.View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </PremiumCard>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    backgroundColor: colors.tertiary,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  disabledCard: {
    opacity: 0.6,
  },
  cardContent: {
    flexDirection: 'column',
    padding: 0,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: theme.colors.secondary,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.secondary,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'linear-gradient(transparent, rgba(0,0,0,0.3))',
  },
  soldOutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldOutText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  contentContainer: {
    flex: 1,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
    lineHeight: 24,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  quantityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  stockBadge: {
    marginRight: theme.spacing.xs,
  },
  lowStockBadge: {
    backgroundColor: theme.colors.warning,
    color: 'white',
  },
  normalStockBadge: {
    backgroundColor: theme.colors.success,
    color: 'white',
  },
  stockLabel: {
    fontSize: 12,
    color: theme.colors.placeholder,
  },
  description: {
    fontSize: 14,
    color: theme.colors.placeholder,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  badge: {
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  vegBadge: {
    backgroundColor: theme.colors.success + '20',
    borderColor: theme.colors.success,
  },
  spicyBadge: {
    backgroundColor: theme.colors.error + '20',
    borderColor: theme.colors.error,
  },
  timeBadge: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  stockContainer: {
    alignSelf: 'flex-start',
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
  },
  soldOutText: {
    color: theme.colors.error,
  },
  lowStockText: {
    color: theme.colors.warning,
  },
  availableText: {
    color: theme.colors.success,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary,
    borderRadius: 25,
    paddingHorizontal: theme.spacing.sm,
  },
  quantityButton: {
    margin: 0,
    width: 32,
    height: 32,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginHorizontal: theme.spacing.sm,
    minWidth: 24,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 25,
    elevation: 3,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default DishCard;
