import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Button,
  Card,
  Title,
  Paragraph,
  Divider,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

import { colors, spacing, fontSize, borderRadius } from '../constants/theme';
import { formatCurrency } from '../utils/helpers';
import { fonts } from '../../../../../../theme';

const OrderSuccess = ({ navigation, route }) => {
  const {
    orderItems = [],
    totalAmount = 0,
    paymentMethod = 'razorpay',
    extraCharges = {},
    isCOD = false,
    codMessage = '',
  } = route.params || {};

  useEffect(() => {
    // Auto-navigate to orders screen after 5 seconds
    const timer = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Menu' }],
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigation]);

  const renderOrderItem = (item, index) => (
    <View key={index} style={styles.orderItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDetails}>
          {item.quantity} x {formatCurrency(item.price)}
          {item.orderType === 'parcel' && ' + Parcel'}
        </Text>
      </View>
      <View style={styles.itemActions}>
        {item.orderType && (
          <Chip
            compact
            style={[
              styles.orderTypeChip,
              item.orderType === 'parcel' ? styles.parcelChip : styles.dineInChip
            ]}
            textStyle={styles.chipText}
          >
            {item.orderType === 'parcel' ? 'Parcel' : 'Dine In'}
          </Chip>
        )}
        <Text style={styles.itemTotal}>
          {formatCurrency(item.price * item.quantity + (item.orderType === 'parcel' ? 5 * item.quantity : 0))}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Success Animation */}
        <Animatable.View animation="bounceIn" duration={1000} style={styles.successIcon}>
          <MaterialCommunityIcons
            name="check-circle"
            size={80}
            color={colors.success}
          />
        </Animatable.View>

        {/* Success Message */}
        <Animatable.View animation="fadeInUp" delay={500} duration={1000}>
          <Title style={styles.successTitle}>
            {isCOD ? 'Order Placed Successfully!' : 'Payment Successful!'}
          </Title>
          <Paragraph style={styles.successMessage}>
            {isCOD 
              ? codMessage || 'Pay when you receive your order'
              : 'Your order has been confirmed and is being prepared'
            }
          </Paragraph>
        </Animatable.View>

        {/* Order Details Card */}
        <Animatable.View animation="fadeInUp" delay={1000} duration={1000}>
          <Card style={styles.orderCard}>
            <Card.Content>
              <View style={styles.orderHeader}>
                <Title style={styles.orderTitle}>Order Summary</Title>
                <View style={styles.paymentBadge}>
                  <MaterialCommunityIcons
                    name={isCOD ? 'cash' : 'credit-card'}
                    size={16}
                    color={colors.white}
                  />
                  <Text style={styles.paymentBadgeText}>
                    {isCOD ? 'Cash on Delivery' : 'Paid via UPI'}
                  </Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              {/* Order Items */}
              <View style={styles.orderItems}>
                {orderItems.map((item, index) => renderOrderItem(item, index))}
              </View>

              <Divider style={styles.divider} />

              {/* Charges Breakdown */}
              <View style={styles.chargesContainer}>
                <View style={styles.chargeRow}>
                  <Text style={styles.chargeLabel}>Subtotal</Text>
                  <Text style={styles.chargeValue}>
                    {formatCurrency(totalAmount - (extraCharges.parcelCharge || 0))}
                  </Text>
                </View>
                
                {extraCharges.parcelCharge > 0 && (
                  <View style={styles.chargeRow}>
                    <Text style={styles.chargeLabel}>Parcel Charges</Text>
                    <Text style={styles.chargeValue}>
                      +{formatCurrency(extraCharges.parcelCharge)}
                    </Text>
                  </View>
                )}

                <View style={[styles.chargeRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </Animatable.View>

        {/* COD Special Message */}
        {isCOD && (
          <Animatable.View animation="pulse" delay={2000} iterationCount="infinite">
            <Card style={styles.codMessageCard}>
              <Card.Content>
                <View style={styles.codMessageContent}>
                  <MaterialCommunityIcons
                    name="information"
                    size={24}
                    color={colors.info}
                  />
                  <Text style={styles.codMessageText}>
                    Please keep the exact amount ready for payment
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </Animatable.View>
        )}

        {/* Action Buttons */}
        <Animatable.View animation="fadeInUp" delay={1500} duration={1000}>
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Orders')}
              style={[styles.button, styles.ordersButton]}
              icon="receipt-text"
            >
              View Orders
            </Button>
            <Button
              mode="contained"
              onPress={() => navigation.reset({
                index: 0,
                routes: [{ name: 'Menu' }],
              })}
              style={[styles.button, styles.homeButton]}
              icon="home"
            >
              Back to Menu
            </Button>
          </View>
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  successIcon: {
    marginVertical: spacing.xl,
  },
  successTitle: {
    fontSize: fontSize.xxl,
    fontFamily: fonts.bold,
    color: colors.success,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  successMessage: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
  },
  orderCard: {
    width: '100%',
    marginBottom: spacing.lg,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  orderTitle: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  paymentBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontFamily: fonts.medium,
    marginLeft: spacing.xs,
  },
  divider: {
    marginVertical: spacing.md,
  },
  orderItems: {
    marginBottom: spacing.md,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.md,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
  },
  itemActions: {
    alignItems: 'flex-end',
  },
  orderTypeChip: {
    marginBottom: spacing.xs,
  },
  parcelChip: {
    backgroundColor: colors.warning + '20',
  },
  dineInChip: {
    backgroundColor: colors.info + '20',
  },
  chipText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.medium,
  },
  itemTotal: {
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  chargesContainer: {
    paddingTop: spacing.sm,
  },
  chargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  chargeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
  },
  chargeValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontFamily: fonts.medium,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  codMessageCard: {
    width: '100%',
    marginBottom: spacing.lg,
    backgroundColor: colors.info + '10',
    borderColor: colors.info,
    borderWidth: 1,
  },
  codMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codMessageText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.info,
    fontFamily: fonts.medium,
    marginLeft: spacing.sm,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    borderRadius: borderRadius.lg,
  },
  ordersButton: {
    borderColor: colors.primary,
  },
  homeButton: {
    backgroundColor: colors.primary,
  },
});

export default OrderSuccess;
