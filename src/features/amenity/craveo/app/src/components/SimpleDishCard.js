import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { fonts } from '../../../../../../theme';

// Simple hardcoded colors to avoid theme issues
const COLORS = {
  primary: '#235EAA',
  white: '#FFFFFF',
  text: '#1a1a1a',
  secondary: '#f2f2f7',
  success: '#34c759',
  error: '#ff3b30',
  warning: '#ff9500',
  disabled: '#cccccc',
  disabledText: '#999999',
};

const SimpleDishCard = ({ dish, onAddToCart, onPress }) => {
  const isOutOfStock = !dish.quantity || dish.quantity <= 0;

  const handleAddToCartPress = () => {
    if (!isOutOfStock && onAddToCart) {
      onAddToCart(dish, 1);
    }
  };
  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image
          source={require('../../assets/food1.jpg')}
          style={styles.placeholderImage}
          resizeMode="cover"
        />
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.name, isOutOfStock && styles.disabledText]}>{dish.name}</Text>
        <Text style={[styles.description, isOutOfStock && styles.disabledText]} numberOfLines={2}>
          {dish.description}
        </Text>
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={[styles.price, isOutOfStock && styles.disabledText]}>₹{dish.price}</Text>
            {isOutOfStock && (
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            )}
            {!isOutOfStock && dish.quantity && (
              <Text style={styles.quantityText}>Available: {dish.quantity}</Text>
            )}
          </View>
          <TouchableOpacity 
            style={[
              styles.addButton, 
              isOutOfStock && styles.disabledButton
            ]}
            onPress={handleAddToCartPress}
            disabled={isOutOfStock}
          >
            <Text style={[
              styles.addButtonText,
              isOutOfStock && styles.disabledButtonText
            ]}>
              {isOutOfStock ? 'Unavailable' : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    margin: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  imageContainer: {
    height: 150,
    width: '100%',
  },
  placeholderImage: {
    flex: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontFamily: fonts.regular,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flex: 1,
    marginRight: 12,
  },
  price: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: COLORS.primary,
  },
  quantityText: {
    fontSize: 12,
    color: COLORS.success,
    marginTop: 2,
    fontFamily: fonts.regular,
  },
  outOfStockText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 2,
    fontFamily: fonts.medium,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: COLORS.disabled,
  },
  addButtonText: {
    color: COLORS.white,
    fontFamily: fonts.medium,
  },
  disabledButtonText: {
    color: COLORS.disabledText,
    fontFamily: fonts.regular,
  },
  disabledText: {
    color: COLORS.disabledText,
    fontFamily: fonts.regular,
  },
});

export default SimpleDishCard;
