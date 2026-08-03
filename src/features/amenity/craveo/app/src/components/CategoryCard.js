import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Card, Text, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';

const { width } = Dimensions.get('window');
const cardWidth = (width - spacing.lg * 3) / 2; // 2 cards per row with margins

const CategoryCard = ({ category, dishCount, onPress, totalQuantity = 0 }) => {
  const getCategoryIcon = (categoryName) => {
    const icons = {
      'Breakfast': 'food-croissant',
      'Lunch': 'food-fork-drink', 
      'Snacks': 'food-apple',
      'Drinks': 'cup',
      'Sweets': 'cupcake',
      'Fast Food': 'hamburger',
      'Chinese': 'noodles',
      'North Indian': 'bowl-mix',
      'South Indian': 'rice',
      'Desserts': 'ice-cream'
    };
    return icons[categoryName] || 'food';
  };

  const getCategoryColor = (categoryName) => {
    const colors = {
      'Breakfast': '#FF6B6B',
      'Lunch': '#4ECDC4', 
      'Snacks': '#45B7D1',
      'Drinks': '#96CEB4',
      'Sweets': '#FFEAA7',
      'Fast Food': '#DDA0DD',
      'Chinese': '#FD79A8',
      'North Indian': '#FDCB6E',
      'South Indian': '#A0E7E5',
      'Desserts': '#FFB8B8'
    };
    return colors[categoryName] || colors.primary;
  };

  const categoryColor = getCategoryColor(category);
  const categoryIcon = getCategoryIcon(category);

  return (
    <TouchableOpacity onPress={onPress} style={styles.cardContainer}>
      <Card style={[styles.card, { borderLeftColor: categoryColor }]}>
        <View style={styles.cardContent}>
          {/* Icon and Badge Container */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconBackground, { backgroundColor: categoryColor + '20' }]}>
              <MaterialCommunityIcons 
                name={categoryIcon} 
                size={32} 
                color={categoryColor} 
              />
            </View>
            {totalQuantity > 0 && (
              <Badge 
                style={[styles.quantityBadge, { backgroundColor: categoryColor }]}
                size={20}
              >
                {totalQuantity}
              </Badge>
            )}
          </View>

          {/* Category Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.categoryName} numberOfLines={1}>
              {category}
            </Text>
            <Text style={styles.dishCount}>
              {dishCount} {dishCount === 1 ? 'item' : 'items'}
            </Text>
            {totalQuantity > 0 && (
              <Text style={styles.totalQuantity}>
                {totalQuantity} available
              </Text>
            )}
          </View>

          {/* Arrow Icon */}
          <View style={styles.arrowContainer}>
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={24} 
              color={colors.textSecondary} 
            />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: cardWidth,
    marginBottom: spacing.md,
  },
  card: {
    elevation: 3,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    backgroundColor: colors.surface,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    minHeight: 80,
  },
  iconContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  iconBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 20,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  dishCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  totalQuantity: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: '500',
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
});

export default CategoryCard;
