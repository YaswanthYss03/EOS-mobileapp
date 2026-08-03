import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Image,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_WIDTH = SCREEN_WIDTH * 0.9;
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.6;

const TodaysSpecialModal = ({ visible, onClose, specials = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  if (!specials || specials.length === 0) {
    return null;
  }

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / SCREEN_WIDTH);
        setCurrentIndex(index);
      },
    }
  );

  const scrollToIndex = (index) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true });
      setCurrentIndex(index);
    }
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.imageContainer}>
      <Image
        source={{ uri: item.image_url }}
        style={styles.specialImage}
        resizeMode="cover"
      />
      {specials.length > 1 && (
        <View style={styles.imageCounter}>
          <Text style={styles.counterText}>
            {index + 1} / {specials.length}
          </Text>
        </View>
      )}
    </View>
  );

  const renderDots = () => {
    if (specials.length <= 1) return null;

    return (
      <View style={styles.dotsContainer}>
        {specials.map((_, index) => {
          const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
          ];

          const dotScale = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1.4, 0.8],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });

          return (
            <TouchableOpacity
              key={index}
              onPress={() => scrollToIndex(index)}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  styles.dot,
                  {
                    transform: [{ scale: dotScale }],
                    opacity: dotOpacity,
                  },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const getMealTypeIcon = () => {
    if (specials[0]?.meal_type === 'lunch') {
      return 'white-balance-sunny';
    }
    return 'moon-waning-crescent';
  };

  const getMealTypeText = () => {
    if (specials[0]?.meal_type === 'lunch') {
      return "Today's Lunch Special";
    }
    return "Today's Dinner Special";
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons
                name={getMealTypeIcon()}
                size={28}
                color={colors.primary}
              />
              <Text style={styles.title}>{getMealTypeText()}</Text>
            </View>
            <IconButton
              icon="close"
              size={28}
              iconColor={colors.text}
              onPress={onClose}
              style={styles.closeButton}
            />
          </View>

          {/* Carousel */}
          <View style={styles.carouselContainer}>
            <FlatList
              ref={flatListRef}
              data={specials}
              renderItem={renderItem}
              keyExtractor={(item, index) => `special-${item.id || index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              bounces={false}
              decelerationRate="fast"
              snapToInterval={SCREEN_WIDTH}
              snapToAlignment="center"
              getItemLayout={(data, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
            />
          </View>

          {/* Dots Indicator */}
          {renderDots()}

          {/* Footer Message */}
          <View style={styles.footer}>
            <MaterialCommunityIcons
              name="star-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.footerText}>
              Don't miss out on today's special delights!
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: SCREEN_WIDTH * 0.95,
    maxHeight: SCREEN_HEIGHT * 0.85,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: spacing.sm,
  },
  closeButton: {
    margin: 0,
  },
  carouselContainer: {
    height: IMAGE_HEIGHT,
    width: SCREEN_WIDTH * 0.95,
    position: 'relative',
  },
  imageContainer: {
    width: SCREEN_WIDTH * 0.95,
    height: IMAGE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  specialImage: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT - 40,
    borderRadius: 12,
  },
  imageCounter: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  counterText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: 'bold',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginHorizontal: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: `${colors.primary}10`,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
});

export default TodaysSpecialModal;
