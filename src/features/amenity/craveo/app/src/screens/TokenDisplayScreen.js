import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, StatusBar } from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import { formatCurrency, formatTime } from '../utils/helpers';
import { colors, spacing, fontSize } from '../constants/theme';
import { fonts } from '../../../../../../theme';

const { width, height } = Dimensions.get('window');

const TokenDisplayScreen = ({ navigation, route }) => {
  const { order, tokenNumber } = route.params || {};
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    // Hide status bar for fullscreen experience
    StatusBar.setHidden(true);

    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
      if (order?.createdAt) {
        const elapsed = Math.floor((new Date() - new Date(order.createdAt)) / 1000 / 60);
        setTimeElapsed(elapsed);
      }
    }, 1000);

    // Auto-close after 5 minutes
    const autoCloseTimeout = setTimeout(() => {
      handleClose();
    }, 300000); // 5 minutes

    return () => {
      StatusBar.setHidden(false);
      clearInterval(timeInterval);
      clearTimeout(autoCloseTimeout);
    };
  }, []);

  const handleClose = () => {
    navigation.goBack();
  };

  const getStatusColor = () => {
    if (order?.status === 'completed') return colors.success;
    if (timeElapsed > (order?.estimatedTime || 15)) return colors.warning;
    return colors.primary;
  };

  const getStatusText = () => {
    if (order?.status === 'completed') return 'Order Ready!';
    if (timeElapsed > (order?.estimatedTime || 15)) return 'Taking longer than expected';
    return 'Preparing your order';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="close"
          size={24}
          iconColor={colors.white}
          onPress={handleClose}
          style={styles.closeButton}
        />
        <Text style={styles.currentTime}>
          {formatTime(currentTime)}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Token Number - Main Display */}
        <Card style={styles.tokenCard}>
          <View style={styles.tokenContent}>
            <Text style={styles.tokenLabel}>Your Token Number</Text>
            <Text style={styles.tokenNumber}>{tokenNumber}</Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
          </View>
        </Card>

        {/* Order Details */}
        {order && (
          <Card style={styles.detailsCard}>
            <View style={styles.detailsContent}>
              <Text style={styles.detailsTitle}>Order Summary</Text>
              
              <View style={styles.orderInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Student:</Text>
                  <Text style={styles.infoValue}>{user?.name || 'Student'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Order ID:</Text>
                  <Text style={styles.infoValue}>#{order.id}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Total Amount:</Text>
                  <Text style={[styles.infoValue, styles.totalAmount]}>
                    {formatCurrency(order.totalAmount)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Order Time:</Text>
                  <Text style={styles.infoValue}>
                    {formatTime(order.createdAt)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Wait Time:</Text>
                  <Text style={styles.infoValue}>{timeElapsed} mins</Text>
                </View>
              </View>

              {/* Items List */}
              <View style={styles.itemsContainer}>
                <Text style={styles.itemsTitle}>Items:</Text>
                {order.items?.map((item, index) => (
                  <Text key={index} style={styles.itemText}>
                    {item.quantity}x {item.dish.name}
                  </Text>
                ))}
              </View>
            </View>
          </Card>
        )}

        {/* Instructions */}
        <Card style={styles.instructionsCard}>
          <View style={styles.instructionsContent}>
            <Text style={styles.instructionsTitle}>Instructions</Text>
            <Text style={styles.instructionText}>
              • Keep this screen visible to the canteen staff
            </Text>
            <Text style={styles.instructionText}>
              • Wait for your token number to be called
            </Text>
            <Text style={styles.instructionText}>
              • Collect your order from the pickup counter
            </Text>
          </View>
        </Card>
      </View>

      <View style={styles.footer}>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('Orders')}
          style={styles.ordersButton}
          textColor={colors.white}
        >
          View All Orders
        </Button>
        <Button
          mode="contained"
          onPress={handleClose}
          style={styles.doneButton}
          buttonColor={colors.white}
          textColor={colors.primary}
        >
          Done
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  currentTime: {
    color: colors.white,
    fontSize: fontSize.md,
    fontFamily: fonts.medium,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  tokenCard: {
    marginBottom: spacing.lg,
    elevation: 8,
  },
  tokenContent: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  tokenLabel: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontFamily: fonts.regular,
  },
  tokenNumber: {
    fontSize: Math.min(width * 0.15, 80),
    fontFamily: fonts.bold,
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.md,
    fontFamily: fonts.medium,
  },
  detailsCard: {
    marginBottom: spacing.md,
  },
  detailsContent: {
    padding: spacing.md,
  },
  detailsTitle: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  orderInfo: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
  },
  infoValue: {
    fontSize: fontSize.md,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  totalAmount: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  itemsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  itemsTitle: {
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    marginBottom: spacing.sm,
  },
  itemText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    paddingVertical: 2,
    fontFamily: fonts.regular,
  },
  instructionsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  instructionsContent: {
    padding: spacing.md,
  },
  instructionsTitle: {
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    marginBottom: spacing.sm,
    color: colors.primary,
  },
  instructionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 18,
    fontFamily: fonts.regular,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  ordersButton: {
    flex: 1,
    marginRight: spacing.sm,
    borderColor: colors.white,
  },
  doneButton: {
    flex: 1,
    marginLeft: spacing.sm,
  },
});

export default TokenDisplayScreen;
